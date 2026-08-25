import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { normalizeCurrency } from "./currency";

export type Lang = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

/** Centralized copy. Never hardcode user-facing strings in components. */
export const messages: Dict = {
  "brand.name": { ar: "جيونايتد ترافيل", en: "Gunited Travel" },
  "brand.tagline": { ar: "سفر وسياحة بثقة", en: "Travel & tourism, done right" },

  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.offers": { ar: "العروض والخدمات", en: "Offers & Services" },
  "nav.track": { ar: "تتبع طلبي", en: "Track My Order" },
  "nav.dashboard": { ar: "حسابي", en: "My Account" },
  "nav.admin": { ar: "لوحة الإدارة", en: "Admin Panel" },
  "nav.login": { ar: "تسجيل الدخول", en: "Sign in" },
  "nav.logout": { ar: "تسجيل الخروج", en: "Sign out" },

  "hero.title": { ar: "رحلتك تبدأ من هنا", en: "Your journey starts here" },
  "hero.subtitle": {
    ar: "تأشيرات، تذاكر طيران، باقات سياحية وتأمين سفر — بإدارة فريق جيونايتد ترافيل ومتابعة لحظية لطلبك.",
    en: "Visas, flight deals, tourism packages and travel insurance — managed by the Gunited Travel team with live tracking on every order.",
  },
  "hero.cta.browse": { ar: "تصفح العروض", en: "Browse offers" },
  "hero.cta.track": { ar: "تتبع طلبي", en: "Track my order" },

  "catalog.title": { ar: "العروض والخدمات", en: "Offers & Services" },
  "catalog.subtitle": {
    ar: "أسعار محدثة لحظياً بالعملة التي تختارها.",
    en: "Prices convert live into the currency you choose.",
  },
  "catalog.search": { ar: "ابحث عن عرض أو خدمة…", en: "Search offers and services…" },
  "catalog.empty": { ar: "لا توجد عروض مطابقة حالياً.", en: "No matching offers right now." },
  "catalog.all": { ar: "كل الفئات", en: "All categories" },
  "catalog.view": { ar: "عرض التفاصيل", en: "View details" },
  "catalog.currency": { ar: "العملة", en: "Currency" },

  "category.package": { ar: "باقات سياحية", en: "Packages" },
  "category.visa": { ar: "خدمات التأشيرات", en: "Visa services" },
  "category.flight": { ar: "عروض الطيران", en: "Flight deals" },
  "category.tour": { ar: "رحلات", en: "Tours" },
  "category.insurance": { ar: "تأمين السفر", en: "Insurance" },
  "category.other": { ar: "أخرى", en: "Other" },

  "offer.duration": { ar: "المدة", en: "Duration" },
  "offer.includes": { ar: "يشمل", en: "Includes" },
  "offer.breakdown": { ar: "تفصيل السعر", en: "Price breakdown" },
  "offer.base": { ar: "السعر الأساسي", en: "Base price" },
  "offer.tax": { ar: "الضريبة", en: "Tax" },
  "offer.fees": { ar: "رسوم الخدمة", en: "Service fees" },
  "offer.discount": { ar: "الخصم", en: "Discount" },
  "offer.total": { ar: "الإجمالي", en: "Total" },
  "offer.cta": { ar: "اطلب وادفع الآن", en: "Request & Pay Now" },
  "offer.notfound": { ar: "العرض غير متوفر", en: "Offer unavailable" },
  "offer.expires": { ar: "ينتهي في", en: "Expires" },
  "offer.rate.note": {
    ar: "الأسعار محسوبة من الدولار الأمريكي بسعر الصرف الحالي.",
    en: "Prices are derived from USD at the current exchange rate.",
  },

  "checkout.title": { ar: "إتمام الطلب", en: "Checkout" },
  "checkout.summary": { ar: "ملخص الطلب", en: "Order summary" },
  "checkout.method": { ar: "طريقة الدفع", en: "Payment method" },
  "checkout.holder": { ar: "اسم صاحب الحساب", en: "Account holder" },
  "checkout.account": { ar: "رقم الحساب", en: "Account number" },
  "checkout.iban": { ar: "الآيبان", en: "IBAN" },
  "checkout.branch": { ar: "الفرع", en: "Branch" },
  "checkout.yourdetails": { ar: "بياناتك", en: "Your details" },
  "checkout.name": { ar: "الاسم الكامل", en: "Full name" },
  "checkout.email": { ar: "البريد الإلكتروني", en: "Email address" },
  "checkout.whatsapp": { ar: "رقم واتساب (مع رمز الدولة)", en: "WhatsApp number (with country code)" },
  "checkout.reference": { ar: "رقم مرجع التحويل", en: "Transaction reference number" },
  "checkout.receipt": { ar: "إيصال الدفع (PNG / JPG / PDF)", en: "Payment receipt (PNG / JPG / PDF)" },
  "checkout.submit": { ar: "إرسال الطلب", en: "Submit order" },
  "checkout.submitting": { ar: "جارٍ الإرسال…", en: "Submitting…" },
  "checkout.note": {
    ar: "لن يتم تأكيد الطلب تلقائياً — يقوم فريقنا بمراجعة الإيصال ثم تأكيد الدفع.",
    en: "Orders are never auto-confirmed — our team reviews your receipt before confirming payment.",
  },
  "checkout.success": { ar: "تم استلام طلبك", en: "Order received" },
  "checkout.tracking": { ar: "رقم التتبع الخاص بك", en: "Your tracking ID" },
  "checkout.needlogin": {
    ar: "سجّل الدخول أو أنشئ حساباً لإتمام الطلب ومتابعته.",
    en: "Sign in or create an account to place and follow your order.",
  },
  "checkout.filetype": { ar: "يُسمح فقط بملفات PNG أو JPG أو PDF.", en: "Only PNG, JPG or PDF files are allowed." },
  "checkout.filesize": { ar: "حجم الملف يجب أن يكون أقل من 5 ميجابايت.", en: "File must be smaller than 5 MB." },
  "checkout.required": { ar: "يرجى إكمال جميع الحقول المطلوبة.", en: "Please complete all required fields." },

  "track.title": { ar: "تتبع طلبي", en: "Track My Order" },
  "track.subtitle": {
    ar: "أدخل رقم التتبع أو رقم الطلب أو رقم الحجز (PNR).",
    en: "Enter your Tracking ID, Order ID or PNR.",
  },
  "track.placeholder": { ar: "GT-ORD-2026-000123", en: "GT-ORD-2026-000123" },
  "track.search": { ar: "بحث", en: "Search" },
  "track.notfound": { ar: "لم نجد طلباً بهذا الرقم.", en: "No order found with that reference." },
  "track.invoice": { ar: "تنزيل الفاتورة", en: "Download invoice" },
  "track.history": { ar: "سجل الحالة", en: "Status history" },

  "status.submitted": { ar: "تم إرسال الطلب ورفع الإيصال", en: "Order submitted & receipt uploaded" },
  "status.payment_pending": { ar: "بانتظار التحقق من الدفع", en: "Payment verification pending" },
  "status.payment_confirmed": { ar: "تم تأكيد الدفع", en: "Payment confirmed" },
  "status.processing": { ar: "جارٍ تنفيذ الخدمة وإصدار المستندات", en: "Processing service / issuing documents" },
  "status.completed": { ar: "تم إكمال الطلب", en: "Order completed" },
  "status.cancelled": { ar: "ملغي", en: "Cancelled" },
  "status.rejected": { ar: "مرفوض", en: "Rejected" },

  "auth.title": { ar: "الدخول إلى جيونايتد ترافيل", en: "Sign in to Gunited Travel" },
  "auth.signin": { ar: "تسجيل الدخول", en: "Sign in" },
  "auth.signup": { ar: "إنشاء حساب", en: "Create account" },
  "auth.password": { ar: "كلمة المرور", en: "Password" },
  "auth.remember": { ar: "تذكرني", en: "Remember me" },
  "auth.forgot": { ar: "نسيت كلمة المرور؟", en: "Forgot password?" },
  "auth.reset.sent": {
    ar: "أرسلنا رابط إعادة التعيين إلى بريدك.",
    en: "We've emailed you a reset link.",
  },
  "auth.have": { ar: "لدي حساب بالفعل", en: "I already have an account" },
  "auth.new": { ar: "ليس لدي حساب", en: "I don't have an account" },
  "auth.google": { ar: "المتابعة بحساب Google", en: "Continue with Google" },
  "auth.mustchange": {
    ar: "هذا حساب إداري مبدئي — يرجى تغيير كلمة المرور الآن.",
    en: "This is an initial admin account — please change your password now.",
  },
  "auth.newpassword": { ar: "كلمة المرور الجديدة", en: "New password" },
  "auth.save": { ar: "حفظ", en: "Save" },

  "dash.title": { ar: "طلباتي", en: "My orders" },
  "dash.empty": { ar: "لا توجد طلبات بعد.", en: "No orders yet." },
  "dash.order": { ar: "الطلب", en: "Order" },
  "dash.date": { ar: "التاريخ", en: "Date" },
  "dash.amount": { ar: "المبلغ", en: "Amount" },
  "dash.status": { ar: "الحالة", en: "Status" },

  "common.loading": { ar: "جارٍ التحميل…", en: "Loading…" },
  "common.error": { ar: "حدث خطأ. حاول مرة أخرى.", en: "Something went wrong. Please try again." },
  "common.back": { ar: "رجوع", en: "Back" },
  "common.whatsapp": { ar: "تواصل معنا على واتساب", en: "Chat with us on WhatsApp" },
  "footer.rights": { ar: "جميع الحقوق محفوظة", en: "All rights reserved" },

  "admin.title": { ar: "مركز الإدارة", en: "ERP Hub" },
  "admin.subtitle": {
    ar: "إدارة المبيعات والعملاء والشركاء والمالية في مكان واحد.",
    en: "Run sales, customers, partners and finance from one place.",
  },
  "admin.tab.sales": { ar: "المبيعات والحجوزات", en: "Sales & Bookings" },
  "admin.tab.customers": { ar: "العملاء", en: "Customers" },
  "admin.tab.partners": { ar: "الشركاء", en: "Partners" },
  "admin.tab.finance": { ar: "المالية", en: "Finance" },
  "admin.forbidden": {
    ar: "هذه الصفحة مخصصة لفريق جيونايتد ترافيل فقط.",
    en: "This area is restricted to Gunited Travel staff.",
  },
  "admin.backstore": { ar: "العودة للمتجر", en: "Back to store" },

  "admin.kpi.orders": { ar: "إجمالي الطلبات", en: "Total orders" },
  "admin.kpi.review": { ar: "بانتظار المراجعة", en: "Awaiting review" },
  "admin.kpi.revenue": { ar: "الإيرادات المؤكدة", en: "Confirmed revenue" },
  "admin.kpi.pipeline": { ar: "قيد التحصيل", en: "In pipeline" },
  "admin.kpi.offers": { ar: "العروض النشطة", en: "Active offers" },
  "admin.kpi.customers": { ar: "العملاء", en: "Customers" },
  "admin.kpi.partners": { ar: "وكالات شريكة", en: "Partner agencies" },

  "admin.orders.title": { ar: "الطلبات والحجوزات", en: "Orders & bookings" },
  "admin.orders.search": { ar: "ابحث برقم التتبع أو الاسم…", en: "Search tracking ID or name…" },
  "admin.orders.filter": { ar: "تصفية بالحالة", en: "Filter by status" },
  "admin.orders.all": { ar: "كل الحالات", en: "All statuses" },
  "admin.orders.empty": { ar: "لا توجد طلبات مطابقة.", en: "No matching orders." },
  "admin.orders.customer": { ar: "العميل", en: "Customer" },
  "admin.orders.service": { ar: "الخدمة", en: "Service" },
  "admin.orders.reference": { ar: "مرجع التحويل", en: "Transfer reference" },
  "admin.orders.receipt": { ar: "عرض الإيصال", en: "View receipt" },
  "admin.orders.setstatus": { ar: "تغيير الحالة", en: "Change status" },
  "admin.orders.note": { ar: "ملاحظة للعميل (اختياري)", en: "Note for customer (optional)" },
  "admin.orders.internal": { ar: "ملاحظات داخلية", en: "Internal notes" },
  "admin.orders.save": { ar: "حفظ", en: "Save" },
  "admin.orders.saved": { ar: "تم الحفظ", en: "Saved" },
  "admin.orders.updated": { ar: "تم تحديث حالة الطلب", en: "Order status updated" },
  "admin.orders.manage": { ar: "إدارة", en: "Manage" },

  "admin.people.name": { ar: "الاسم", en: "Name" },
  "admin.people.search": { ar: "ابحث بالاسم أو البريد…", en: "Search by name or email…" },
  "admin.people.empty": { ar: "لا توجد سجلات بعد.", en: "No records yet." },
  "admin.people.orders": { ar: "الطلبات", en: "Orders" },
  "admin.people.spend": { ar: "إجمالي الإنفاق", en: "Lifetime value" },
  "admin.people.contact": { ar: "التواصل", en: "Contact" },
  "admin.people.tier": { ar: "نسبة الخصم", en: "Discount tier" },
  "admin.people.status": { ar: "الحالة", en: "Status" },
  "admin.people.active": { ar: "نشط", en: "Active" },
  "admin.people.inactive": { ar: "موقوف", en: "Suspended" },
  "admin.customers.title": { ar: "قاعدة العملاء", en: "Customer base" },
  "admin.partners.title": { ar: "الوكالات الشريكة", en: "Partner agencies" },
  "admin.partners.hint": {
    ar: "الحسابات المعلّمة كوكالة تحصل على خصم تلقائي في الأسعار.",
    en: "Accounts flagged as agencies receive their discount tier automatically at checkout.",
  },

  "crm.customers.db": { ar: "قاعدة بيانات العملاء", en: "Customer database" },
  "crm.agencies.db": { ar: "قاعدة بيانات وكالات السفر", en: "Travel agency database" },
  "crm.add.customer": { ar: "إضافة عميل جديد", en: "Add new customer" },
  "crm.add.agency": { ar: "إضافة وكالة جديدة", en: "Add new agency" },
  "crm.kpi.customers": { ar: "عدد العملاء", en: "Customers" },
  "crm.kpi.agencies": { ar: "عدد الوكالات", en: "Agencies" },
  "crm.kpi.orders": { ar: "إجمالي الطلبات", en: "Total orders" },
  "crm.kpi.review": { ar: "طلبات بانتظار المراجعة", en: "Orders awaiting review" },
  "crm.kpi.total": { ar: "إجمالي المبيعات", en: "Total value" },
  "crm.field.name": { ar: "الاسم", en: "Full name" },
  "crm.field.agency": { ar: "اسم الوكالة", en: "Agency name" },
  "crm.field.license": { ar: "رقم الترخيص", en: "License number" },
  "crm.field.contact": { ar: "جهة الاتصال", en: "Contact person" },
  "crm.field.email": { ar: "البريد الإلكتروني", en: "Email" },
  "crm.field.phone": { ar: "الهاتف", en: "Phone" },
  "crm.field.whatsapp": { ar: "واتساب", en: "WhatsApp" },
  "crm.field.nationality": { ar: "الجنسية", en: "Nationality" },
  "crm.field.city": { ar: "المدينة", en: "City" },
  "crm.field.notes": { ar: "ملاحظات", en: "Notes" },
  "crm.save": { ar: "حفظ", en: "Save" },
  "crm.cancel": { ar: "إلغاء", en: "Cancel" },
  "crm.saved": { ar: "تم الحفظ بنجاح", en: "Saved successfully" },
  "crm.error": { ar: "تعذر الحفظ، حاول مرة أخرى", en: "Could not save, try again" },
  "crm.view": { ar: "عرض التفاصيل", en: "View details" },
  "crm.empty": { ar: "لا توجد سجلات بعد.", en: "No records yet." },
  "crm.search": { ar: "ابحث بالاسم أو البريد أو الهاتف…", en: "Search name, email or phone…" },
  "crm.back": { ar: "رجوع", en: "Back" },
  "crm.orders.history": { ar: "سجل الطلبات", en: "Order history" },
  "crm.orders.none": { ar: "لا توجد طلبات مرتبطة بهذا السجل.", en: "No orders linked to this record." },
  "crm.notfound": { ar: "السجل غير موجود.", en: "Record not found." },
  "crm.added": { ar: "تاريخ الإضافة", en: "Added on" },



  "admin.fin.collected": { ar: "المبالغ المحصلة", en: "Collected" },
  "admin.fin.outstanding": { ar: "مبالغ معلقة", en: "Outstanding" },
  "admin.fin.bycurrency": { ar: "التوزيع حسب العملة", en: "Volume by currency" },
  "admin.fin.monthly": { ar: "الحجم الشهري", en: "Monthly volume" },
  "admin.fin.invoices": { ar: "الفواتير", en: "Invoices" },
  "admin.fin.invoice": { ar: "رقم الفاتورة", en: "Invoice" },
  "admin.fin.paid": { ar: "المدفوع", en: "Paid" },
  "admin.fin.noinvoices": { ar: "لم تصدر فواتير بعد.", en: "No invoices issued yet." },
  "admin.fin.rates": { ar: "أسعار الصرف مقابل الدولار", en: "Exchange rates per USD" },
  "admin.fin.methods": { ar: "طرق الدفع", en: "Payment methods" },
};

type I18nValue = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: keyof typeof messages | string) => string;
  fmt: (n: number, currency?: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "gt-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string) => messages[key]?.[lang] ?? key;
    const fmt = (n: number, currency?: string) => {
      const locale = lang === "ar" ? "ar-EG" : "en-US";
      const value = Number.isFinite(n) ? n : 0;
      const code = currency ? normalizeCurrency(currency) : undefined;
      const options: Intl.NumberFormatOptions = {
        style: code ? "currency" : "decimal",
        maximumFractionDigits: code === "SDG" ? 0 : 2,
      };
      if (code) options.currency = code;
      try {
        return new Intl.NumberFormat(locale, options).format(value);
      } catch {
        return `${code ? `${code} ` : ""}${value.toLocaleString(locale)}`;
      }
    };
    return { lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t, fmt };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
