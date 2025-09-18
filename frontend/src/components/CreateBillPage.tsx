import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "../hooks/useTelegram";
import { useBillStore } from "../stores/billStore";
import { ParticipantAdder } from "./ParticipantAdder";
import { createBillSchema, type CreateBillData } from "../utils/validation";

const CreateBillPage: React.FC = () => {
  const navigate = useNavigate();
  const { hapticFeedback, showSuccess, showError } = useTelegram();
  const { createBill, isLoading } = useBillStore();

  const [formData, setFormData] = useState<CreateBillData>({
    title: "",
    description: "",
    totalAmount: 0,
    currency: "USDT",
    participants: [],
    splitType: "equal",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Автоматически пересчитываем равные доли при изменении общей суммы
  useEffect(() => {
    if (
      formData.splitType === "equal" &&
      formData.totalAmount > 0 &&
      formData.participants.length > 0
    ) {
      const amountPerPerson =
        formData.totalAmount / formData.participants.length;
      const needsUpdate = formData.participants.some(
        p => Math.abs(p.amount - amountPerPerson) > 0.01
      );

      if (needsUpdate) {
        setFormData(prev => ({
          ...prev,
          participants: prev.participants.map(p => ({
            ...p,
            amount: amountPerPerson,
          })),
        }));
      }
    }
  }, [formData.totalAmount, formData.splitType, formData.participants.length]);

  const handleInputChange = (
    field: keyof CreateBillData,
    value: string | number
  ) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      };

      // Автоматически пересчитываем равные доли при изменении типа разделения или общей суммы
      if (field === "splitType" && value === "equal") {
        if (newData.totalAmount > 0 && newData.participants.length > 0) {
          const amountPerPerson =
            newData.totalAmount / newData.participants.length;
          newData.participants = newData.participants.map(p => ({
            ...p,
            amount: amountPerPerson,
          }));
        }
      }

      return newData;
    });

    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Валидация с Zod
      const validatedData = createBillSchema.parse(formData);

      hapticFeedback.impact("medium");

      const result = await createBill({
        title: validatedData.title,
        description: validatedData.description || undefined,
        totalAmount: validatedData.totalAmount,
        currency: validatedData.currency,
        participants: validatedData.participants,
        splitType: validatedData.splitType,
      });

      showSuccess("Счёт успешно создан!");
      // Переходим к просмотру созданного счета
      navigate(`/bill/${(result as any)?.id || "new"}`);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        // Обрабатываем ошибки валидации Zod
        const zodError = error as any;
        const fieldErrors: Record<string, string> = {};

        zodError.errors?.forEach((err: any) => {
          if (err.path.length > 0) {
            fieldErrors[err.path.join(".")] = err.message;
          }
        });

        setErrors(fieldErrors);
        showError("Проверьте правильность заполнения формы");
      } else {
        showError("Ошибка при создании счёта");
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
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={e => handleInputChange("title", e.target.value)}
            placeholder="Например: Ужин в ресторане"
            className={errors.title ? "error" : ""}
          />
          {errors.title && (
            <span className="error-message">{errors.title}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={e => handleInputChange("description", e.target.value)}
            placeholder="Дополнительная информация о счёте"
            rows={3}
          />
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
          <select
            id="currency"
            value={formData.currency}
            onChange={e => handleInputChange("currency", e.target.value)}
          >
            <option value="USDT">USDT</option>
            <option value="TON">TON</option>
          </select>
        </div>

        <div className="form-group">
          <label>Тип разделения</label>
          <div className="split-type-toggle">
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
        </div>

        <div className="participants-section">
          <h3>Участники</h3>
          <ParticipantAdder
            participants={formData.participants.map(p => ({
              id: p.name + p.username, // Простой ID для совместимости
              name: p.name,
              telegramUsername: p.telegramUsername,
              shareAmount: p.amount.toString(),
            }))}
            onParticipantsChange={participants => {
              setFormData(prev => ({
                ...prev,
                participants: participants.map(p => ({
                  name: p.name,
                  username: p.telegramUsername,
                  telegramUsername: p.telegramUsername,
                  amount: parseFloat(p.shareAmount),
                })),
              }));
            }}
            totalAmount={formData.totalAmount}
            splitType={formData.splitType}
          />

          {errors.participants && (
            <span className="error-message">{errors.participants}</span>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? "Создание..." : "Создать & Поделиться"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBillPage;
