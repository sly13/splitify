import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Показываем тост с небольшой задержкой для плавной анимации
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    // Автоматически скрываем тост через указанное время
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Ждём завершения анимации скрытия
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles: React.CSSProperties = {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: 1000,
      maxWidth: "320px",
      width: "100%",
      margin: "0 16px",
      transform: isVisible ? "translateX(0)" : "translateX(100%)",
      opacity: isVisible ? 1 : 0,
      transition: "all 0.3s ease-in-out",
    };

    const typeStyles = {
      success: {
        backgroundColor: "#10b981",
        color: "white",
        borderLeft: "4px solid #059669",
      },
      error: {
        backgroundColor: "#ef4444",
        color: "white",
        borderLeft: "4px solid #dc2626",
      },
      info: {
        backgroundColor: "#3b82f6",
        color: "white",
        borderLeft: "4px solid #2563eb",
      },
    };

    return {
      ...baseStyles,
      ...typeStyles[type],
    };
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return "ℹ️";
    }
  };

  return (
    <div style={getToastStyles()}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            marginRight: "12px",
            fontSize: "20px",
          }}
        >
          {getIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {message}
          </p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          style={{
            flexShrink: 0,
            marginLeft: "12px",
            background: "none",
            border: "none",
            color: "white",
            fontSize: "16px",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Toast;
