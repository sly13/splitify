import React, { useState, useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";

interface Contact {
  id: string;
  name: string;
  telegramUsername?: string;
}

interface ContactSelectorProps {
  onSelect: (contact: Contact) => void;
  placeholder?: string;
  className?: string;
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
  onSelect,
  placeholder = "Выберите контакт",
  className = "",
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { hapticFeedback } = useTelegram();

  // Загружаем список друзей пользователя
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:4041/api";
        const response = await fetch(`${API_BASE_URL}/friends`, {
          headers: {
            "X-Telegram-Init-Data": window.Telegram?.WebApp?.initData || "",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setContacts(data.friends || []);
        }
      } catch (error) {
        console.error("Ошибка загрузки друзей:", error);
      }
    };

    loadFriends();
  }, []);

  // Фильтруем контакты по поисковому запросу
  const filteredContacts = contacts.filter(
    contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.telegramUsername &&
        contact.telegramUsername
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (contact: Contact) => {
    hapticFeedback.selection();
    onSelect(contact);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleToggle = () => {
    hapticFeedback.impact("light");
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className="text-gray-500">{placeholder}</span>
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Поиск */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Поиск контактов..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Список контактов */}
          <div className="max-h-48 overflow-y-auto">
            {filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {contact.name}
                      </div>
                      {contact.telegramUsername && (
                        <div className="text-sm text-gray-500">
                          @{contact.telegramUsername}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-center">
                {searchQuery
                  ? "Контакты не найдены"
                  : "Нет сохраненных контактов"}
              </div>
            )}
          </div>

          {/* Кнопка добавления нового контакта */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => {
                // Здесь можно открыть модальное окно для добавления нового контакта
                console.log("Добавить новый контакт");
              }}
              className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md focus:outline-none focus:bg-blue-50"
            >
              + Добавить новый контакт
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
