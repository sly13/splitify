import React from "react";
import Toast from "./Toast";

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: "success" | "error" | "info";
    duration?: number;
  }>;
  onHideToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onHideToast,
}) => {
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 1000 - index,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onHideToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
