import { useMutation } from "@tanstack/react-query";
import { Bot, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAdminAssistant, askClientAssistant } from "@/lib/assistant.functions";
import { useI18n } from "@/lib/i18n";

type Turn = { role: "user" | "assistant"; content: string };

/**
 * Chat surface for both assistants. `mode` picks the server function, and each
 * server function enforces its own permissions — the UI never carries privileges.
 */
export function AssistantWidget({ mode }: { mode: "client" | "admin" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, open]);

  const ask = useMutation({
    mutationFn: async (question: string) => {
      const payload = { data: { question, history: turns.slice(-8) } };
      return mode === "admin" ? askAdminAssistant(payload) : askClientAssistant(payload);
    },
    onSuccess: (res) => setTurns((prev) => [...prev, { role: "assistant", content: res.reply }]),
    onError: (err: Error) => {
      const key =
        err.message.includes("RATE_LIMIT")
          ? "assistant.err.rate"
          : err.message.includes("CREDITS")
            ? "assistant.err.credits"
            : err.message.includes("FORBIDDEN")
              ? "assistant.err.forbidden"
              : "assistant.err.generic";
      toast.error(t(key));
      setTurns((prev) => [...prev, { role: "assistant", content: t(key) }]);
    },
  });

  const send = () => {
    const question = input.trim();
    if (!question || ask.isPending) return;
    setTurns((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    ask.mutate(question);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 end-5 z-50 h-12 rounded-full bg-forest px-5 text-cream shadow-lg hover:bg-forest-deep"
      >
        {mode === "admin" ? <ShieldCheck className="me-2 size-4" /> : <Bot className="me-2 size-4" />}
        {t(mode === "admin" ? "assistant.admin.open" : "assistant.client.open")}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-5 end-5 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center gap-2 bg-forest-deep px-4 py-3 text-cream">
        {mode === "admin" ? <ShieldCheck className="size-4" /> : <Bot className="size-4" />}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {t(mode === "admin" ? "assistant.admin.title" : "assistant.client.title")}
          </p>
          <p className="truncate text-[11px] text-cream/70">
            {t(mode === "admin" ? "assistant.admin.scope" : "assistant.client.scope")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("common.close")}
          className="ms-auto rounded-md p-1 hover:bg-cream/10"
        >
          <X className="size-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 ? (
          <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
            {t(mode === "admin" ? "assistant.admin.hello" : "assistant.client.hello")}
          </p>
        ) : null}
        {turns.map((turn, i) => (
          <div
            key={i}
            className={
              turn.role === "user"
                ? "ms-auto w-fit max-w-[85%] rounded-2xl bg-forest px-3 py-2 text-sm text-cream"
                : "w-fit max-w-[90%] whitespace-pre-wrap rounded-2xl bg-secondary px-3 py-2 text-sm text-forest-deep"
            }
          >
            {turn.content}
          </div>
        ))}
        {ask.isPending ? (
          <p className="text-xs text-muted-foreground">{t("assistant.thinking")}</p>
        ) : null}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={t("assistant.placeholder")}
          className="min-h-[2.5rem] resize-none"
        />
        <Button size="icon" onClick={send} disabled={ask.isPending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
