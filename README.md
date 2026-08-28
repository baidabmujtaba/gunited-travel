# Gunited Travel Hub

GUNITED TRAVEL — MASTER BUILD PROMPT (ERP + Client Store)

Build a complete, production-ready Travel & Tourism ERP + Client Storefront named:

Gunited Travel — Arabic: جيونايتد ترافيل

Use both names consistently everywhere the brand appears (logo lockup, login, sidebar, invoices, emails, WhatsApp templates, PDF documents): the English wordmark Gunited Travel in LTR contexts, and جيونايتد ترافيل as the exact Arabic transliteration in RTL contexts — never a different Arabic translation or a re-transliteration. This is a single brand referenced in one official name pair, not two separate names.

This is a real, functional dual-mode application — NOT a prototype, static UI, or demo:

Client/Store mode: travel agencies and end customers browse offers/services, place orders, pay, upload receipts, and track status.

Admin/ERP mode: staff manage the full travel business — bookings, offers, payments, currencies, documents, WhatsApp outreach, and reporting.

0. BRAND & DESIGN SYSTEM

Color palette (use these as the real tokens, not placeholders): Forest #1F4D3A (primary/brand), Forest Deep #14342A (headings/dark text), Sage #6B9080 (secondary/accents), Mint #A4C3B2 (light accent/backgrounds), Beige #F3EDE3 and Beige Card #EAE0D0 (surfaces), Cream #FBF8F2 (base background), Gold #C9A063 (small highlight accent only — sparingly, for badges/dots).

Signature hero element (homepage, top of storefront): on page load, a realistic commercial-airliner silhouette (fuselage, wings, engine, tail fin — not a cartoon icon) sits on a dashed runway line at the bottom of the hero. It taxis horizontally along the runway, then rotates nose-up and takes off, climbing along a curved ascent path up and off the top-right of the screen, shrinking slightly with distance for depth. The wordmark "Gunited Travel" is painted on the tail fin, rotated vertically along the fin, in dark green (#14342A) on a lighter fin background — like real airline tail branding, not a towed banner. A faint sage-colored vapor trail draws in behind the plane only during the climb phase. Once airborne and off-frame (~3.3 seconds total), the headline, subtext, and CTA buttons reveal with a soft fade-up. Respect prefers-reduced-motion (skip straight to the settled state). Keep this as the one bold animated moment of the page — everything else (buttons, cards, page transitions) should use restrained, quick micro-interactions (hover lift, subtle shadow growth), not competing animation.

A working HTML/CSS reference of this exact hero animation (plane + flight path + banner + reveal) has been prototyped separately — replicate its motion timing and palette when building the real storefront homepage in Lovable.

Modern, animated interface overall: smooth micro-interactions, transitions between states, animated step-progress bars, skeleton loading states, subtle hover/press animations. Avoid gratuitous animation elsewhere that slows perceived performance — the plane hero is the one deliberate "wow" moment, not a pattern to repeat on every page.

Fully responsive: desktop, laptop, tablet, mobile. Sidebar becomes a mobile drawer. Tables become mobile-friendly cards on small screens.

Arabic is the default language and default direction (RTL). English is fully supported (LTR). Use a centralized i18n system — never hardcode strings in components. Language switch instantly flips direction site-wide, including admin panel, storefront, invoices, and emails.

Reusable component library / design system: buttons, cards, tables, modals, drawers, tabs, badges, toasts, empty/loading/error states — no duplicated UI code.

1. AUTHENTICATION & ADMIN SEEDING

JWT-based authentication, secure password hashing (never plaintext, never reversible storage).

Roles: Super Admin, Admin, Booking Agent, Accountant, Client/Customer (RBAC, granular permissions, enforced server-side — never trust frontend-only checks).

Seed two initial Super Admin accounts on first setup:

gunitedtravel@gmail.com / temp password Gt202610#

mujtababaidab@gmail.com / temp password Mb202510#

Store only hashed versions in the database.

Force "must change password on first login" for both seeded accounts.

Only existing Admins/Super Admins can create new Admin accounts (email + password), never self-registration into admin roles.

Standard auth features: login, logout, remember me, forgot/reset password, session management, account activation/deactivation. Architecture should leave room for future 2FA/OTP/SSO without a rebuild.

2. CURRENCY & DYNAMIC PRICING ENGINE

Base reference currency: USD.

Admin panel section for managing exchange rates: SDG, SAR, AED, plus ability to add custom currencies.

Every offer/service is priced in USD at creation. All other currency prices are derived, not stored — computed live from current exchange rates.

Updating an exchange rate triggers an instant recalculation of every displayed price across the storefront (no manual republishing needed).

Historical transactions must freeze the exchange rate used at the time of that transaction — never retroactively change a completed invoice/payment's rate.

Pricing calculation (cost, markup, tax, fees, discount, commission, final price) is computed server-side only, exposed as a single source of truth service — never duplicated in frontend components.

3. OFFERS & SERVICES CATALOG (Admin)

Full CRUD for Offers & Services (visa services, flight deals, tourism packages, insurance, etc.), with instant live sync to the client catalog on publish/update/archive — no manual refresh needed.

Manual entry, automatic display: every offer/service is added manually by the admin (no auto-generated content). The instant it's saved as Active, it must appear automatically on the client-facing homepage/catalog — no separate "publish" step, no page refresh, no redeploy. Setting status to Draft/Archived removes it from the homepage immediately the same way.

Fields: Title (Ar/En), Description (Ar/En), Category, Base Price (USD), Duration, Status (Active / Draft / Archived), Expiry Date, custom attribute/feature list.

Multi-image upload: drag-and-drop, multiple high-resolution images per item, primary thumbnail selection, delete/reorder previews.

Filterable/searchable admin data table with quick actions (edit, deactivate, delete, duplicate).

4. CLIENT STOREFRONT

Public, responsive card-grid catalog of active offers/services with live search, category filters, and a currency selector (prices auto-convert from USD using current rates).

Detail page per offer: image gallery/slider, dynamic price breakdown in the selected currency, full description, and a prominent "Request & Pay Now" button.

5. PAYMENTS — MANUAL BANK/APP TRANSFER + RECEIPT UPLOAD

Admin Payment Settings:

Admin can add/edit multiple manual payment methods (e.g., Bank of Khartoum, Bankak, bank transfer, Fawry, cash).

Fields per method: bank/app name, account holder name, account number/IBAN, branch, QR code image, custom instructions text. Mask/restrict who can edit these.

Client Checkout:

Order summary (service, total, currency).

Display admin-configured payment method details.

Client enters: transaction reference number, WhatsApp phone number (with country code), and uploads a payment receipt (PNG/JPG/PDF only, validated by type and size).

On submit, generate a unique tracking ID, e.g. GT-ORD-2026-000123.

Never mark an order as confirmed/paid automatically from just an upload — payment must be verified by an admin before status moves to Confirmed.

6. ORDER / APPLICATION TRACKING

Public "Track My Order" page: client enters Tracking ID / Order ID / PNR.

Live timeline with stages (bilingual labels):

Order Submitted & Receipt Uploaded

Payment Verification Pending

Payment Confirmed

Processing Service / Issuing Documents

Order Completed

Each status change is logged with timestamp, actor, note, previous/new status (OrderStatusHistory).

"Download Receipt / Invoice" button appears once completed.

Client-facing dashboard listing their own orders/status — never expose another client's data.

Automatic Invoice on Completion:

The moment an order status reaches Completed, the system must automatically generate a formatted invoice (PDF, bilingual Ar/En, branded with Gunited Travel logo) and email it automatically to the client's registered email address — no manual trigger by the admin needed.

The generated invoice is saved and stored on the admin side (linked to the order/customer record), retrievable anytime from the order detail view.

Every completed-order invoice must automatically appear in the Admin Reports & Sales dashboard (Invoices list, Sales Report, Revenue Report) — it should count toward totals/charts immediately, not after a manual sync.

If the email fails to send (bad address, provider outage), log the failure and show a retry action in the admin panel — never silently drop it.

7. REAL-TIME NOTIFICATIONS

WebSocket (or equivalent real-time channel) notification engine, abstracted behind a NotificationProvider interface (in-app now; email/WhatsApp/SMS-ready later).

Admin/Finance dashboard gets an instant alert the moment a client submits a new order + receipt.

Client gets an instant in-app alert whenever an admin changes their order status or approves/rejects a payment receipt.

Notification bell in the header with unread counter and visual/audio badge.

Automated email notifications (with formatted invoice attached) on order creation and every status change.

8. WHATSAPP INTEGRATION & ADMIN OUTREACH

Client must supply a WhatsApp number (with country code) at checkout; it's stored against the order/client record.

In the Admin Order Detail view: show the client's WhatsApp number with a "Chat on WhatsApp" button that opens WhatsApp Web/App with a pre-filled template, e.g.:

"Hello [Client Name], regarding your Order #[Order_ID] with Gunited Travel, please provide us with your Residency ID / Passport / Documents to proceed…"

Document collection status field per order, editable by admin: Awaiting Residence Permit, Documents Received, Processing Visa, etc. (Ar/En labels).

Internal Notes section on each order for admins/supervisors to log WhatsApp conversation notes — internal only, never shown to the client.

9. CORE ERP MODULES (beyond offers/orders)

Build these as real, working modules connected to the database (not placeholder pages):

Dashboard: bookings/orders today, confirmed/pending/cancelled counts, total sales/revenue/profit, receivables/payables, customer/agent/employee counts, charts by day/month, top destinations/airlines/hotels.

Customers: full profile (contact, passport info, nationality), bookings history, financials (invoiced/paid/outstanding), documents, notes/CRM, activity timeline. Passport-expiry alerts (configurable warning windows: 180/120/90/60/30/7 days).

Bookings & Flight/Hotel search architecture: modular FlightProvider / HotelProvider interfaces so real GDS/API integrations can be added later without a rewrite. Never fabricate a "confirmed" booking without real provider confirmation — use explicit statuses like Pending Provider Confirmation / Booking Failed.

Flight provider: implement Amadeus for Developers as the real, working FlightProvider (not just an abstraction placeholder):

Use the Amadeus Self-Service APIs: Flight Offers Search (search), Flight Offers Price (re-price/confirm before booking), Flight Create Orders (book), Flight Order Management (retrieve/cancel), and Airport & City Search (autocomplete for origin/destination fields).

Auth: Amadeus uses OAuth2 client-credentials — request an access token server-side with the API Key + API Secret, cache/refresh it, and never call Amadeus directly from the frontend.

Two environments: test (test.api.amadeus.com, free-tier sandbox with limited/fake fare data — use this for development) and production (api.amadeus.com, requires an approved/paid Amadeus account for live bookings). Build against test first; switching to production should only require swapping the base URL + credentials via environment variables, with no code changes.

Store AMADEUS_API_KEY, AMADEUS_API_SECRET, and AMADEUS_ENV (test | production) as backend secrets — the person building this needs to register at developers.amadeus.com and generate their own credentials; do not invent or hardcode placeholder keys as if they were real.

Map Amadeus's flight-offer response fields (airline, flight number, times, duration, stops, fare, cabin, baggage) directly into the existing booking/search result fields already defined in Section 9 above, so the rest of the system (booking creation, PNR, pricing engine, invoice) doesn't need separate logic per provider.

If Amadeus returns an error, times out, or a priced offer changes between search and booking, surface it as Search Failed / Provider Timeout / Price Changed — confirm new fare, per the existing rule of never showing a false confirmation.

Keep the HotelProvider and any future secondary flight provider (Sabre, Travelport, Duffel) behind the same interface — Amadeus is the first real implementation, not the only one the architecture supports.

Tickets & Passengers: PNR, ticket status lifecycle (Pending → Issued → Reissued/Voided/Refunded).

Suppliers & Agents: contact info, commission rate, balance, payables/receivables, performance stats.

Invoices & Payments: auto-numbered invoices (GT-INV-2026-000001), line items, tax/discount/fee calculation, payment allocation, never let payment exceed remaining balance unless overpayment is explicitly allowed.

Accounting foundation: chart of accounts, journal entries (debit/credit), receivables, payables, expenses — every financial action traceable; use reversal/adjustment entries instead of silently editing history.

Commissions: percentage or fixed, configurable per service type, tracked per booking/order.

Documents: secure private storage for passports, IDs, tickets, receipts — permission-checked access only, never public.

Reports Center: sales, revenue, profit, bookings, receivables/payables, commissions, cancellations, popular destinations/airlines/hotels — with date/employee/service filters and PDF/Excel export.

Global Search: search across customers, bookings, PNR, tickets, invoices, payments, suppliers, agents, orders — respecting the searching user's permissions.

Audit Logs: immutable-style log of logins, CRUD actions, status changes, permission changes, with before/after data where relevant. Normal users cannot delete audit logs.

Gunited AI Assistant (admin/internal): can search/recommend flights & hotels, summarize customer/order history, flag overdue payments and incomplete bookings, and generate sales insights — respects the requesting user's permissions (e.g., a Booking Agent can't use it to pull financial data they're not authorized to see), and never auto-executes sensitive actions (refunds, cancellations, payments) without human confirmation.

9.1 Client-Facing AI Assistant (storefront chatbot — separate from the admin Gunited AI Assistant above)

A lightweight chat widget on the client storefront, clearly labeled as an automated assistant (never impersonates a human agent).

Scope is strictly limited to grounded, real data — it must not answer from general knowledge about visas, travel law, immigration requirements, or pricing it wasn't given:

Can answer questions about published offers/services (using their real title, description, and live-converted price).

Can look up order status when the client provides their tracking ID/Order ID (read-only — same data as the Track My Order page).

Can explain how checkout, payment methods, and tracking work (static help content).

Read-only, no actions: it must never confirm a booking, change an order status, apply a discount, or process a payment. It can only inform and route.

Hard handoff to a human: any question about visa/travel requirements, legal/immigration advice, a firm final price negotiation, or anything the assistant isn't confident is grounded in real system data must trigger an automatic "Chat with us on WhatsApp" handoff (reusing the WhatsApp deep-link from Section 8) instead of attempting an answer.

Logged like any other support channel: conversations are saved and visible to admins for quality review, same permission model as other customer data (private, not public).

10. SECURITY & DATA INTEGRITY (non-negotiable)

No API keys, DB credentials, or payment secrets in frontend code — environment variables/secrets manager only.

Backend authorization on every endpoint — frontend checks are UX only, never the real gate.

Soft-delete for customers, bookings, invoices, and other financial records — never destructive delete of financial history.

Server-side validation mirrors frontend validation (required fields, email/phone formats, passport dates, currency amounts).

File upload validation: type and size restrictions on receipts/documents.

Rate limiting and session management on auth endpoints.

Clear separation between a mock/demo provider (for development when no real Flight/Hotel/Payment API is connected) and production provider code — never blend fake data into live business logic.

11. DATABASE (indicative schema — relational, e.g. PostgreSQL)

users, roles, permissions, role_permissions, customers, customer_documents, passengers, suppliers, agents, bookings, booking_passengers, tickets, applications, application_status_history, invoices, invoice_items, payments, payment_allocations, commissions, expenses, accounts, journal_entries, journal_entry_lines, currencies, exchange_rates, service_offers, payment_method_configs, service_orders, order_status_history, notifications, documents, ai_conversations, audit_logs, settings

Use proper primary/foreign keys, unique constraints, indexes on frequently searched fields (booking ref, PNR, order ID, phone, email, invoice number), and DB transactions for any multi-step financial or booking operation.

12. STRICT SCOPE RULE

This system is exclusively for travel, tourism, bookings, offers, payments, and related customer/agent/supplier/accounting functionality.

Do NOT build any doctors, patients, hospitals, clinics, pharmacy, medical records, or healthcare-related modules of any kind, under any framing.

13. BUILD ORDER

Architecture + database schema

Auth + roles/permissions + seed the two admin accounts (hashed, force password reset)

Company settings + localization (Ar/En, RTL/LTR) + green/beige theme

Currency & exchange rate engine

Offers/services catalog (admin CRUD + live client sync)

Client storefront + detail pages

Checkout: manual payment methods + receipt upload + WhatsApp capture

Order tracking page + status timeline

Real-time notifications (WebSocket) + notification bell

WhatsApp outreach button + document-status tracking + internal notes

Core ERP: dashboard, customers, bookings, tickets, suppliers, agents

Invoices, payments, accounting, commissions

Documents, reports, global search, audit logs

Gunited AI Assistant

Security hardening + responsive/RTL polish + full workflow testing

14. ACCEPTANCE CRITERIA

Ship only when: auth + RBAC work end-to-end; storefront and admin panel are connected to a real database (no mock data in production paths); currency conversion recalculates live; orders flow through the full status lifecycle with real-time notifications; WhatsApp deep-link opens with correct pre-filled text; receipts are private and permission-gated; invoices/payments/commissions calculate correctly server-side; Arabic RTL and English LTR both work everywhere including PDFs and emails; mobile/tablet/desktop layouts all work; no medical/healthcare modules exist anywhere; no secrets are exposed client-side.

15. RECOMMENDED ADDITIONS (value-add, not optional filler)

Stale-order auto-alerts: if an order sits in the same status (e.g. "Payment Verification Pending") longer than a configurable threshold (e.g. 24h), auto-notify the assigned admin and flag it on the dashboard — prevents orders silently falling through the cracks.

Promo / discount codes: admin can create time-limited or usage-limited codes (percentage or fixed amount), applied at checkout, tracked per order, with a usage report.

Ratings & reviews: clients can rate/review a completed order or offer; admin can moderate (hide/feature) reviews before they show publicly on the catalog.

Agency/reseller tiered pricing: since some clients are travel agencies rather than end customers, allow tagging a customer as "Agency" with a custom discount tier or negotiated rate applied automatically at checkout.

WhatsApp broadcast for new offers: opt-in list of client WhatsApp numbers who can be notified (via a "Broadcast New Offer" admin action, using the same WhatsApp deep-link approach — no bulk automated messaging that could violate WhatsApp policy) when a major new offer goes live.

Abandoned checkout follow-up: if a client starts checkout (selects an offer) but doesn't submit a receipt within a set time, log it as "Abandoned" and surface it to admins as a follow-up list.

PWA support: make the client storefront installable (Add to Home Screen) with offline-friendly loading states, since many users will be on mobile.

Data export / backup: admin can export customers, orders, and invoices to Excel/CSV on demand, in addition to the automated DB backup architecture already specified.

Dark mode: optional dark theme variant of the green/beige palette, toggle in settings, respecting system preference by default.

16. SYSTEM-WIDE INTEGRATION & USABILITY REQUIREMENT

The system must function as one connected whole, not a set of separate screens — every module must actually talk to every other module through the real database, with zero broken links between them:

No orphaned data: a new offer created by the admin must appear on the storefront instantly (Section 3); an order placed by a client must instantly appear in the admin dashboard, reports, and notifications (Sections 5–9); a payment recorded against an invoice must instantly update that customer's balance, the accounting ledger, and the sales reports; a status change on an order must instantly update the client's tracking page, trigger the notification, and log to the audit trail. If a change happens in one place and doesn't reflect everywhere else that depends on it, that's a bug, not an edge case.

No dead ends or broken flows: every button, filter, form, and status action must actually work against real data — no non-functional "coming soon" buttons, no forms that don't save, no filters that don't filter.

Consistent single source of truth: pricing, currency conversion, order status, and permissions must be calculated in one backend service each and referenced everywhere they're displayed — never recalculated differently in different screens (which is how numbers start disagreeing with each other).

Zero-error tolerance for core flows: before considering any phase "done," walk the full path end-to-end and confirm no console errors, no failed network requests, and no silent failures — an action either visibly succeeds (toast/confirmation) or visibly fails with a clear message, never nothing.

Simplicity for the end user: despite the depth of the backend, the client-facing storefront and checkout must stay simple — minimal required fields, clear step-by-step checkout, plain-language status labels (Ar/En), and obvious next actions on every screen (what do I do now?). The admin ERP can be information-dense, but must still be organized (grouped sidebar, consistent table patterns, predictable actions) so staff aren't hunting for where something lives.

Treat this as a hard acceptance gate alongside Section 14 — a feature that works in isolation but breaks the chain to another module (dashboard, reports, notifications, audit log) is not considered complete.

Navigation must be grouped into section hubs, not one page per sub-item. Each sidebar section opens as a single hub page with everything in that domain accessible via tabs/panels inside it — the user should not have to click through a separate full page load for every related screen:

Sales & Bookings hub: one page, tabs for Flight Search / Hotel Search / Bookings / Applications / Tickets.

Customers hub: one page, tabs for Customer List / Customer Portal view / CRM notes & follow-ups.

Partners hub: one page, tabs for Suppliers / Agents / Airlines / Hotels.

Finance hub: one page, tabs for Invoices / Payments / Receivables / Payables / Expenses / Commissions / Accounting.

Offers & Orders hub: one page, tabs for Offers Catalog / Orders / Payment Methods Settings.

Administration hub: one page, tabs for Users / Roles & Permissions / Settings / API Integrations / Exchange Rates / Audit Logs.

Switching tabs within a hub must be instant (client-side tab state, no full page reload) and must preserve any active filters when reasonable.

The sidebar itself should only list these hubs (plus Dashboard, Documents, Reports, Notifications, Gunited AI) — not every sub-item individually — so the whole system is reachable in one click per section instead of hunting through a long, fragmented menu tree.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gunited-travel.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5c4bd00d-5303-4eb4-96c6-a18ead850b08).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
