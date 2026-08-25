import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import {
  deletePaymentMethod,
  listPaymentMethodsAdmin,
  savePaymentMethod,
} from "@/lib/finance.functions";

type Method = {
  id?: string;
  name_ar: string;
  name_en: string;
  account_holder?: string | null;
  account_number?: string | null;
  iban?: string | null;
  branch?: string | null;
  instructions_ar?: string | null;
  instructions_en?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
};

const blank: Method = {
  name_ar: "",
  name_en: "",
  account_holder: "",
  account_number: "",
  iban: "",
  branch: "",
  instructions_ar: "",
  instructions_en: "",
  sort_order: 0,
  is_active: true,
};

export function PaymentMethodsPanel() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Method>(blank);

  const list = useQuery({
    queryKey: ["admin-methods"],
    queryFn: () => listPaymentMethodsAdmin(),
  });

  const save = useMutation({
    mutationFn: (payload: Method) =>
      savePaymentMethod({
        data: {
          ...payload,
          account_holder: payload.account_holder ?? "",
          account_number: payload.account_number ?? "",
          iban: payload.iban ?? "",
          branch: payload.branch ?? "",
          instructions_ar: payload.instructions_ar ?? "",
          instructions_en: payload.instructions_en ?? "",
          sort_order: Number(payload.sort_order ?? 0),
          is_active: payload.is_active !== false,
        },
      }),
    onSuccess: () => {
      toast.success(t("admin.fin.method.saved"));
      setOpen(false);
      setDraft(blank);
      void qc.invalidateQueries({ queryKey: ["admin-methods"] });
      void qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePaymentMethod({ data: { id } }),
    onSuccess: () => {
      toast.success(t("admin.fin.method.deleted"));
      void qc.invalidateQueries({ queryKey: ["admin-methods"] });
      void qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const field = (key: keyof Method, label: string, textarea = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(key)}>{label}</Label>
      {textarea ? (
        <Textarea
          id={String(key)}
          value={String(draft[key] ?? "")}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          rows={2}
        />
      ) : (
        <Input
          id={String(key)}
          value={String(draft[key] ?? "")}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      )}
    </div>
  );

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("admin.fin.methods")}</h2>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setDraft(blank);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-forest text-white hover:bg-forest-deep">
              {t("admin.fin.method.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {draft.id ? t("admin.fin.method.edit") : t("admin.fin.method.new")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {field("name_ar", t("admin.fin.method.name_ar"))}
              {field("name_en", t("admin.fin.method.name_en"))}
              {field("account_holder", t("admin.fin.method.holder"))}
              {field("account_number", t("admin.fin.method.account"))}
              {field("iban", t("admin.fin.method.iban"))}
              {field("branch", t("admin.fin.method.branch"))}
              {field("instructions_ar", t("admin.fin.method.instr_ar"), true)}
              {field("instructions_en", t("admin.fin.method.instr_en"), true)}
              <div className="space-y-1.5">
                <Label htmlFor="sort_order">{t("admin.fin.method.order")}</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={String(draft.sort_order ?? 0)}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <Label htmlFor="is_active">{t("admin.fin.method.active")}</Label>
                <Switch
                  id="is_active"
                  checked={draft.is_active !== false}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                className="bg-forest text-white hover:bg-forest-deep"
                disabled={save.isPending || draft.name_ar.length < 2 || draft.name_en.length < 2}
                onClick={() => save.mutate(draft)}
              >
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {list.isPending ? (
        <Skeleton className="mt-5 h-40 w-full" />
      ) : (list.data ?? []).length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("admin.fin.method.empty")}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {(list.data ?? []).map((m: any) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
            >
              <div>
                <p className="font-semibold text-forest-deep">
                  {lang === "ar" ? m.name_ar : m.name_en}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[m.account_holder, m.account_number, m.iban].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={m.is_active ? "bg-mint text-forest-deep" : "bg-beige text-muted-foreground"}>
                  {m.is_active ? t("admin.fin.method.active") : t("admin.fin.email.pending")}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft({ ...m });
                    setOpen(true);
                  }}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm(t("admin.fin.method.confirm"))) remove.mutate(m.id);
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
