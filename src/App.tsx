/**
 * Main Application Component - Trading Platform Core
 * Features: Stock Dashboard, Real-time Charts, Watchlist, Portfolio, Orders, Deposits, Withdrawals
 * Version: 3.0.0 - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { fetchStocks, fetchStockHistory, fetchMarketStatus, executeDeposit, executeWithdrawal, type Stock, type StockHistory, type MarketStatus, type DepositRequest, type WithdrawalRequest, type OrderRequest, type OrderResponse } from './api';
import { 
  formatCurrency, 
  formatPercentage, 
  validateDepositAmount, 
  validateWithdrawalAmount, 
  validateUPIId, 
  validateName,
  calculateMarketCountdown,
  generateId,
  calculatePortfolioValue,
  calculateTotalPL,
  calculateDayPL,
  debounce,
  throttle,
  type MarketTimeInfo,
  type ToastType,
  type SoundType
} from './utils';

// Lazy load chart component for performance
const ChartComponent = lazy(() => import('./components/ChartComponent'));

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

interface Notification {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
}

interface NewsItem {
  id: string;
  title: string;
  time: string;
  impact: 'positive' | 'negative' | 'neutral';
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useSound = () => {
  const soundsRef = useRef<{ [key in SoundType]?: HTMLAudioElement }>({});
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    const soundFiles: SoundType[] = ['click', 'success', 'error', 'notification', 'order', 'alert'];
    soundFiles.forEach(sound => {
      try {
        const audio = new Audio(`/assets/sounds/${sound}.mp3`);
        audio.preload = 'auto';
        audio.onerror = () => console.warn(`Failed to load sound: ${sound}`);
        soundsRef.current[sound] = audio;
      } catch (error) {
        console.warn(`Error loading sound ${sound}:`, error);
      }
    });
  }, []);

  const play = useCallback((type: SoundType) => {
    if (!isEnabled) return;
    const sound = soundsRef.current[type];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.warn('Sound play failed:', err));
    }
  }, [isEnabled]);

  return { play, isEnabled, setIsEnabled };
};

const useToast = () => {
  const [toasts, setToasts] = useState<Notification[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration: number = 4000) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
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
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  // Stock Data State
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory | null>(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  
  // Market Status State
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [marketCountdown, setMarketCountdown] = useState<MarketTimeInfo | null>(null);
  
  // Chart Settings
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1D' | '1W' | '1M'>('1D');
  
  // Watchlist State
  const [watchlist, setWatchlist] = useLocalStorage<WatchlistItem[]>('watchlist', []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Portfolio State
  const [portfolio, setPortfolio] = useLocalStorage<Portfolio>('portfolio', {
    balance: 100000,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'orders' | 'watchlist'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Market Movers & News
  const [marketMovers, setMarketMovers] = useState<MarketMover[]>([
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2856.75, changePercent: 2.3, volume: 5234567 },
    { symbol: 'TCS', name: 'Tata Consultancy', price: 3987.50, changePercent: -0.31, volume: 1234567 },
    { symbol: 'HDFC', name: 'HDFC Bank', price: 1678.90, changePercent: 0.94, volume: 3456789 },
    { symbol: 'INFY', name: 'Infosys', price: 1523.45, changePercent: 1.2, volume: 2345678 },
    { symbol: 'ICICI', name: 'ICICI Bank', price: 1123.80, changePercent: -0.46, volume: 4567890 },
  ]);

  const [news] = useState<NewsItem[]>([
    { id: '1', title: 'RBI keeps repo rate unchanged at 6.5%', time: '2 hours ago', impact: 'neutral' },
    { id: '2', title: 'IT sector shows strong quarterly results', time: '4 hours ago', impact: 'positive' },
    { id: '3', title: 'Oil prices surge amid supply concerns', time: '6 hours ago', impact: 'negative' },
    { id: '4', title: 'FIIs invest ₹5000 crores in Indian markets', time: '8 hours ago', impact: 'positive' },
    { id: '5', title: 'New SEBI regulations for F&O trading', time: '12 hours ago', impact: 'neutral' },
  ]);
  
  // Custom Hooks
  const { play: playSound } = useSound();
  const { toasts, showToast, removeToast } = useToast();

  // Filter stocks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStocks(stocks);
      setShowSearchResults(false);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = stocks.filter(
        stock => stock.symbol.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query)
      );
      setFilteredStocks(filtered);
      setShowSearchResults(true);
    }
  }, [searchQuery, stocks]);

  // Load stocks
  const loadStocks = useCallback(async () => {
    try {
      setIsLoadingStocks(true);
      const data = await fetchStocks();
      setStocks(data);
      setFilteredStocks(data);
      if (data.length > 0 && !selectedStock) {
        setSelectedStock(data[0]);
      }
      
      // Update market movers with real data
      const topGainers = [...data].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
      setMarketMovers(topGainers.map(s => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        changePercent: s.changePercent,
        volume: s.volume
      })));
      
    } catch (error) {
      showToast('Failed to load stock data', 'error');
    } finally {
      setIsLoadingStocks(false);
    }
  }, [selectedStock, showToast]);

  // Load stock history
  const loadStockHistory = useCallback(async (symbol: string) => {
    if (!symbol) return;
    try {
      setIsLoadingChart(true);
      const history = await fetchStockHistory(symbol, timeframe);
      setStockHistory(history);
    } catch (error) {
      showToast('Failed to load chart data', 'error');
    } finally {
      setIsLoadingChart(false);
    }
  }, [timeframe, showToast]);

  // Load market status
  const loadMarketStatusData = useCallback(async () => {
    try {
      const status = await fetchMarketStatus();
      setMarketStatus(status);
      const countdown = calculateMarketCountdown();
      setMarketCountdown(countdown);
    } catch (error) {
      console.error(error);
    }
  }, []);

  // Add to watchlist
  const addToWatchlist = useCallback((stock: Stock) => {
    if (watchlist.length >= 50) {
      showToast('Watchlist limit reached (50 items)', 'error');
      return;
    }
    if (watchlist.some(item => item.symbol === stock.symbol)) {
      showToast(`${stock.symbol} already in watchlist`, 'info');
      return;
    }
    setWatchlist(prev => [...prev, { 
      id: generateId(), 
      symbol: stock.symbol, 
      name: stock.name, 
      addedAt: Date.now() 
    }]);
    playSound('click');
    showToast(`Added ${stock.symbol} to watchlist`, 'success');
  }, [watchlist, setWatchlist, playSound, showToast]);

  // Remove from watchlist
  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
    playSound('click');
    showToast(`Removed ${symbol} from watchlist`, 'info');
  }, [setWatchlist, playSound, showToast]);

  // Place order
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
    
    if (orderPanel.type === 'SELL') {
      const holding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
      if (!holding || holding.quantity < quantityNum) {
        showToast('Insufficient shares to sell', 'error');
        return;
      }
    }
    
    try {
      playSound('click');
      
      const newOrder: Order = {
        id: generateId(),
        symbol: orderPanel.symbol,
        type: orderPanel.type,
        orderType: orderPanel.orderType,
        quantity: quantityNum,
        price: finalPrice,
        total: totalCost,
        status: 'EXECUTED',
        timestamp: Date.now(),
      };
      
      if (orderPanel.type === 'BUY') {
        const existingHolding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
        let updatedHoldings;
        
        if (existingHolding) {
          const newQuantity = existingHolding.quantity + quantityNum;
          const newInvestedValue = existingHolding.investedValue + totalCost;
          updatedHoldings = portfolio.holdings.map(h =>
            h.symbol === orderPanel.symbol
              ? { ...h, quantity: newQuantity, investedValue: newInvestedValue, buyPrice: newInvestedValue / newQuantity }
              : h
          );
        } else {
          updatedHoldings = [...portfolio.holdings, {
            symbol: orderPanel.symbol,
            name: selectedStockData.name,
            quantity: quantityNum,
            buyPrice: finalPrice,
            currentPrice: finalPrice,
            investedValue: totalCost,
            currentValue: totalCost,
            pl: 0,
            plPercentage: 0,
          }];
        }
        
        setPortfolio(prev => ({
          ...prev,
          balance: prev.balance - totalCost,
          holdings: updatedHoldings,
          orders: [newOrder, ...prev.orders],
        }));
        
        playSound('success');
        showToast(`✅ Buy order placed for ${quantityNum} shares of ${orderPanel.symbol}`, 'success');
      } else {
        const holding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
        const remainingQuantity = holding!.quantity - quantityNum;
        const soldValue = totalCost;
        
        let updatedHoldings;
        if (remainingQuantity === 0) {
          updatedHoldings = portfolio.holdings.filter(h => h.symbol !== orderPanel.symbol);
        } else {
          updatedHoldings = portfolio.holdings.map(h =>
            h.symbol === orderPanel.symbol
              ? { ...h, quantity: remainingQuantity, investedValue: h.investedValue * (remainingQuantity / h.quantity) }
              : h
          );
        }
        
        setPortfolio(prev => ({
          ...prev,
          balance: prev.balance + soldValue,
          holdings: updatedHoldings,
          orders: [newOrder, ...prev.orders],
        }));
        
        playSound('success');
        showToast(`✅ Sell order placed for ${quantityNum} shares of ${orderPanel.symbol}`, 'success');
      }
      
      setOrderPanel(prev => ({ ...prev, quantity: '', price: '', estimatedCost: 0 }));
    } catch (error) {
      playSound('error');
      showToast('Failed to place order', 'error');
    }
  }, [orderPanel, stocks, portfolio, setPortfolio, playSound, showToast]);

  // Handle deposit
  const handleDeposit = useCallback(async () => {
    const amountNum = parseFloat(depositModal.amount);
    const validation = validateDepositAmount(amountNum);
    
    if (!validation.isValid) {
      showToast(validation.error || 'Invalid amount', 'error');
      return;
    }
    
    setDepositModal(prev => ({ ...prev, status: 'processing' }));
    
    try {
      const response = await executeDeposit({ amount: amountNum });
      if (response.success) {
        setDepositModal(prev => ({
          ...prev,
          status: 'success',
          transactionId: response.transactionId || null,
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + 
            encodeURIComponent(`upi://pay?pa=merchant@trading&pn=TradingPlatform&am=${amountNum}&cu=INR`),
        }));
        setPortfolio(prev => ({ ...prev, balance: prev.balance + amountNum }));
        playSound('success');
        showToast(`💰 Successfully deposited ₹${formatCurrency(amountNum)}`, 'success');
        
        setTimeout(() => {
          setDepositModal(prev => ({ ...prev, isOpen: false, status: 'idle', amount: '' }));
        }, 3000);
      }
    } catch (error) {
      setDepositModal(prev => ({ ...prev, status: 'error', errorMessage: 'Deposit failed' }));
      playSound('error');
      showToast('Deposit failed. Please try again.', 'error');
    }
  }, [depositModal.amount, setPortfolio, playSound, showToast]);

  // Handle withdrawal
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
    
    setWithdrawModal(prev => ({ ...prev, status: 'processing' }));
    
    try {
      const response = await executeWithdrawal({ 
        upiId: withdrawModal.upiId, 
        name: withdrawModal.name, 
        amount: amountNum 
      });
      
      if (response.success) {
        setWithdrawModal(prev => ({ 
          ...prev, 
          status: 'success', 
          responseMessage: response.message 
        }));
        setPortfolio(prev => ({ ...prev, balance: prev.balance - amountNum }));
        playSound('success');
        showToast(`💸 Withdrawal request for ₹${formatCurrency(amountNum)} submitted`, 'success');
        
        setTimeout(() => {
          setWithdrawModal(prev => ({ 
            ...prev, 
            isOpen: false, 
            status: 'idle', 
            upiId: '', 
            name: '', 
            amount: '' 
          }));
        }, 3000);
      }
    } catch (error) {
      setWithdrawModal(prev => ({ ...prev, status: 'error', responseMessage: 'Withdrawal failed' }));
      playSound('error');
      showToast('Withdrawal failed. Please try again.', 'error');
    }
  }, [withdrawModal, portfolio.balance, playSound, showToast]);

  // Effects
  useEffect(() => {
    loadStocks();
    loadMarketStatusData();
    const marketInterval = setInterval(loadMarketStatusData, 60000);
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
    const quantityNum = parseInt(orderPanel.quantity) || 0;
    let priceNum = parseFloat(orderPanel.price) || 0;
    if (orderPanel.orderType === 'MARKET' && orderPanel.symbol) {
      const currentStock = stocks.find(s => s.symbol === orderPanel.symbol);
      if (currentStock) priceNum = currentStock.price;
    }
    setOrderPanel(prev => ({ ...prev, estimatedCost: quantityNum * priceNum }));
  }, [orderPanel.quantity, orderPanel.price, orderPanel.orderType, orderPanel.symbol, stocks]);

  // Watchlist stocks
  const watchlistStocks = useMemo(() => {
    const symbols = new Set(watchlist.map(item => item.symbol));
    return stocks.filter(stock => symbols.has(stock.symbol));
  }, [stocks, watchlist]);

  // Render functions
  const renderMarketStatus = () => {
    if (!marketStatus || !marketCountdown) return null;
    return (
      <div className={`market-status ${marketStatus.isOpen ? 'open' : 'closed'}`}>
        <div className="market-status-indicator">
          <span className={`status-dot ${marketStatus.isOpen ? 'live' : 'inactive'}`}></span>
          <span className="status-text">{marketStatus.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
        </div>
        {marketCountdown.timeRemaining && (
          <div className="market-countdown">
            <i className="fas fa-clock"></i>
            <span>{marketStatus.isOpen ? 'Closes in: ' : 'Opens in: '}{marketCountdown.timeRemaining}</span>
          </div>
        )}
      </div>
    );
  };

  const renderStockCard = (stock: Stock, showAddButton = false, showRemoveButton = false) => (
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
          {stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)} 
          ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
        </div>
      </div>
      {showAddButton && (
        <button 
          className="add-watchlist-btn"
          onClick={(e) => { e.stopPropagation(); addToWatchlist(stock); }}
        >
          <i className="fas fa-plus"></i>
        </button>
      )}
      {showRemoveButton && (
        <button 
          className="remove-watchlist-btn"
          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(stock.symbol); }}
        >
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );

  const renderSearchResults = () => {
    if (!showSearchResults || !searchQuery.trim()) return null;
    return (
      <div className="search-results-dropdown">
        {filteredStocks.length === 0 ? (
          <div className="no-results">No stocks found for "{searchQuery}"</div>
        ) : (
          filteredStocks.slice(0, 10).map(stock => renderStockCard(stock, true, false))
        )}
      </div>
    );
  };

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
              {portfolio.totalPL >= 0 ? '+' : ''}₹{formatCurrency(portfolio.totalPL)} 
              ({portfolio.totalPLPercentage.toFixed(2)}%)
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
                {stock.symbol} - {stock.name} (₹{formatCurrency(stock.price)})
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

  // Main Render
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
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>
            <i className="fas fa-star"></i>
            <span>Watchlist</span>
            {watchlist.length > 0 && <span className="badge">{watchlist.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
            <i className="fas fa-briefcase"></i>
            <span>Portfolio</span>
          </button>
          <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <i className="fas fa-list-ul"></i>
            <span>Orders</span>
          </button>
        </nav>
        
        <div className="sidebar-footer">
          {renderMarketStatus()}
        </div>
      </aside>
      
      {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}
      
      <main className="main-content">
        <header className="app-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <i className="fas fa-bars"></i>
          </button>
          
          <div className="header-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search stocks by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            />
            {renderSearchResults()}
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
        
        <div className="content-area">
          {activeTab === 'dashboard' && (
            <>
              {/* Market Status Banner */}
              <div className="market-banner">
                <div className="market-time">
                  <i className="fas fa-calendar-alt"></i>
                  <span>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {renderMarketStatus()}
              </div>
              
              {/* Chart Section */}
              <div className="chart-section">
                <div className="chart-header">
                  <div className="chart-stock-info">
                    {selectedStock && (
                      <>
                        <h2>{selectedStock.symbol}</h2>
                        <span className="stock-name-chart">{selectedStock.name}</span>
                        <div className="stock-current-price">
                          <span className="price">₹{formatCurrency(selectedStock.price)}</span>
                          <span className={`change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
                            {selectedStock.change >= 0 ? '+' : ''}{formatCurrency(selectedStock.change)} ({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="chart-controls">
                    <div className="chart-type-toggle">
                      <button className={`chart-type-btn ${chartType === 'candlestick' ? 'active' : ''}`} onClick={() => setChartType('candlestick')}>
                        <i className="fas fa-chart-bar"></i> Candlestick
                      </button>
                      <button className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}>
                        <i className="fas fa-chart-line"></i> Line
                      </button>
                    </div>
                    <div className="timeframe-toggle">
                      <button className={`timeframe-btn ${timeframe === '1m' ? 'active' : ''}`} onClick={() => setTimeframe('1m')}>1m</button>
                      <button className={`timeframe-btn ${timeframe === '5m' ? 'active' : ''}`} onClick={() => setTimeframe('5m')}>5m</button>
                      <button className={`timeframe-btn ${timeframe === '1D' ? 'active' : ''}`} onClick={() => setTimeframe('1D')}>1D</button>
                      <button className={`timeframe-btn ${timeframe === '1W' ? 'active' : ''}`} onClick={() => setTimeframe('1W')}>1W</button>
                      <button className={`timeframe-btn ${timeframe === '1M' ? 'active' : ''}`} onClick={() => setTimeframe('1M')}>1M</button>
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
                      <ChartComponent data={stockHistory} type={chartType} symbol={selectedStock?.symbol || ''} />
                    </Suspense>
                  )}
                </div>
              </div>
              
              {/* Market Movers & News Grid */}
              <div className="market-info-grid">
                {/* Market Movers */}
                <div className="market-movers-section">
                  <div className="section-header">
                    <h2><i className="fas fa-rocket"></i> Top Movers</h2>
                    <button className="btn-small" onClick={() => setShowLeaderboard(!showLeaderboard)}>
                      {showLeaderboard ? 'Show Less' : 'View All'}
                    </button>
                  </div>
                  <div className="movers-grid">
                    {(showLeaderboard ? marketMovers : marketMovers.slice(0, 3)).map(mover => (
                      <div key={mover.symbol} className="mover-card" onClick={() => {
                        const stock = stocks.find(s => s.symbol === mover.symbol);
                        if (stock) setSelectedStock(stock);
                      }}>
                        <div className="mover-info">
                          <div>
                            <h4>{mover.symbol}</h4>
                            <small>{mover.name}</small>
                          </div>
                          <div className="mover-stats">
                            <div className="mover-price">₹{formatCurrency(mover.price)}</div>
                            <div className={`mover-change ${mover.changePercent >= 0 ? 'positive' : 'negative'}`}>
                              {mover.changePercent >= 0 ? '+' : ''}{mover.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className="mover-volume">
                          <i className="fas fa-chart-simple"></i> Vol: {(mover.volume / 100000).toFixed(1)}L
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* News Section */}
                <div className="news-section">
                  <div className="section-header">
                    <h2><i className="fas fa-newspaper"></i> Market News</h2>
                  </div>
                  <div className="news-list">
                    {news.map(item => (
                      <div key={item.id} className="news-item">
                        <div className="news-impact">
                          <span className={`impact-dot ${item.impact}`}></span>
                        </div>
                        <div className="news-content">
                          <h4>{item.title}</h4>
                          <div className="news-meta">
                            <span><i className="far fa-clock"></i> {item.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'watchlist' && (
            <div className="watchlist-section">
              <div className="section-header">
                <h2><i className="fas fa-star"></i> My Watchlist</h2>
                <button className="refresh-btn" onClick={loadStocks} disabled={isLoadingStocks}>
                  <i className={`fas fa-sync-alt ${isLoadingStocks ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
              <div className="watchlist-container">
                {watchlistStocks.length === 0 ? (
                  <div className="empty-watchlist">
                    <i className="fas fa-star-of-life"></i>
                    <h3>Your watchlist is empty</h3>
                    <p>Search for stocks and click the + button to add them to your watchlist</p>
                  </div>
                ) : (
                  watchlistStocks.map(stock => renderStockCard(stock, false, true))
                )}
              </div>
            </div>
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
      
      {renderDepositModal()}
      {renderWithdrawModal()}
      
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <div className="toast-icon">
              {toast.type === 'success' && <i className="fas fa-check-circle"></i>}
              {toast.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
              {toast.type === 'info' && <i className="fas fa-info-circle"></i>}
            </div>
            <div className="toast-message">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
