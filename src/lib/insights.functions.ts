import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./admin.shared";

export type OpsAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  count: number;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  link: string;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Cross-module operations inbox: one query pass that correlates orders,
 * invoices, agency balances, offers, email delivery and agency links so staff
 * see everything that needs a human decision in a single place.
 */
export const getOpsAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const now = Date.now();

    const [orders, invoices, agencies, ledger, offers, emails, agencyProfiles] = await Promise.all([
      sb
        .from("service_orders")
        .select("id,tracking_id,status,created_at,updated_at,agency_id")
        .is("deleted_at", null),
      sb.from("invoices").select("order_id,status").is("deleted_at", null),
      sb
        .from("travel_agencies")
        .select("id,agency_name,credit_limit_usd,warning_percent,financial_hold,is_active")
        .is("deleted_at", null),
      sb.from("agency_ledger").select("agency_id,debit,credit,currency_code"),
      sb
        .from("service_offers")
        .select("id,title_en,title_ar,expiry_date,status")
        .eq("status", "active")
        .is("deleted_at", null),
      sb.from("email_queue").select("id,status,retry_count"),
      sb.from("profiles").select("id,is_agency,agency_id"),
    ]);

    const orderRows = orders.data ?? [];
    const alerts: OpsAlert[] = [];

    // 1) Receipts waiting on verification for more than a day.
    const staleReview = orderRows.filter(
      (o: any) =>
        ["submitted", "payment_pending"].includes(o.status) &&
        now - new Date(o.created_at).getTime() > DAY,
    );
    if (staleReview.length > 0) {
      alerts.push({
        id: "orders.stale_review",
        severity: "critical",
        count: staleReview.length,
        title_en: "Payments awaiting verification",
        title_ar: "دفعات بانتظار التحقق",
        body_en: `${staleReview.length} order(s) have been waiting more than 24 hours for a payment review.`,
        body_ar: `${staleReview.length} طلب/طلبات تنتظر التحقق من الدفع أكثر من 24 ساعة.`,
        link: "/admin",
      });
    }

    // 2) Confirmed work stuck in processing for over a week.
    const stalled = orderRows.filter(
      (o: any) =>
        ["payment_confirmed", "processing"].includes(o.status) &&
        now - new Date(o.updated_at ?? o.created_at).getTime() > 7 * DAY,
    );
    if (stalled.length > 0) {
      alerts.push({
        id: "orders.stalled",
        severity: "warning",
        count: stalled.length,
        title_en: "Orders stalled in processing",
        title_ar: "طلبات متوقفة في التنفيذ",
        body_en: `${stalled.length} paid order(s) have not moved for 7+ days.`,
        body_ar: `${stalled.length} طلب مدفوع لم يتقدّم منذ 7 أيام أو أكثر.`,
        link: "/admin",
      });
    }

    // 3) Completed orders that never got an invoice.
    const invoiced = new Set((invoices.data ?? []).map((i: any) => i.order_id));
    const missingInvoice = orderRows.filter(
      (o: any) => o.status === "completed" && !invoiced.has(o.id),
    );
    if (missingInvoice.length > 0) {
      alerts.push({
        id: "finance.missing_invoice",
        severity: "warning",
        count: missingInvoice.length,
        title_en: "Completed orders without an invoice",
        title_ar: "طلبات مكتملة بدون فاتورة",
        body_en: `${missingInvoice.length} completed order(s) still need an invoice issued.`,
        body_ar: `${missingInvoice.length} طلب مكتمل يحتاج إصدار فاتورة.`,
        link: "/admin/finance",
      });
    }

    // 4) Agency credit exposure (balance vs. limit) and financial holds.
    const balances = new Map<string, number>();
    for (const row of ledger.data ?? []) {
      if (!row.agency_id || row.currency_code !== "USD") continue;
      balances.set(
        row.agency_id,
        (balances.get(row.agency_id) ?? 0) + Number(row.debit ?? 0) - Number(row.credit ?? 0),
      );
    }
    const overLimit: string[] = [];
    const nearLimit: string[] = [];
    const held: string[] = [];
    for (const a of agencies.data ?? []) {
      const balance = balances.get(a.id) ?? 0;
      const limit = Number(a.credit_limit_usd ?? 0);
      const warnAt = (limit * Number(a.warning_percent ?? 80)) / 100;
      if (a.financial_hold) held.push(a.agency_name);
      else if (limit > 0 && balance >= limit) overLimit.push(a.agency_name);
      else if (limit > 0 && balance >= warnAt) nearLimit.push(a.agency_name);
    }
    if (overLimit.length > 0 || held.length > 0) {
      const names = [...held, ...overLimit].slice(0, 4).join(", ");
      alerts.push({
        id: "agency.credit_blocked",
        severity: "critical",
        count: overLimit.length + held.length,
        title_en: "Agencies blocked on credit",
        title_ar: "وكالات متوقفة مالياً",
        body_en: `${names} reached the credit limit or are on financial hold.`,
        body_ar: `${names} وصلت الحد الائتماني أو موقوفة مالياً.`,
        link: "/admin/balances",
      });
    }
    if (nearLimit.length > 0) {
      alerts.push({
        id: "agency.credit_warning",
        severity: "warning",
        count: nearLimit.length,
        title_en: "Agencies near their credit limit",
        title_ar: "وكالات قريبة من الحد الائتماني",
        body_en: `${nearLimit.slice(0, 4).join(", ")} crossed the warning threshold.`,
        body_ar: `${nearLimit.slice(0, 4).join(", ")} تجاوزت حد التحذير.`,
        link: "/admin/balances",
      });
    }

    // 5) Published offers that expired or expire within two weeks.
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(now + 14 * DAY).toISOString().slice(0, 10);
    const expired = (offers.data ?? []).filter((o: any) => o.expiry_date && o.expiry_date < today);
    const expiring = (offers.data ?? []).filter(
      (o: any) => o.expiry_date && o.expiry_date >= today && o.expiry_date <= soon,
    );
    if (expired.length > 0) {
      alerts.push({
        id: "offers.expired",
        severity: "critical",
        count: expired.length,
        title_en: "Expired offers still published",
        title_ar: "عروض منتهية ما زالت منشورة",
        body_en: `${expired.length} active offer(s) passed their expiry date.`,
        body_ar: `${expired.length} عرض نشط تجاوز تاريخ انتهائه.`,
        link: "/admin/offers",
      });
    }
    if (expiring.length > 0) {
      alerts.push({
        id: "offers.expiring",
        severity: "info",
        count: expiring.length,
        title_en: "Offers expiring soon",
        title_ar: "عروض تنتهي قريباً",
        body_en: `${expiring.length} offer(s) expire within 14 days.`,
        body_ar: `${expiring.length} عرض ينتهي خلال 14 يوماً.`,
        link: "/admin/offers",
      });
    }

    // 6) Email delivery health.
    const failed = (emails.data ?? []).filter((e: any) => e.status === "failed");
    if (failed.length > 0) {
      alerts.push({
        id: "email.failed",
        severity: "critical",
        count: failed.length,
        title_en: "Notification emails failed",
        title_ar: "رسائل إشعارات فاشلة",
        body_en: `${failed.length} email(s) exhausted their retries and were not delivered.`,
        body_ar: `${failed.length} رسالة استنفدت المحاولات ولم تُسلَّم.`,
        link: "/admin/email-notifications",
      });
    }

    // 7) Agency users that were never linked to an agency record.
    const unlinked = (agencyProfiles.data ?? []).filter((p: any) => p.is_agency && !p.agency_id);
    if (unlinked.length > 0) {
      alerts.push({
        id: "links.unlinked_agency_users",
        severity: "warning",
        count: unlinked.length,
        title_en: "Agency users without an agency",
        title_ar: "مستخدمو وكالات بدون ربط",
        body_en: `${unlinked.length} agency account(s) are not linked to an agency yet.`,
        body_ar: `${unlinked.length} حساب وكالة غير مرتبط بأي وكالة.`,
        link: "/admin/links",
      });
    }

    const rank = { critical: 0, warning: 1, info: 2 } as const;
    alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
    return alerts;
  });
