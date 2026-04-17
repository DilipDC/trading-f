/**
 * Utilities Module - Trading Platform Helper Functions
 * @module utils
 * @description Provides utility functions for formatting, validation, calculations, time management, and common operations
 * @version 2.0.0
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

export interface ToastMessage {
  message: string;
  type: ToastType;
  duration?: number;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type SoundType = 'click' | 'success' | 'error' | 'notification' | 'order' | 'alert';

export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}

export interface DateFormatOptions {
  includeTime?: boolean;
  includeSeconds?: boolean;
  timezone?: string;
  format24h?: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// CURRENCY & NUMBER FORMATTING
// ============================================================================

/**
 * Format number as Indian currency (₹)
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = 'en-IN',
    currency = 'INR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
  } = options;

  if (isNaN(amount)) return '₹0.00';
  if (amount === null || amount === undefined) return '₹0.00';

  try {
    if (compact && Math.abs(amount) >= 10000000) {
      const crores = amount / 10000000;
      return `₹${crores.toFixed(2)}Cr`;
    }
    
    if (compact && Math.abs(amount) >= 100000) {
      const lakhs = amount / 100000;
      return `₹${lakhs.toFixed(2)}L`;
    }

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    });
    
    return formatter.format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `₹${amount.toFixed(2)}`;
  }
}

/**
 * Format number with commas (Indian numbering system)
 */
export function formatNumber(num: number, decimals: number = 0): string {
  if (isNaN(num)) return '0';
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  
  return new Intl.NumberFormat('en-IN', options).format(num);
}

/**
 * Format percentage with sign
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '0.00%';
  
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Parse number from formatted string
 */
export function parseNumber(value: string): number {
  if (!value) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toString();
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Format timestamp to readable date/time
 */
export function formatDate(
  timestamp: number | Date,
  options: DateFormatOptions = {}
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  const {
    includeTime = true,
    includeSeconds = false,
    timezone = 'Asia/Kolkata',
    format24h = true,
  } = options;
  
  const formattedDate = date.toLocaleDateString('en-IN', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  
  if (!includeTime) return formattedDate;
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !format24h,
  };
  
  if (includeSeconds) {
    timeOptions.second = '2-digit';
  }
  
  const formattedTime = date.toLocaleTimeString('en-IN', timeOptions);
  
  return `${formattedDate} ${formattedTime}`;
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 10) return `${seconds} seconds ago`;
  return 'Just now';
}

/**
 * Calculate market countdown timer
 */
export function calculateMarketCountdown(): MarketTimeInfo {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const marketOpen = 9 * 60 + 15; // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM
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
    nextOpenTime = formatDate(nextMonday, { includeTime: true, includeSeconds: false });
    
    const diff = nextMonday.getTime() - istTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
  } else if (currentMinutes < marketOpen) {
    statusMessage = 'Market yet to open';
    const openTime = new Date(istTime);
    openTime.setHours(9, 15, 0, 0);
    nextOpenTime = formatDate(openTime, { includeTime: true, includeSeconds: false });
    
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
    nextCloseTime = formatDate(closeTime, { includeTime: true, includeSeconds: false });
    
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
    nextOpenTime = formatDate(tomorrow, { includeTime: true, includeSeconds: false });
    
    const diff = tomorrow.getTime() - istTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timeRemaining = `${hours}h ${minutes}m`;
    percentageComplete = 100;
  }
  
  return {
    isOpen,
    timeRemaining,
    nextOpenTime,
    nextCloseTime,
    currentTime: formatDate(istTime, { includeTime: true, includeSeconds: true }),
    percentageComplete: Math.min(100, Math.max(0, percentageComplete)),
    statusMessage,
  };
}

/**
 * Check if market is currently open
 */
export function isMarketOpen(): boolean {
  const info = calculateMarketCountdown();
  return info.isOpen;
}

/**
 * Get formatted market time remaining
 */
export function getMarketTimeRemaining(): string | null {
  const info = calculateMarketCountdown();
  return info.timeRemaining;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate deposit amount
 */
export function validateDepositAmount(amount: number): ValidationResult {
  if (isNaN(amount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (amount < 100) {
    return { isValid: false, error: 'Minimum deposit amount is ₹100' };
  }
  
  if (amount > 10000000) {
    return { isValid: false, error: 'Maximum deposit amount is ₹1,00,00,000' };
  }
  
  if (!Number.isInteger(amount) && amount % 100 !== 0) {
    return { isValid: false, error: 'Amount should be in multiples of ₹100' };
  }
  
  return { isValid: true, value: amount };
}

/**
 * Validate withdrawal amount
 */
export function validateWithdrawalAmount(amount: number, availableBalance: number): ValidationResult {
  if (isNaN(amount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (amount < 100) {
    return { isValid: false, error: 'Minimum withdrawal amount is ₹100' };
  }
  
  if (amount > availableBalance) {
    return { isValid: false, error: `Insufficient balance. Available: ₹${formatCurrency(availableBalance)}` };
  }
  
  if (amount > 1000000) {
    return { isValid: false, error: 'Maximum withdrawal amount per transaction is ₹10,00,000' };
  }
  
  return { isValid: true, value: amount };
}

/**
 * Validate UPI ID format
 */
export function validateUPIId(upiId: string): ValidationResult {
  if (!upiId || upiId.trim().length === 0) {
    return { isValid: false, error: 'UPI ID is required' };
  }
  
  const trimmed = upiId.trim();
  
  // Basic UPI ID regex pattern
  const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  
  if (!upiPattern.test(trimmed)) {
    return { isValid: false, error: 'Invalid UPI ID format. Example: username@bank' };
  }
  
  if (trimmed.length < 5 || trimmed.length > 50) {
    return { isValid: false, error: 'UPI ID must be between 5 and 50 characters' };
  }
  
  return { isValid: true, value: trimmed };
}

/**
 * Validate name (for withdrawals)
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Name must be at least 3 characters' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Name must be less than 100 characters' };
  }
  
  const namePattern = /^[a-zA-Z\s.-]+$/;
  if (!namePattern.test(trimmed)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, dots, and hyphens' };
  }
  
  return { isValid: true, value: trimmed };
}

/**
 * Validate stock quantity
 */
export function validateQuantity(quantity: number, maxQuantity: number = 100000): ValidationResult {
  if (isNaN(quantity)) {
    return { isValid: false, error: 'Please enter a valid quantity' };
  }
  
  if (!Number.isInteger(quantity)) {
    return { isValid: false, error: 'Quantity must be a whole number' };
  }
  
  if (quantity <= 0) {
    return { isValid: false, error: 'Quantity must be greater than 0' };
  }
  
  if (quantity > maxQuantity) {
    return { isValid: false, error: `Maximum quantity per order is ${formatNumber(maxQuantity)}` };
  }
  
  return { isValid: true, value: quantity };
}

/**
 * Validate price (for limit orders)
 */
export function validatePrice(price: number, minPrice: number = 0.05): ValidationResult {
  if (isNaN(price)) {
    return { isValid: false, error: 'Please enter a valid price' };
  }
  
  if (price <= 0) {
    return { isValid: false, error: 'Price must be greater than 0' };
  }
  
  if (price < minPrice) {
    return { isValid: false, error: `Price cannot be less than ₹${minPrice}` };
  }
  
  return { isValid: true, value: price };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailPattern.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, value: email.trim().toLowerCase() };
}

/**
 * Validate phone number (Indian)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Phone number must be 10 digits' };
  }
  
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: false, error: 'Please enter a valid Indian mobile number' };
  }
  
  return { isValid: true, value: cleaned };
}

// ============================================================================
// PORTFOLIO & TRADING CALCULATIONS
// ============================================================================

/**
 * Calculate total portfolio value
 */
export function calculatePortfolioValue(holdings: any[]): { invested: number; current: number } {
  return holdings.reduce(
    (acc, holding) => ({
      invested: acc.invested + (holding.investedValue || holding.quantity * holding.buyPrice),
      current: acc.current + (holding.currentValue || holding.quantity * holding.currentPrice),
    }),
    { invested: 0, current: 0 }
  );
}

/**
 * Calculate total profit/loss
 */
export function calculateTotalPL(holdings: any[]): number {
  return holdings.reduce((total, holding) => {
    const pl = (holding.currentValue || holding.quantity * holding.currentPrice) - 
               (holding.investedValue || holding.quantity * holding.buyPrice);
    return total + pl;
  }, 0);
}

/**
 * Calculate day's profit/loss
 */
export function calculateDayPL(holdings: any[]): number {
  return holdings.reduce((total, holding) => {
    const dayChange = (holding.currentPrice - (holding.previousClose || holding.buyPrice)) * holding.quantity;
    return total + dayChange;
  }, 0);
}

/**
 * Calculate average buy price
 */
export function calculateAveragePrice(quantity: number, totalCost: number): number {
  if (quantity === 0) return 0;
  return totalCost / quantity;
}

/**
 * Calculate brokerage fee (Zerodha-like)
 */
export function calculateBrokerage(
  quantity: number,
  price: number,
  segment: 'equity' | 'futures' | 'options' = 'equity'
): number {
  const totalValue = quantity * price;
  let brokerage = 0;
  
  switch (segment) {
    case 'equity':
      // ₹0 brokerage for equity delivery
      brokerage = 0;
      break;
    case 'futures':
      // ₹20 per order or 0.01% whichever is lower
      brokerage = Math.min(20, totalValue * 0.0001);
      break;
    case 'options':
      // ₹20 per order
      brokerage = 20;
      break;
  }
  
  return Math.ceil(brokerage);
}

/**
 * Calculate STT (Securities Transaction Tax)
 */
export function calculateSTT(quantity: number, price: number, isSell: boolean): number {
  const totalValue = quantity * price;
  if (isSell) {
    // 0.1% on sell side for equity delivery
    return totalValue * 0.001;
  }
  return 0;
}

/**
 * Calculate GST on brokerage
 */
export function calculateGST(brokerage: number): number {
  // 18% GST on brokerage
  return brokerage * 0.18;
}

/**
 * Calculate total charges for an order
 */
export function calculateTotalCharges(
  quantity: number,
  price: number,
  isSell: boolean,
  segment: 'equity' | 'futures' | 'options' = 'equity'
): {
  brokerage: number;
  stt: number;
  gst: number;
  exchangeCharges: number;
  sebiCharges: number;
  stampDuty: number;
  total: number;
} {
  const brokerage = calculateBrokerage(quantity, price, segment);
  const stt = calculateSTT(quantity, price, isSell);
  const gst = calculateGST(brokerage);
  const exchangeCharges = (quantity * price) * 0.00003; // 0.003%
  const sebiCharges = 10; // ₹10 per crore
  const stampDuty = (quantity * price) * 0.00001; // 0.001%
  
  const total = brokerage + stt + gst + exchangeCharges + sebiCharges + stampDuty;
  
  return {
    brokerage,
    stt,
    gst,
    exchangeCharges,
    sebiCharges,
    stampDuty,
    total,
  };
}

// ============================================================================
// STRING & DATA MANIPULATION
// ============================================================================

/**
 * Generate unique ID
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (obj instanceof RegExp) return new RegExp(obj) as any;
  
  const clonedObj = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert object to query string
 */
export function toQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => query.append(`${key}[]`, String(v)));
      } else {
        query.append(key, String(value));
      }
    }
  }
  
  return query.toString();
}

/**
 * Parse query string to object
 */
export function parseQueryString(query: string): Record<string, any> {
  const params: Record<string, any> = {};
  const searchParams = new URLSearchParams(query);
  
  for (const [key, value] of searchParams.entries()) {
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!params[arrayKey]) params[arrayKey] = [];
      params[arrayKey].push(value);
    } else {
      params[key] = value;
    }
  }
  
  return params;
}

// ============================================================================
// COLOR & STYLE HELPERS
// ============================================================================

/**
 * Get color based on price change
 */
export function getChangeColor(change: number): string {
  if (change > 0) return '#00d4ff'; // Positive - cyan
  if (change < 0) return '#ff4444'; // Negative - red
  return '#6b7280'; // Neutral - gray
}

/**
 * Get CSS class for price change
 */
export function getChangeClass(change: number): string {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
}

/**
 * Format change with sign and color
 */
export function formatChangeWithSign(change: number, percent: boolean = false): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  const value = Math.abs(change);
  const formatted = percent ? `${value.toFixed(2)}%` : formatCurrency(value);
  return `${sign}${formatted}`;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

/**
 * Save data to localStorage with expiry
 */
export function setWithExpiry(key: string, value: any, ttl: number = 86400000): void {
  const item = {
    value,
    expiry: Date.now() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Get data from localStorage with expiry check
 */
export function getWithExpiry(key: string): any {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  
  const item = JSON.parse(itemStr);
  if (Date.now() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  
  return item.value;
}

/**
 * Clear all trading-related storage
 */
export function clearTradingStorage(): void {
  const keys = ['watchlist', 'portfolio', 'orders', 'settings'];
  keys.forEach(key => localStorage.removeItem(key));
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Paginate array data
 */
export function paginate<T>(
  data: T[],
  page: number = 1,
  limit: number = 20
): PaginationResult<T> {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: paginatedData,
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Search array items by text
 */
export function searchItems<T>(
  items: T[],
  searchTerm: string,
  keys: (keyof T)[]
): T[] {
  if (!searchTerm || searchTerm.trim().length === 0) return items;
  
  const term = searchTerm.toLowerCase().trim();
  
  return items.filter(item =>
    keys.some(key => {
      const value = item[key];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      if (typeof value === 'number') {
        return value.toString().includes(term);
      }
      return false;
    })
  );
}

/**
 * Sort array items by key
 */
export function sortItems<T>(
  items: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...items];
  
  sorted.sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

// ============================================================================
// ERROR HANDLING & LOGGING
// ============================================================================

/**
 * Custom error class for trading errors
 */
export class TradingError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;
  
  constructor(message: string, code: string = 'TRADING_ERROR', statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'TradingError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Log error with context
 */
export function logError(error: Error | unknown, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`[${context || 'Application'} Error]:`, error);
  }
  
  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Send to Sentry or similar service
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: Date.now(),
      url: window.location.href,
    };
    
    // Send to error tracking endpoint
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(console.error);
  }
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}

// ============================================================================
// BROWSER & DEVICE UTILITIES
// ============================================================================

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if browser supports WebSocket
 */
export function supportsWebSocket(): boolean {
  return 'WebSocket' in window && typeof WebSocket === 'function';
}

/**
 * Check if browser supports localStorage
 */
export function supportsLocalStorage(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  browser: string;
  os: string;
} {
  const ua = navigator.userAgent;
  
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  
  return { isMobile, isTablet, isDesktop, browser, os };
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  // Currency & Number
  formatCurrency,
  formatNumber,
  formatPercentage,
  parseNumber,
  formatCompactNumber,
  
  // Date & Time
  formatDate,
  getRelativeTime,
  calculateMarketCountdown,
  isMarketOpen,
  getMarketTimeRemaining,
  
  // Validation
  validateDepositAmount,
  validateWithdrawalAmount,
  validateUPIId,
  validateName,
  validateQuantity,
  validatePrice,
  validateEmail,
  validatePhoneNumber,
  
  // Portfolio
  calculatePortfolioValue,
  calculateTotalPL,
  calculateDayPL,
  calculateAveragePrice,
  calculateBrokerage,
  calculateSTT,
  calculateGST,
  calculateTotalCharges,
  
  // String & Data
  generateId,
  debounce,
  throttle,
  deepClone,
  capitalize,
  truncate,
  toQueryString,
  parseQueryString,
  
  // Color & Style
  getChangeColor,
  getChangeClass,
  formatChangeWithSign,
  
  // Storage
  setWithExpiry,
  getWithExpiry,
  clearTradingStorage,
  
  // Pagination
  paginate,
  searchItems,
  sortItems,
  
  // Error Handling
  TradingError,
  logError,
  retryOperation,
  
  // Browser
  isMobileDevice,
  supportsWebSocket,
  supportsLocalStorage,
  getDeviceInfo,
};