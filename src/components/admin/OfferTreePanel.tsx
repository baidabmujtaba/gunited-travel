import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  createChildOffer,
  deleteOfferBranch,
  listOfferCurrencies,
  listOfferTree,
  updateOfferNode,
  type OfferTreeNode,
} from "@/lib/offers.functions";

type Currency = { code: string; name_ar: string; name_en: string; rate: number };

function buildIndex(nodes: OfferTreeNode[]) {
  const byParent = new Map<string, OfferTreeNode[]>();
  for (const n of nodes) {
    const key = n.parent_offer_id ?? "__root__";
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  return byParent;
}

/**
 * Mother -> children -> grandchildren tree with inline create/edit/delete.
 * `rootId` limits the tree to one package's subtree (used inside the offer builder).
 */
export function OfferTreePanel({
  rootId = null,
  compact = false,
}: {
  rootId?: string | null;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  const tree = useQuery({ queryKey: ["offer-tree"], queryFn: () => listOfferTree() });
  const currencies = useQuery({
    queryKey: ["offer-currencies"],
    queryFn: () => listOfferCurrencies(),
  });
  const currencyList = (currencies.data ?? []) as Currency[];

  const byParent = useMemo(() => buildIndex(tree.data ?? []), [tree.data]);
  const roots = useMemo(() => {
    if (!tree.data) return [];
    if (rootId) return tree.data.filter((n) => n.id === rootId);
    return byParent.get("__root__") ?? [];
  }, [tree.data, byParent, rootId]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["offer-tree"] });
    void qc.invalidateQueries({ queryKey: ["admin-offers"] });
    void qc.invalidateQueries({ queryKey: ["catalog"] });
    void qc.invalidateQueries({ queryKey: ["packages"] });
  };

  if (tree.isPending) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tree.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {roots.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              byParent={byParent}
              currencies={currencyList}
              onChanged={invalidate}
              lang={lang}
              t={t}
              compact={compact}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  byParent,
  currencies,
  onChanged,
  lang,
  t,
  compact,
}: {
  node: OfferTreeNode;
  depth: number;
  byParent: Map<string, OfferTreeNode[]>;
  currencies: Currency[];
  onChanged: () => void;
  lang: string;
  t: (k: string) => string;
  compact: boolean;
}) {
  const children = byParent.get(node.id) ?? [];
  const [open, setOpen] = useState(depth < 1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  const [titleAr, setTitleAr] = useState(node.title_ar);
  const [titleEn, setTitleEn] = useState(node.title_en);
  const [price, setPrice] = useState(String(node.input_price ?? node.customer_price_usd ?? ""));
  const [currency, setCurrency] = useState(node.input_currency || "USD");

  const [descAr, setDescAr] = useState(node.description_ar ?? "");
  const [descEn, setDescEn] = useState(node.description_en ?? "");
  const [roomType, setRoomType] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelCity, setHotelCity] = useState("");

  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCurrency, setNewCurrency] = useState(node.input_currency || "USD");
  const [newDescAr, setNewDescAr] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
  const [newRoomType, setNewRoomType] = useState("");
  const [newHotelName, setNewHotelName] = useState("");
  const [newHotelCity, setNewHotelCity] = useState("");

  const save = useMutation({
    mutationFn: () =>
      updateOfferNode({
        data: {
          id: node.id,
          title_ar: titleAr,
          title_en: titleEn,
          price: price.trim() === "" ? null : Number(price) || 0,
          currency,
          description_ar: descAr,
          description_en: descEn,
          room_type: roomType,
          hotel_name: hotelName,
          hotel_city: hotelCity,
        },
      }),
    onSuccess: () => {
      toast.success(t("tree.saved"));
      setEditing(false);
      onChanged();
    },
    onError: (e: Error) => toast.error(t("common.error"), { description: e.message }),
  });

  const create = useMutation({
    mutationFn: () =>
      createChildOffer({
        data: {
          parent_offer_id: node.id,
          title_ar: newAr,
          title_en: newEn || newAr,
          price: newPrice.trim() === "" ? null : Number(newPrice) || 0,
          currency: newCurrency,
          agency_price: null,
          status: "active",
          description_ar: newDescAr,
          description_en: newDescEn,
          room_type: newRoomType,
          hotel_name: newHotelName,
          hotel_city: newHotelCity,
        },
      }),
    onSuccess: () => {
      toast.success(t("tree.added"));
      setNewAr("");
      setNewEn("");
      setNewPrice("");
      setNewDescAr("");
      setNewDescEn("");
      setNewRoomType("");
      setNewHotelName("");
      setNewHotelCity("");
      setAdding(false);
      setOpen(true);
      onChanged();
    },
    onError: (e: Error) => toast.error(t("common.error"), { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: () => deleteOfferBranch({ data: { id: node.id } }),
    onSuccess: () => {
      toast.success(t("tree.deleted"));
      onChanged();
    },
    onError: (e: Error) => toast.error(t("common.error"), { description: e.message }),
  });

  const levelLabel =
    depth === 0 ? t("tree.level.mother") : depth === 1 ? t("tree.level.child") : t("tree.level.grandchild");

  return (
    <li className="rounded-xl border border-border/60 bg-card/60">
      <div className="flex flex-wrap items-center gap-2 p-3" style={{ paddingInlineStart: 12 + depth * 16 }}>
        <button
          type="button"
          aria-label="toggle"
          className="text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {children.length ? (
            open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
          ) : (
            <span className="inline-block size-4" />
          )}
        </button>

        <div className="min-w-[12rem] flex-1">
          <p className="font-semibold text-forest-deep">
            {lang === "ar" ? node.title_ar : node.title_en}
          </p>
          <p className="text-xs text-muted-foreground">
            {levelLabel} ·{" "}
            {Number(node.customer_price_usd ?? 0) > 0
              ? `${node.input_currency} ${Number(node.input_price ?? node.customer_price_usd ?? 0)} · $${Number(node.customer_price_usd ?? 0).toFixed(2)}`
              : t("tree.noPrice")}
            {children.length ? ` · ${children.length} ${t("tree.children")}` : ""}
          </p>
        </div>

        <Badge className={node.status === "active" ? "bg-forest text-cream" : "bg-secondary"}>
          {t(`admin.offers.status.${node.status}`)}
        </Badge>

        {node.slug ? (
          <a
            href={`/offers/${node.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-forest underline"
          >
            <ExternalLink className="size-3.5" /> {t("tree.open")}
          </a>
        ) : null}

        <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-4" /> {t("tree.addChild")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
          {t("tree.edit")}
        </Button>
        {!compact ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(t("tree.confirmDelete"))) remove.mutate();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div
          className="grid gap-3 border-t border-border/60 p-3 sm:grid-cols-4"
          style={{ paddingInlineStart: 12 + depth * 16 }}
        >
          <Field label={t("tree.nameAr")}>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" />
          </Field>
          <Field label={t("tree.nameEn")}>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
          </Field>
          <Field label={`${t("tree.price")} (${t("tree.optional")})`}>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("tree.noPrice")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label={t("tree.currency")}>
            <CurrencyPicker
              currencies={currencies}
              value={currency}
              onChange={setCurrency}
              lang={lang}
            />
          </Field>
          <Field label={`${t("tree.roomType")} (${t("tree.optional")})`}>
            <Input value={roomType} onChange={(e) => setRoomType(e.target.value)} />
          </Field>
          <Field label={`${t("tree.hotel")} (${t("tree.optional")})`}>
            <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} />
          </Field>
          <Field label={`${t("tree.hotelCity")} (${t("tree.optional")})`}>
            <Input value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} />
          </Field>
          <Field label={`${t("tree.detailsAr")} (${t("tree.optional")})`}>
            <Textarea rows={2} dir="rtl" value={descAr} onChange={(e) => setDescAr(e.target.value)} />
          </Field>
          <Field label={`${t("tree.detailsEn")} (${t("tree.optional")})`}>
            <Textarea rows={2} dir="ltr" value={descEn} onChange={(e) => setDescEn(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Button
              className="bg-forest text-white hover:bg-forest-deep"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="size-4" /> {t("tree.save")}
            </Button>
          </div>
        </div>
      ) : null}

      {adding ? (
        <div
          className="grid gap-3 border-t border-border/60 bg-secondary/30 p-3 sm:grid-cols-4"
          style={{ paddingInlineStart: 12 + depth * 16 }}
        >
          <Field label={t("tree.nameAr")}>
            <Input value={newAr} onChange={(e) => setNewAr(e.target.value)} dir="rtl" />
          </Field>
          <Field label={t("tree.nameEn")}>
            <Input value={newEn} onChange={(e) => setNewEn(e.target.value)} dir="ltr" />
          </Field>
          <Field label={`${t("tree.price")} (${t("tree.optional")})`}>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("tree.noPrice")}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </Field>
          <Field label={t("tree.currency")}>
            <CurrencyPicker
              currencies={currencies}
              value={newCurrency}
              onChange={setNewCurrency}
              lang={lang}
            />
          </Field>
          <Field label={`${t("tree.roomType")} (${t("tree.optional")})`}>
            <Input value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)} />
          </Field>
          <Field label={`${t("tree.hotel")} (${t("tree.optional")})`}>
            <Input value={newHotelName} onChange={(e) => setNewHotelName(e.target.value)} />
          </Field>
          <Field label={`${t("tree.hotelCity")} (${t("tree.optional")})`}>
            <Input value={newHotelCity} onChange={(e) => setNewHotelCity(e.target.value)} />
          </Field>
          <Field label={`${t("tree.detailsAr")} (${t("tree.optional")})`}>
            <Textarea rows={2} dir="rtl" value={newDescAr} onChange={(e) => setNewDescAr(e.target.value)} />
          </Field>
          <Field label={`${t("tree.detailsEn")} (${t("tree.optional")})`}>
            <Textarea rows={2} dir="ltr" value={newDescEn} onChange={(e) => setNewDescEn(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Button
              className="bg-forest text-white hover:bg-forest-deep"
              disabled={create.isPending || !newAr.trim()}
              onClick={() => create.mutate()}
            >
              <Plus className="size-4" /> {t("tree.create")}
            </Button>
          </div>
        </div>
      ) : null}

      {open && children.length ? (
        <ul className="space-y-2 border-t border-border/60 p-2">
          {children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              byParent={byParent}
              currencies={currencies}
              onChanged={onChanged}
              lang={lang}
              t={t}
              compact={compact}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CurrencyPicker({
  currencies,
  value,
  onChange,
  lang,
}: {
  currencies: Currency[];
  value: string;
  onChange: (v: string) => void;
  lang: string;
}) {
  const list = currencies.length ? currencies : [{ code: "USD", name_ar: "دولار", name_en: "US Dollar", rate: 1 }];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {list.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code} — {lang === "ar" ? c.name_ar : c.name_en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
