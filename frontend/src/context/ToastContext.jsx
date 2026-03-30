import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const AUTO_REMOVE_MS = 4500;

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant, message) => {
      const text = typeof message === "string" ? message.trim() : "";
      if (!text) return;

      const id = ++toastId;
      setToasts((prev) => [...prev, { id, variant, message: text }]);

      const timer = setTimeout(() => removeToast(id), AUTO_REMOVE_MS);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg) => pushToast("success", msg),
      error: (msg) => pushToast("error", msg),
      info: (msg) => pushToast("info", msg),
    }),
    [pushToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-viewport"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`toast toast--${item.variant}`}
            role="status"
          >
            <p className="toast__text">{item.message}</p>
            <button
              type="button"
              className="toast__dismiss"
              aria-label="Dismiss notification"
              onClick={() => removeToast(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};
