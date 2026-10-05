import { useState } from "react";
import { askAssistant } from "../services/aiAssistantService";
import type { AssistantSource } from "../types/aiAssistant";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
  sources?: AssistantSource[];
}

interface AIAssistantWidgetProps {
  // Fournis uniquement quand le widget est monté dans le contexte d'un
  // patient (ex. sur RiskResultPage) — leur absence bascule automatiquement
  // le backend en mode RAG général.
  patientId?: string;
  intakeId?: string;
  title?: string;
  placeholder?: string;
}

export function AIAssistantWidget({
  patientId,
  intakeId,
  title = "AI Assistant",
  placeholder = "Ask a question...",
}: AIAssistantWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const result = await askAssistant({ question, patientId, intakeId });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer, sources: result.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: "The assistant is currently unavailable. Please try again shortly." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
      <div className="border-b border-sand-dark/60 px-5 py-3">
        <h2 className="font-display text-lg text-pine">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          {patientId
            ? "Grounded in this patient's clinical record."
            : "Grounded in the clinic's reference documents."}
        </p>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-soft">
            {patientId
              ? "Ask why this patient's risk score is what it is, or which factors contributed."
              : "Ask a general medical question, e.g. \u201cWhat is type 2 diabetes?\u201d"}
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-pine text-paper"
                  : m.role === "error"
                    ? "bg-risk-high/10 text-risk-high"
                    : "bg-sand/40 text-ink"
              }`}
            >
              {m.text}
            </div>
            {m.sources && m.sources.length > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                Sources: {m.sources.map((s) => s.source).join(", ")}
              </p>
            )}
          </div>
        ))}

        {loading && <p className="text-sm text-ink-soft">Thinking...</p>}
      </div>

      <div className="flex gap-2 border-t border-sand-dark/60 px-5 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-sand-dark bg-paper px-3.5 py-2 text-sm text-ink outline-none focus:border-pine"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </div>

      <p className="border-t border-sand-dark/60 px-5 py-2 text-[11px] text-ink-soft">
        AI-generated does not replace clinical judgment.
      </p>
    </div>
  );
}
