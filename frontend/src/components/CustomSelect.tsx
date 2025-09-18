import React, { useState, useRef, useEffect } from "react";

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Выберите опцию",
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div
      className={`custom-select ${className} ${isOpen ? "open" : ""} ${
        disabled ? "disabled" : ""
      }`}
      ref={selectRef}
    >
      <div
        className="select-trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={placeholder}
      >
        <div className="select-value">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="option-icon">{selectedOption.icon}</span>
              )}
              <span className="option-label">{selectedOption.label}</span>
            </>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </div>
        <div className="select-arrow">
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`arrow-icon ${isOpen ? "rotated" : ""}`}
          >
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <ul
          className="select-options"
          ref={listRef}
          role="listbox"
          aria-label="Опции"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              className={`select-option ${
                option.value === value ? "selected" : ""
              } ${index === highlightedIndex ? "highlighted" : ""}`}
              onClick={() => handleOptionClick(option.value)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.icon && (
                <span className="option-icon">{option.icon}</span>
              )}
              <span className="option-label">{option.label}</span>
              {option.value === value && <span className="check-icon">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
