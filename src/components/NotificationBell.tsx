import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

type Notification = {
  id: string;
  audience: string;
  title_en: string;
  title_ar: string;
  body_en: string | null;
  body_ar: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Realtime notification inbox. RLS decides what each viewer receives: staff see
 * `audience = 'staff'` rows, customers only see rows addressed to their user id.
 */
export function NotificationBell() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const query = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,audience,title_en,title_ar,body_en,body_ar,link,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw new Error(error.message);
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as Notification;
          toast(lang === "ar" ? row.title_ar : row.title_en, {
            description: (lang === "ar" ? row.body_ar : row.body_en) ?? undefined,
          });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, lang, queryClient]);

  if (!userId) return null;

  const items = query.data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notif.title")}>
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 end-0 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-forest-deep">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">{t("notif.title")}</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-forest hover:underline"
            >
              {t("notif.markall")}
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("notif.empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const title = lang === "ar" ? n.title_ar : n.title_en;
                const body = lang === "ar" ? n.body_ar : n.body_en;
                const content = (
                  <div className={`px-3 py-2.5 ${n.is_read ? "" : "bg-secondary/50"}`}>
                    <p className="text-sm font-medium">{title}</p>
                    {body ? <p className="mt-0.5 text-xs text-muted-foreground">{body}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <a href={n.link} className="block hover:bg-secondary/70">
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
