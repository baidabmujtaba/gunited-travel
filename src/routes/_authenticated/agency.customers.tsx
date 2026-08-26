import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createAgencyCustomer, listAgencyCustomers } from "@/lib/agency.functions";

export const Route = createFileRoute("/_authenticated/agency/customers")({
  component: AgencyCustomers,
});

const EMPTY = { full_name: "", email: "", phone: "", whatsapp: "", city: "", notes: "" };

function AgencyCustomers() {
  const l = useL();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const list = useServerFn(listAgencyCustomers);
  const create = useServerFn(createAgencyCustomer);

  const { data, isPending } = useQuery({
    queryKey: ["agency-customers", search],
    queryFn: () => list({ data: { search } }),
  });

  const save = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success(l("تم إضافة العميل", "Customer added"));
      setForm(EMPTY);
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["agency-customers"] });
      void qc.invalidateQueries({ queryKey: ["agency-overview"] });
    },
    onError: (e: any) => toast.error(String(e.message ?? e)),
  });

  return (
    <Section
      title={l("عملائي", "My customers")}
      subtitle={l("العملاء المسجلون تحت وكالتك فقط.", "Only customers registered under your agency.")}
      actions={
        <>
          <Input
            className="w-48"
            placeholder={l("بحث…", "Search…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button size="sm" onClick={() => setOpen(!open)}>
            {open ? l("إلغاء", "Cancel") : l("عميل جديد", "New customer")}
          </Button>
        </>
      }
    >
      {open ? (
        <div className="mb-5 grid gap-3 rounded-xl border border-border/70 bg-beige/40 p-4 sm:grid-cols-2">
          {(
            [
              ["full_name", l("الاسم الكامل", "Full name")],
              ["email", l("البريد", "Email")],
              ["phone", l("الهاتف", "Phone")],
              ["whatsapp", l("واتساب", "WhatsApp")],
              ["city", l("المدينة", "City")],
              ["notes", l("ملاحظات", "Notes")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs font-semibold text-forest-deep">
              {label}
              <Input
                className="mt-1"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || form.full_name.trim().length < 2}
            >
              {l("حفظ", "Save")}
            </Button>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{l("الاسم", "Name")}</th>
                <th className="px-3 py-2 text-start">{l("البريد", "Email")}</th>
                <th className="px-3 py-2 text-start">{l("الهاتف", "Phone")}</th>
                <th className="px-3 py-2 text-start">{l("المدينة", "City")}</th>
                <th className="px-3 py-2 text-start">{l("أُضيف", "Added")}</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c: any) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-semibold text-forest-deep">{c.full_name}</td>
                  <td className="px-3 py-2">{c.email ?? "—"}</td>
                  <td className="px-3 py-2">{c.phone || c.whatsapp || "—"}</td>
                  <td className="px-3 py-2">{c.city || "—"}</td>
                  <td className="px-3 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(data ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                    {l("لا يوجد عملاء بعد.", "No customers yet.")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Section>
  );
}
