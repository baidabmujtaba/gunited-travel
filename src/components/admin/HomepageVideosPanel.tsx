import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  createVideo,
  deleteVideo,
  listAllVideos,
  setVideoOrder,
  updateVideo,
  type HomepageVideo,
} from "@/lib/videos.functions";

const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_SIZE = 50 * 1024 * 1024;

/** Read duration client-side so admins see metadata without a server probe. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? Math.round(el.duration) : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function HomepageVideosPanel() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-videos"], queryFn: () => listAllVideos() });

  const [rows, setRows] = useState<HomepageVideo[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title_ar: "", title_en: "", video_url: "" });

  useEffect(() => {
    if (list.data) setRows(list.data);
  }, [list.data]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-videos"] });
    void qc.invalidateQueries({ queryKey: ["homepage-videos"] });
  };

  const patch = useMutation({
    mutationFn: (v: { id: string; title_ar?: string; title_en?: string; is_active?: boolean }) =>
      updateVideo({ data: v }),
    onSuccess: () => {
      toast.success(t("videos.saved"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteVideo({ data: { id } }),
    onSuccess: () => {
      toast.success(t("videos.removed"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const order = useMutation({
    mutationFn: (ids: string[]) => setVideoOrder({ data: { ids } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  async function submit(file: File | null) {
    const nextOrder = rows.length;
    if (!file && !/^https?:\/\//i.test(form.video_url.trim())) {
      toast.error(t("checkout.required"));
      return;
    }
    setUploading(true);
    try {
      let storage_path: string | null = null;
      let file_name: string | null = null;
      let duration_seconds: number | null = null;
      if (file) {
        if (!VIDEO_TYPES.includes(file.type)) {
          toast.error(t("checkout.filetype"));
          return;
        }
        if (file.size > MAX_SIZE) {
          toast.error(t("checkout.filesize"));
          return;
        }
        duration_seconds = await readDuration(file);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
        const path = `home/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("homepage-videos")
          .upload(path, file, { contentType: file.type });
        if (error) {
          toast.error(error.message);
          return;
        }
        storage_path = path;
        file_name = file.name;
      }
      await createVideo({
        data: {
          title_ar: form.title_ar,
          title_en: form.title_en,
          video_url: file ? "" : form.video_url.trim(),
          storage_path,
          file_name,
          duration_seconds,
          display_order: nextOrder,
          is_active: true,
        },
      });
      toast.success(t("videos.uploaded"));
      setForm({ title_ar: "", title_en: "", video_url: "" });
      refresh();
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    } finally {
      setUploading(false);
    }
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = rows.findIndex((r) => r.id === dragId);
    const to = rows.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setRows(next);
    setDragId(null);
    order.mutate(next.map((r) => r.id));
  }

  return (
    <div className="space-y-6">
      <div className="surface-card space-y-4 p-4 sm:p-5">
        <h2 className="text-lg font-bold text-forest-deep">{t("videos.add")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("videos.titlear")}</Label>
            <Input
              value={form.title_ar}
              onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("videos.titleen")}</Label>
            <Input
              value={form.title_en}
              onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("videos.url")}</Label>
            <Input
              dir="ltr"
              placeholder="https://…"
              value={form.video_url}
              onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("videos.file")}</Label>
            <Input
              type="file"
              accept="video/mp4,video/webm"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) void submit(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <Button
          disabled={uploading}
          onClick={() => void submit(null)}
          className="gap-2 bg-forest text-cream hover:bg-forest-deep"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {t("videos.add")}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="surface-card h-32 animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="surface-card p-6 text-sm text-muted-foreground">{t("videos.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((v, i) => (
            <li
              key={v.id}
              draggable
              onDragStart={() => setDragId(v.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(v.id)}
              className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
            >
              <span className="flex cursor-grab items-center gap-2 text-muted-foreground">
                <GripVertical className="size-4" />
                <span className="text-xs font-semibold">{i + 1}</span>
              </span>
              <video
                src={v.video_url}
                muted
                playsInline
                preload="metadata"
                className="h-24 w-40 rounded-xl bg-forest-deep/10 object-cover"
              />
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  defaultValue={v.title_ar}
                  placeholder={t("videos.titlear")}
                  onBlur={(e) =>
                    e.target.value !== v.title_ar &&
                    patch.mutate({ id: v.id, title_ar: e.target.value })
                  }
                />
                <Input
                  defaultValue={v.title_en}
                  placeholder={t("videos.titleen")}
                  onBlur={(e) =>
                    e.target.value !== v.title_en &&
                    patch.mutate({ id: v.id, title_en: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  {v.file_name ?? v.video_url.slice(0, 60)} · {t("videos.duration")}:{" "}
                  {formatDuration(v.duration_seconds)} · {t("videos.added")}:{" "}
                  {new Date(v.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={v.is_active}
                    onCheckedChange={(checked) => patch.mutate({ id: v.id, is_active: checked })}
                  />
                  <span className="text-xs font-medium">
                    {v.is_active ? t("videos.active") : t("videos.inactive")}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("videos.delete")}
                  onClick={() => remove.mutate(v.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
