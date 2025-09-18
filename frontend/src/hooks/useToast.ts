import { useState, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" = "info",
      duration?: number
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = { id, message, type, duration };

      setToasts(prev => [...prev, newToast]);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "success", duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "error", duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "info", duration);
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
  };
};
