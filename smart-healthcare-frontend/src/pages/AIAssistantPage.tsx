import { AIAssistantWidget } from "../components/AIAssistantWidget";

export default function AIAssistantPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">
          Knowledge base
        </span>
        <h1 className="font-display text-4xl text-pine">AI Assistant</h1>
        <p className="mt-2 text-ink-soft">
          Ask general medical questions. Answers are grounded in the clinic's reference documents.
        </p>
      </div>

      <AIAssistantWidget />
    </div>
  );
}
