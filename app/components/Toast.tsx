"use client";

import { useCallback, useEffect, useState } from "react";

type ToastItem = { id: number; message: string; type: "success" | "error" | "info" };

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = ++nextId;
    setToasts((old) => [...old, { id, message, type }]);
    setTimeout(() => setToasts((old) => old.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((old) => old.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}

export function ToastContainer({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
          <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function useAutoDismiss(toasts: ToastItem[], dismiss: (id: number) => void) {
  useEffect(() => {
    toasts.forEach((t) => {
      const timer = setTimeout(() => dismiss(t.id), 3500);
      return () => clearTimeout(timer);
    });
  }, [toasts, dismiss]);
}
