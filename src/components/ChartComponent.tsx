/**
 * Chart Component - Professional Trading Chart
 * Fixed: Removed direct DOM manipulation that caused build errors
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StockHistory, StockDataPoint } from '../api';
import { formatCurrency, formatDate } from '../utils';

interface ChartComponentProps {
  data: StockHistory | null;
  type: 'candlestick' | 'line';
  symbol: string;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, type, symbol }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoverData, setHoverData] = useState<StockDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setDimensions({ width: width, height: 450 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Draw chart function
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !data || !data.data || data.data.length === 0) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const points = [...data.data];
    const visiblePoints = points.slice(
      Math.max(0, Math.floor(offset * points.length)),
      Math.min(points.length, Math.floor((offset + zoomLevel) * points.length))
    );
    
    if (visiblePoints.length === 0) return;

    // Calculate price range
    const allPrices = visiblePoints.flatMap(p => [p.high, p.low]);
    const maxPrice = Math.max(...allPrices) * 1.02;
    const minPrice = Math.min(...allPrices) * 0.98;
    const priceRange = maxPrice - minPrice;

    // Calculate volume range
    const maxVolume = Math.max(...visiblePoints.map(p => p.volume));
    const volumeHeight = height * 0.2;
    const volumeYOffset = height - volumeHeight;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0e1a');
    gradient.addColorStop(1, '#1a1f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange * i / 5);
      const y = height - ((price - minPrice) / priceRange) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Price labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`₹${price.toFixed(2)}`, 5, y - 3);
    }

    // Vertical grid lines (time intervals)
    const step = Math.max(1, Math.floor(visiblePoints.length / 8));
    for (let i = 0; i < visiblePoints.length; i += step) {
      const x = (i / (visiblePoints.length - 1)) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      const date = new Date(visiblePoints[i].timestamp);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px Inter, sans-serif';
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(timeStr, x - 20, height - 8);
    }

    // Draw volume bars
    visiblePoints.forEach((point, i) => {
      const x = (i / (visiblePoints.length - 1)) * width;
      const barWidth = Math.max(2, width / visiblePoints.length * 0.7);
      const volumeBarHeight = (point.volume / maxVolume) * volumeHeight;
      const isGreen = point.close >= point.open;
      
      ctx.fillStyle = isGreen ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 68, 68, 0.3)';
      ctx.fillRect(x - barWidth / 2, volumeYOffset + volumeHeight - volumeBarHeight, barWidth, volumeBarHeight);
    });

    // Draw chart based on type
    if (type === 'line') {
      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2.5;
      
      visiblePoints.forEach((point, i) => {
        const x = (i / (visiblePoints.length - 1)) * width;
        const y = height - ((point.close - minPrice) / priceRange) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw gradient under line
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.fill();
      
      // Draw points on hover
      if (hoverData) {
        const hoverIndex = visiblePoints.findIndex(p => p.timestamp === hoverData.timestamp);
        if (hoverIndex !== -1) {
          const x = (hoverIndex / (visiblePoints.length - 1)) * width;
          const y = height - ((hoverData.close - minPrice) / priceRange) * height;
          ctx.fillStyle = '#00d4ff';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    } 
    else if (type === 'candlestick') {
      const candleWidth = Math.max(3, width / visiblePoints.length * 0.7);
      
      visiblePoints.forEach((point, i) => {
        const x = (i / (visiblePoints.length - 1)) * width;
        const openY = height - ((point.open - minPrice) / priceRange) * height;
        const closeY = height - ((point.close - minPrice) / priceRange) * height;
        const highY = height - ((point.high - minPrice) / priceRange) * height;
        const lowY = height - ((point.low - minPrice) / priceRange) * height;
        
        const isGreen = point.close >= point.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.abs(closeY - openY);
        
        // Draw wick (high-low line)
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.strokeStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw body
        ctx.fillStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
        
        // Add border to body
        ctx.strokeStyle = isGreen ? '#00a853' : '#cc3333';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
        
        // Highlight hovered candle
        if (hoverData && hoverData.timestamp === point.timestamp) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = isGreen ? '#00e676' : '#ff4444';
          ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
          ctx.shadowBlur = 0;
        }
      });
    }

    // Draw crosshair on hover
    if (hoverData && mousePosition.x > 0 && mousePosition.x < width && mousePosition.y > 0 && mousePosition.y < height) {
      ctx.beginPath();
      ctx.moveTo(mousePosition.x, 0);
      ctx.lineTo(mousePosition.x, height);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, mousePosition.y);
      ctx.lineTo(width, mousePosition.y);
      ctx.stroke();
    }

    // Draw tooltip
    if (hoverData && mousePosition.x > 0 && mousePosition.x < width) {
      const tooltipX = Math.min(mousePosition.x + 15, width - 200);
      const tooltipY = Math.max(mousePosition.y - 100, 10);
      
      // Tooltip background
      ctx.fillStyle = 'rgba(10, 14, 26, 0.98)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(tooltipX, tooltipY, 190, 110);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tooltipX, tooltipY, 190, 110);
      
      // Symbol
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(symbol, tooltipX + 12, tooltipY + 22);
      
      // Date
      ctx.fillStyle = '#8b92a8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(formatDate(hoverData.timestamp), tooltipX + 12, tooltipY + 38);
      
      // Price
      const isGreen = hoverData.close >= hoverData.open;
      ctx.fillStyle = isGreen ? '#00e676' : '#ff4444';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`₹${hoverData.close.toFixed(2)}`, tooltipX + 12, tooltipY + 58);
      
      // High/Low
      ctx.fillStyle = '#8b92a8';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(`H: ₹${hoverData.high.toFixed(2)}`, tooltipX + 12, tooltipY + 75);
      ctx.fillText(`L: ₹${hoverData.low.toFixed(2)}`, tooltipX + 100, tooltipY + 75);
      
      // Open & Volume
      ctx.fillText(`O: ₹${hoverData.open.toFixed(2)}`, tooltipX + 12, tooltipY + 92);
      ctx.fillText(`Vol: ${(hoverData.volume / 1000).toFixed(0)}K`, tooltipX + 100, tooltipY + 92);
    }

    // Draw current price line
    if (visiblePoints.length > 0) {
      const lastPrice = visiblePoints[visiblePoints.length - 1].close;
      const y = height - ((lastPrice - minPrice) / priceRange) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Current price label
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`₹${lastPrice.toFixed(2)}`, width - 60, y - 3);
    }
  }, [data, type, dimensions, hoverData, mousePosition, symbol, zoomLevel, offset]);

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !data.data) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const canvasX = x * scaleX;
    const scaleY = canvas.height / rect.height;
    const canvasY = y * scaleY;
    
    setMousePosition({ x: canvasX, y: canvasY });
    
    const points = data.data;
    const visiblePoints = points.slice(
      Math.max(0, Math.floor(offset * points.length)),
      Math.min(points.length, Math.floor((offset + zoomLevel) * points.length))
    );
    
    const index = Math.round((canvasX / canvas.width) * (visiblePoints.length - 1));
    if (index >= 0 && index < visiblePoints.length) {
      setHoverData(visiblePoints[index]);
    } else {
      setHoverData(null);
    }
  }, [data, offset, zoomLevel]);

  const handleMouseLeave = useCallback(() => {
    setHoverData(null);
    setMousePosition({ x: 0, y: 0 });
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.2, Math.min(3, prev * delta)));
  }, []);

  // Handle drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  }, []);

  const handleMouseDrag = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const panAmount = dx / dimensions.width;
    setOffset(prev => Math.max(0, Math.min(1 - zoomLevel, prev - panAmount)));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, dimensions.width, zoomLevel]);

  // Reset view
  const resetView = useCallback(() => {
    setZoomLevel(1);
    setOffset(0);
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(3, prev + 0.1));
  }, []);

  // Zoom out
  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(0.2, prev - 0.1));
  }, []);

  // Animation loop for smooth rendering
  useEffect(() => {
    const animate = () => {
      drawChart();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [drawChart]);

  // Loading state
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="chart-loading-state">
        <div className="loading-spinner-chart">
          <i className="fas fa-chart-line fa-spin"></i>
        </div>
        <p>Loading chart data for {symbol}...</p>
        <style>{`
          .chart-loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 450px;
            background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
            border-radius: 16px;
            color: #8b92a8;
          }
          .loading-spinner-chart i {
            font-size: 48px;
            color: #00d4ff;
            margin-bottom: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chart-component-wrapper" ref={containerRef}>
      <div className="chart-toolbar">
        <div className="chart-info">
          <div className="chart-symbol-info">
            <span className="chart-symbol">{symbol}</span>
            <span className="chart-timeframe-badge">
              {data.timeframe === '1m' ? '1 Minute' : data.timeframe === '5m' ? '5 Minutes' : '1 Day'}
            </span>
          </div>
        </div>
        <div className="chart-control-buttons">
          <button className="chart-btn" onClick={resetView} title="Reset View">
            <i className="fas fa-expand"></i>
          </button>
          <button className="chart-btn" onClick={zoomIn} title="Zoom In">
            <i className="fas fa-search-plus"></i>
          </button>
          <button className="chart-btn" onClick={zoomOut} title="Zoom Out">
            <i className="fas fa-search-minus"></i>
          </button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMoveCapture={handleMouseDrag}
        onWheel={handleWheel}
        style={{ width: '100%', height: '450px', cursor: 'crosshair' }}
      />
      
      <div className="chart-footer">
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color bullish"></span>
            <span>Bullish</span>
          </div>
          <div className="legend-item">
            <span className="legend-color bearish"></span>
            <span>Bearish</span>
          </div>
          <div className="legend-item">
            <span className="legend-color volume"></span>
            <span>Volume</span>
          </div>
        </div>
        <div className="chart-hint">
          <i className="fas fa-mouse-pointer"></i>
          <span>Hover for details • Scroll to zoom • Drag to pan</span>
        </div>
      </div>
      
      <style>{`
        .chart-component-wrapper {
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        .chart-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .chart-symbol {
          font-weight: 700;
          font-size: 20px;
          background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        
        .chart-timeframe-badge {
          font-size: 11px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          color: #8b92a8;
          margin-left: 12px;
        }
        
        .chart-control-buttons {
          display: flex;
          gap: 8px;
        }
        
        .chart-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #8b92a8;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .chart-btn:hover {
          background: rgba(0, 212, 255, 0.2);
          color: #00d4ff;
        }
        
        .chart-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .chart-legend {
          display: flex;
          gap: 20px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #8b92a8;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }
        
        .legend-color.bullish {
          background: #00e676;
        }
        
        .legend-color.bearish {
          background: #ff4444;
        }
        
        .legend-color.volume {
          background: rgba(0, 212, 255, 0.3);
        }
        
        .chart-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #5a6278;
        }
        
        @media (max-width: 768px) {
          .chart-component-wrapper {
            padding: 12px;
          }
          
          .chart-symbol {
            font-size: 16px;
          }
          
          .legend-item {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ChartComponent);
