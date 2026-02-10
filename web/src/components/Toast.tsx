import { useEffect } from "react";
import { useStore, type Toast } from "../store.js";

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useStore((s) => s.removeToast);

  useEffect(() => {
    const duration = toast.duration ?? (toast.action ? 5000 : 3000);
    const timer = setTimeout(() => removeToast(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, toast.action, removeToast]);

  const variantStyles = {
    success: "bg-cc-success text-white",
    error: "bg-cc-error text-white",
    info: "bg-cc-primary text-white",
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-[fadeSlideIn_0.2s_ease-out] ${variantStyles[toast.variant]}`}
    >
      <span className="flex-1 min-w-0">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            removeToast(toast.id);
          }}
          className="shrink-0 px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors cursor-pointer"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
