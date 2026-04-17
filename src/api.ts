/**
 * API Layer - Trading Platform Backend Integration
 * Features: Real-time stock data, WebSocket support, error handling, retry logic, mock data fallback
 * Version: 3.0.0
 */

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
  timeframe: '1m' | '5m' | '1D' | '1W' | '1M';
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

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  timestamp: number;
  details?: any;
}

export interface WebSocketMessage {
  type: 'PRICE_UPDATE' | 'ORDER_UPDATE' | 'MARKET_STATUS' | 'NEWS' | 'TRADE_EXECUTION';
  payload: any;
  timestamp: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const IS_PRODUCTION = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const API_BASE_URL = IS_PRODUCTION 
  ? 'https://api.tradingplatform.com/v1'
  : 'http://localhost:8080/api/v1';

const WS_BASE_URL = IS_PRODUCTION
  ? 'wss://ws.tradingplatform.com'
  : 'ws://localhost:8080/ws';

const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============================================================================
// MOCK DATA - Indian Stock Market
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
  { symbol: 'WIPRO', name: 'Wipro Ltd.', price: 456.20, change: 2.15, changePercent: 0.47, volume: 2345678, high: 460.00, low: 453.00, open: 455.00, previousClose: 454.05, marketCap: 2500000000000, peRatio: 20.4, dividendYield: 1.20, week52High: 540.00, week52Low: 380.00, lastUpdated: Date.now() },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', price: 1345.80, change: -4.20, changePercent: -0.31, volume: 1234567, high: 1355.00, low: 1340.00, open: 1350.00, previousClose: 1350.00, marketCap: 3650000000000, peRatio: 26.7, dividendYield: 1.50, week52High: 1500.00, week52Low: 1100.00, lastUpdated: Date.now() },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Inds.', price: 1234.50, change: 18.90, changePercent: 1.55, volume: 2345678, high: 1245.00, low: 1220.00, open: 1225.00, previousClose: 1215.60, marketCap: 2950000000000, peRatio: 32.4, dividendYield: 0.65, week52High: 1320.00, week52Low: 920.00, lastUpdated: Date.now() },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', price: 3456.70, change: -23.40, changePercent: -0.67, volume: 876543, high: 3480.00, low: 3445.00, open: 3475.00, previousClose: 3480.10, marketCap: 3070000000000, peRatio: 85.6, dividendYield: 0.35, week52High: 3700.00, week52Low: 2600.00, lastUpdated: Date.now() },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', price: 11234.50, change: 156.30, changePercent: 1.41, volume: 543210, high: 11300.00, low: 11100.00, open: 11150.00, previousClose: 11078.20, marketCap: 3390000000000, peRatio: 28.9, dividendYield: 0.45, week52High: 12000.00, week52Low: 8500.00, lastUpdated: Date.now() },
  { symbol: 'AXIS', name: 'Axis Bank Ltd.', price: 1123.40, change: 11.20, changePercent: 1.01, volume: 3456789, high: 1135.00, low: 1115.00, open: 1120.00, previousClose: 1112.20, marketCap: 3450000000000, peRatio: 16.8, dividendYield: 0.55, week52High: 1250.00, week52Low: 850.00, lastUpdated: Date.now() },
  { symbol: 'KOTAK', name: 'Kotak Mahindra Bank Ltd.', price: 1876.30, change: -8.70, changePercent: -0.46, volume: 2345678, high: 1890.00, low: 1870.00, open: 1885.00, previousClose: 1885.00, marketCap: 3730000000000, peRatio: 21.3, dividendYield: 0.15, week52High: 2200.00, week52Low: 1650.00, lastUpdated: Date.now() },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', price: 2567.80, change: 14.20, changePercent: 0.56, volume: 1987654, high: 2580.00, low: 2555.00, open: 2560.00, previousClose: 2553.60, marketCap: 6020000000000, peRatio: 62.4, dividendYield: 1.60, week52High: 2760.00, week52Low: 2250.00, lastUpdated: Date.now() },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', price: 7123.40, change: 89.60, changePercent: 1.27, volume: 987654, high: 7150.00, low: 7080.00, open: 7100.00, previousClose: 7033.80, marketCap: 4400000000000, peRatio: 35.7, dividendYield: 0.00, week52High: 8500.00, week52Low: 5800.00, lastUpdated: Date.now() },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd.', price: 1123.40, change: 23.40, changePercent: 2.13, volume: 4567890, high: 1140.00, low: 1105.00, open: 1110.00, previousClose: 1100.00, marketCap: 2420000000000, peRatio: 28.5, dividendYield: 0.45, week52High: 1350.00, week52Low: 750.00, lastUpdated: Date.now() },
  { symbol: 'NTPC', name: 'NTPC Ltd.', price: 334.50, change: 2.30, changePercent: 0.69, volume: 5678901, high: 338.00, low: 332.00, open: 333.00, previousClose: 332.20, marketCap: 3250000000000, peRatio: 15.8, dividendYield: 3.50, week52High: 370.00, week52Low: 250.00, lastUpdated: Date.now() },
  { symbol: 'POWERGRID', name: 'Power Grid Corp. Ltd.', price: 287.60, change: -1.20, changePercent: -0.42, volume: 4567890, high: 290.00, low: 286.00, open: 289.00, previousClose: 288.80, marketCap: 2680000000000, peRatio: 14.2, dividendYield: 4.80, week52High: 320.00, week52Low: 220.00, lastUpdated: Date.now() },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd.', price: 4123.50, change: 45.20, changePercent: 1.11, volume: 876543, high: 4150.00, low: 4090.00, open: 4100.00, previousClose: 4078.30, marketCap: 2680000000000, peRatio: 85.2, dividendYield: 0.00, week52High: 4500.00, week52Low: 3400.00, lastUpdated: Date.now() },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', price: 9876.50, change: -45.30, changePercent: -0.46, volume: 234567, high: 9950.00, low: 9850.00, open: 9920.00, previousClose: 9921.80, marketCap: 2850000000000, peRatio: 42.5, dividendYield: 0.55, week52High: 10500.00, week52Low: 7200.00, lastUpdated: Date.now() },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const generateRandomMovement = (basePrice: number, volatility: number = 0.003): number => {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return basePrice * (1 + change);
};

const updateMockPrices = (): Stock[] => {
  return MOCK_STOCKS.map(stock => {
    const newPrice = generateRandomMovement(stock.price, 0.003);
    const change = newPrice - stock.previousClose;
    const changePercent = (change / stock.previousClose) * 100;
    
    return {
      ...stock,
      price: Number(newPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      high: Math.max(stock.high, newPrice),
      low: Math.min(stock.low, newPrice),
      lastUpdated: Date.now(),
    };
  });
};

const generateHistoricalData = (symbol: string, timeframe: '1m' | '5m' | '1D' | '1W' | '1M'): StockHistory => {
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
    case '1W':
      points = 7;
      interval = 24 * 60 * 60 * 1000;
      break;
    case '1M':
      points = 30;
      interval = 24 * 60 * 60 * 1000;
      break;
    default:
      points = 100;
      interval = 60 * 1000;
  }
  
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
  const basePrice = stock.price;
  const volatility = 0.02;
  
  const data: StockDataPoint[] = [];
  let currentPrice = basePrice;
  
  for (let i = points; i >= 0; i--) {
    const timestamp = now - (i * interval);
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
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
};

const getMarketStatus = (): MarketStatus => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;
  const isWeekday = istTime.getDay() >= 1 && istTime.getDay() <= 5;
  
  let isOpen = false;
  let nextOpenTime: string | undefined;
  let nextCloseTime: string | undefined;
  let statusMessage = '';
  
  if (!isWeekday) {
    statusMessage = 'Market closed on weekends';
    const nextMonday = new Date(istTime);
    nextMonday.setDate(istTime.getDate() + (8 - istTime.getDay()));
    nextMonday.setHours(9, 15, 0, 0);
    nextOpenTime = nextMonday.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  } else if (currentMinutes < marketOpen) {
    statusMessage = 'Market yet to open';
    const openTime = new Date(istTime);
    openTime.setHours(9, 15, 0, 0);
    nextOpenTime = openTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  } else if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
    isOpen = true;
    statusMessage = 'Market is open for trading';
    const closeTime = new Date(istTime);
    closeTime.setHours(15, 30, 0, 0);
    nextCloseTime = closeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  } else {
    statusMessage = 'Market closed for the day';
    const tomorrow = new Date(istTime);
    tomorrow.setDate(istTime.getDate() + 1);
    tomorrow.setHours(9, 15, 0, 0);
    nextOpenTime = tomorrow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  }
  
  return {
    isOpen,
    currentTime: istTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' }),
    nextOpenTime,
    nextCloseTime,
    holiday: false,
    statusMessage,
    timezone: 'Asia/Kolkata',
  };
};

// ============================================================================
// API REQUEST HANDLER
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...options,
  };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_TIMEOUT}ms`);
    }
    
    if (retryCount < MAX_RETRIES && !IS_PRODUCTION) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return apiRequest<T>(endpoint, options, retryCount + 1);
    }
    
    throw error;
  }
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export async function fetchStocks(): Promise<Stock[]> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(300);
      return updateMockPrices();
    }
    return await apiRequest<Stock[]>('/stocks');
  } catch (error) {
    console.warn('Failed to fetch from API, using mock data:', error);
    return updateMockPrices();
  }
}

export async function fetchStockBySymbol(symbol: string): Promise<Stock | null> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(200);
      return MOCK_STOCKS.find(s => s.symbol === symbol) || null;
    }
    return await apiRequest<Stock>(`/stocks/${symbol}`);
  } catch (error) {
    console.warn('Failed to fetch stock, using mock:', error);
    return MOCK_STOCKS.find(s => s.symbol === symbol) || null;
  }
}

export async function fetchStockHistory(
  symbol: string,
  timeframe: '1m' | '5m' | '1D' | '1W' | '1M'
): Promise<StockHistory> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(500);
      return generateHistoricalData(symbol, timeframe);
    }
    return await apiRequest<StockHistory>(`/stocks/${symbol}/history`, {
      method: 'POST',
      body: JSON.stringify({ timeframe }),
    });
  } catch (error) {
    console.warn('Failed to fetch history, using mock:', error);
    return generateHistoricalData(symbol, timeframe);
  }
}

export async function fetchMultipleStocksHistory(
  symbols: string[],
  timeframe: '1m' | '5m' | '1D' | '1W' | '1M'
): Promise<Map<string, StockHistory>> {
  const results = new Map<string, StockHistory>();
  
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(800);
      for (const symbol of symbols) {
        results.set(symbol, generateHistoricalData(symbol, timeframe));
      }
      return results;
    }
    
    const response = await apiRequest<StockHistory[]>(`/stocks/history/batch`, {
      method: 'POST',
      body: JSON.stringify({ symbols, timeframe }),
    });
    
    response.forEach(history => {
      results.set(history.symbol, history);
    });
    return results;
  } catch (error) {
    console.warn('Failed to fetch batch history, using mock:', error);
    for (const symbol of symbols) {
      results.set(symbol, generateHistoricalData(symbol, timeframe));
    }
    return results;
  }
}

export async function fetchMarketStatus(): Promise<MarketStatus> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(100);
      return getMarketStatus();
    }
    return await apiRequest<MarketStatus>('/market/status');
  } catch (error) {
    console.warn('Failed to fetch market status, using local:', error);
    return getMarketStatus();
  }
}

export async function executeDeposit(request: DepositRequest): Promise<TransactionResponse> {
  try {
    if (!IS_PRODUCTION) {
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
      
      if (request.amount > 1000000) {
        return {
          success: false,
          message: 'Maximum deposit amount is ₹10,00,000',
          timestamp: Date.now(),
          status: 'FAILED',
          amount: request.amount,
        };
      }
      
      return {
        success: true,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: `Successfully deposited ₹${request.amount.toLocaleString('en-IN')}`,
        timestamp: Date.now(),
        status: 'SUCCESS',
        amount: request.amount,
        reference: `REF_${Date.now()}`,
      };
    }
    
    return await apiRequest<TransactionResponse>('/transactions/deposit', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error('Deposit failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Deposit processing failed',
      timestamp: Date.now(),
      status: 'FAILED',
      amount: request.amount,
    };
  }
}

export async function executeWithdrawal(request: WithdrawalRequest): Promise<TransactionResponse> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(1500);
      
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (!upiRegex.test(request.upiId)) {
        return {
          success: false,
          message: 'Invalid UPI ID format. Please enter a valid UPI ID (e.g., username@bank)',
          timestamp: Date.now(),
          status: 'FAILED',
          amount: request.amount,
        };
      }
      
      if (!request.name || request.name.length < 3) {
        return {
          success: false,
          message: 'Please enter a valid name (minimum 3 characters)',
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
      
      if (request.amount > 1000000) {
        return {
          success: false,
          message: 'Maximum withdrawal amount is ₹10,00,000 per transaction',
          timestamp: Date.now(),
          status: 'FAILED',
          amount: request.amount,
        };
      }
      
      return {
        success: true,
        transactionId: `WDL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: `Withdrawal request for ₹${request.amount.toLocaleString('en-IN')} has been initiated. Amount will be credited to ${request.upiId} within 24 hours.`,
        timestamp: Date.now(),
        status: 'PENDING',
        amount: request.amount,
        reference: `WDL_REF_${Date.now()}`,
      };
    }
    
    return await apiRequest<TransactionResponse>('/transactions/withdraw', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error('Withdrawal failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Withdrawal processing failed',
      timestamp: Date.now(),
      status: 'FAILED',
      amount: request.amount,
    };
  }
}

export async function placeOrder(request: OrderRequest): Promise<OrderResponse> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(800);
      
      if (request.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      
      if (request.orderType === 'LIMIT' && request.price <= 0) {
        throw new Error('Limit price must be greater than 0');
      }
      
      const stock = MOCK_STOCKS.find(s => s.symbol === request.symbol);
      if (!stock) {
        throw new Error(`Stock ${request.symbol} not found`);
      }
      
      const total = request.quantity * request.price;
      const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: orderId,
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
        orderId,
      };
    }
    
    return await apiRequest<OrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error('Order placement failed:', error);
    throw error;
  }
}

export async function cancelOrder(orderId: string): Promise<boolean> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(300);
      return true;
    }
    
    const response = await apiRequest<{ success: boolean }>(`/orders/${orderId}/cancel`, {
      method: 'POST',
    });
    return response.success;
  } catch (error) {
    console.error('Cancel order failed:', error);
    return false;
  }
}

export async function fetchOrderHistory(
  filters?: { symbol?: string; status?: string; from?: number; to?: number }
): Promise<OrderResponse[]> {
  try {
    if (!IS_PRODUCTION) {
      await simulateDelay(400);
      return [];
    }
    
    const queryParams = new URLSearchParams();
    if (filters?.symbol) queryParams.append('symbol', filters.symbol);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.from) queryParams.append('from', filters.from.toString());
    if (filters?.to) queryParams.append('to', filters.to.toString());
    
    return await apiRequest<OrderResponse[]>(`/orders?${queryParams.toString()}`);
  } catch (error) {
    console.error('Fetch order history failed:', error);
    return [];
  }
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 3000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(url: string = WS_BASE_URL) {
    this.url = url;
  }
  
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }
  
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.emit('connected', { timestamp: Date.now() });
    
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'PING', timestamp: Date.now() });
    }, 30000);
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
      
      if (data.type) {
        this.emit(data.type, data.payload);
      }
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  }
  
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.emit('error', { error });
  }
  
  private handleClose(): void {
    console.log('WebSocket disconnected');
    this.isConnecting = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.emit('disconnected', { timestamp: Date.now() });
    this.scheduleReconnect();
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
  }
  
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }
  
  subscribe(symbols: string[]): void {
    this.send({
      type: 'SUBSCRIBE',
      symbols,
      timestamp: Date.now(),
    });
  }
  
  unsubscribe(symbols: string[]): void {
    this.send({
      type: 'UNSUBSCRIBE',
      symbols,
      timestamp: Date.now(),
    });
  }
  
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
  
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton WebSocket manager instance
export const wsManager = new WebSocketManager();

// ============================================================================
// EXPORTS
// ============================================================================

export const api = {
  fetchStocks,
  fetchStockBySymbol,
  fetchStockHistory,
  fetchMultipleStocksHistory,
  fetchMarketStatus,
  executeDeposit,
  executeWithdrawal,
  placeOrder,
  cancelOrder,
  fetchOrderHistory,
  wsManager,
};
