/**
 * Утилиты для работы с адресами TON
 */

/**
 * Проверяет, является ли строка корректным адресом TON
 * @param address - адрес для проверки
 * @returns true если адрес корректный
 */
export function isValidTonAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Проверяем raw формат (workchain:hash)
  if (address.includes(":")) {
    return isValidRawTonAddress(address);
  }

  // Проверяем user-friendly формат (UQ/EQ)
  if (address.startsWith("UQ") || address.startsWith("EQ")) {
    return isValidUserFriendlyTonAddress(address);
  }

  return false;
}

/**
 * Проверяет raw формат адреса TON (workchain:hash)
 * @param address - адрес в формате "0:hash"
 * @returns true если адрес корректный
 */
function isValidRawTonAddress(address: string): boolean {
  const parts = address.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [workchainStr, hash] = parts;

  // Проверяем workchain (должен быть 0 или -1)
  const workchain = parseInt(workchainStr, 10);
  if (workchain !== 0 && workchain !== -1) {
    return false;
  }

  // Проверяем hash (должен быть 64 символа hex)
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
    return false;
  }

  return true;
}

/**
 * Проверяет user-friendly формат адреса TON (UQ/EQ)
 * @param address - адрес в формате "UQ..." или "EQ..."
 * @returns true если адрес корректный
 */
function isValidUserFriendlyTonAddress(address: string): boolean {
  // Длина должна быть 48 символов
  if (address.length !== 48) {
    return false;
  }

  // Должен начинаться с UQ или EQ
  if (!address.startsWith("UQ") && !address.startsWith("EQ")) {
    return false;
  }

  // Остальные символы должны быть base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  if (!base64urlRegex.test(address.slice(2))) {
    return false;
  }

  return true;
}

/**
 * Нормализует адрес TON к единому формату
 * @param address - адрес для нормализации
 * @returns нормализованный адрес в raw формате
 */
export function normalizeTonAddress(address: string): string {
  if (!isValidTonAddress(address)) {
    throw new Error(`Invalid TON address: ${address}`);
  }

  // Если уже в raw формате, возвращаем как есть
  if (address.includes(":")) {
    return address.toLowerCase(); // Приводим к нижнему регистру
  }

  // Для user-friendly формата пока возвращаем как есть
  // В будущем можно добавить конвертацию в raw формат
  return address;
}

/**
 * Форматирует адрес для отображения пользователю
 * @param address - адрес для форматирования
 * @param maxLength - максимальная длина (по умолчанию 10)
 * @returns отформатированный адрес
 */
export function formatTonAddressForDisplay(
  address: string,
  maxLength: number = 10
): string {
  if (!address || address.length <= maxLength) {
    return address;
  }

  const start = Math.floor(maxLength / 2);
  const end = maxLength - start;

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Создает Deep Link для платежа TON
 * @param address - адрес получателя
 * @param amount - сумма в nanoTON
 * @param comment - комментарий к платежу
 * @returns Deep Link для открытия кошелька
 */
export function createTonPaymentDeeplink(
  address: string,
  amount: string,
  comment?: string
): string {
  if (!isValidTonAddress(address)) {
    throw new Error(`Invalid TON address: ${address}`);
  }

  const params = new URLSearchParams();
  params.set("amount", amount);

  if (comment) {
    params.set("text", comment);
  }

  return `ton://transfer/${address}?${params.toString()}`;
}

/**
 * Извлекает workchain из raw адреса TON
 * @param address - адрес в raw формате
 * @returns номер workchain
 */
export function extractWorkchain(address: string): number {
  if (!address.includes(":")) {
    throw new Error("Address must be in raw format (workchain:hash)");
  }

  const workchainStr = address.split(":")[0];
  return parseInt(workchainStr, 10);
}

/**
 * Извлекает hash из raw адреса TON
 * @param address - адрес в raw формате
 * @returns hash адреса
 */
export function extractHash(address: string): string {
  if (!address.includes(":")) {
    throw new Error("Address must be in raw format (workchain:hash)");
  }

  return address.split(":")[1];
}

/**
 * Проверяет, является ли адрес bounceable
 * @param address - адрес в user-friendly формате
 * @returns true если адрес bounceable
 */
export function isBounceableAddress(address: string): boolean {
  if (!isValidUserFriendlyTonAddress(address)) {
    throw new Error("Address must be in user-friendly format (UQ/EQ)");
  }

  // В TON bounceable адреса начинаются с UQ, non-bounceable с EQ
  return address.startsWith("UQ");
}

/**
 * Примеры использования:
 *
 * // Валидация
 * isValidTonAddress("0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f") // true
 * isValidTonAddress("UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH") // true
 * isValidTonAddress("invalid") // false
 *
 * // Нормализация
 * normalizeTonAddress("0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f") // "0:83dfd552..."
 *
 * // Форматирование для отображения
 * formatTonAddressForDisplay("0:83dfd552e63729b471fc03dca9e96bfd0197afbe46e2112b5eb4f24868b51e0f") // "0:83dfd5...51e0f"
 *
 * // Создание Deep Link
 * createTonPaymentDeeplink("0:83dfd552...", "1000000000", "Payment") // "ton://transfer/0:83dfd552...?amount=1000000000&text=Payment"
 */
