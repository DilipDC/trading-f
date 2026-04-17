/**
 * Main Application Component - Trading Platform Core
 * @module App
 * @description Complete trading application with dashboard, charts, watchlist, orders, portfolio, deposits, withdrawals, and real-time market data
 * @version 2.0.0 - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { fetchStocks, fetchStockHistory, fetchMarketStatus, executeDeposit, executeWithdrawal, type Stock, type StockHistory, type MarketStatus, type DepositRequest, type WithdrawalRequest, type TransactionResponse, type OrderRequest, type OrderResponse } from './api';
import { 
  formatCurrency, 
  formatPercentage, 
  validateDepositAmount, 
  validateWithdrawalAmount, 
  validateUPIId, 
  validateName,
  calculateMarketCountdown,
  isMarketOpen,
  getMarketTimeRemaining,
  generateId,
  debounce,
  throttle,
  calculatePortfolioValue,
  calculateTotalPL,
  calculateDayPL,
  type MarketTimeInfo,
  type ValidationResult,
  type ToastMessage,
  type ToastType,
  type SoundType
} from './utils';

// Lazy load chart component for performance
const ChartComponent = lazy(() => import('./components/ChartComponent').catch(() => ({
  default: () => <div className="chart-placeholder">Chart component loading...</div>
})));

// ============================================================================
// PRODUCTION ASSET PATH HELPER
// ============================================================================

// Helper function to get correct asset paths in production
const getAssetPath = (path: string): string => {
  // In production on GitHub Pages, assets are in the root
  return `/${path}`;
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  addedAt: number;
}

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  pl: number;
  plPercentage: number;
}

interface Order {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  total: number;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
  timestamp: number;
}

interface Portfolio {
  balance: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalPL: number;
  totalPLPercentage: number;
  dayPL: number;
  holdings: Holding[];
  orders: Order[];
}

interface DepositModalState {
  isOpen: boolean;
  amount: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  qrCodeUrl: string;
  transactionId: string | null;
  errorMessage: string | null;
}

interface WithdrawModalState {
  isOpen: boolean;
  upiId: string;
  name: string;
  amount: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  responseMessage: string | null;
}

interface OrderPanelState {
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  symbol: string;
  quantity: string;
  price: string;
  estimatedCost: number;
}

interface Notification extends ToastMessage {
  id: string;
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useSound = () => {
  const soundsRef = useRef<{ [key in SoundType]?: HTMLAudioElement }>({});
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Preload sounds with correct production paths
    const soundFiles: SoundType[] = ['click', 'success', 'error', 'notification', 'order', 'alert'];
    soundFiles.forEach(sound => {
      try {
        // Use correct path for production
        const audioPath = `/assets/sounds/${sound}.mp3`;
        const audio = new Audio(audioPath);
        audio.preload = 'auto';
        
        // Add error handling for missing sounds
        audio.onerror = () => {
          console.warn(`Failed to load sound: ${sound}`);
        };
        
        soundsRef.current[sound] = audio;
      } catch (error) {
        console.warn(`Error loading sound ${sound}:`, error);
      }
    });

    return () => {
      Object.values(soundsRef.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  const play = useCallback((type: SoundType) => {
    if (!isEnabled) return;
    const sound = soundsRef.current[type];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => {
        console.warn('Sound play failed:', err);
      });
    }
  }, [isEnabled]);

  return { play, isEnabled, setIsEnabled };
};

const useToast = () => {
  const [toasts, setToasts] = useState<Notification[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration: number = 4000) => {
    const id = generateId();
    const toast: Notification = {
      id,
      message,
      type,
      duration,
    };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

const useWebSocket = (url: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!url) return;

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected, reconnecting...');
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, [isConnected]);

  return { isConnected, lastMessage, sendMessage };
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  // ==========================================================================
  // STATE DECLARATIONS
  // ==========================================================================
  
  // Stock Data State
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory | null>(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  
  // Market Status State
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [marketCountdown, setMarketCountdown] = useState<MarketTimeInfo | null>(null);
  
  // Chart Settings
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1D'>('1D');
  
  // Watchlist State
  const [watchlist, setWatchlist] = useLocalStorage<WatchlistItem[]>('watchlist', []);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Portfolio State
  const [portfolio, setPortfolio] = useLocalStorage<Portfolio>('portfolio', {
    balance: 100000, // Starting balance ₹1,00,000
    totalInvested: 0,
    totalCurrentValue: 0,
    totalPL: 0,
    totalPLPercentage: 0,
    dayPL: 0,
    holdings: [],
    orders: [],
  });
  
  // Modal States
  const [depositModal, setDepositModal] = useState<DepositModalState>({
    isOpen: false,
    amount: '',
    status: 'idle',
    qrCodeUrl: '',
    transactionId: null,
    errorMessage: null,
  });
  
  const [withdrawModal, setWithdrawModal] = useState<WithdrawModalState>({
    isOpen: false,
    upiId: '',
    name: '',
    amount: '',
    status: 'idle',
    responseMessage: null,
  });
  
  // Order Panel State
  const [orderPanel, setOrderPanel] = useState<OrderPanelState>({
    type: 'BUY',
    orderType: 'MARKET',
    symbol: '',
    quantity: '',
    price: '',
    estimatedCost: 0,
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'orders'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom Hooks
  const { play: playSound } = useSound();
  const { toasts, showToast, removeToast } = useToast();
  
  // WebSocket for real-time updates
  const { lastMessage: wsMessage } = useWebSocket(
    marketStatus?.isOpen ? 'wss://ws.tradingplatform.com/market-data' : null
  );
  
  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;
    const query = searchQuery.toLowerCase();
    return stocks.filter(
      stock => stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query)
    );
  }, [stocks, searchQuery]);
  
  const watchlistStocks = useMemo(() => {
    const watchlistSymbols = new Set(watchlist.map(item => item.symbol));
    return stocks.filter(stock => watchlistSymbols.has(stock.symbol));
  }, [stocks, watchlist]);
  
  const filteredWatchlistStocks = useMemo(() => {
    if (!searchQuery) return watchlistStocks;
    const query = searchQuery.toLowerCase();
    return watchlistStocks.filter(
      stock => stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query)
    );
  }, [watchlistStocks, searchQuery]);
  
  // ==========================================================================
  // API CALLS & DATA FETCHING
  // ==========================================================================
  
  const loadStocks = useCallback(async () => {
    try {
      setIsLoadingStocks(true);
      const data = await fetchStocks();
      setStocks(data);
      
      // Set first stock as selected if none selected
      if (data.length > 0 && !selectedStock) {
        setSelectedStock(data[0]);
      }
      
      // Update portfolio with current prices
      const updatedHoldings = portfolio.holdings.map(holding => {
        const currentStock = data.find(s => s.symbol === holding.symbol);
        if (currentStock) {
          const currentValue = holding.quantity * currentStock.price;
          const pl = currentValue - holding.investedValue;
          const plPercentage = (pl / holding.investedValue) * 100;
          return {
            ...holding,
            currentPrice: currentStock.price,
            currentValue,
            pl,
            plPercentage,
          };
        }
        return holding;
      });
      
      const portfolioValue = calculatePortfolioValue(updatedHoldings);
      const totalPL = calculateTotalPL(updatedHoldings);
      const dayPL = calculateDayPL(updatedHoldings);
      
      setPortfolio(prev => ({
        ...prev,
        holdings: updatedHoldings,
        totalInvested: portfolioValue.invested,
        totalCurrentValue: portfolioValue.current,
        totalPL: totalPL,
        totalPLPercentage: portfolioValue.invested > 0 ? (totalPL / portfolioValue.invested) * 100 : 0,
        dayPL: dayPL,
      }));
    } catch (error) {
      console.error('Failed to load stocks:', error);
      showToast('Failed to load stock data', 'error');
    } finally {
      setIsLoadingStocks(false);
    }
  }, [selectedStock, portfolio.holdings, setPortfolio, showToast]);
  
  const loadStockHistory = useCallback(async (symbol: string) => {
    if (!symbol) return;
    try {
      setIsLoadingChart(true);
      const history = await fetchStockHistory(symbol, timeframe);
      setStockHistory(history);
    } catch (error) {
      console.error('Failed to load stock history:', error);
      showToast('Failed to load chart data', 'error');
    } finally {
      setIsLoadingChart(false);
    }
  }, [timeframe, showToast]);
  
  const loadMarketStatusData = useCallback(async () => {
    try {
      const status = await fetchMarketStatus();
      setMarketStatus(status);
      
      const countdown = calculateMarketCountdown();
      setMarketCountdown(countdown);
    } catch (error) {
      console.error('Failed to load market status:', error);
    }
  }, []);
  
  // ==========================================================================
  // WATCHLIST MANAGEMENT
  // ==========================================================================
  
  const addToWatchlist = useCallback((stock: Stock) => {
    if (watchlist.length >= 50) {
      showToast('Watchlist limit reached (50 items)', 'error');
      return;
    }
    
    if (watchlist.some(item => item.symbol === stock.symbol)) {
      showToast(`${stock.symbol} is already in watchlist`, 'info');
      return;
    }
    
    const newItem: WatchlistItem = {
      id: generateId(),
      symbol: stock.symbol,
      name: stock.name,
      addedAt: Date.now(),
    };
    
    setWatchlist(prev => [...prev, newItem]);
    playSound('click');
    showToast(`Added ${stock.symbol} to watchlist`, 'success');
  }, [watchlist, setWatchlist, playSound, showToast]);
  
  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
    playSound('click');
    showToast(`Removed ${symbol} from watchlist`, 'info');
  }, [setWatchlist, playSound, showToast]);
  
  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================
  
  const placeOrder = useCallback(async () => {
    const quantityNum = parseInt(orderPanel.quantity);
    const priceNum = parseFloat(orderPanel.price);
    
    if (!orderPanel.symbol) {
      showToast('Please select a stock', 'error');
      return;
    }
    
    if (isNaN(quantityNum) || quantityNum <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    
    if (orderPanel.orderType === 'LIMIT' && (isNaN(priceNum) || priceNum <= 0)) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    
    const selectedStockData = stocks.find(s => s.symbol === orderPanel.symbol);
    if (!selectedStockData) {
      showToast('Selected stock not found', 'error');
      return;
    }
    
    const finalPrice = orderPanel.orderType === 'MARKET' ? selectedStockData.price : priceNum;
    const totalCost = quantityNum * finalPrice;
    
    if (orderPanel.type === 'BUY' && totalCost > portfolio.balance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    
    const orderRequest: OrderRequest = {
      symbol: orderPanel.symbol,
      type: orderPanel.type,
      orderType: orderPanel.orderType,
      quantity: quantityNum,
      price: finalPrice,
    };
    
    try {
      playSound('click');
      
      // Simulate API call
      const response: OrderResponse = {
        id: generateId(),
        ...orderRequest,
        total: totalCost,
        status: 'EXECUTED',
        timestamp: Date.now(),
      };
      
      if (orderPanel.type === 'BUY') {
        // Update portfolio balance and holdings
        const existingHolding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
        
        let updatedHoldings;
        if (existingHolding) {
          const newQuantity = existingHolding.quantity + quantityNum;
          const newInvestedValue = existingHolding.investedValue + totalCost;
          const avgPrice = newInvestedValue / newQuantity;
          
          updatedHoldings = portfolio.holdings.map(h =>
            h.symbol === orderPanel.symbol
              ? {
                  ...h,
                  quantity: newQuantity,
                  buyPrice: avgPrice,
                  investedValue: newInvestedValue,
                }
              : h
          );
        } else {
          updatedHoldings = [
            ...portfolio.holdings,
            {
              symbol: orderPanel.symbol,
              name: selectedStockData.name,
              quantity: quantityNum,
              buyPrice: finalPrice,
              currentPrice: finalPrice,
              investedValue: totalCost,
              currentValue: totalCost,
              pl: 0,
              plPercentage: 0,
            },
          ];
        }
        
        setPortfolio(prev => ({
          ...prev,
          balance: prev.balance - totalCost,
          holdings: updatedHoldings,
          orders: [response, ...prev.orders],
        }));
        
        playSound('success');
        showToast(`Buy order placed for ${quantityNum} shares of ${orderPanel.symbol}`, 'success');
      } else {
        // SELL order
        const holding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
        if (!holding || holding.quantity < quantityNum) {
          showToast('Insufficient shares to sell', 'error');
          return;
        }
        
        const remainingQuantity = holding.quantity - quantityNum;
        const soldValue = totalCost;
        
        let updatedHoldings;
        if (remainingQuantity === 0) {
          updatedHoldings = portfolio.holdings.filter(h => h.symbol !== orderPanel.symbol);
        } else {
          updatedHoldings = portfolio.holdings.map(h =>
            h.symbol === orderPanel.symbol
              ? {
                  ...h,
                  quantity: remainingQuantity,
                  investedValue: h.investedValue * (remainingQuantity / h.quantity),
                }
              : h
          );
        }
        
        setPortfolio(prev => ({
          ...prev,
          balance: prev.balance + soldValue,
          holdings: updatedHoldings,
          orders: [response, ...prev.orders],
        }));
        
        playSound('success');
        showToast(`Sell order placed for ${quantityNum} shares of ${orderPanel.symbol}`, 'success');
      }
      
      // Reset order panel
      setOrderPanel(prev => ({
        ...prev,
        quantity: '',
        price: '',
        estimatedCost: 0,
      }));
    } catch (error) {
      console.error('Order placement failed:', error);
      playSound('error');
      showToast('Failed to place order', 'error');
    }
  }, [orderPanel, stocks, portfolio, setPortfolio, playSound, showToast]);
  
  // ==========================================================================
  // DEPOSIT MANAGEMENT
  // ==========================================================================
  
  const handleDeposit = useCallback(async () => {
    const amountNum = parseFloat(depositModal.amount);
    const validation = validateDepositAmount(amountNum);
    
    if (!validation.isValid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }
    
    setDepositModal(prev => ({ ...prev, status: 'processing', errorMessage: null }));
    
    try {
      const request: DepositRequest = { amount: amountNum };
      const response = await executeDeposit(request);
      
      if (response.success) {
        setDepositModal(prev => ({
          ...prev,
          status: 'success',
          transactionId: response.transactionId || null,
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(`upi://pay?pa=merchant@trading&pn=TradingPlatform&am=${amountNum}&cu=INR`),
        }));
        
        setPortfolio(prev => ({
          ...prev,
          balance: prev.balance + amountNum,
        }));
        
        playSound('success');
        showToast(`Successfully deposited ₹${formatCurrency(amountNum)}`, 'success');
      } else {
        throw new Error(response.message || 'Deposit failed');
      }
    } catch (error) {
      console.error('Deposit failed:', error);
      setDepositModal(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Deposit processing failed',
      }));
      playSound('error');
      showToast('Deposit failed. Please try again.', 'error');
    }
  }, [depositModal.amount, setPortfolio, playSound, showToast]);
  
  // ==========================================================================
  // WITHDRAWAL MANAGEMENT
  // ==========================================================================
  
  const handleWithdrawal = useCallback(async () => {
    const amountNum = parseFloat(withdrawModal.amount);
    const amountValidation = validateWithdrawalAmount(amountNum, portfolio.balance);
    
    if (!amountValidation.isValid) {
      showToast(amountValidation.error || 'Invalid amount', 'error');
      return;
    }
    
    const upiValidation = validateUPIId(withdrawModal.upiId);
    if (!upiValidation.isValid) {
      showToast(upiValidation.error || 'Invalid UPI ID', 'error');
      return;
    }
    
    const nameValidation = validateName(withdrawModal.name);
    if (!nameValidation.isValid) {
      showToast(nameValidation.error || 'Invalid name', 'error');
      return;
    }
    
    setWithdrawModal(prev => ({ ...prev, status: 'processing', responseMessage: null }));
    
    try {
      const request: WithdrawalRequest = {
        upiId: withdrawModal.upiId,
        name: withdrawModal.name,
        amount: amountNum,
      };
      
      const response = await executeWithdrawal(request);
      
      if (response.success) {
        setWithdrawModal(prev => ({
          ...prev,
          status: 'success',
          responseMessage: response.message || 'Withdrawal request submitted successfully',
        }));
        
        setPortfolio(prev => ({
          ...prev,
          balance: prev.balance - amountNum,
        }));
        
        playSound('success');
        showToast(`Withdrawal request for ₹${formatCurrency(amountNum)} submitted`, 'success');
        
        // Auto close modal after 3 seconds
        setTimeout(() => {
          setWithdrawModal(prev => ({ ...prev, isOpen: false }));
        }, 3000);
      } else {
        throw new Error(response.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setWithdrawModal(prev => ({
        ...prev,
        status: 'error',
        responseMessage: error instanceof Error ? error.message : 'Withdrawal processing failed',
      }));
      playSound('error');
      showToast('Withdrawal failed. Please try again.', 'error');
    }
  }, [withdrawModal, portfolio.balance, playSound, showToast]);
  
  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  
  useEffect(() => {
    loadStocks();
    loadMarketStatusData();
    
    // Refresh market status every minute
    const marketInterval = setInterval(loadMarketStatusData, 60000);
    // Refresh stock prices every 5 seconds
    const priceInterval = setInterval(loadStocks, 5000);
    
    return () => {
      clearInterval(marketInterval);
      clearInterval(priceInterval);
    };
  }, [loadStocks, loadMarketStatusData]);
  
  useEffect(() => {
    if (selectedStock) {
      loadStockHistory(selectedStock.symbol);
    }
  }, [selectedStock, timeframe, loadStockHistory]);
  
  useEffect(() => {
    // Update estimated cost in order panel
    const quantityNum = parseInt(orderPanel.quantity) || 0;
    let priceNum = parseFloat(orderPanel.price) || 0;
    
    if (orderPanel.orderType === 'MARKET' && orderPanel.symbol) {
      const currentStock = stocks.find(s => s.symbol === orderPanel.symbol);
      if (currentStock) {
        priceNum = currentStock.price;
      }
    }
    
    setOrderPanel(prev => ({
      ...prev,
      estimatedCost: quantityNum * priceNum,
    }));
  }, [orderPanel.quantity, orderPanel.price, orderPanel.orderType, orderPanel.symbol, stocks]);
  
  useEffect(() => {
    // Update real-time prices from WebSocket
    if (wsMessage && wsMessage.type === 'price_update') {
      setStocks(prev => prev.map(stock =>
        stock.symbol === wsMessage.symbol
          ? { ...stock, price: wsMessage.price, change: wsMessage.change, changePercent: wsMessage.changePercent }
          : stock
      ));
    }
  }, [wsMessage]);
  
  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  
  const renderMarketStatus = () => {
    if (!marketStatus || !marketCountdown) return null;
    
    return (
      <div className={`market-status ${marketStatus.isOpen ? 'open' : 'closed'}`}>
        <div className="market-status-indicator">
          <span className={`status-dot ${marketStatus.isOpen ? 'live' : 'inactive'}`}></span>
          <span className="status-text">{marketStatus.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
        </div>
        {!marketStatus.isOpen && marketCountdown.nextOpenTime && (
          <div className="market-countdown">
            <i className="fas fa-clock"></i>
            <span>Opens in: {marketCountdown.nextOpenTime}</span>
          </div>
        )}
        {marketStatus.isOpen && marketCountdown.timeRemaining && (
          <div className="market-countdown">
            <i className="fas fa-hourglass-half"></i>
            <span>Closes in: {marketCountdown.timeRemaining}</span>
          </div>
        )}
      </div>
    );
  };
  
  const renderStockCard = (stock: Stock, showRemoveButton = false) => (
    <div
      key={stock.symbol}
      className={`stock-card ${selectedStock?.symbol === stock.symbol ? 'selected' : ''}`}
      onClick={() => setSelectedStock(stock)}
    >
      <div className="stock-info">
        <div className="stock-symbol">{stock.symbol}</div>
        <div className="stock-name">{stock.name}</div>
      </div>
      <div className="stock-price-info">
        <div className="stock-price">₹{formatCurrency(stock.price)}</div>
        <div className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
          {stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
        </div>
      </div>
      {showRemoveButton && (
        <button
          className="remove-watchlist-btn"
          onClick={(e) => {
            e.stopPropagation();
            removeFromWatchlist(stock.symbol);
          }}
        >
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
  
  const renderPortfolioPanel = () => (
    <div className="portfolio-panel">
      <div className="portfolio-summary">
        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">₹{formatCurrency(portfolio.balance)}</div>
          <div className="balance-actions">
            <button className="btn-deposit" onClick={() => setDepositModal(prev => ({ ...prev, isOpen: true }))}>
              <i className="fas fa-plus-circle"></i> Deposit
            </button>
            <button className="btn-withdraw" onClick={() => setWithdrawModal(prev => ({ ...prev, isOpen: true }))}>
              <i className="fas fa-minus-circle"></i> Withdraw
            </button>
          </div>
        </div>
        
        <div className="pl-card">
          <div className="pl-item">
            <div className="pl-label">Total Invested</div>
            <div className="pl-value">₹{formatCurrency(portfolio.totalInvested)}</div>
          </div>
          <div className="pl-item">
            <div className="pl-label">Current Value</div>
            <div className="pl-value">₹{formatCurrency(portfolio.totalCurrentValue)}</div>
          </div>
          <div className="pl-item">
            <div className="pl-label">Total P&L</div>
            <div className={`pl-value ${portfolio.totalPL >= 0 ? 'positive' : 'negative'}`}>
              {portfolio.totalPL >= 0 ? '+' : ''}₹{formatCurrency(portfolio.totalPL)} ({portfolio.totalPLPercentage.toFixed(2)}%)
            </div>
          </div>
          <div className="pl-item">
            <div className="pl-label">Today's P&L</div>
            <div className={`pl-value ${portfolio.dayPL >= 0 ? 'positive' : 'negative'}`}>
              {portfolio.dayPL >= 0 ? '+' : ''}₹{formatCurrency(portfolio.dayPL)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="holdings-section">
        <div className="section-title">
          <i className="fas fa-chart-simple"></i> Holdings ({portfolio.holdings.length})
        </div>
        {portfolio.holdings.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <p>No holdings yet. Start trading!</p>
          </div>
        ) : (
          <div className="holdings-list">
            <div className="holdings-header">
              <span>Stock</span>
              <span>Qty</span>
              <span>Avg</span>
              <span>Current</span>
              <span>P&L</span>
            </div>
            {portfolio.holdings.map(holding => (
              <div key={holding.symbol} className="holding-item">
                <div className="holding-symbol">
                  <div className="symbol">{holding.symbol}</div>
                  <div className="name">{holding.name}</div>
                </div>
                <div className="holding-quantity">{holding.quantity}</div>
                <div className="holding-avg">₹{formatCurrency(holding.buyPrice)}</div>
                <div className="holding-current">₹{formatCurrency(holding.currentPrice)}</div>
                <div className={`holding-pl ${holding.pl >= 0 ? 'positive' : 'negative'}`}>
                  {holding.pl >= 0 ? '+' : ''}₹{formatCurrency(holding.pl)} ({holding.plPercentage.toFixed(2)}%)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="orders-section">
        <div className="section-title">
          <i className="fas fa-clock"></i> Recent Orders
        </div>
        {portfolio.orders.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-receipt"></i>
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="orders-list">
            {portfolio.orders.slice(0, 10).map(order => (
              <div key={order.id} className="order-item">
                <div className="order-type">
                  <span className={`order-badge ${order.type.toLowerCase()}`}>{order.type}</span>
                  <span className="order-symbol">{order.symbol}</span>
                </div>
                <div className="order-details">
                  <span>{order.quantity} shares @ ₹{formatCurrency(order.price)}</span>
                  <span className="order-total">₹{formatCurrency(order.total)}</span>
                </div>
                <div className="order-status">
                  <span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
                  <span className="order-time">{new Date(order.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderOrderPanel = () => (
    <div className="order-panel">
      <div className="order-type-toggle">
        <button
          className={`order-type-btn ${orderPanel.type === 'BUY' ? 'active buy' : ''}`}
          onClick={() => setOrderPanel(prev => ({ ...prev, type: 'BUY' }))}
        >
          BUY
        </button>
        <button
          className={`order-type-btn ${orderPanel.type === 'SELL' ? 'active sell' : ''}`}
          onClick={() => setOrderPanel(prev => ({ ...prev, type: 'SELL' }))}
        >
          SELL
        </button>
      </div>
      
      <div className="order-form">
        <div className="form-group">
          <label>Stock Symbol</label>
          <select
            value={orderPanel.symbol}
            onChange={(e) => setOrderPanel(prev => ({ ...prev, symbol: e.target.value }))}
          >
            <option value="">Select stock</option>
            {stocks.map(stock => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Order Type</label>
          <div className="order-type-selector">
            <button
              className={`order-subtype ${orderPanel.orderType === 'MARKET' ? 'active' : ''}`}
              onClick={() => setOrderPanel(prev => ({ ...prev, orderType: 'MARKET', price: '' }))}
            >
              MARKET
            </button>
            <button
              className={`order-subtype ${orderPanel.orderType === 'LIMIT' ? 'active' : ''}`}
              onClick={() => setOrderPanel(prev => ({ ...prev, orderType: 'LIMIT' }))}
            >
              LIMIT
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            value={orderPanel.quantity}
            onChange={(e) => setOrderPanel(prev => ({ ...prev, quantity: e.target.value }))}
            placeholder="Enter quantity"
            min="1"
          />
        </div>
        
        {orderPanel.orderType === 'LIMIT' && (
          <div className="form-group">
            <label>Price (₹)</label>
            <input
              type="number"
              value={orderPanel.price}
              onChange={(e) => setOrderPanel(prev => ({ ...prev, price: e.target.value }))}
              placeholder="Enter price"
              step="0.05"
            />
          </div>
        )}
        
        <div className="order-estimate">
          <div className="estimate-label">Estimated Total</div>
          <div className="estimate-value">₹{formatCurrency(orderPanel.estimatedCost)}</div>
        </div>
        
        <button
          className={`place-order-btn ${orderPanel.type.toLowerCase()}`}
          onClick={placeOrder}
          disabled={!orderPanel.symbol || !orderPanel.quantity || (orderPanel.orderType === 'LIMIT' && !orderPanel.price)}
        >
          {orderPanel.type === 'BUY' ? (
            <><i className="fas fa-arrow-down"></i> Place Buy Order</>
          ) : (
            <><i className="fas fa-arrow-up"></i> Place Sell Order</>
          )}
        </button>
      </div>
    </div>
  );
  
  const renderDepositModal = () => (
    <div className={`modal ${depositModal.isOpen ? 'active' : ''}`} onClick={() => depositModal.status === 'idle' && setDepositModal(prev => ({ ...prev, isOpen: false }))}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><i className="fas fa-plus-circle"></i> Deposit Funds</h2>
          <button className="modal-close" onClick={() => setDepositModal(prev => ({ ...prev, isOpen: false }))}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {depositModal.status === 'idle' && (
            <>
              <div className="form-group">
                <label>Amount (Min ₹100)</label>
                <input
                  type="number"
                  value={depositModal.amount}
                  onChange={(e) => setDepositModal(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                  min="100"
                  step="100"
                />
              </div>
              <button className="btn-submit" onClick={handleDeposit}>
                Generate QR Code
              </button>
            </>
          )}
          
          {depositModal.status === 'processing' && (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Processing deposit request...</p>
            </div>
          )}
          
          {depositModal.status === 'success' && (
            <div className="success-state">
              <i className="fas fa-check-circle"></i>
              <h3>Deposit Successful!</h3>
              <p>Amount: ₹{formatCurrency(parseFloat(depositModal.amount))}</p>
              {depositModal.qrCodeUrl && (
                <div className="qr-code">
                  <img src={depositModal.qrCodeUrl} alt="Payment QR Code" />
                  <p className="qr-note">Scan QR code to complete payment</p>
                </div>
              )}
              <button className="btn-close" onClick={() => setDepositModal(prev => ({ ...prev, isOpen: false, status: 'idle', amount: '' }))}>
                Close
              </button>
            </div>
          )}
          
          {depositModal.status === 'error' && (
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Deposit Failed</h3>
              <p>{depositModal.errorMessage}</p>
              <button className="btn-retry" onClick={() => setDepositModal(prev => ({ ...prev, status: 'idle', errorMessage: null }))}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  const renderWithdrawModal = () => (
    <div className={`modal ${withdrawModal.isOpen ? 'active' : ''}`} onClick={() => withdrawModal.status === 'idle' && setWithdrawModal(prev => ({ ...prev, isOpen: false }))}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><i className="fas fa-minus-circle"></i> Withdraw Funds</h2>
          <button className="modal-close" onClick={() => setWithdrawModal(prev => ({ ...prev, isOpen: false }))}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {withdrawModal.status === 'idle' && (
            <>
              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  value={withdrawModal.upiId}
                  onChange={(e) => setWithdrawModal(prev => ({ ...prev, upiId: e.target.value }))}
                  placeholder="username@bank"
                />
              </div>
              
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={withdrawModal.name}
                  onChange={(e) => setWithdrawModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="form-group">
                <label>Amount (Max ₹{formatCurrency(portfolio.balance)})</label>
                <input
                  type="number"
                  value={withdrawModal.amount}
                  onChange={(e) => setWithdrawModal(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                  min="100"
                  max={portfolio.balance}
                  step="100"
                />
              </div>
              
              <button className="btn-submit" onClick={handleWithdrawal}>
                Request Withdrawal
              </button>
            </>
          )}
          
          {withdrawModal.status === 'processing' && (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Processing withdrawal request...</p>
            </div>
          )}
          
          {withdrawModal.status === 'success' && (
            <div className="success-state">
              <i className="fas fa-check-circle"></i>
              <h3>Withdrawal Request Submitted!</h3>
              <p>{withdrawModal.responseMessage}</p>
              <p className="note">Amount will be credited within 24 hours</p>
              <button className="btn-close" onClick={() => setWithdrawModal(prev => ({ ...prev, isOpen: false, status: 'idle', upiId: '', name: '', amount: '' }))}>
                Close
              </button>
            </div>
          )}
          
          {withdrawModal.status === 'error' && (
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Withdrawal Failed</h3>
              <p>{withdrawModal.responseMessage}</p>
              <button className="btn-retry" onClick={() => setWithdrawModal(prev => ({ ...prev, status: 'idle', responseMessage: null }))}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <i className="fas fa-chart-line"></i>
            <span>TRADING<span>PRO</span></span>
          </div>
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <i className={`fas fa-chevron-${isSidebarOpen ? 'left' : 'right'}`}></i>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            <i className="fas fa-briefcase"></i>
            <span>Portfolio</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-list-ul"></i>
            <span>Orders</span>
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="market-status-widget">
            {renderMarketStatus()}
          </div>
        </div>
      </aside>
      
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      
      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="app-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <i className="fas fa-bars"></i>
          </button>
          
          <div className="header-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="header-actions">
            <div className="balance-display">
              <i className="fas fa-wallet"></i>
              <span>₹{formatCurrency(portfolio.balance)}</span>
            </div>
            <button className="sound-toggle" onClick={() => playSound('click')}>
              <i className="fas fa-volume-up"></i>
            </button>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'dashboard' && (
            <>
              {/* Watchlist Section */}
              <div className="watchlist-section">
                <div className="section-header">
                  <h2><i className="fas fa-star"></i> Watchlist</h2>
                  <button
                    className="refresh-btn"
                    onClick={loadStocks}
                    disabled={isLoadingStocks}
                  >
                    <i className={`fas fa-sync-alt ${isLoadingStocks ? 'fa-spin' : ''}`}></i>
                  </button>
                </div>
                
                <div className="watchlist-container">
                  {filteredWatchlistStocks.length === 0 ? (
                    <div className="empty-watchlist">
                      <i className="fas fa-star-of-life"></i>
                      <p>Your watchlist is empty</p>
                      <p className="hint">Click + on any stock to add</p>
                    </div>
                  ) : (
                    filteredWatchlistStocks.map(stock => renderStockCard(stock, true))
                  )}
                </div>
              </div>
              
              {/* Chart Section */}
              <div className="chart-section">
                <div className="chart-header">
                  <div className="chart-stock-info">
                    {selectedStock && (
                      <>
                        <h2>{selectedStock.symbol}</h2>
                        <span className="stock-name-chart">{selectedStock.name}</span>
                      </>
                    )}
                  </div>
                  <div className="chart-controls">
                    <div className="chart-type-toggle">
                      <button
                        className={`chart-type-btn ${chartType === 'candlestick' ? 'active' : ''}`}
                        onClick={() => setChartType('candlestick')}
                      >
                        Candlestick
                      </button>
                      <button
                        className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
                        onClick={() => setChartType('line')}
                      >
                        Line
                      </button>
                    </div>
                    <div className="timeframe-toggle">
                      <button
                        className={`timeframe-btn ${timeframe === '1m' ? 'active' : ''}`}
                        onClick={() => setTimeframe('1m')}
                      >
                        1m
                      </button>
                      <button
                        className={`timeframe-btn ${timeframe === '5m' ? 'active' : ''}`}
                        onClick={() => setTimeframe('5m')}
                      >
                        5m
                      </button>
                      <button
                        className={`timeframe-btn ${timeframe === '1D' ? 'active' : ''}`}
                        onClick={() => setTimeframe('1D')}
                      >
                        1D
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="chart-container">
                  {isLoadingChart ? (
                    <div className="chart-loading">
                      <i className="fas fa-chart-line fa-spin"></i>
                      <p>Loading chart data...</p>
                    </div>
                  ) : (
                    <Suspense fallback={<div className="chart-loading">Loading chart...</div>}>
                      <ChartComponent
                        data={stockHistory}
                        type={chartType}
                        symbol={selectedStock?.symbol || ''}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
              
              {/* Market Overview */}
              <div className="market-overview">
                <div className="section-header">
                  <h2><i className="fas fa-chart-simple"></i> Market Overview</h2>
                </div>
                <div className="stocks-grid">
                  {filteredStocks.slice(0, 10).map(stock => renderStockCard(stock, !watchlist.some(w => w.symbol === stock.symbol)))}
                  {filteredStocks.length > 10 && (
                    <button className="view-more-btn">
                      View More <i className="fas fa-arrow-right"></i>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'portfolio' && renderPortfolioPanel()}
          
          {activeTab === 'orders' && (
            <div className="orders-panel-view">
              <div className="order-panel-container">
                {renderOrderPanel()}
              </div>
              <div className="recent-orders-container">
                <h3><i className="fas fa-history"></i> Order History</h3>
                <div className="orders-list-full">
                  {portfolio.orders.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-receipt"></i>
                      <p>No orders placed yet</p>
                    </div>
                  ) : (
                    portfolio.orders.map(order => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-header">
                          <span className={`order-badge ${order.type.toLowerCase()}`}>{order.type}</span>
                          <span className="order-symbol">{order.symbol}</span>
                          <span className={`order-status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
                        </div>
                        <div className="order-card-details">
                          <div className="detail">
                            <span className="label">Quantity:</span>
                            <span className="value">{order.quantity}</span>
                          </div>
                          <div className="detail">
                            <span className="label">Price:</span>
                            <span className="value">₹{formatCurrency(order.price)}</span>
                          </div>
                          <div className="detail">
                            <span className="label">Total:</span>
                            <span className="value">₹{formatCurrency(order.total)}</span>
                          </div>
                          <div className="detail">
                            <span className="label">Time:</span>
                            <span className="value">{new Date(order.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Modals */}
      {renderDepositModal()}
      {renderWithdrawModal()}
      
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <div className="toast-icon">
              {toast.type === 'success' && <i className="fas fa-check-circle"></i>}
              {toast.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
              {toast.type === 'info' && <i className="fas fa-info-circle"></i>}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button className="toast-close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;