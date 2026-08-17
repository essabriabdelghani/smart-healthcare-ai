import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastItem {
  id: string;
  title: string;
  message: string;
}

interface ToastContextValue {
  notify: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-sand-dark/60 bg-paper-raised p-4 shadow-lg"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-paper">
              ✓
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{t.message}</p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink-soft hover:text-ink"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}