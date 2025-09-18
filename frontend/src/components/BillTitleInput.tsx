import React, { useState, useRef, useEffect } from "react";

interface BillTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

const SUGGESTED_TITLES = [
  "Ужин в ресторане",
  "Обед в кафе",
  "Покупки в магазине",
  "Такси",
  "Кинотеатр",
  "Концерт",
  "Спортзал",
  "Аптека",
  "Бензин",
  "Супермаркет",
  "Кафе с друзьями",
  "Пиццерия",
  "Суши-бар",
  "Бургерная",
  "Кофейня",
  "Бар",
  "Клуб",
  "Парк развлечений",
  "Музей",
  "Театр",
  "Коммунальные услуги",
  "Интернет",
  "Мобильная связь",
  "Стриминговые сервисы",
  "Подписки",
  "Общественный транспорт",
  "Парковка",
  "Штрафы",
  "Медицинские услуги",
  "Образование",
];

export const BillTitleInput: React.FC<BillTitleInputProps> = ({
  value,
  onChange,
  placeholder = "Например: Ужин в ресторане",
  className = "",
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Фильтруем предложения на основе введенного текста
  useEffect(() => {
    if (isSelecting) {
      return;
    }

    if (value.trim()) {
      const filtered = SUGGESTED_TITLES.filter(title =>
        title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      // Показываем селект только если пользователь печатал или это пустое поле
      setIsOpen(filtered.length > 0 && (hasUserTyped || !value.trim()));
    } else {
      setFilteredSuggestions(SUGGESTED_TITLES.slice(0, 8));
      // Не закрываем селект автоматически для пустого поля
      // setIsOpen(false); - убираем эту строку
    }
  }, [value, isSelecting, hasUserTyped]);

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSelecting) {
        return;
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSelecting]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasUserTyped(true);
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Очищаем предыдущий таймаут
    if (selectTimeoutRef.current) {
      clearTimeout(selectTimeoutRef.current);
    }

    setIsSelecting(true);
    setHasUserTyped(false); // Сбрасываем флаг ввода
    onChange(suggestion);
    setIsOpen(false);

    // Устанавливаем новый таймаут для сброса флага
    selectTimeoutRef.current = setTimeout(() => {
      setIsSelecting(false);
      selectTimeoutRef.current = null;
    }, 1000);
  };

  const handleInputFocus = () => {
    if (isSelecting) {
      return;
    }

    // Если поле пустое, показываем список предложений
    if (!value.trim()) {
      setFilteredSuggestions(SUGGESTED_TITLES.slice(0, 8));
      setIsOpen(true);
      return;
    }

    // Если есть текст и пользователь печатал, показываем отфильтрованный список
    if (hasUserTyped && value.trim()) {
      const filtered = SUGGESTED_TITLES.filter(title =>
        title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleInputBlur = () => {
    if (isSelecting) {
      return;
    }

    setTimeout(() => {
      if (!isSelecting) {
        setIsOpen(false);
      }
    }, 200);
  };

  // Очищаем таймаут при размонтировании
  useEffect(() => {
    return () => {
      if (selectTimeoutRef.current) {
        clearTimeout(selectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`bill-title-input ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={error ? "error" : ""}
      />

      {isOpen && (
        <div ref={dropdownRef} className="suggestions-dropdown">
          <div className="suggestions-header">
            <span className="suggestions-title">Популярные варианты:</span>
          </div>
          <div className="suggestions-list">
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onMouseDown={e => {
                  e.preventDefault();
                  handleSuggestionClick(suggestion);
                }}
              >
                <span className="suggestion-icon">💡</span>
                <span className="suggestion-text">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default BillTitleInput;
