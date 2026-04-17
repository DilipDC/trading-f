/**
 * API Layer - Optimized for Speed
 * Features: Mock data with realistic updates, request caching, fast responses
 */

// ========== TYPES ==========
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
  metadata: { startTime: number; endTime: number; interval: string; source: string };
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
  statusMessage: string;
  timezone: string;
}

export interface DepositRequest { amount: number; paymentMethod?: string; }
export interface WithdrawalRequest { upiId: string; name: string; amount: number; }
export interface TransactionResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  timestamp: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
}
export interface OrderRequest { symbol: string; type: 'BUY'|'SELL'; orderType: 'MARKET'|'LIMIT'; quantity: number; price: number; }
export interface OrderResponse {
  id: string; symbol: string; type: 'BUY'|'SELL'; orderType: 'MARKET'|'LIMIT';
  quantity: number; price: number; total: number; status: 'EXECUTED'; timestamp: number;
}

// ========== FAST MOCK DATA ==========
const MOCK_STOCKS: Stock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2856.75, change: 23.45, changePercent: 0.83, volume: 5234567, high: 2875.00, low: 2840.50, open: 2845.00, previousClose: 2833.30, marketCap: 19350000000000, peRatio: 24.5, dividendYield: 0.35, week52High: 3020.00, week52Low: 2180.00, lastUpdated: Date.now() },
  { symbol: 'TCS', name: 'Tata Consultancy', price: 3987.50, change: -12.30, changePercent: -0.31, volume: 1234567, high: 4010.00, low: 3975.00, open: 4000.00, previousClose: 3999.80, marketCap: 14700000000000, peRatio: 28.3, dividendYield: 1.20, week52High: 4250.00, week52Low: 3250.00, lastUpdated: Date.now() },
  { symbol: 'HDFC', name: 'HDFC Bank', price: 1678.90, change: 15.60, changePercent: 0.94, volume: 3456789, high: 1690.00, low: 1665.00, open: 1668.00, previousClose: 1663.30, marketCap: 12500000000000, peRatio: 19.2, dividendYield: 0.95, week52High: 1820.00, week52Low: 1400.00, lastUpdated: Date.now() },
  { symbol: 'INFY', name: 'Infosys', price: 1523.45, change: 8.75, changePercent: 0.58, volume: 2345678, high: 1535.00, low: 1515.00, open: 1520.00, previousClose: 1514.70, marketCap: 6300000000000, peRatio: 22.1, dividendYield: 1.80, week52High: 1675.00, week52Low: 1280.00, lastUpdated: Date.now() },
  { symbol: 'ICICI', name: 'ICICI Bank', price: 1123.80, change: -5.20, changePercent: -0.46, volume: 4567890, high: 1135.00, low: 1118.00, open: 1130.00, previousClose: 1129.00, marketCap: 7800000000000, peRatio: 17.8, dividendYield: 0.65, week52High: 1240.00, week52Low: 890.00, lastUpdated: Date.now() },
  { symbol: 'SBIN', name: 'State Bank of India', price: 678.45, change: 12.30, changePercent: 1.85, volume: 7890123, high: 685.00, low: 670.00, open: 672.00, previousClose: 666.15, marketCap: 6050000000000, peRatio: 12.5, dividendYield: 1.40, week52High: 725.00, week52Low: 520.00, lastUpdated: Date.now() },
  { symbol: 'BHARTI', name: 'Bharti Airtel', price: 987.60, change: -8.90, changePercent: -0.89, volume: 3456789, high: 1000.00, low: 985.00, open: 996.00, previousClose: 996.50, marketCap: 5500000000000, peRatio: 85.3, dividendYield: 0.00, week52High: 1120.00, week52Low: 780.00, lastUpdated: Date.now() },
  { symbol: 'ITC', name: 'ITC Ltd', price: 445.30, change: 3.45, changePercent: 0.78, volume: 5678901, high: 448.00, low: 442.00, open: 443.00, previousClose: 441.85, marketCap: 5500000000000, peRatio: 25.6, dividendYield: 3.20, week52High: 499.00, week52Low: 380.00, lastUpdated: Date.now() },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: 456.20, change: 2.15, changePercent: 0.47, volume: 2345678, high: 460.00, low: 453.00, open: 455.00, previousClose: 454.05, marketCap: 2500000000000, peRatio: 20.4, dividendYield: 1.20, week52High: 540.00, week52Low: 380.00, lastUpdated: Date.now() },
  { symbol: 'HCLTECH', name: 'HCL Technologies', price: 1345.80, change: -4.20, changePercent: -0.31, volume: 1234567, high: 1355.00, low: 1340.00, open: 1350.00, previousClose: 1350.00, marketCap: 3650000000000, peRatio: 26.7, dividendYield: 1.50, week52High: 1500.00, week52Low: 1100.00, lastUpdated: Date.now() },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', price: 1234.50, change: 18.90, changePercent: 1.55, volume: 2345678, high: 1245.00, low: 1220.00, open: 1225.00, previousClose: 1215.60, marketCap: 2950000000000, peRatio: 32.4, dividendYield: 0.65, week52High: 1320.00, week52Low: 920.00, lastUpdated: Date.now() },
  { symbol: 'TITAN', name: 'Titan Company', price: 3456.70, change: -23.40, changePercent: -0.67, volume: 876543, high: 3480.00, low: 3445.00, open: 3475.00, previousClose: 3480.10, marketCap: 3070000000000, peRatio: 85.6, dividendYield: 0.35, week52High: 3700.00, week52Low: 2600.00, lastUpdated: Date.now() },
];

let cachedStocks = [...MOCK_STOCKS];
let lastUpdate = 0;

// Update prices every 2 seconds
function updatePrices(): Stock[] {
  const now = Date.now();
  if (now - lastUpdate < 2000) return cachedStocks;
  lastUpdate = now;
  cachedStocks = cachedStocks.map(stock => {
    const change = (Math.random() - 0.5) * 4;
    const newPrice = Math.max(0.01, stock.price + change);
    const changePercent = (change / stock.previousClose) * 100;
    return {
      ...stock,
      price: Number(newPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      high: Math.max(stock.high, newPrice),
      low: Math.min(stock.low, newPrice),
      lastUpdated: now,
    };
  });
  return cachedStocks;
}

// Historical data cache
const historyCache = new Map<string, StockHistory>();

function generateHistory(symbol: string, timeframe: '1m'|'5m'|'1D'): StockHistory {
  const cacheKey = `${symbol}_${timeframe}`;
  if (historyCache.has(cacheKey)) return historyCache.get(cacheKey)!;
  
  const now = Date.now();
  let points: number, interval: number;
  switch (timeframe) {
    case '1m': points = 60; interval = 60 * 1000; break;
    case '5m': points = 72; interval = 5 * 60 * 1000; break;
    default: points = 390; interval = 60 * 1000; break;
  }
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
  let price = stock.price;
  const data: StockDataPoint[] = [];
  for (let i = points; i >= 0; i--) {
    const ts = now - i * interval;
    const change = (Math.random() - 0.5) * 0.02;
    const open = price;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    data.push({
      timestamp: ts,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      timeStr: new Date(ts).toLocaleTimeString(),
    });
    price = close;
  }
  const history: StockHistory = {
    symbol, timeframe, data,
    metadata: { startTime: data[0].timestamp, endTime: data[data.length-1].timestamp, interval: `${interval/1000}s`, source: 'MOCK' }
  };
  historyCache.set(cacheKey, history);
  return history;
}

let cachedMarket: MarketStatus | null = null;
let marketCacheTime = 0;

function getMarketStatusFast(): MarketStatus {
  const now = Date.now();
  if (cachedMarket && now - marketCacheTime < 60000) return cachedMarket;
  marketCacheTime = now;
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const isOpen = (ist.getDay() >= 1 && ist.getDay() <= 5) && minutes >= 9*60+15 && minutes < 15*60+30;
  cachedMarket = {
    isOpen,
    currentTime: ist.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Kolkata' }),
    statusMessage: isOpen ? 'Market is open' : 'Market closed',
    timezone: 'Asia/Kolkata',
  };
  return cachedMarket;
}

// ========== API FUNCTIONS ==========
export async function fetchStocks(): Promise<Stock[]> {
  return Promise.resolve(updatePrices());
}

export async function fetchStockBySymbol(symbol: string): Promise<Stock | null> {
  const stocks = await fetchStocks();
  return stocks.find(s => s.symbol === symbol) || null;
}

export async function fetchStockHistory(symbol: string, timeframe: '1m'|'5m'|'1D'): Promise<StockHistory> {
  return Promise.resolve(generateHistory(symbol, timeframe));
}

export async function fetchMarketStatus(): Promise<MarketStatus> {
  return Promise.resolve(getMarketStatusFast());
}

export async function executeDeposit(req: DepositRequest): Promise<TransactionResponse> {
  await new Promise(r => setTimeout(r, 200));
  if (req.amount < 100) return { success: false, message: 'Minimum ₹100', timestamp: Date.now(), status: 'FAILED', amount: req.amount };
  return { success: true, transactionId: `TXN_${Date.now()}`, message: 'Deposit successful', timestamp: Date.now(), status: 'SUCCESS', amount: req.amount };
}

export async function executeWithdrawal(req: WithdrawalRequest): Promise<TransactionResponse> {
  await new Promise(r => setTimeout(r, 200));
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(req.upiId)) return { success: false, message: 'Invalid UPI ID', timestamp: Date.now(), status: 'FAILED', amount: req.amount };
  if (req.amount < 100) return { success: false, message: 'Minimum ₹100', timestamp: Date.now(), status: 'FAILED', amount: req.amount };
  return { success: true, transactionId: `WDL_${Date.now()}`, message: 'Withdrawal initiated', timestamp: Date.now(), status: 'PENDING', amount: req.amount };
}

export async function placeOrder(req: OrderRequest): Promise<OrderResponse> {
  await new Promise(r => setTimeout(r, 100));
  if (req.quantity <= 0) throw new Error('Invalid quantity');
  return {
    id: `ORD_${Date.now()}`,
    symbol: req.symbol,
    type: req.type,
    orderType: req.orderType,
    quantity: req.quantity,
    price: req.price,
    total: req.quantity * req.price,
    status: 'EXECUTED',
    timestamp: Date.now(),
  };
}
