import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPublicClient } from "./public-client.server";

export type HomepageVideo = {
  id: string;
  title_ar: string;
  title_en: string;
  video_url: string;
  storage_path: string | null;
  file_name: string | null;
  duration_seconds: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

const BUCKET = "homepage-videos";
const SIGN_TTL = 60 * 60 * 6;

/** Admin-only guard. RLS is the second line of defence. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN");
}

/** Uploaded files live in a private bucket; playback goes through signed URLs. */
async function signRows<T extends { storage_path: string | null; video_url: string }>(
  sb: any,
  rows: T[],
): Promise<T[]> {
  const paths = rows.map((r) => r.storage_path).filter((p): p is string => !!p);
  if (paths.length === 0) return rows;
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL);
  const map = new Map<string, string>((data ?? []).map((d: any) => [d.path, d.signedUrl]));
  return rows.map((r) =>
    r.storage_path && map.get(r.storage_path)
      ? { ...r, video_url: map.get(r.storage_path)! }
      : r,
  );
}

/** Public: active videos for the storefront slideshow, in admin-defined order. */
export const listActiveVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageVideo[]> => {
    const sb = getPublicClient();
    const { data, error } = await sb
      .from("homepage_videos")
      .select(
        "id,title_ar,title_en,video_url,storage_path,file_name,duration_seconds,display_order,is_active,created_at",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return signRows(sb, (data ?? []) as HomepageVideo[]);
  },
);

/** Admin: every video, active or not. */
export const listAllVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HomepageVideo[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("homepage_videos")
      .select(
        "id,title_ar,title_en,video_url,storage_path,file_name,duration_seconds,display_order,is_active,created_at",
      )
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return signRows(context.supabase, (data ?? []) as HomepageVideo[]);
  });

const createSchema = z.object({
  title_ar: z.string().max(160).default(""),
  title_en: z.string().max(160).default(""),
  video_url: z.string().max(1000).default(""),
  storage_path: z.string().max(400).nullable().default(null),
  file_name: z.string().max(240).nullable().default(null),
  duration_seconds: z.number().min(0).max(86400).nullable().default(null),
  display_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const createVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.storage_path && !/^https?:\/\//i.test(data.video_url)) {
      throw new Error("A video file or a valid https video URL is required");
    }
    const { error } = await context.supabase.from("homepage_videos").insert({
      ...data,
      video_url: data.storage_path ?? data.video_url,
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  title_ar: z.string().max(160).optional(),
  title_en: z.string().max(160).optional(),
  display_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const updateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("homepage_videos").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase
      .from("homepage_videos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("homepage_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.storage_path) {
      await context.supabase.storage.from(BUCKET).remove([row.storage_path]);
    }
    return { ok: true };
  });

/** Move a video one slot up or down by swapping display order with its neighbour. */
export const reorderVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("homepage_videos")
      .select("id,display_order")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as { id: string; display_order: number }[];
    const index = list.findIndex((r) => r.id === data.id);
    const target = data.direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= list.length) return { ok: true };
    const reordered = [...list];
    const a = reordered[index]!;
    reordered[index] = reordered[target]!;
    reordered[target] = a;
    await Promise.all(
      reordered.map((row, i) =>
        context.supabase.from("homepage_videos").update({ display_order: i }).eq("id", row.id),
      ),
    );
    return { ok: true };
  });
