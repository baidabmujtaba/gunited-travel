import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://www.gunitedtravel.com";
const STATIC = ["/", "/offers", "/umrah", "/select", "/catalog", "/track"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient(
          process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL,
          process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          { auth: { persistSession: false } },
        );
        const { data } = await sb
          .from("service_offers")
          .select("slug,category,security_subtype,updated_at")
          .eq("is_active", true)
          .limit(1000);
        const urls = STATIC.map((p) => `<url><loc>${BASE}${p}</loc></url>`);
        for (const o of data ?? []) {
          const path =
            o.category === "security_approval" ? `/request/${o.slug}` : `/offers/${o.slug}`;
          const lastmod = o.updated_at ? `<lastmod>${String(o.updated_at).slice(0, 10)}</lastmod>` : "";
          urls.push(`<url><loc>${BASE}${path}</loc>${lastmod}</url>`);
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
