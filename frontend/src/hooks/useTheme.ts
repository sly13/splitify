import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { useTelegram } from "./useTelegram";

export const useTheme = () => {
  const { theme, setTheme } = useAppStore();
  const { colorScheme } = useTelegram();

  // Определяем активную тему
  const getActiveTheme = () => {
    if (theme === "auto") {
      return colorScheme;
    }
    return theme;
  };

  const activeTheme = getActiveTheme();

  // Применяем тему к документу
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Удаляем предыдущие классы темы
    root.classList.remove("light", "dark");
    body.classList.remove("light", "dark");

    // Добавляем новый класс темы
    root.classList.add(activeTheme);
    body.classList.add(activeTheme);

    // Обновляем CSS переменные для темной темы
    if (activeTheme === "dark") {
      root.style.setProperty("--tg-theme-bg-color", "#17212b");
      root.style.setProperty("--tg-theme-text-color", "#ffffff");
      root.style.setProperty("--tg-theme-hint-color", "#708499");
      root.style.setProperty("--tg-theme-link-color", "#64b5f6");
      root.style.setProperty("--tg-theme-button-color", "#64b5f6");
      root.style.setProperty("--tg-theme-button-text-color", "#ffffff");
      root.style.setProperty("--tg-theme-secondary-bg-color", "#232e3c");
    } else {
      // Светлая тема - используем значения по умолчанию
      root.style.setProperty("--tg-theme-bg-color", "#ffffff");
      root.style.setProperty("--tg-theme-text-color", "#000000");
      root.style.setProperty("--tg-theme-hint-color", "#999999");
      root.style.setProperty("--tg-theme-link-color", "#2481cc");
      root.style.setProperty("--tg-theme-button-color", "#2481cc");
      root.style.setProperty("--tg-theme-button-text-color", "#ffffff");
      root.style.setProperty("--tg-theme-secondary-bg-color", "#f1f1f1");
    }
  }, [activeTheme]);

  return {
    theme,
    activeTheme,
    setTheme,
    isDark: activeTheme === "dark",
    isLight: activeTheme === "light",
    isAuto: theme === "auto",
  };
};
