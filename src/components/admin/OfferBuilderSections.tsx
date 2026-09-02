import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/* Draft shapes — every numeric value is kept as a string while typing */
/* ------------------------------------------------------------------ */

export type RoomDraft = {
  key: string;
  name_ar: string;
  name_en: string;
  occupancy: string;
  price: string;
  currency_code: string;
  available_rooms: string;
  description_ar: string;
  description_en: string;
  is_active: boolean;
};

export type HotelDraft = {
  key: string;
  city_ar: string;
  city_en: string;
  name_ar: string;
  name_en: string;
  stars: string;
  distance_haram_m: string;
  distance_mosque_m: string;
  room_type: string;
  description_ar: string;
  description_en: string;
  check_in: string;
  check_out: string;
};

export type ServiceDraft = {
  key: string;
  icon: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  is_included: boolean;
  is_optional: boolean;
  extra_price_usd: string;
};

export type FaqDraft = {
  key: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
};

export type DepartureDraft = {
  key: string;
  departure_date: string;
  return_date: string;
  seats_total: string;
  seats_taken: string;
  is_blocked: boolean;
  note: string;
};

export const newKey = () => Math.random().toString(36).slice(2, 10);

export const emptyRoom = (): RoomDraft => ({
  key: newKey(),
  name_ar: "",
  name_en: "",
  occupancy: "2",
  price: "",
  currency_code: "USD",
  available_rooms: "0",
  description_ar: "",
  description_en: "",
  is_active: true,
});

export const emptyHotel = (): HotelDraft => ({
  key: newKey(),
  city_ar: "",
  city_en: "",
  name_ar: "",
  name_en: "",
  stars: "5",
  distance_haram_m: "",
  distance_mosque_m: "",
  room_type: "",
  description_ar: "",
  description_en: "",
  check_in: "",
  check_out: "",
});

export const emptyService = (included: boolean): ServiceDraft => ({
  key: newKey(),
  icon: "",
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  is_included: included,
  is_optional: false,
  extra_price_usd: "0",
});

export const emptyFaq = (): FaqDraft => ({
  key: newKey(),
  question_ar: "",
  question_en: "",
  answer_ar: "",
  answer_en: "",
});

export const emptyDeparture = (): DepartureDraft => ({
  key: newKey(),
  departure_date: "",
  return_date: "",
  seats_total: "0",
  seats_taken: "0",
  is_blocked: false,
  note: "",
});

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  hint,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  hint?: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        {onAdd ? (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="size-4" /> {addLabel}
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RowShell({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <li className="space-y-3 rounded-xl border border-border/60 p-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {children}
    </li>
  );
}

type ListProps<T> = {
  items: T[];
  onChange: (next: T[]) => void;
  ar: boolean;
};

function patcher<T extends { key: string }>(items: T[], onChange: (n: T[]) => void) {
  return (key: string, patch: Partial<T>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

export function RoomsList({ items, onChange, ar }: ListProps<RoomDraft>) {
  const patch = patcher(items, onChange);
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {ar ? "لا توجد أنواع غرف بعد." : "No room types yet."}
      </p>
    );
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <RowShell key={r.key} onRemove={() => onChange(items.filter((i) => i.key !== r.key))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "الاسم (عربي)" : "Name (Arabic)"}>
              <Input value={r.name_ar} onChange={(e) => patch(r.key, { name_ar: e.target.value })} />
            </Field>
            <Field label={ar ? "الاسم (إنجليزي)" : "Name (English)"}>
              <Input value={r.name_en} onChange={(e) => patch(r.key, { name_en: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={ar ? "عدد الأشخاص" : "Occupancy"}>
              <Input
                type="number"
                min="1"
                value={r.occupancy}
                onChange={(e) => patch(r.key, { occupancy: e.target.value })}
              />
            </Field>
            <Field label={ar ? "السعر" : "Price"}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={r.price}
                onChange={(e) => patch(r.key, { price: e.target.value })}
              />
            </Field>
            <Field label={ar ? "العملة" : "Currency"}>
              <Input
                value={r.currency_code}
                onChange={(e) => patch(r.key, { currency_code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label={ar ? "الغرف المتاحة" : "Available rooms"}>
              <Input
                type="number"
                min="0"
                value={r.available_rooms}
                onChange={(e) => patch(r.key, { available_rooms: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "الوصف (عربي)" : "Description (Arabic)"}>
              <Textarea
                rows={2}
                value={r.description_ar}
                onChange={(e) => patch(r.key, { description_ar: e.target.value })}
              />
            </Field>
            <Field label={ar ? "الوصف (إنجليزي)" : "Description (English)"}>
              <Textarea
                rows={2}
                value={r.description_en}
                onChange={(e) => patch(r.key, { description_en: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={r.is_active}
              onCheckedChange={(v) => patch(r.key, { is_active: v })}
            />
            <span className="text-xs text-muted-foreground">{ar ? "متاح" : "Active"}</span>
          </div>
        </RowShell>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Hotels                                                              */
/* ------------------------------------------------------------------ */

export function HotelsList({ items, onChange, ar }: ListProps<HotelDraft>) {
  const patch = patcher(items, onChange);
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {ar ? "لا توجد فنادق مضافة." : "No hotels added."}
      </p>
    );
  return (
    <ul className="space-y-3">
      {items.map((h) => (
        <RowShell key={h.key} onRemove={() => onChange(items.filter((i) => i.key !== h.key))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "المدينة (عربي)" : "City (Arabic)"}>
              <Input value={h.city_ar} onChange={(e) => patch(h.key, { city_ar: e.target.value })} />
            </Field>
            <Field label={ar ? "المدينة (إنجليزي)" : "City (English)"}>
              <Input value={h.city_en} onChange={(e) => patch(h.key, { city_en: e.target.value })} />
            </Field>
            <Field label={ar ? "اسم الفندق (عربي)" : "Hotel name (Arabic)"}>
              <Input value={h.name_ar} onChange={(e) => patch(h.key, { name_ar: e.target.value })} />
            </Field>
            <Field label={ar ? "اسم الفندق (إنجليزي)" : "Hotel name (English)"}>
              <Input value={h.name_en} onChange={(e) => patch(h.key, { name_en: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={ar ? "التصنيف (نجوم)" : "Stars"}>
              <Input
                type="number"
                min="1"
                max="7"
                value={h.stars}
                onChange={(e) => patch(h.key, { stars: e.target.value })}
              />
            </Field>
            <Field label={ar ? "المسافة للحرم (متر)" : "Distance to Haram (m)"}>
              <Input
                type="number"
                min="0"
                value={h.distance_haram_m}
                onChange={(e) => patch(h.key, { distance_haram_m: e.target.value })}
              />
            </Field>
            <Field label={ar ? "المسافة للمسجد النبوي (متر)" : "Distance to Prophet's Mosque (m)"}>
              <Input
                type="number"
                min="0"
                value={h.distance_mosque_m}
                onChange={(e) => patch(h.key, { distance_mosque_m: e.target.value })}
              />
            </Field>
            <Field label={ar ? "نوع الغرفة" : "Room type"}>
              <Input
                value={h.room_type}
                onChange={(e) => patch(h.key, { room_type: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "تسجيل الدخول" : "Check-in"}>
              <Input value={h.check_in} onChange={(e) => patch(h.key, { check_in: e.target.value })} />
            </Field>
            <Field label={ar ? "تسجيل الخروج" : "Check-out"}>
              <Input
                value={h.check_out}
                onChange={(e) => patch(h.key, { check_out: e.target.value })}
              />
            </Field>
            <Field label={ar ? "الوصف (عربي)" : "Description (Arabic)"}>
              <Textarea
                rows={2}
                value={h.description_ar}
                onChange={(e) => patch(h.key, { description_ar: e.target.value })}
              />
            </Field>
            <Field label={ar ? "الوصف (إنجليزي)" : "Description (English)"}>
              <Textarea
                rows={2}
                value={h.description_en}
                onChange={(e) => patch(h.key, { description_en: e.target.value })}
              />
            </Field>
          </div>
        </RowShell>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Services (included / excluded)                                      */
/* ------------------------------------------------------------------ */

export function ServicesList({ items, onChange, ar }: ListProps<ServiceDraft>) {
  const patch = patcher(items, onChange);
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {ar ? "لم تُضف خدمات بعد." : "No services added yet."}
      </p>
    );
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <RowShell key={s.key} onRemove={() => onChange(items.filter((i) => i.key !== s.key))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "الخدمة (عربي)" : "Service (Arabic)"}>
              <Input value={s.name_ar} onChange={(e) => patch(s.key, { name_ar: e.target.value })} />
            </Field>
            <Field label={ar ? "الخدمة (إنجليزي)" : "Service (English)"}>
              <Input value={s.name_en} onChange={(e) => patch(s.key, { name_en: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={ar ? "الأيقونة" : "Icon"}>
              <Input
                placeholder="plane, hotel, bus…"
                value={s.icon}
                onChange={(e) => patch(s.key, { icon: e.target.value })}
              />
            </Field>
            <Field label={ar ? "سعر إضافي (دولار)" : "Extra price (USD)"}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={s.extra_price_usd}
                onChange={(e) => patch(s.key, { extra_price_usd: e.target.value })}
              />
            </Field>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2">
                <Switch
                  checked={s.is_included}
                  onCheckedChange={(v) => patch(s.key, { is_included: v })}
                />
                <span className="text-xs text-muted-foreground">
                  {s.is_included ? (ar ? "مشمول" : "Included") : ar ? "غير مشمول" : "Not included"}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={s.is_optional}
                  onCheckedChange={(v) => patch(s.key, { is_optional: v })}
                />
                <span className="text-xs text-muted-foreground">{ar ? "اختياري" : "Optional"}</span>
              </label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "التفاصيل (عربي)" : "Details (Arabic)"}>
              <Input
                value={s.description_ar}
                onChange={(e) => patch(s.key, { description_ar: e.target.value })}
              />
            </Field>
            <Field label={ar ? "التفاصيل (إنجليزي)" : "Details (English)"}>
              <Input
                value={s.description_en}
                onChange={(e) => patch(s.key, { description_en: e.target.value })}
              />
            </Field>
          </div>
        </RowShell>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* FAQs                                                                */
/* ------------------------------------------------------------------ */

export function FaqsList({ items, onChange, ar }: ListProps<FaqDraft>) {
  const patch = patcher(items, onChange);
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {ar ? "لا توجد أسئلة شائعة." : "No FAQs yet."}
      </p>
    );
  return (
    <ul className="space-y-3">
      {items.map((f) => (
        <RowShell key={f.key} onRemove={() => onChange(items.filter((i) => i.key !== f.key))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "السؤال (عربي)" : "Question (Arabic)"}>
              <Input
                value={f.question_ar}
                onChange={(e) => patch(f.key, { question_ar: e.target.value })}
              />
            </Field>
            <Field label={ar ? "السؤال (إنجليزي)" : "Question (English)"}>
              <Input
                value={f.question_en}
                onChange={(e) => patch(f.key, { question_en: e.target.value })}
              />
            </Field>
            <Field label={ar ? "الجواب (عربي)" : "Answer (Arabic)"}>
              <Textarea
                rows={2}
                value={f.answer_ar}
                onChange={(e) => patch(f.key, { answer_ar: e.target.value })}
              />
            </Field>
            <Field label={ar ? "الجواب (إنجليزي)" : "Answer (English)"}>
              <Textarea
                rows={2}
                value={f.answer_en}
                onChange={(e) => patch(f.key, { answer_en: e.target.value })}
              />
            </Field>
          </div>
        </RowShell>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Departures                                                          */
/* ------------------------------------------------------------------ */

export function DeparturesList({ items, onChange, ar }: ListProps<DepartureDraft>) {
  const patch = patcher(items, onChange);
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {ar ? "لا توجد تواريخ مغادرة محددة." : "No departure dates defined."}
      </p>
    );
  return (
    <ul className="space-y-3">
      {items.map((d) => (
        <RowShell key={d.key} onRemove={() => onChange(items.filter((i) => i.key !== d.key))}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label={ar ? "تاريخ المغادرة" : "Departure date"}>
              <Input
                type="date"
                value={d.departure_date}
                onChange={(e) => patch(d.key, { departure_date: e.target.value })}
              />
            </Field>
            <Field label={ar ? "تاريخ العودة" : "Return date"}>
              <Input
                type="date"
                value={d.return_date}
                onChange={(e) => patch(d.key, { return_date: e.target.value })}
              />
            </Field>
            <Field label={ar ? "المقاعد" : "Seats"}>
              <Input
                type="number"
                min="0"
                value={d.seats_total}
                onChange={(e) => patch(d.key, { seats_total: e.target.value })}
              />
            </Field>
            <Field label={ar ? "المحجوز" : "Seats taken"}>
              <Input
                type="number"
                min="0"
                value={d.seats_taken}
                onChange={(e) => patch(d.key, { seats_taken: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <Switch
                checked={d.is_blocked}
                onCheckedChange={(v) => patch(d.key, { is_blocked: v })}
              />
              <span className="text-xs text-muted-foreground">{ar ? "مغلق" : "Blocked"}</span>
            </label>
            <Input
              className="max-w-sm"
              placeholder={ar ? "ملاحظة" : "Note"}
              value={d.note}
              onChange={(e) => patch(d.key, { note: e.target.value })}
            />
          </div>
        </RowShell>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Small selects reused by the builder                                 */
/* ------------------------------------------------------------------ */

export const OFFER_TYPES = [
  { value: "umrah_package", ar: "باقة عمرة", en: "Umrah package" },
  { value: "visa_only", ar: "تأشيرة فقط", en: "Visa only" },
  { value: "custom_package", ar: "باقة مخصصة", en: "Custom package" },
  { value: "tourism_package", ar: "باقة سياحية", en: "Tourism package" },
  { value: "flight_only", ar: "طيران فقط", en: "Flight only" },
  { value: "hotel_only", ar: "فندق فقط", en: "Hotel only" },
  { value: "transport", ar: "نقل", en: "Transport" },
  { value: "security_approval", ar: "موافقة أمنية", en: "Security approval" },
] as const;

export const PRICE_MODES = [
  { value: "starting_from", ar: "يبدأ من", en: "Starting from" },
  { value: "fixed", ar: "سعر ثابت", en: "Fixed price" },
  { value: "per_person", ar: "للفرد", en: "Per person" },
  { value: "per_room", ar: "للغرفة", en: "Per room" },
  { value: "contact_us", ar: "اتصل بنا", en: "Contact us" },
] as const;

export function BilingualSelect({
  value,
  onChange,
  options,
  ar,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; ar: string; en: string }[];
  ar: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {ar ? o.ar : o.en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
