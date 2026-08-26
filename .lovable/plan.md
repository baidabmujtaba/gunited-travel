# Financial Ledger, Agency Tenancy & Portals

Extending the existing Gunited Travel system — no rebuild, no deletions. Current auth, catalog, orders, invoices, offers, documents, flights, notifications and admin hub stay exactly as they are.

## What already exists (verified)
- Real database + auth + RBAC (`user_roles`, `is_staff`, `is_admin`, `has_role`), RLS on every table.
- Orders, invoices (auto number + PDF + email), offers with document checklists, payment methods, manual exchange rates, CRM (customers + travel agencies), users & settings hubs, Amadeus flights, realtime notification bell, Arabic RTL i18n.

## What is missing (this is the work)
1. **Agency tenancy** — agencies are CRM records today, not tenants. No `agency_id` on orders/customers/payments, so no A-cannot-see-B isolation.
2. **Financial ledger** — revenue is derived from invoices; there is no double-entry ledger, no agency balance, no outstanding amount, no credit limit.
3. **Payments** — no payments table. Receipts are uploaded per order only; no external payments, no reversals, no adjustments, no receipts.
4. **Statements & reports** — no agency statement, no payments/outstanding/sales report pages.
5. **Agency & customer portals** — clients get `/account` only; agencies have no sidebar portal.
6. **Agency vs customer pricing** — one `base_price_usd`; no agency price tier beyond a flat discount.

## Phase 1 — Database (safe additive migration)
Reuse existing tables; add only what's absent.
- `agencies_link`: add `agency_id uuid` (FK → `travel_agencies`) to `profiles`, `customers`, `service_orders`, `invoices`. Backfill left null → existing data untouched.
- `travel_agencies`: add `credit_limit_usd`, `is_active`, `currency_code`.
- New `agency_ledger` (append-only): agency, order, payment, user, currency, entry_type (`charge`/`payment`/`adjustment`/`reversal`), `amount_usd`, `signed_amount_usd`, reference, note, `reversed_by`, timestamps. No UPDATE/DELETE policy — corrections happen via reversal rows.
- New `payments`: agency/customer, order (nullable → external), amount + currency + frozen rate, method, transaction reference (unique per agency to block duplicates), receipt path, status (`recorded`/`reversed`), `is_external`, recorded_by, timestamps.
- New `service_prices`: offer, audience (`agency`/`customer`), `price_usd` — so agency and customer prices are separate rows; falls back to `base_price_usd`.
- SQL function `agency_balance(agency_id)` summing the ledger; a `v_agency_balances` view for dashboards.
- Indexes on every FK plus `(agency_id, created_at)` on orders/payments/ledger.
- RLS: staff full access; agency users see only rows where `agency_id` matches their profile's agency (via a `security definer` `current_agency_id()`); customers see only their own. GRANTs for `authenticated` + `service_role` on all new tables.

## Phase 2 — Backend (server functions, all validation server-side)
- `src/lib/ledger.server.ts` — the only writer of ledger rows: `chargeOrder`, `recordPayment`, `reversePayment`, `adjust`. Enforces: positive amounts only, duplicate reference check, credit-limit check, agency derived from the session (never from the client payload), audit log on every call.
- `src/lib/payments.functions.ts` — `recordPayment`, `recordExternalPayment`, `reversePayment`, `financialAdjustment`, `listPayments`, `getPaymentReceipt` (PDF via existing pdf-lib helper), all staff-gated; agencies get read-only `myPayments`.
- `src/lib/statements.functions.ts` — `getAgencyStatement` (opening balance, entries, running balance, closing), `listAgencyBalances`, paginated.
- `src/lib/reports.functions.ts` — sales, orders, agency balances, payments, external payments, outstanding. Aggregated in SQL, paginated, CSV export.
- Order approval hooks into `chargeOrder` so an approved order creates the due amount; invoice issuance stays as-is.
- Pricing: `computePrice` gains an audience argument reading `service_prices`; agencies never receive customer prices in the payload and vice versa.

## Phase 3 — UI (reuse AdminShell / StoreLayout patterns)
- **Admin sidebar** extended with: Payments, External Payments, Agency Balances, Statements, Reports, Audit Log. Existing tabs untouched.
- **Agency portal** at `/_authenticated/agency/*`: home, services (agency prices), customers, orders, balance, payments, statement, notifications, profile.
- **Customer area**: keep `/account`, add sidebar shell with services, my orders, notifications, profile.
- Responsive: full sidebar desktop, collapsed tablet, drawer mobile; tables wrapped in a scroll container with card fallback on mobile.
- Realtime: extend the existing notification channel to also invalidate balance/ledger queries so dashboards update without refresh.

## Phase 4 — Verification
End-to-end checks in the browser: agency login sees only its own customers/orders/payments; a second agency's data is unreachable via API too; payment recording moves balance and statement; reversal restores it; duplicate reference is rejected; negative amount rejected; receipts print; reports export.

## Order of delivery
Phases run in sequence, each shippable. Phase 1 is a single approved migration; nothing existing is dropped or renamed.

## Technical notes
- All money stored in USD with a frozen display rate, matching current invoice/order behaviour.
- Balance is never a stored mutable column — always the ledger sum via the SQL function.
- Every new server function goes through `requireSupabaseAuth` + role assertion; frontend never sends agency_id, balance, status or transaction type.
