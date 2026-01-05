import { useEffect } from "react";

export default function Modal({ open, title, subtitle, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border">
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-bold text-slate-900">{title}</div>
              {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="px-3 py-2 rounded-lg border hover:bg-slate-50 text-sm">
              Tutup
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
