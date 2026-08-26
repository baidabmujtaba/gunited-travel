import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KpiCard } from "@/components/admin/AdminShell";
import { Section, TableWrap, useL } from "@/components/admin/Bilingual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { agencyOptions } from "@/lib/agencies.functions";
import {
  PAYMENT_METHODS,
  financialAdjustment,
  getPaymentReceipt,
  listPayments,
  recordExternalPayment,
  recordPayment,
  reversePayment,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: PaymentsPage,
});

const today = () => new Date().toISOString().slice(0, 10);

const emptyPayment = {
  agencyId: "",
  amount: 0,
  currency: "USD",
  paymentDate: today(),
  paymentMethod: "bank_transfer" as (typeof PAYMENT_METHODS)[number],
  transactionReference: "",
  description: "",
  notes: "",
  payerName: "",
  sendingInstitution: "",
};

function PaymentsPage() {
  const l = useL();
  const { fmt } = useI18n();
  const qc = useQueryClient();

  const [filters, setFilters] = useState({
    search: "",
    agencyId: "",
    type: "all" as "all" | "internal" | "external",
    status: "all" as "all" | "recorded" | "reversed",
    from: "",
    to: "",
    page: 1,
  });
  const [mode, setMode] = useState<"internal" | "external">("internal");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyPayment });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState({
    agencyId: "",
    amount: 0,
    direction: "credit" as "credit" | "debit",
    adjustmentType: "adjustment" as "opening" | "adjustment" | "settlement",
    reason: "",
    notes: "",
  });
  const [receipt, setReceipt] = useState<any>(null);

  const list = useServerFn(listPayments);
  const options = useServerFn(agencyOptions);
  const internal = useServerFn(recordPayment);
  const external = useServerFn(recordExternalPayment);
  const reverse = useServerFn(reversePayment);
  const adjustFn = useServerFn(financialAdjustment);
  const receiptFn = useServerFn(getPaymentReceipt);

  const { data: agencies } = useQuery({ queryKey: ["agency-options"], queryFn: () => options() });
  const { data, isPending } = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: () =>
      list({
        data: {
          search: filters.search,
          agencyId: filters.agencyId || null,
          type: filters.type,
          status: filters.status,
          from: filters.from,
          to: filters.to,
          page: filters.page,
          pageSize: 25,
        },
      }),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-payments"] });
    void qc.invalidateQueries({ queryKey: ["admin-balances"] });
    void qc.invalidateQueries({ queryKey: ["admin-agencies"] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        agencyId: form.agencyId,
        amount: form.amount,
        currency: form.currency,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        transactionReference: form.transactionReference,
        description: form.description,
        notes: form.notes,
      };
      return mode === "internal"
        ? internal({ data: payload })
        : external({
            data: {
              ...payload,
              payerName: form.payerName,
              sendingInstitution: form.sendingInstitution,
            },
          });
    },
    onSuccess: (r: any) => {
      toast.success(
        l(
          `تم تسجيل الدفعة ${r.paymentNumber} · الرصيد الآن ${r.balanceAfter}`,
          `Payment ${r.paymentNumber} recorded · balance now ${r.balanceAfter}`,
        ),
      );
      setOpen(false);
      setForm({ ...emptyPayment });
      refresh();
    },
    onError: (e: any) =>
      toast.error(
        e.message === "DUPLICATE_REFERENCE"
          ? l("رقم العملية مسجل مسبقاً لهذه الوكالة.", "This reference already exists for the agency.")
          : e.message,
      ),
  });

  const rows = data?.rows ?? [];
  const recorded = rows.filter((r: any) => r.status === "recorded");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={l("دفعات معروضة", "Payments shown")} value={String(data?.total ?? 0)} />
        <KpiCard
          label={l("إجمالي المسجل", "Recorded total")}
          value={fmt(
            recorded.reduce((s: number, r: any) => s + Number(r.amount_usd), 0),
            "USD",
          )}
        />
        <KpiCard
          label={l("دفعات خارجية", "External payments")}
          value={String(rows.filter((r: any) => r.payment_type === "external").length)}
        />
        <KpiCard
          label={l("عمليات ملغاة", "Reversed")}
          value={String(rows.filter((r: any) => r.status === "reversed").length)}
        />
      </div>

      <Section
        title={l("المدفوعات والتحصيل", "Payments & collection")}
        subtitle={l(
          "تسجيل الدفعات يخصم من رصيد الوكالة تلقائياً. لا يمكن تعديل دفعة — تُلغى بحركة عكسية موثقة.",
          "Recording a payment reduces the agency balance instantly. Payments are never edited — they are reversed with an audited entry.",
        )}
        actions={
          <>
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">{l("تسوية / رصيد افتتاحي", "Adjustment")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{l("تسوية مالية", "Financial adjustment")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{l("الوكالة", "Agency")}</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={adjust.agencyId}
                      onChange={(e) => setAdjust({ ...adjust, agencyId: e.target.value })}
                    >
                      <option value="">{l("اختر…", "Select…")}</option>
                      {(agencies ?? []).map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.agency_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{l("المبلغ USD", "Amount USD")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={adjust.amount}
                        onChange={(e) => setAdjust({ ...adjust, amount: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{l("الاتجاه", "Direction")}</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={adjust.direction}
                        onChange={(e) =>
                          setAdjust({ ...adjust, direction: e.target.value as "credit" | "debit" })
                        }
                      >
                        <option value="credit">{l("دائن (يخفض المستحق)", "Credit (reduces due)")}</option>
                        <option value="debit">{l("مدين (يزيد المستحق)", "Debit (increases due)")}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{l("النوع", "Type")}</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={adjust.adjustmentType}
                        onChange={(e) =>
                          setAdjust({ ...adjust, adjustmentType: e.target.value as any })
                        }
                      >
                        <option value="adjustment">{l("تسوية", "Adjustment")}</option>
                        <option value="opening">{l("رصيد افتتاحي", "Opening balance")}</option>
                        <option value="settlement">{l("إغلاق حساب", "Settlement")}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{l("السبب", "Reason")}</Label>
                      <Input
                        value={adjust.reason}
                        onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={!adjust.agencyId || adjust.amount <= 0 || adjust.reason.length < 3}
                    onClick={() =>
                      void adjustFn({ data: adjust })
                        .then(() => {
                          toast.success(l("تمت التسوية", "Adjustment posted"));
                          setAdjustOpen(false);
                          refresh();
                        })
                        .catch((e: any) => toast.error(e.message))
                    }
                  >
                    {l("تنفيذ", "Post")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-forest text-cream hover:bg-forest-deep">
                  {l("تسجيل دفعة", "Record payment")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{l("تسجيل دفعة", "Record payment")}</DialogTitle>
                </DialogHeader>
                <div className="mb-2 flex gap-2">
                  {(["internal", "external"] as const).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={mode === m ? "default" : "outline"}
                      onClick={() => setMode(m)}
                    >
                      {m === "internal" ? l("دفعة وكالة", "Agency payment") : l("دفعة خارجية", "External payment")}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{l("الوكالة", "Agency")}</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.agencyId}
                      onChange={(e) => setForm({ ...form, agencyId: e.target.value })}
                    >
                      <option value="">{l("اختر…", "Select…")}</option>
                      {(agencies ?? []).map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.agency_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{l("المبلغ", "Amount")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{l("العملة", "Currency")}</Label>
                    <Input
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{l("التاريخ", "Date")}</Label>
                    <Input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{l("طريقة الدفع", "Method")}</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })
                      }
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{l("رقم العملية", "Transaction reference")}</Label>
                    <Input
                      value={form.transactionReference}
                      onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                    />
                  </div>
                  {mode === "external" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>{l("اسم المُرسل", "Payer name")}</Label>
                        <Input
                          value={form.payerName}
                          onChange={(e) => setForm({ ...form, payerName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>{l("الجهة المُرسلة", "Sending institution")}</Label>
                        <Input
                          value={form.sendingInstitution}
                          onChange={(e) => setForm({ ...form, sendingInstitution: e.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{l("ملاحظات", "Notes")}</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={saveMut.isPending || !form.agencyId || form.amount <= 0}
                    onClick={() => saveMut.mutate()}
                    className="bg-forest text-cream hover:bg-forest-deep"
                  >
                    {l("تسجيل", "Record")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder={l("رقم الدفعة / العملية…", "Payment or reference…")}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.agencyId}
            onChange={(e) => setFilters({ ...filters, agencyId: e.target.value, page: 1 })}
          >
            <option value="">{l("كل الوكالات", "All agencies")}</option>
            {(agencies ?? []).map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.agency_name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as any, page: 1 })}
          >
            <option value="all">{l("كل الأنواع", "All types")}</option>
            <option value="internal">{l("داخلية", "Internal")}</option>
            <option value="external">{l("خارجية", "External")}</option>
          </select>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })}
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })}
          />
        </div>

        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {l("لا توجد دفعات مطابقة.", "No payments match these filters.")}
          </p>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{l("رقم الدفعة", "Payment")}</th>
                  <th className="px-3 py-2 text-start">{l("الوكالة", "Agency")}</th>
                  <th className="px-3 py-2 text-start">{l("المبلغ", "Amount")}</th>
                  <th className="px-3 py-2 text-start">{l("التاريخ", "Date")}</th>
                  <th className="px-3 py-2 text-start">{l("الطريقة", "Method")}</th>
                  <th className="px-3 py-2 text-start">{l("رقم العملية", "Reference")}</th>
                  <th className="px-3 py-2 text-start">{l("الحالة", "Status")}</th>
                  <th className="px-3 py-2 text-end">{l("إجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-3 py-3 font-mono text-xs">{p.payment_number}</td>
                    <td className="px-3 py-3">{p.agency_name ?? "—"}</td>
                    <td className="px-3 py-3 font-semibold">
                      {fmt(Number(p.amount), p.currency_code)}
                      <span className="ms-1 text-xs text-muted-foreground">
                        ({fmt(Number(p.amount_usd), "USD")})
                      </span>
                    </td>
                    <td className="px-3 py-3">{p.payment_date}</td>
                    <td className="px-3 py-3">{p.payment_method}</td>
                    <td className="px-3 py-3">{p.transaction_reference || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge
                        className={
                          p.status === "reversed"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-mint text-forest-deep"
                        }
                      >
                        {p.status === "reversed" ? l("ملغاة", "Reversed") : l("مسجلة", "Recorded")}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void receiptFn({ data: { paymentId: p.id } })
                              .then(setReceipt)
                              .catch((e: any) => toast.error(e.message))
                          }
                        >
                          {l("سند القبض", "Receipt")}
                        </Button>
                        {p.status === "recorded" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => {
                              const reason = window.prompt(l("سبب الإلغاء", "Reversal reason") ?? "");
                              if (!reason || reason.trim().length < 3) return;
                              void reverse({ data: { paymentId: p.id, reason } })
                                .then(() => {
                                  toast.success(l("تم الإلغاء", "Reversed"));
                                  refresh();
                                })
                                .catch((e: any) => toast.error(e.message));
                            }}
                          >
                            {l("إلغاء", "Reverse")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        {(data?.total ?? 0) > 25 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button
              size="sm"
              variant="outline"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              {l("السابق", "Previous")}
            </Button>
            <span className="text-muted-foreground">
              {filters.page} / {Math.ceil((data?.total ?? 0) / 25)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={filters.page >= Math.ceil((data?.total ?? 0) / 25)}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              {l("التالي", "Next")}
            </Button>
          </div>
        ) : null}
      </Section>

      <Dialog open={Boolean(receipt)} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="print:shadow-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{l("سند قبض", "Payment receipt")}</DialogTitle>
          </DialogHeader>
          {receipt ? (
            <div className="space-y-2 text-sm">
              <p className="font-mono">{receipt.payment.receipt_number}</p>
              <p>
                <strong>{l("الوكالة", "Agency")}:</strong> {receipt.payment.agency_name}
              </p>
              <p>
                <strong>{l("المبلغ", "Amount")}:</strong>{" "}
                {fmt(Number(receipt.payment.amount), receipt.payment.currency_code)}
              </p>
              <p>
                <strong>{l("التاريخ", "Date")}:</strong> {receipt.payment.payment_date}
              </p>
              <p>
                <strong>{l("الرصيد قبل", "Balance before")}:</strong> {fmt(receipt.balanceBefore, "USD")}
              </p>
              <p>
                <strong>{l("الرصيد بعد", "Balance after")}:</strong> {fmt(receipt.balanceAfter, "USD")}
              </p>
              <p className="text-xs text-muted-foreground">
                {l("سجّلها", "Recorded by")}: {receipt.recordedByName ?? "—"}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => window.print()}>{l("طباعة", "Print")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
