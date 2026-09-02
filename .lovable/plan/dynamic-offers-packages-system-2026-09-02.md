# Dynamic Offers & Packages System

A fully database-driven offers/packages system (Umrah packages, hotel/flight/visa/tourism offers) layered onto the existing Gunited Travel ERP — reusing its auth, roles, currencies, orders, invoicing, accounting ledger and email notifications.

This is far too large for one pass, so it ships in 4 phases. Each phase is complete and usable on its own.

## Phase 1 — Data model + admin offer builder

New relational tables (all with row-level security, staff-only write, public read of published rows only):

- `offer_categories` — bilingual name/description, icon, image, display order, active, featured
- `offer_badges` — bilingual label, colour (admin can add custom badges)
- extend `service_offers` with: category_id, badge_id, offer_type, short descriptions, price display mode, original/discounted price, currency, total days, Makkah/Madinah/other nights, publish/expiry dates, featured + featured order, SEO title/description/og image, view + booking counters
- `offer_room_types` — bilingual name, occupancy, price, currency, inventory, description, active, sort order
- `offer_hotels` — city, bilingual name, stars, distance to Haram / Prophet's Mosque, image, description, sort order
- `offer_services` — bilingual name, icon, description, included/excluded flag, sort order
- `offer_departures` — fixed departure dates, seats, blocked dates
- `offer_faqs`, `offer_terms` — bilingual, ordered
- `offer_coupons` — code, percent/fixed, window, usage limit, min order, scope (offers/categories)
- `offer_analytics` — daily views/clicks/booking events per offer

Admin builder at `/admin/offers`, rebuilt as a sectioned form: basic info, images (existing private storage bucket + signed URLs), pricing, room types, program/nights, hotels, included/excluded services, departures, terms, FAQ, SEO, status & scheduling. Drag-and-drop ordering for room types, hotels, services and gallery. Duplicate / publish / unpublish / archive / delete actions, stats row (total, published, draft, featured, expired, categories), and a device-framed preview (mobile/tablet/desktop) before publishing.

Categories and badges get their own management screens.

## Phase 2 — Public storefront

- Homepage section "باقات العمرة" driven by featured offers with category tabs, premium cards (image, badge, name, duration, nights split, top inclusions, "ابتداءً من" price, CTA); horizontal scroll on mobile, grid on desktop. Section title/subtitle/limit are admin-editable.
- `/offers` listing: category chips, filters (price, duration, stars, Makkah/Madinah nights, services, availability), sorting (popular, price asc/desc, newest, featured), pagination, skeletons, debounced search.
- `/offers/:slug` details: hero, badge, summary card (starting price, days, nights), description, program, hotels, included/excluded services, room options, pricing, terms, important info, gallery, FAQ, sticky mobile "احجز هذه الباقة".
- Empty/expired states, per-offer SEO head metadata + og:image, structured data.
- Visa-only and custom-package offer types render without hotel/room sections; custom package shows "اطلب برنامجك الخاص".

## Phase 3 — Booking flow

Multi-step booking with a progress indicator and back/forward navigation that preserves data: package → travel date (admin-controlled available/blocked dates) → passengers (adults/children/infants with age rules) → traveller details → rooms (quantity per type, inventory-checked) → extra services → coupon → review → payment (existing manual bank-transfer receipt flow) → confirmation.

Server-side price engine (single source of truth, never client-trusted): base/per-person/per-room, room subtotals, extra services, discount, coupon, tax, total, with a transparent breakdown. Booking writes a **price snapshot** so later admin price edits never change existing bookings.

Bookings land in the existing `service_orders`/invoice/ledger pipeline so accounting keeps working, and trigger the existing notification + email queue for admin-notify-on-submit and customer-notify-on-status-change.

## Phase 4 — Analytics, search, polish

- Offer analytics in the admin dashboard: views, clicks, booking requests, confirmed bookings, conversion rate, revenue, top offers, top room types.
- Global bilingual offer search (name, category, hotel, destination, price, badge).
- Full RTL/LTR, mobile/tablet/desktop pass, micro-interactions (hover elevation, image zoom, button loading, skeletons, toasts, step transitions), error handling with Arabic-first messages.
- End-to-end verification: create → publish → homepage → details → booking → price check → submit → admin sees order → notification; plus expired offer, sold-out room, coupon, edit, duplicate.

## Technical notes

- Server functions in `src/lib/offers.functions.ts` (+ new `offer-admin.functions.ts`, `offer-booking.functions.ts`) with Zod validation; staff checks via existing `assertStaff` / `has_role`.
- Public reads go through the existing publishable-key server client with narrow anon SELECT policies limited to published, non-expired offers.
- Existing offers keep working: `service_offers` is extended, not replaced, and current storefront/checkout routes stay functional throughout.
- Prices stay USD-anchored with the existing exchange-rate/frozen-rate mechanism; the new currency field controls display only.

## Suggested start

Phase 1 (database + admin builder) in this round, since everything else reads from it.
