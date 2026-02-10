import { useEffect } from "react";
import { useStore } from "../store.js";

export function Lightbox() {
  const src = useStore((s) => s.lightboxSrc);
  const setLightboxSrc = useStore((s) => s.setLightboxSrc);

  useEffect(() => {
    if (!src) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        useStore.getState().setLightboxSrc(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [src]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-[fadeIn_0.15s_ease-out] cursor-pointer"
      onClick={() => setLightboxSrc(null)}
    >
      <img
        src={src}
        alt="Enlarged view"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
        onClick={() => setLightboxSrc(null)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
