import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Presentation-only dashboard building blocks shared by the ERP and agency portals.
 * Every colour comes from the semantic design tokens in src/styles.css.
 */

const TONE: Record<string, { ring: string; icon: string; value: string }> = {
  forest: { ring: "bg-forest/10", icon: "text-forest", value: "text-forest-deep" },
  gold: { ring: "bg-gold/15", icon: "text-gold", value: "text-forest-deep" },
  sage: { ring: "bg-sage/20", icon: "text-sage", value: "text-forest-deep" },
  mint: { ring: "bg-mint/40", icon: "text-forest", value: "text-forest-deep" },
  destructive: { ring: "bg-destructive/10", icon: "text-destructive", value: "text-destructive" },
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "forest",
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE | string;
  /** 0–100; renders a thin usage bar under the value. */
  progress?: number;
}) {
  const t = TONE[tone] ?? TONE['forest']!;
  return (
    <div className="surface-card group relative overflow-hidden p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-2 text-xl font-bold tabular-nums sm:text-2xl", t.value)}>{value}</p>
        </div>
        {Icon ? (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.ring)}>
            <Icon className={cn("h-4.5 w-4.5", t.icon)} aria-hidden />
          </span>
        ) : null}
      </div>
      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-beige">
          <div
            className={cn("h-full rounded-full", progress >= 90 ? "bg-destructive" : "bg-forest")}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>;
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="mb-3 min-w-0">
        <h2 className="truncate text-base font-bold text-forest-deep">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    fontSize: 12,
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
} as const;

/** Monthly money trend. `data` = [["2026-01", 1200], ...] */
export function TrendCard({
  title,
  subtitle,
  data,
  empty,
}: {
  title: string;
  subtitle?: string;
  data: Array<[string, number]>;
  empty: string;
}) {
  const { fmt, lang } = useI18n();
  const rows = data.map(([month, total]) => ({
    month: new Date(`${month}-01T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar" : "en", {
      month: "short",
    }),
    total: Math.round(Number(total)),
  }));

  return (
    <ChartCard title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="h-52 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gtTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--forest)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--forest)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis
                width={48}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any) => [fmt(Number(v), "USD"), title] as [string, string]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--forest)"
                strokeWidth={2}
                fill="url(#gtTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/** Order pipeline distribution by status. */
export function StatusBreakdownCard({
  title,
  subtitle,
  byStatus,
  empty,
}: {
  title: string;
  subtitle?: string;
  byStatus: Record<string, number>;
  empty: string;
}) {
  const { t } = useI18n();
  const rows = Object.entries(byStatus)
    .filter(([, n]) => Number(n) > 0)
    .map(([status, count]) => ({ status, label: t(`status.${status}`), count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="h-52 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={0}
                stroke="var(--muted-foreground)"
              />
              <YAxis width={32} allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--sage)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <header className="surface-card grid grid-cols-[minmax(0,1fr)] gap-3 p-4 sm:flex sm:flex-wrap sm:items-center sm:p-5">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="truncate text-lg font-bold text-forest-deep sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">{actions}</div>
      ) : null}
    </header>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 animate-pulse rounded-2xl bg-beige/70" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-beige/70" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-beige/70" />
        <div className="h-64 animate-pulse rounded-2xl bg-beige/70" />
      </div>
    </div>
  );
}
