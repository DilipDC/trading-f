/**
 * API Layer - Trading Platform Backend Integration
 */

// ============================================================================
// PRODUCTION CONFIGURATION
// ============================================================================

// Define types for environment
declare const importMeta: any;

const IS_PRODUCTION = import.meta.env?.PROD || false;
const IS_DEVELOPMENT = import.meta.env?.DEV || true;

// API URLs
const PRODUCTION_API_URL = 'https://trading-platform-api.onrender.com/api/v1';
const DEVELOPMENT_API_URL = 'http://localhost:8080/api/v1';

export const API_BASE_URL = IS_PRODUCTION 
  ? (import.meta.env?.VITE_API_URL || PRODUCTION_API_URL)
  : (import.meta.env?.VITE_API_URL || DEVELOPMENT_API_URL);

export const WS_BASE_URL = IS_PRODUCTION
  ? (import.meta.env?.VITE_WS_URL || PRODUCTION_API_URL.replace('/api/v1', '/ws'))
  : (import.meta.env?.VITE_WS_URL || 'ws://localhost:8080/ws');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap: number;
  peRatio: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
  lastUpdated: number;
}

export interface StockHistory {
  symbol: string;
  timeframe: '1m' | '5m' | '1D';
  data: StockDataPoint[];
  metadata: {
    startTime: number;
    endTime: number;
    interval: string;
    source: string;
  };
}

export interface StockDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeStr: string;
}

export interface MarketStatus {
  isOpen: boolean;
  currentTime: string;
  nextOpenTime?: string;
  nextCloseTime?: string;
  holiday?: boolean;
  holidayName?: string;
  statusMessage: string;
  timezone: string;
}

export interface DepositRequest {
  amount: number;
  paymentMethod?: 'UPI' | 'CARD' | 'NETBANKING';
  metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
  upiId: string;
  name: string;
  amount: number;
  metadata?: Record<string, any>;
}

export interface TransactionResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  timestamp: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'PROCESSING';
  amount: number;
  reference?: string;
}

export interface OrderRequest {
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  triggerPrice?: number;
  validity?: 'DAY' | 'IOC' | 'GTC';
  metadata?: Record<string, any>;
}

export interface OrderResponse {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  total: number;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
  timestamp: number;
  executedQuantity?: number;
  executedPrice?: number;
  rejectionReason?: string;
  orderId?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STOCKS: Stock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 2856.75, change: 23.45, changePercent: 0.83, volume: 5234567, high: 2875.00, low: 2840.50, open: 2845.00, previousClose: 2833.30, marketCap: 19350000000000, peRatio: 24.5, dividendYield: 0.35, week52High: 3020.00, week52Low: 2180.00, lastUpdated: Date.now() },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', price: 3987.50, change: -12.30, changePercent: -0.31, volume: 1234567, high: 4010.00, low: 3975.00, open: 4000.00, previousClose: 3999.80, marketCap: 14700000000000, peRatio: 28.3, dividendYield: 1.20, week52High: 4250.00, week52Low: 3250.00, lastUpdated: Date.now() },
  { symbol: 'HDFC', name: 'HDFC Bank Ltd.', price: 1678.90, change: 15.60, changePercent: 0.94, volume: 3456789, high: 1690.00, low: 1665.00, open: 1668.00, previousClose: 1663.30, marketCap: 12500000000000, peRatio: 19.2, dividendYield: 0.95, week52High: 1820.00, week52Low: 1400.00, lastUpdated: Date.now() },
  { symbol: 'INFY', name: 'Infosys Ltd.', price: 1523.45, change: 8.75, changePercent: 0.58, volume: 2345678, high: 1535.00, low: 1515.00, open: 1520.00, previousClose: 1514.70, marketCap: 6300000000000, peRatio: 22.1, dividendYield: 1.80, week52High: 1675.00, week52Low: 1280.00, lastUpdated: Date.now() },
  { symbol: 'ICICI', name: 'ICICI Bank Ltd.', price: 1123.80, change: -5.20, changePercent: -0.46, volume: 4567890, high: 1135.00, low: 1118.00, open: 1130.00, previousClose: 1129.00, marketCap: 7800000000000, peRatio: 17.8, dividendYield: 0.65, week52High: 1240.00, week52Low: 890.00, lastUpdated: Date.now() },
  { symbol: 'SBIN', name: 'State Bank of India', price: 678.45, change: 12.30, changePercent: 1.85, volume: 7890123, high: 685.00, low: 670.00, open: 672.00, previousClose: 666.15, marketCap: 6050000000000, peRatio: 12.5, dividendYield: 1.40, week52High: 725.00, week52Low: 520.00, lastUpdated: Date.now() },
  { symbol: 'BHARTI', name: 'Bharti Airtel Ltd.', price: 987.60, change: -8.90, changePercent: -0.89, volume: 3456789, high: 1000.00, low: 985.00, open: 996.00, previousClose: 996.50, marketCap: 5500000000000, peRatio: 85.3, dividendYield: 0.00, week52High: 1120.00, week52Low: 780.00, lastUpdated: Date.now() },
  { symbol: 'ITC', name: 'ITC Ltd.', price: 445.30, change: 3.45, changePercent: 0.78, volume: 5678901, high: 448.00, low: 442.00, open: 443.00, previousClose: 441.85, marketCap: 5500000000000, peRatio: 25.6, dividendYield: 3.20, week52High: 499.00, week52Low: 380.00, lastUpdated: Date.now() },
];

const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const updateMockPrices = (): Stock[] => {
  return MOCK_STOCKS.map(stock => {
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / stock.price) * 100;
    return {
      ...stock,
      price: Number((stock.price + change).toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      lastUpdated: Date.now(),
    };
  });
};

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export async function fetchStocks(): Promise<Stock[]> {
  await simulateDelay(300);
  return updateMockPrices();
}

export async function fetchStockBySymbol(symbol: string): Promise<Stock | null> {
  await simulateDelay(200);
  return MOCK_STOCKS.find(s => s.symbol === symbol) || null;
}

export async function fetchStockHistory(
  symbol: string,
  timeframe: '1m' | '5m' | '1D'
): Promise<StockHistory> {
  await simulateDelay(500);
  
  const now = Date.now();
  let points: number;
  let interval: number;
  
  switch (timeframe) {
    case '1m':
      points = 60;
      interval = 60 * 1000;
      break;
    case '5m':
      points = 72;
      interval = 5 * 60 * 1000;
      break;
    case '1D':
      points = 390;
      interval = 60 * 1000;
      break;
  }
  
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
  const basePrice = stock.price;
  
  const data: StockDataPoint[] = [];
  let currentPrice = basePrice;
  
  for (let i = points; i >= 0; i--) {
    const timestamp = now - (i * interval);
    const change = (Math.random() - 0.5) * 0.02;
    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    data.push({
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      timeStr: new Date(timestamp).toLocaleTimeString(),
    });
    
    currentPrice = close;
  }
  
  return {
    symbol,
    timeframe,
    data,
    metadata: {
      startTime: data[0].timestamp,
      endTime: data[data.length - 1].timestamp,
      interval: `${interval / 1000}s`,
      source: 'MOCK_DATA',
    },
  };
}

export async function fetchMarketStatus(): Promise<MarketStatus> {
  await simulateDelay(100);
  
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;
  const isWeekday = istTime.getDay() >= 1 && istTime.getDay() <= 5;
  
  let isOpen = false;
  let statusMessage = '';
  
  if (!isWeekday) {
    statusMessage = 'Market closed on weekends';
  } else if (currentMinutes < marketOpen) {
    statusMessage = 'Market yet to open';
  } else if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
    isOpen = true;
    statusMessage = 'Market is open for trading';
  } else {
    statusMessage = 'Market closed for the day';
  }
  
  return {
    isOpen,
    currentTime: istTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' }),
    statusMessage,
    timezone: 'Asia/Kolkata',
  };
}

export async function executeDeposit(request: DepositRequest): Promise<TransactionResponse> {
  await simulateDelay(1500);
  
  if (request.amount < 100) {
    return {
      success: false,
      message: 'Minimum deposit amount is ₹100',
      timestamp: Date.now(),
      status: 'FAILED',
      amount: request.amount,
    };
  }
  
  return {
    success: true,
    transactionId: `TXN_${Date.now()}`,
    message: 'Deposit successful!',
    timestamp: Date.now(),
    status: 'SUCCESS',
    amount: request.amount,
  };
}

export async function executeWithdrawal(request: WithdrawalRequest): Promise<TransactionResponse> {
  await simulateDelay(1500);
  
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  if (!upiRegex.test(request.upiId)) {
    return {
      success: false,
      message: 'Invalid UPI ID format',
      timestamp: Date.now(),
      status: 'FAILED',
      amount: request.amount,
    };
  }
  
  if (request.amount < 100) {
    return {
      success: false,
      message: 'Minimum withdrawal amount is ₹100',
      timestamp: Date.now(),
      status: 'FAILED',
      amount: request.amount,
    };
  }
  
  return {
    success: true,
    transactionId: `WDL_${Date.now()}`,
    message: `Withdrawal request for ₹${request.amount} initiated`,
    timestamp: Date.now(),
    status: 'PENDING',
    amount: request.amount,
  };
}

export async function placeOrder(request: OrderRequest): Promise<OrderResponse> {
  await simulateDelay(800);
  
  if (request.quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  const total = request.quantity * request.price;
  
  return {
    id: `ORD_${Date.now()}`,
    symbol: request.symbol,
    type: request.type,
    orderType: request.orderType,
    quantity: request.quantity,
    price: request.price,
    total,
    status: 'EXECUTED',
    timestamp: Date.now(),
    executedQuantity: request.quantity,
    executedPrice: request.price,
  };
}

export const api = {
  fetchStocks,
  fetchStockBySymbol,
  fetchStockHistory,
  fetchMarketStatus,
  executeDeposit,
  executeWithdrawal,
  placeOrder,
};
