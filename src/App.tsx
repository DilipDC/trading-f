/**
 * Main Application Component - Full UI/UX, Optimized for Speed
 * Features: Dashboard, Charts, Watchlist, Portfolio, Orders, Deposits, Withdrawals
 * Responsive: Mobile, Tablet, Laptop, Desktop
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { fetchStocks, fetchStockHistory, fetchMarketStatus, executeDeposit, executeWithdrawal, type Stock, type StockHistory, type MarketStatus } from './api';
import { formatCurrency, validateDepositAmount, validateWithdrawalAmount, validateUPIId, validateName, calculateMarketCountdown, generateId, type MarketTimeInfo, type ToastType } from './utils';

// Lazy load chart for performance
const ChartComponent = lazy(() => import('./components/ChartComponent'));

// ========== TYPES ==========
interface WatchlistItem { id: string; symbol: string; name: string; addedAt: number; }
interface Holding { symbol: string; name: string; quantity: number; buyPrice: number; currentPrice: number; investedValue: number; currentValue: number; pl: number; plPercentage: number; }
interface Order { id: string; symbol: string; type: 'BUY' | 'SELL'; orderType: 'MARKET' | 'LIMIT'; quantity: number; price: number; total: number; status: 'EXECUTED'; timestamp: number; }
interface Portfolio { balance: number; totalInvested: number; totalCurrentValue: number; totalPL: number; totalPLPercentage: number; dayPL: number; holdings: Holding[]; orders: Order[]; }
interface Notification { id: string; message: string; type: ToastType; }

// ========== CUSTOM HOOKS ==========
const useToast = () => {
  const [toasts, setToasts] = useState<Notification[]>([]);
  const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  return { toasts, showToast, removeToast };
};

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; }
    catch { return initialValue; }
  });
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      requestIdleCallback(() => localStorage.setItem(key, JSON.stringify(newValue)));
      return newValue;
    });
  }, [key]);
  return [storedValue, setValue];
};

// ========== MAIN APP ==========
const App: React.FC = () => {
  // State
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [marketCountdown, setMarketCountdown] = useState<MarketTimeInfo | null>(null);
  const [chartType] = useState<'candlestick' | 'line'>('candlestick');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1D'>('1D');
  const [watchlist, setWatchlist] = useLocalStorage<WatchlistItem[]>('watchlist', []);
  const [searchQuery, setSearchQuery] = useState('');
  const [portfolio, setPortfolio] = useLocalStorage<Portfolio>('portfolio', {
    balance: 100000, totalInvested: 0, totalCurrentValue: 0, totalPL: 0, totalPLPercentage: 0, dayPL: 0, holdings: [], orders: []
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'orders'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [depositModal, setDepositModal] = useState({ isOpen: false, amount: '', status: 'idle' as 'idle'|'processing'|'success'|'error', qrCodeUrl: '', errorMessage: null as string | null });
  const [withdrawModal, setWithdrawModal] = useState({ isOpen: false, upiId: '', name: '', amount: '', status: 'idle' as 'idle'|'processing'|'success'|'error', responseMessage: null as string | null });
  const [orderPanel, setOrderPanel] = useState({ type: 'BUY' as 'BUY'|'SELL', orderType: 'MARKET' as 'MARKET'|'LIMIT', symbol: '', quantity: '', price: '', estimatedCost: 0 });
  const { toasts, showToast, removeToast } = useToast();

  // Data fetching
  const loadStocks = useCallback(async () => {
    try { const data = await fetchStocks(); setStocks(data); if (data.length && !selectedStock) setSelectedStock(data[0]); }
    catch { showToast('Failed to load stocks', 'error'); }
  }, [selectedStock, showToast]);

  const loadStockHistory = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setIsLoadingChart(true);
    try { const history = await fetchStockHistory(symbol, timeframe); setStockHistory(history); }
    catch { showToast('Chart data failed', 'error'); }
    finally { setIsLoadingChart(false); }
  }, [timeframe, showToast]);

  const loadMarketStatus = useCallback(async () => {
    try { const status = await fetchMarketStatus(); setMarketStatus(status); setMarketCountdown(calculateMarketCountdown()); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { loadStocks(); loadMarketStatus(); const interval = setInterval(loadStocks, 5000); return () => clearInterval(interval); }, [loadStocks, loadMarketStatus]);
  useEffect(() => { if (selectedStock) loadStockHistory(selectedStock.symbol); }, [selectedStock, timeframe, loadStockHistory]);

  // Watchlist
  const addToWatchlist = useCallback((stock: Stock) => {
    if (watchlist.length >= 50) return showToast('Watchlist limit reached', 'error');
    if (watchlist.some(i => i.symbol === stock.symbol)) return showToast('Already in watchlist', 'info');
    setWatchlist(prev => [...prev, { id: generateId(), symbol: stock.symbol, name: stock.name, addedAt: Date.now() }]);
    showToast(`Added ${stock.symbol}`, 'success');
  }, [watchlist, setWatchlist, showToast]);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(i => i.symbol !== symbol));
    showToast(`Removed ${symbol}`, 'info');
  }, [setWatchlist, showToast]);

  // Order placement
  const placeOrder = useCallback(async () => {
    const qty = parseInt(orderPanel.quantity);
    const priceVal = parseFloat(orderPanel.price);
    if (!orderPanel.symbol) return showToast('Select stock', 'error');
    if (isNaN(qty) || qty <= 0) return showToast('Invalid quantity', 'error');
    const stock = stocks.find(s => s.symbol === orderPanel.symbol);
    if (!stock) return showToast('Stock not found', 'error');
    const finalPrice = orderPanel.orderType === 'MARKET' ? stock.price : priceVal;
    const total = qty * finalPrice;
    if (orderPanel.type === 'BUY' && total > portfolio.balance) return showToast('Insufficient balance', 'error');
    if (orderPanel.type === 'SELL') {
      const holding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
      if (!holding || holding.quantity < qty) return showToast('Insufficient shares', 'error');
    }
    const newOrder: Order = { id: generateId(), symbol: orderPanel.symbol, type: orderPanel.type, orderType: orderPanel.orderType, quantity: qty, price: finalPrice, total, status: 'EXECUTED', timestamp: Date.now() };
    if (orderPanel.type === 'BUY') {
      const existing = portfolio.holdings.find(h => h.symbol === orderPanel.symbol);
      let updatedHoldings;
      if (existing) {
        const newQty = existing.quantity + qty;
        const newInvested = existing.investedValue + total;
        updatedHoldings = portfolio.holdings.map(h => h.symbol === orderPanel.symbol ? { ...h, quantity: newQty, investedValue: newInvested, buyPrice: newInvested / newQty } : h);
      } else {
        updatedHoldings = [...portfolio.holdings, { symbol: orderPanel.symbol, name: stock.name, quantity: qty, buyPrice: finalPrice, currentPrice: finalPrice, investedValue: total, currentValue: total, pl: 0, plPercentage: 0 }];
      }
      setPortfolio(prev => ({ ...prev, balance: prev.balance - total, holdings: updatedHoldings, orders: [newOrder, ...prev.orders] }));
    } else {
      const holding = portfolio.holdings.find(h => h.symbol === orderPanel.symbol)!;
      const remaining = holding.quantity - qty;
      const updatedHoldings = remaining === 0 ? portfolio.holdings.filter(h => h.symbol !== orderPanel.symbol) : portfolio.holdings.map(h => h.symbol === orderPanel.symbol ? { ...h, quantity: remaining, investedValue: h.investedValue * (remaining / holding.quantity) } : h);
      setPortfolio(prev => ({ ...prev, balance: prev.balance + total, holdings: updatedHoldings, orders: [newOrder, ...prev.orders] }));
    }
    showToast(`${orderPanel.type} order placed`, 'success');
    setOrderPanel(prev => ({ ...prev, quantity: '', price: '', estimatedCost: 0 }));
  }, [orderPanel, stocks, portfolio, setPortfolio, showToast]);

  // Deposit & Withdrawal
  const handleDeposit = async () => {
    const amt = parseFloat(depositModal.amount);
    const validation = validateDepositAmount(amt);
    if (!validation.isValid) return showToast(validation.error!, 'error');
    setDepositModal(prev => ({ ...prev, status: 'processing' }));
    const response = await executeDeposit({ amount: amt });
    if (response.success) {
      setDepositModal(prev => ({ ...prev, status: 'success', qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=merchant@trading&am=${amt}&cu=INR` }));
      setPortfolio(p => ({ ...p, balance: p.balance + amt }));
      showToast(`Deposited ₹${formatCurrency(amt)}`, 'success');
      setTimeout(() => setDepositModal({ isOpen: false, amount: '', status: 'idle', qrCodeUrl: '', errorMessage: null }), 2000);
    } else {
      setDepositModal(prev => ({ ...prev, status: 'error', errorMessage: response.message || 'Failed' }));
    }
  };

  const handleWithdrawal = async () => {
    const amt = parseFloat(withdrawModal.amount);
    const amountValid = validateWithdrawalAmount(amt, portfolio.balance);
    if (!amountValid.isValid) return showToast(amountValid.error!, 'error');
    const upiValid = validateUPIId(withdrawModal.upiId);
    if (!upiValid.isValid) return showToast(upiValid.error!, 'error');
    const nameValid = validateName(withdrawModal.name);
    if (!nameValid.isValid) return showToast(nameValid.error!, 'error');
    setWithdrawModal(prev => ({ ...prev, status: 'processing' }));
    const response = await executeWithdrawal({ upiId: withdrawModal.upiId, name: withdrawModal.name, amount: amt });
    if (response.success) {
      setWithdrawModal(prev => ({ ...prev, status: 'success', responseMessage: response.message }));
      setPortfolio(p => ({ ...p, balance: p.balance - amt }));
      showToast(`Withdrawal request submitted`, 'success');
      setTimeout(() => setWithdrawModal({ isOpen: false, upiId: '', name: '', amount: '', status: 'idle', responseMessage: null }), 2000);
    } else {
      setWithdrawModal(prev => ({ ...prev, status: 'error', responseMessage: response.message || 'Failed' }));
    }
  };

  // Computed
  const watchlistStocks = useMemo(() => {
    const set = new Set(watchlist.map(i => i.symbol));
    return stocks.filter(s => set.has(s.symbol));
  }, [stocks, watchlist]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;
    const q = searchQuery.toLowerCase();
    return stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }, [stocks, searchQuery]);

  useEffect(() => {
    const qty = parseInt(orderPanel.quantity) || 0;
    let price = parseFloat(orderPanel.price) || 0;
    if (orderPanel.orderType === 'MARKET' && orderPanel.symbol) {
      const stock = stocks.find(s => s.symbol === orderPanel.symbol);
      if (stock) price = stock.price;
    }
    setOrderPanel(prev => ({ ...prev, estimatedCost: qty * price }));
  }, [orderPanel.quantity, orderPanel.price, orderPanel.orderType, orderPanel.symbol, stocks]);

  // Render helpers
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

  const StockCard = ({ stock, showAdd, showRemove }: { stock: Stock; showAdd?: boolean; showRemove?: boolean }) => (
    <div className={`stock-card ${selectedStock?.symbol === stock.symbol ? 'selected' : ''}`} onClick={() => setSelectedStock(stock)}>
      <div className="stock-info"><div className="stock-symbol">{stock.symbol}</div><div className="stock-name">{stock.name}</div></div>
      <div className="stock-price-info">
        <div className="stock-price">₹{formatCurrency(stock.price)}</div>
        <div className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>{stock.change >= 0 ? '+' : ''}{formatCurrency(stock.change)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)</div>
      </div>
      {showAdd && <button className="add-watchlist-btn" onClick={(e) => { e.stopPropagation(); addToWatchlist(stock); }}><i className="fas fa-plus"></i></button>}
      {showRemove && <button className="remove-watchlist-btn" onClick={(e) => { e.stopPropagation(); removeFromWatchlist(stock.symbol); }}><i className="fas fa-times"></i></button>}
    </div>
  );

  // Main JSX
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo"><i className="fas fa-chart-line"></i><span>TRADING<span>PRO</span></span></div>
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><i className={`fas fa-chevron-${isSidebarOpen ? 'left' : 'right'}`}></i></button>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><i className="fas fa-tachometer-alt"></i><span>Dashboard</span></button>
          <button className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}><i className="fas fa-briefcase"></i><span>Portfolio</span></button>
          <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}><i className="fas fa-list-ul"></i><span>Orders</span></button>
        </nav>
        <div className="sidebar-footer">{renderMarketStatus()}</div>
      </aside>

      {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="main-content">
        <header className="app-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><i className="fas fa-bars"></i></button>
          <div className="header-search"><i className="fas fa-search"></i><input type="text" placeholder="Search stocks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
          <div className="header-actions"><div className="balance-display"><i className="fas fa-wallet"></i><span>₹{formatCurrency(portfolio.balance)}</span></div></div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' && (
            <>
              {/* Chart Section */}
              <div className="chart-section">
                <div className="chart-header">
                  <div><h2>{selectedStock?.symbol || 'Select Stock'}</h2><span className="stock-name-chart">{selectedStock?.name}</span></div>
                  <div className="timeframe-toggle">
                    {['1m','5m','1D'].map(tf => <button key={tf} className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf as any)}>{tf}</button>)}
                  </div>
                </div>
                <div className="chart-container">
                  {isLoadingChart ? <div className="chart-loading"><i className="fas fa-chart-line fa-spin"></i><p>Loading chart...</p></div> : <Suspense fallback={<div className="chart-loading">Loading chart...</div>}><ChartComponent data={stockHistory} type={chartType} symbol={selectedStock?.symbol || ''} /></Suspense>}
                </div>
              </div>

              {/* Watchlist */}
              <div className="watchlist-section">
                <div className="section-header"><h2><i className="fas fa-star"></i> Watchlist</h2></div>
                <div className="watchlist-container">
                  {watchlistStocks.length === 0 ? <div className="empty-watchlist"><i className="fas fa-star-of-life"></i><p>Your watchlist is empty</p></div> : watchlistStocks.map(s => <StockCard key={s.symbol} stock={s} showRemove />)}
                </div>
              </div>

              {/* Market Overview */}
              <div className="market-overview">
                <div className="section-header"><h2><i className="fas fa-chart-simple"></i> Top Stocks</h2></div>
                <div className="stocks-grid">{filteredStocks.slice(0, 10).map(s => <StockCard key={s.symbol} stock={s} showAdd={!watchlist.some(w => w.symbol === s.symbol)} />)}</div>
              </div>
            </>
          )}

          {activeTab === 'portfolio' && (
            <div className="portfolio-panel">
              <div className="portfolio-summary">
                <div className="balance-card"><div className="balance-label">Available Balance</div><div className="balance-amount">₹{formatCurrency(portfolio.balance)}</div><div className="balance-actions"><button className="btn-deposit" onClick={() => setDepositModal(prev => ({ ...prev, isOpen: true }))}>Deposit</button><button className="btn-withdraw" onClick={() => setWithdrawModal(prev => ({ ...prev, isOpen: true }))}>Withdraw</button></div></div>
                <div className="pl-card"><div className="pl-item"><span>Total P&L</span><span className={portfolio.totalPL >= 0 ? 'positive' : 'negative'}>{portfolio.totalPL >= 0 ? '+' : ''}₹{formatCurrency(portfolio.totalPL)}</span></div><div className="pl-item"><span>Today's P&L</span><span className={portfolio.dayPL >= 0 ? 'positive' : 'negative'}>{portfolio.dayPL >= 0 ? '+' : ''}₹{formatCurrency(portfolio.dayPL)}</span></div></div>
              </div>
              <div className="holdings-section"><h3>Holdings</h3>{portfolio.holdings.map(h => <div key={h.symbol} className="holding-item"><span>{h.symbol}</span><span>{h.quantity}</span><span>₹{formatCurrency(h.buyPrice)}</span><span>₹{formatCurrency(h.currentPrice)}</span><span className={h.pl >= 0 ? 'positive' : 'negative'}>{h.pl >= 0 ? '+' : ''}₹{formatCurrency(h.pl)}</span></div>)}</div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="order-panel-container">
              <div className="order-panel">
                <div className="order-type-toggle"><button className={`order-type-btn ${orderPanel.type === 'BUY' ? 'active buy' : ''}`} onClick={() => setOrderPanel(p => ({ ...p, type: 'BUY' }))}>BUY</button><button className={`order-type-btn ${orderPanel.type === 'SELL' ? 'active sell' : ''}`} onClick={() => setOrderPanel(p => ({ ...p, type: 'SELL' }))}>SELL</button></div>
                <div className="order-form">
                  <select value={orderPanel.symbol} onChange={e => setOrderPanel(p => ({ ...p, symbol: e.target.value }))}><option value="">Select stock</option>{stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}</select>
                  <div className="order-type-selector"><button className={`order-subtype ${orderPanel.orderType === 'MARKET' ? 'active' : ''}`} onClick={() => setOrderPanel(p => ({ ...p, orderType: 'MARKET', price: '' }))}>MARKET</button><button className={`order-subtype ${orderPanel.orderType === 'LIMIT' ? 'active' : ''}`} onClick={() => setOrderPanel(p => ({ ...p, orderType: 'LIMIT' }))}>LIMIT</button></div>
                  <input type="number" placeholder="Quantity" value={orderPanel.quantity} onChange={e => setOrderPanel(p => ({ ...p, quantity: e.target.value }))} />
                  {orderPanel.orderType === 'LIMIT' && <input type="number" placeholder="Price" value={orderPanel.price} onChange={e => setOrderPanel(p => ({ ...p, price: e.target.value }))} />}
                  <div className="order-estimate"><span>Estimated Total</span><span>₹{formatCurrency(orderPanel.estimatedCost)}</span></div>
                  <button className={`place-order-btn ${orderPanel.type.toLowerCase()}`} onClick={placeOrder} disabled={!orderPanel.symbol || !orderPanel.quantity || (orderPanel.orderType === 'LIMIT' && !orderPanel.price)}>Place {orderPanel.type} Order</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Deposit Modal */}
      {depositModal.isOpen && <div className="modal active"><div className="modal-content"><div className="modal-header"><h2>Deposit Funds</h2><button onClick={() => setDepositModal(prev => ({ ...prev, isOpen: false }))}>×</button></div><div className="modal-body">{depositModal.status === 'idle' && <><input type="number" placeholder="Amount (Min ₹100)" value={depositModal.amount} onChange={e => setDepositModal(p => ({ ...p, amount: e.target.value }))} /><button className="btn-submit" onClick={handleDeposit}>Generate QR Code</button></>}{depositModal.status === 'processing' && <div className="loading-state"><i className="fas fa-spinner fa-spin"></i><p>Processing...</p></div>}{depositModal.status === 'success' && <div className="success-state"><i className="fas fa-check-circle"></i><p>₹{formatCurrency(parseFloat(depositModal.amount))} deposited!</p>{depositModal.qrCodeUrl && <div className="qr-code"><img src={depositModal.qrCodeUrl} alt="QR" /></div>}<button className="btn-close" onClick={() => setDepositModal({ isOpen: false, amount: '', status: 'idle', qrCodeUrl: '', errorMessage: null })}>Close</button></div>}{depositModal.status === 'error' && <div className="error-state"><i className="fas fa-exclamation-triangle"></i><p>{depositModal.errorMessage}</p><button className="btn-retry" onClick={() => setDepositModal(p => ({ ...p, status: 'idle', errorMessage: null }))}>Retry</button></div>}</div></div></div>}

      {/* Withdraw Modal */}
      {withdrawModal.isOpen && <div className="modal active"><div className="modal-content"><div className="modal-header"><h2>Withdraw Funds</h2><button onClick={() => setWithdrawModal(prev => ({ ...prev, isOpen: false }))}>×</button></div><div className="modal-body">{withdrawModal.status === 'idle' && <><input placeholder="UPI ID" value={withdrawModal.upiId} onChange={e => setWithdrawModal(p => ({ ...p, upiId: e.target.value }))} /><input placeholder="Full Name" value={withdrawModal.name} onChange={e => setWithdrawModal(p => ({ ...p, name: e.target.value }))} /><input type="number" placeholder="Amount" value={withdrawModal.amount} onChange={e => setWithdrawModal(p => ({ ...p, amount: e.target.value }))} /><button className="btn-submit" onClick={handleWithdrawal}>Request Withdrawal</button></>}{withdrawModal.status === 'processing' && <div className="loading-state"><i className="fas fa-spinner fa-spin"></i><p>Processing...</p></div>}{withdrawModal.status === 'success' && <div className="success-state"><i className="fas fa-check-circle"></i><p>{withdrawModal.responseMessage}</p><button className="btn-close" onClick={() => setWithdrawModal({ isOpen: false, upiId: '', name: '', amount: '', status: 'idle', responseMessage: null })}>Close</button></div>}{withdrawModal.status === 'error' && <div className="error-state"><i className="fas fa-exclamation-triangle"></i><p>{withdrawModal.responseMessage}</p><button className="btn-retry" onClick={() => setWithdrawModal(p => ({ ...p, status: 'idle', responseMessage: null }))}>Retry</button></div>}</div></div></div>}

      {/* Toasts */}
      <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}><div className="toast-message">{t.message}</div></div>)}</div>
    </div>
  );
};

export default App;
