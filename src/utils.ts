/**
 * Utilities Module - Optimized for Super Fast Performance
 * Features: Memoization, caching, lazy evaluation, fast formatting
 * Version: 4.0.0 - Ultra Fast
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MarketTimeInfo {
  isOpen: boolean;
  timeRemaining: string | null;
  nextOpenTime: string | null;
  nextCloseTime: string | null;
  currentTime: string;
  percentageComplete: number;
  statusMessage: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type SoundType = 'click' | 'success' | 'error' | 'notification' | 'order' | 'alert';

// ============================================================================
// PERFORMANCE CACHES
// ============================================================================

// Simple in-memory cache for expensive operations
const cache = new Map<string, { value: any; expiry: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.value as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, value: any, ttl: number = CACHE_TTL): void {
  cache.set(key, { value, expiry: Date.now() + ttl });
}

// ============================================================================
// FAST CURRENCY FORMATTING (No Intl for speed, uses simple regex)
// ============================================================================

const CURRENCY_CACHE = new Map<string, string>();

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  if (amount === null || amount === undefined) return '₹0';
  
  // Cache key
  const cacheKey = amount.toFixed(2);
  const cached = CURRENCY_CACHE.get(cacheKey);
  if (cached) return cached;
  
  // Fast formatting (Indian number system)
  const rounded = Math.round(amount * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas to integer part (Indian style: lakhs, crores)
  let lastThree = integerPart.substring(integerPart.length - 3);
  let otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  let result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  
  const formatted = `₹${result}.${decimalPart}`;
  CURRENCY_CACHE.set(cacheKey, formatted);
  
  // Limit cache size
  if (CURRENCY_CACHE.size > 1000) {
    const firstKey = CURRENCY_CACHE.keys().next().value;
    CURRENCY_CACHE.delete(firstKey);
  }
  
  return formatted;
}

// Fast number formatting
const NUMBER_CACHE = new Map<string, string>();
export function formatNumber(num: number): string {
  if (isNaN(num)) return '0';
  const cacheKey = num.toString();
  const cached = NUMBER_CACHE.get(cacheKey);
  if (cached) return cached;
  
  const formatted = num.toLocaleString('en-IN');
  NUMBER_CACHE.set(cacheKey, formatted);
  return formatted;
}

// Fast percentage formatting
export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Fast compact number (K, M, B)
export function formatCompactNumber(num: number): string {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ============================================================================
// FAST DATE FORMATTING (Cached)
// ============================================================================

const DATE_CACHE = new Map<string, string>();

export function formatDate(timestamp: number): string {
  const cacheKey = timestamp.toString();
  const cached = DATE_CACHE.get(cacheKey);
  if (cached) return cached;
  
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  const formatted = `${day}/${month}/${year} ${hours}:${minutes}`;
  DATE_CACHE.set(cacheKey, formatted);
  
  if (DATE_CACHE.size > 500) {
    const firstKey = DATE_CACHE.keys().next().value;
    DATE_CACHE.delete(firstKey);
  }
  
  return formatted;
}

export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}

// ============================================================================
// MARKET TIME (Cached, recalculated every minute)
// ============================================================================

let cachedMarketInfo: MarketTimeInfo | null = null;
let lastMarketCalc = 0;

export function calculateMarketCountdown(): MarketTimeInfo {
  const now = Date.now();
  // Recalculate only every second (not every call)
  if (cachedMarketInfo && (now - lastMarketCalc) < 1000) {
    return cachedMarketInfo;
  }
  
  lastMarketCalc = now;
  
  const istTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;
  const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();
  const isWeekday = istTime.getDay() >= 1 && istTime.getDay() <= 5;
  
  let isOpen = false;
  let timeRemaining: string | null = null;
  let nextOpenTime: string | null = null;
  let nextCloseTime: string | null = null;
  let percentageComplete = 0;
  let statusMessage = '';
  
  if (!isWeekday) {
    statusMessage = 'Market closed on weekends';
    const nextMonday = new Date(istTime);
    nextMonday.setDate(istTime.getDate() + (8 - istTime.getDay()));
    nextMonday.setHours(9, 15, 0, 0);
    nextOpenTime = formatDate(nextMonday.getTime());
    const diff = nextMonday.getTime() - istTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
  } else if (currentMinutes < marketOpen) {
    statusMessage = 'Market yet to open';
    const openTime = new Date(istTime);
    openTime.setHours(9, 15, 0, 0);
    nextOpenTime = formatDate(openTime.getTime());
    const diff = openTime.getTime() - istTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
    percentageComplete = (currentMinutes / marketOpen) * 100;
  } else if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
    isOpen = true;
    statusMessage = 'Market is open';
    const closeTime = new Date(istTime);
    closeTime.setHours(15, 30, 0, 0);
    nextCloseTime = formatDate(closeTime.getTime());
    const diff = closeTime.getTime() - istTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
    percentageComplete = ((currentMinutes - marketOpen) / (marketClose - marketOpen)) * 100;
  } else {
    statusMessage = 'Market closed';
    const tomorrow = new Date(istTime);
    tomorrow.setDate(istTime.getDate() + 1);
    tomorrow.setHours(9, 15, 0, 0);
    nextOpenTime = formatDate(tomorrow.getTime());
    const diff = tomorrow.getTime() - istTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
    percentageComplete = 100;
  }
  
  cachedMarketInfo = {
    isOpen,
    timeRemaining,
    nextOpenTime,
    nextCloseTime,
    currentTime: formatDate(istTime.getTime()),
    percentageComplete: Math.min(100, Math.max(0, percentageComplete)),
    statusMessage,
  };
  
  return cachedMarketInfo;
}

export function isMarketOpen(): boolean {
  return calculateMarketCountdown().isOpen;
}

// ============================================================================
// FAST VALIDATIONS
// ============================================================================

export function validateDepositAmount(amount: number): ValidationResult {
  if (isNaN(amount)) return { isValid: false, error: 'Invalid amount' };
  if (amount < 100) return { isValid: false, error: 'Minimum ₹100' };
  if (amount > 10000000) return { isValid: false, error: 'Maximum ₹1,00,00,000' };
  return { isValid: true, value: amount };
}

export function validateWithdrawalAmount(amount: number, balance: number): ValidationResult {
  if (isNaN(amount)) return { isValid: false, error: 'Invalid amount' };
  if (amount < 100) return { isValid: false, error: 'Minimum ₹100' };
  if (amount > balance) return { isValid: false, error: 'Insufficient balance' };
  if (amount > 1000000) return { isValid: false, error: 'Max ₹10,00,000 per transaction' };
  return { isValid: true, value: amount };
}

const UPI_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
export function validateUPIId(upiId: string): ValidationResult {
  if (!upiId || upiId.trim().length === 0) return { isValid: false, error: 'UPI ID required' };
  if (!UPI_REGEX.test(upiId.trim())) return { isValid: false, error: 'Invalid UPI ID' };
  return { isValid: true, value: upiId.trim() };
}

export function validateName(name: string): ValidationResult {
  const trimmed = name?.trim();
  if (!trimmed) return { isValid: false, error: 'Name required' };
  if (trimmed.length < 3) return { isValid: false, error: 'Min 3 characters' };
  return { isValid: true, value: trimmed };
}

// ============================================================================
// FAST PORTFOLIO CALCULATIONS
// ============================================================================

export function calculatePortfolioValue(holdings: any[]): { invested: number; current: number } {
  let invested = 0;
  let current = 0;
  for (const h of holdings) {
    invested += h.investedValue || h.quantity * h.buyPrice;
    current += h.currentValue || h.quantity * h.currentPrice;
  }
  return { invested, current };
}

export function calculateTotalPL(holdings: any[]): number {
  let total = 0;
  for (const h of holdings) {
    const invested = h.investedValue || h.quantity * h.buyPrice;
    const current = h.currentValue || h.quantity * h.currentPrice;
    total += current - invested;
  }
  return total;
}

export function calculateDayPL(holdings: any[]): number {
  let total = 0;
  for (const h of holdings) {
    const dayChange = (h.currentPrice - (h.previousClose || h.buyPrice)) * h.quantity;
    total += dayChange;
  }
  return total;
}

// ============================================================================
// FAST ID GENERATION
// ============================================================================

let idCounter = 0;
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

// ============================================================================
// DEBOUNCE & THROTTLE (Optimized)
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  formatDate,
  getRelativeTime,
  calculateMarketCountdown,
  isMarketOpen,
  validateDepositAmount,
  validateWithdrawalAmount,
  validateUPIId,
  validateName,
  calculatePortfolioValue,
  calculateTotalPL,
  calculateDayPL,
  generateId,
  debounce,
  throttle,
};
