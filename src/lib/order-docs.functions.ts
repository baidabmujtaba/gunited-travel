import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

/** Documents attached to an order. RLS limits results to the owner or staff. */
export const listOrderDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("order_documents")
      .select("id,doc_key,label_en,label_ar,file_path,file_name,created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Short-lived link for viewing or downloading one uploaded document. */
export const getOrderDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        path: z.string().min(3).max(400),
        download: z.union([z.boolean(), z.string().max(200)]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("order-documents")
      .createSignedUrl(data.path, 300, data.download ? { download: data.download } : undefined);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

/** Audit trail of document edits (replace/delete) for one order. */
export const listOrderDocumentHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id,action,actor_email,before_data,after_data,created_at")
      .eq("entity", "order_documents")
      .eq("entity_id", data.orderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

async function logDocChange(
  context: { supabase: any; userId: string },
  action: string,
  orderId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("email,full_name")
    .eq("id", context.userId)
    .maybeSingle();

  await context.supabase.from("audit_logs").insert({
    actor_id: context.userId,
    actor_email: profile?.email ?? null,
    action,
    entity: "order_documents",
    entity_id: orderId,
    before_data: before,
    after_data: after,
  });

  const label = action === "order_document.delete" ? "deleted" : "replaced";
  await context.supabase.from("order_status_history").insert({
    order_id: orderId,
    new_status: (
      await context.supabase.from("service_orders").select("status").eq("id", orderId).maybeSingle()
    ).data?.status,
    note: `Document ${label}: ${String(before?.["file_name"] ?? before?.["doc_key"] ?? "")}${
      after ? ` → ${String(after["file_name"] ?? "")}` : ""
    }`,
    actor_id: context.userId,
    actor_name: profile?.full_name ?? profile?.email ?? null,
  });
}

/** Staff-only: remove an uploaded document, keeping a permanent audit entry. */
export const deleteOrderDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: doc, error } = await context.supabase
      .from("order_documents")
      .select("id,order_id,doc_key,label_en,label_ar,file_path,file_name")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("DOCUMENT_NOT_FOUND");

    const { error: delErr } = await context.supabase
      .from("order_documents")
      .delete()
      .eq("id", doc.id);
    if (delErr) throw new Error(delErr.message);

    await context.supabase.storage.from("order-documents").remove([doc.file_path]);
    await logDocChange(context, "order_document.delete", doc.order_id, doc, null);
    return { ok: true };
  });

/** Staff-only: point a document row at a newly uploaded file and archive the old one. */
export const replaceOrderDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        path: z.string().min(3).max(400),
        name: z.string().max(200).default(""),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: doc, error } = await context.supabase
      .from("order_documents")
      .select("id,order_id,doc_key,label_en,label_ar,file_path,file_name")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("DOCUMENT_NOT_FOUND");

    const { error: upErr } = await context.supabase
      .from("order_documents")
      .update({ file_path: data.path, file_name: data.name, uploaded_by: context.userId })
      .eq("id", doc.id);
    if (upErr) throw new Error(upErr.message);

    if (doc.file_path && doc.file_path !== data.path) {
      await context.supabase.storage.from("order-documents").remove([doc.file_path]);
    }
    await logDocChange(context, "order_document.replace", doc.order_id, doc, {
      ...doc,
      file_path: data.path,
      file_name: data.name,
    });
    return { ok: true };
  });
