import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";
import { ParticipantAdder } from "./ParticipantAdder";
import {
  createBillSchema,
  type CreateBillData,
  type ParticipantData,
} from "../utils/validation";
import CustomSelect from "./CustomSelect";
import BillTitleInput from "./BillTitleInput";
import WalletConnect from "./WalletConnect";
import { userApi, friendsApi } from "../services/api";
import { useToast } from "../hooks/useToast";
import ToastContainer from "./ToastContainer";

// Расширенный интерфейс для участника с полем isPayer
interface ExtendedParticipantData extends ParticipantData {
  isPayer?: boolean;
}

// Интерфейс для друга
interface Friend {
  id: string;
  name: string;
  telegramUsername?: string;
}

// Функция для равномерного распределения суммы - каждый получает одинаковую сумму, округленную в большую сторону
const distributeAmountEqually = (
  totalAmount: number,
  participantCount: number
): number[] => {
  if (participantCount === 0) return [];

  // Делим сумму поровну и округляем в большую сторону до сотых
  const equalAmount = Math.ceil((totalAmount / participantCount) * 100) / 100;

  // Все участники получают одинаковую сумму
  return Array(participantCount).fill(equalAmount);
};

const CreateBillPage: React.FC = () => {
  const navigate = useNavigate();
  const { hapticFeedback, user, webApp } = useTelegram();
  const { createBill, isLoading } = useBillStore();
  const { toasts, showError, hideToast } = useToast();

  const [formData, setFormData] = useState<CreateBillData>({
    title: "",
    description: "",
    totalAmount: 0,
    currency: "USDT",
    participants: [],
    splitType: "equal",
    creatorWalletAddress: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(
    null
  );
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const prevValuesRef = useRef({
    totalAmount: 0,
    splitType: "equal" as "equal" | "custom",
    participantsCount: 0,
  });

  // Настройка Telegram BackButton
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(() => {
        navigate(-1);
      });
    }

    return () => {
      if (webApp?.BackButton) {
        webApp.BackButton.hide();
        webApp.BackButton.offClick(() => {
          navigate(-1);
        });
      }
    };
  }, [webApp, navigate]);

  // Функция для обновления адреса кошелька из API
  const updateWalletAddressFromAPI = useCallback(async () => {
    try {
      console.log("🔗 updateWalletAddressFromAPI: Getting user data from API");
      const response = await userApi.getMe();
      console.log(
        "🔗 updateWalletAddressFromAPI: API response:",
        response.data
      );

      if (response.data?.success && response.data?.data?.tonWalletAddress) {
        const walletAddress = response.data.data.tonWalletAddress;
        console.log(
          "🔗 updateWalletAddressFromAPI: Found wallet address:",
          walletAddress
        );

        setUserWalletAddress(walletAddress);
        setFormData(prev => ({
          ...prev,
          creatorWalletAddress: walletAddress,
        }));

        console.log(
          "🔗 updateWalletAddressFromAPI: Updated state with wallet address"
        );
      } else {
        console.log(
          "🔗 updateWalletAddressFromAPI: No wallet address found in API response"
        );
      }
    } catch (error) {
      console.log("🔗 updateWalletAddressFromAPI: Error:", error);
    }
  }, []);

  // Автоматически добавляем себя при загрузке пользователя
  useEffect(() => {
    const addCurrentUser = async () => {
      if (formData.participants.length === 0) {
        try {
          // Сначала пытаемся получить данные из API
          const response = await userApi.getMe();
          if (response.data?.success && response.data?.data) {
            const userData = response.data.data;

            // Сохраняем адрес кошелька пользователя
            if (userData.tonWalletAddress) {
              setUserWalletAddress(userData.tonWalletAddress);
              setFormData(prev => ({
                ...prev,
                creatorWalletAddress: userData.tonWalletAddress,
              }));
            }

            const selfParticipant = {
              name: userData.firstName || "Пользователь",
              username: userData.username || "",
              telegramUsername: userData.username || "",
              telegramUserId:
                userData.telegramUserId || user?.id?.toString() || "",
              amount: 0,
            };

            setFormData(prev => {
              // Проверяем, не добавлен ли уже пользователь
              const isAlreadyAdded = prev.participants.some(
                p => p.telegramUserId === selfParticipant.telegramUserId
              );

              if (isAlreadyAdded) {
                return prev;
              }

              return {
                ...prev,
                participants: [selfParticipant],
              };
            });
            return;
          }
        } catch (error) {
          console.log("Не удалось получить данные пользователя из API:", error);
        }

        // Fallback: используем данные из Telegram WebApp
        if (user) {
          const selfParticipant = {
            name: `${user.first_name}${
              user.last_name ? ` ${user.last_name}` : ""
            }`,
            username: user.username || "",
            telegramUsername: user.username || "",
            telegramUserId: user.id.toString(),
            amount: 0,
          };

          setFormData(prev => {
            // Проверяем, не добавлен ли уже пользователь
            const isAlreadyAdded = prev.participants.some(
              p => p.telegramUserId === selfParticipant.telegramUserId
            );

            if (isAlreadyAdded) {
              return prev;
            }

            return {
              ...prev,
              participants: [selfParticipant],
            };
          });
        }
      }
    };

    addCurrentUser();
  }, [user, formData.participants.length]);

  // Загружаем список друзей один раз
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const response = await friendsApi.getFriends();
        setFriends(response.data.friends || []);
      } catch (error) {
        console.error("Ошибка загрузки друзей:", error);
      }
    };

    loadFriends();
  }, []);

  // Автоматически пересчитываем равные доли при изменении общей суммы
  useEffect(() => {
    const currentValues = {
      totalAmount: formData.totalAmount,
      splitType: formData.splitType,
      participantsCount: formData.participants.length,
    };

    const prevValues = prevValuesRef.current;

    // Проверяем, изменились ли значения, которые должны вызвать пересчет
    const shouldRecalculate =
      formData.splitType === "equal" &&
      formData.totalAmount > 0 &&
      formData.participants.length > 0 &&
      (prevValues.totalAmount !== currentValues.totalAmount ||
        prevValues.splitType !== currentValues.splitType ||
        prevValues.participantsCount !== currentValues.participantsCount);

    if (shouldRecalculate) {
      const distributedAmounts = distributeAmountEqually(
        formData.totalAmount,
        formData.participants.length
      );

      setFormData(prev => {
        const needsUpdate = prev.participants.some(
          (p, index) => Math.abs(p.amount - distributedAmounts[index]) > 0.01
        );

        if (!needsUpdate) {
          return prev;
        }

        return {
          ...prev,
          participants: prev.participants.map((p, index) => ({
            ...p,
            amount: distributedAmounts[index],
          })),
        };
      });
    }

    // Обновляем предыдущие значения
    prevValuesRef.current = currentValues;
  }, [formData.totalAmount, formData.splitType, formData.participants.length]);

  const handleParticipantsChange = useCallback(
    (
      participants: Array<{
        id: string;
        name: string;
        telegramUsername?: string;
        telegramUserId?: string;
        shareAmount: string;
        isPayer?: boolean;
      }>
    ) => {
      setFormData(prev => {
        console.log("📥 Получены участники из ParticipantAdder:", participants);

        const newParticipants = participants.map(p => ({
          id: p.id, // Сохраняем ID
          name: p.name,
          username: p.telegramUsername,
          telegramUsername: p.telegramUsername,
          telegramUserId: p.telegramUserId,
          amount: parseFloat(p.shareAmount),
          isPayer: p.isPayer || false,
        }));

        console.log("🔄 Преобразованные участники:", newParticipants);
        console.log("📊 Предыдущие участники:", prev.participants);

        // Проверяем, действительно ли изменились участники
        const hasChanges =
          prev.participants.length !== newParticipants.length ||
          prev.participants.some((oldP, index) => {
            const newP = newParticipants[index];
            return (
              !newP ||
              oldP.name !== newP.name ||
              oldP.telegramUsername !== newP.telegramUsername ||
              oldP.telegramUserId !== newP.telegramUserId ||
              Math.abs(oldP.amount - newP.amount) > 0.01 ||
              (oldP as ExtendedParticipantData).isPayer !== newP.isPayer
            );
          });

        console.log("🔍 Есть изменения:", hasChanges);

        if (!hasChanges) {
          console.log("⏭️ Изменений нет, пропускаем обновление");
          return prev;
        }

        console.log("✅ Обновляем участников");
        return {
          ...prev,
          participants: newParticipants,
        };
      });
    },
    []
  );

  const handleSplitTypeChange = useCallback((splitType: "equal" | "custom") => {
    setFormData(prev => ({ ...prev, splitType }));
  }, []);

  const handleWalletConnected = useCallback((address: string) => {
    console.log("🔗 handleWalletConnected called with address:", address);

    setUserWalletAddress(address);
    setFormData(prev => ({
      ...prev,
      creatorWalletAddress: address,
    }));
    setShowWalletConnect(false);

    console.log("🔗 handleWalletConnected: Updated state and closed modal");
  }, []);

  const handleConnectWalletClick = useCallback(async () => {
    console.log("🔗 handleConnectWalletClick called");
    console.log("🔗 Current userWalletAddress:", userWalletAddress);

    // Сначала обновляем адрес кошелька из API
    await updateWalletAddressFromAPI();

    console.log(
      "🔗 After updateWalletAddressFromAPI, userWalletAddress:",
      userWalletAddress
    );
    console.log("🔗 Setting showWalletConnect to true");

    setShowWalletConnect(true);
  }, [updateWalletAddressFromAPI, userWalletAddress]);

  // Функция для валидации всех полей
  const validateForm = (data: CreateBillData) => {
    const validationErrors: Record<string, string> = {};

    if (!data.title || data.title.trim().length === 0) {
      validationErrors.title = "Название обязательно";
    }

    if (!data.totalAmount || data.totalAmount <= 0) {
      validationErrors.totalAmount = "Общая сумма должна быть больше 0";
    }

    if (!data.participants || data.participants.length < 2) {
      validationErrors.participants = "Добавьте минимум 2 участника";
    } else {
      const hasPayer = data.participants.some(
        p => (p as ExtendedParticipantData).isPayer === true
      );
      if (!hasPayer) {
        validationErrors.participants =
          "Необходимо указать, кто заплатил за счёт";
      }
    }

    return validationErrors;
  };

  const handleInputChange = (
    field: keyof CreateBillData,
    value: string | number
  ) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };

    setFormData(newFormData);

    // Валидируем форму в реальном времени
    const validationErrors = validateForm(newFormData);
    setErrors(validationErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🎯 Функция handleSubmit вызвана!");
    console.log("🚀 Попытка создания счета с данными:", formData);

    // Сначала очищаем предыдущие ошибки
    setErrors({});

    // Проверка валидации
    const validationErrors = validateForm(formData);
    console.log("🔍 Проверка валидации:", validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      console.log("❌ Найдены ошибки валидации, устанавливаем их");
      setErrors(validationErrors);
      return; // Прерываем выполнение
    }

    try {
      // Валидация с Zod
      console.log("🔍 Начинаем валидацию с Zod...");
      const validatedData = createBillSchema.parse(formData);
      console.log("✅ Валидация прошла успешно:", validatedData);

      hapticFeedback.impact("medium");

      // Определяем нужно ли передавать кошелек (только если пользователь является плательщиком)
      const currentUserParticipant = validatedData.participants.find(
        p => p.telegramUserId === (user?.id?.toString() || "")
      );

      // Если не нашли по telegramUserId, попробуем найти по имени (первый участник - создатель)
      const fallbackParticipant =
        !currentUserParticipant && validatedData.participants.length > 0
          ? validatedData.participants[0]
          : currentUserParticipant;

      const isCurrentUserPayer = (
        fallbackParticipant ||
        (currentUserParticipant as ExtendedParticipantData)
      )?.isPayer;

      const result = await createBill({
        title: validatedData.title,
        description: validatedData.description || undefined,
        totalAmount: validatedData.totalAmount,
        currency: validatedData.currency,
        participants: validatedData.participants,
        splitType: validatedData.splitType,
        creatorWalletAddress: isCurrentUserPayer
          ? validatedData.creatorWalletAddress
          : undefined,
      });

      // showSuccess("🎉 Счёт успешно создан!", 2000);

      // Переходим к просмотру созданного счета через небольшую задержку
      setTimeout(() => {
        navigate(`/bill/${result.id}`);
      }, 1000);
    } catch (error) {
      console.log("❌ Ошибка при валидации:", error);

      if (error instanceof Error && error.name === "ZodError") {
        // Обрабатываем ошибки валидации Zod
        const zodError = error as {
          errors?: Array<{ path: string[]; message: string }>;
        };

        console.log("🔍 Zod ошибки:", zodError.errors);
        const fieldErrors: Record<string, string> = {};

        zodError.errors?.forEach((err: { path: string[]; message: string }) => {
          console.log("🔍 Обрабатываем ошибку:", err);
          if (err.path.length > 0) {
            const fieldPath = err.path.join(".");

            // Обрабатываем ошибки участников отдельно
            if (fieldPath.startsWith("participants")) {
              fieldErrors["participants"] = err.message;
            } else {
              // Для остальных полей используем первый элемент пути
              fieldErrors[err.path[0]] = err.message;
            }
          }
        });

        console.log("🔍 Ошибки валидации:", fieldErrors);
        setErrors(fieldErrors);
      } else {
        console.log("❌ Неизвестная ошибка:", error);
        showError("❌ Ошибка при создании счёта");
      }
    }
  };

  return (
    <div className="create-bill-page">
      <div className="header">
        <h1>📝 Создать счёт</h1>
      </div>

      <form onSubmit={handleSubmit} className="bill-form">
        <div className="form-group">
          <label htmlFor="title">Название счёта *</label>
          <BillTitleInput
            value={formData.title}
            onChange={value => handleInputChange("title", value)}
            placeholder="Например: Ужин в ресторане"
            error={errors.title}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={e => handleInputChange("description", e.target.value)}
            placeholder="Дополнительная информация о счёте"
            rows={3}
            className={errors.description ? "error" : ""}
          />
          {errors.description && (
            <span className="error-message">{errors.description}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="totalAmount">Общая сумма *</label>
          <input
            id="totalAmount"
            type="number"
            step="0.01"
            min="0"
            value={formData.totalAmount}
            onChange={e =>
              handleInputChange("totalAmount", parseFloat(e.target.value) || 0)
            }
            placeholder="0.00"
            className={errors.totalAmount ? "error" : ""}
          />
          {errors.totalAmount && (
            <span className="error-message">{errors.totalAmount}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="currency">Валюта</label>
          <CustomSelect
            options={[
              { value: "USDT", label: "USDT", icon: "💵" },
              { value: "TON", label: "TON", icon: "💎" },
            ]}
            value={formData.currency}
            onChange={value => handleInputChange("currency", value)}
            placeholder="Выберите валюту"
          />
          {errors.currency && (
            <span className="error-message">{errors.currency}</span>
          )}
        </div>

        <div className="form-group">
          <label>Тип разделения</label>
          <div
            className={`split-type-toggle ${errors.splitType ? "error" : ""}`}
          >
            <button
              type="button"
              className={`toggle-button ${
                formData.splitType === "equal" ? "active" : ""
              }`}
              onClick={() => handleInputChange("splitType", "equal")}
            >
              Разделить поровну
            </button>
            <button
              type="button"
              className={`toggle-button ${
                formData.splitType === "custom" ? "active" : ""
              }`}
              onClick={() => handleInputChange("splitType", "custom")}
            >
              Неравный
            </button>
          </div>
          {errors.splitType && (
            <span className="error-message">{errors.splitType}</span>
          )}
        </div>

        <div
          className={`participants-section ${
            errors.participants ? "has-error" : ""
          }`}
        >
          <h3>Участники</h3>
          <ParticipantAdder
            participants={formData.participants.map((p, index) => ({
              id:
                p.id ||
                `${p.name}_${p.telegramUsername || "no_username"}_${index}`, // Сохраняем оригинальный ID
              name: p.name,
              telegramUsername: p.telegramUsername,
              telegramUserId: p.telegramUserId,
              shareAmount: p.amount.toString(),
              isPayer: (p as ExtendedParticipantData).isPayer || false,
            }))}
            onParticipantsChange={handleParticipantsChange}
            totalAmount={formData.totalAmount}
            splitType={formData.splitType}
            onSplitTypeChange={handleSplitTypeChange}
            currency={formData.currency}
            friends={friends}
            payerError={errors.participants}
          />
        </div>

        {/* Поле кошелька - последний шаг перед созданием счета */}
        {(() => {
          // Ищем текущего пользователя среди участников
          // Сначала пробуем найти по telegramUserId
          let currentUserParticipant = formData.participants.find(
            p => p.telegramUserId === user?.id?.toString()
          );

          // Если не нашли по telegramUserId, пробуем найти по имени (fallback)
          if (!currentUserParticipant && user?.first_name) {
            currentUserParticipant = formData.participants.find(
              p => p.name.includes(user.first_name) || p.name.includes("Тест")
            );
          }

          // Если все еще не нашли, используем первого участника как fallback
          if (!currentUserParticipant && formData.participants.length > 0) {
            currentUserParticipant = formData.participants[0];
          }

          const isCurrentUserPayer =
            (currentUserParticipant as ExtendedParticipantData)?.isPayer ===
            true;

          // Отладка для диагностики
          console.log("🔍 Кошелек - Отладка:");
          console.log("  user?.id:", user?.id);
          console.log("  user?.first_name:", user?.first_name);
          console.log(
            "  participants:",
            formData.participants.map(p => ({
              name: p.name,
              telegramUserId: p.telegramUserId,
              telegramUserIdType: typeof p.telegramUserId,
              isPayer: (p as ExtendedParticipantData).isPayer,
            }))
          );
          console.log("  currentUserParticipant:", currentUserParticipant);
          console.log("  isCurrentUserPayer:", isCurrentUserPayer);

          // Показываем поле кошелька только если текущий пользователь является плательщиком
          if (isCurrentUserPayer) {
            console.log(
              "🎯 Показываем кошелек! isCurrentUserPayer:",
              isCurrentUserPayer
            );
            return (
              <div className="form-group">
                <label>Ваш кошелек для получения платежей</label>
                {userWalletAddress ? (
                  <div className="wallet-display">
                    <div className="wallet-info">
                      <span className="wallet-icon">💎</span>
                      <span className="wallet-address">
                        {userWalletAddress.slice(0, 6)}...
                        {userWalletAddress.slice(-6)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={handleConnectWalletClick}
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <div className="wallet-connect-prompt">
                    <p>Подключите TON кошелек для получения платежей</p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleConnectWalletClick}
                    >
                      Подключить кошелек
                    </button>
                  </div>
                )}
                {errors.creatorWalletAddress && (
                  <span className="error-message">
                    {errors.creatorWalletAddress}
                  </span>
                )}
              </div>
            );
          }
          console.log(
            "❌ Кошелек НЕ показываем! isCurrentUserPayer:",
            isCurrentUserPayer
          );
          return null;
        })()}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? "Создание..." : "Создать & Поделиться"}
          </button>
        </div>
      </form>

      {/* Контейнер для уведомлений */}
      <ToastContainer toasts={toasts} onHideToast={hideToast} />

      {/* Модальное окно для подключения кошелька */}
      {showWalletConnect && (
        <div className="modal-overlay">
          <div className="modal-content">
            <WalletConnect
              onWalletConnected={handleWalletConnected}
              onCancel={() => setShowWalletConnect(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBillPage;
