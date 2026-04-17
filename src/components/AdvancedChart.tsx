/**
 * Advanced Chart Component - Professional Trading Charts
 * Features: Candlestick, Line, Area charts with zoom, pan, and multiple timeframes
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StockHistory, StockDataPoint } from '../api';
import { formatCurrency, formatDate } from '../utils';

interface AdvancedChartProps {
  data: StockHistory | null;
  type: 'candlestick' | 'line' | 'area';
  symbol: string;
}

interface ChartPoint {
  x: number;
  y: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  timestamp: number;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({ data, type, symbol }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
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

  // Draw chart
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

    // Vertical grid lines (time)
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
      ctx.fillText(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), x - 25, height - 5);
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
    if (type === 'line' || type === 'area') {
      // Draw area fill
      if (type === 'area') {
        ctx.beginPath();
        visiblePoints.forEach((point, i) => {
          const x = (i / (visiblePoints.length - 1)) * width;
          const y = height - ((point.close - minPrice) / priceRange) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fill();
      }
      
      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      
      visiblePoints.forEach((point, i) => {
        const x = (i / (visiblePoints.length - 1)) * width;
        const y = height - ((point.close - minPrice) / priceRange) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw points
      visiblePoints.forEach((point, i) => {
        const x = (i / (visiblePoints.length - 1)) * width;
        const y = height - ((point.close - minPrice) / priceRange) * height;
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    } 
    else if (type === 'candlestick') {
      const candleWidth = Math.max(2, width / visiblePoints.length * 0.7);
      
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
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw body
        ctx.fillStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
        
        // Add glow effect for selected candle on hover
        if (hoverData && hoverData.timestamp === point.timestamp) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = isGreen ? '#00e676' : '#ff4444';
          ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
          ctx.shadowBlur = 0;
        }
      });
    }

    // Draw hover crosshair
    if (hoverData && mousePosition.x > 0 && mousePosition.x < width) {
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
      const tooltipX = Math.min(mousePosition.x + 10, width - 180);
      const tooltipY = Math.max(mousePosition.y - 80, 10);
      
      ctx.fillStyle = 'rgba(10, 14, 26, 0.95)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(tooltipX, tooltipY, 170, 95);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.strokeRect(tooltipX, tooltipY, 170, 95);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(symbol, tooltipX + 10, tooltipY + 20);
      
      ctx.fillStyle = '#8b92a8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(formatDate(hoverData.timestamp), tooltipX + 10, tooltipY + 35);
      
      ctx.fillStyle = hoverData.close >= hoverData.open ? '#00e676' : '#ff4444';
      ctx.fillText(`₹${hoverData.close.toFixed(2)}`, tooltipX + 10, tooltipY + 52);
      
      ctx.fillStyle = '#8b92a8';
      ctx.fillText(`H: ₹${hoverData.high.toFixed(2)}`, tooltipX + 10, tooltipY + 67);
      ctx.fillText(`L: ₹${hoverData.low.toFixed(2)}`, tooltipX + 90, tooltipY + 67);
      ctx.fillText(`O: ₹${hoverData.open.toFixed(2)}`, tooltipX + 10, tooltipY + 82);
      ctx.fillText(`Vol: ${(hoverData.volume / 1000).toFixed(0)}K`, tooltipX + 90, tooltipY + 82);
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
    
    setMousePosition({ x: canvasX, y });
    
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

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.2, Math.min(3, prev * delta)));
  }, []);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDrag = useCallback((e: React.MouseEvent) => {
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

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="chart-empty-state">
        <i className="fas fa-chart-line"></i>
        <h4>No chart data available</h4>
        <p>Select a stock to view its price chart</p>
      </div>
    );
  }

  return (
    <div className="advanced-chart-container" ref={containerRef}>
      <div className="chart-toolbar">
        <div className="chart-info">
          <span className="chart-symbol">{symbol}</span>
          <span className="chart-timeframe">
            {data.timeframe === '1m' ? '1 Minute' : data.timeframe === '5m' ? '5 Minutes' : '1 Day'}
          </span>
        </div>
        <div className="chart-controls-toolbar">
          <button className="chart-control-btn" onClick={resetView} title="Reset View">
            <i className="fas fa-expand"></i>
          </button>
          <button className="chart-control-btn" onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))} title="Zoom In">
            <i className="fas fa-search-plus"></i>
          </button>
          <button className="chart-control-btn" onClick={() => setZoomLevel(prev => Math.max(0.2, prev - 0.1))} title="Zoom Out">
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
      
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#00d4ff' }}></span>
          <span>Price</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#00e676' }}></span>
          <span>Bullish</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ff4444' }}></span>
          <span>Bearish</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'rgba(0, 212, 255, 0.3)' }}></span>
          <span>Volume</span>
        </div>
      </div>
      
      <style>{`
        .advanced-chart-container {
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
          border-radius: 16px;
          padding: 16px;
          position: relative;
        }
        
        .chart-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .chart-info {
          display: flex;
          gap: 16px;
        }
        
        .chart-symbol {
          font-weight: 700;
          font-size: 18px;
          color: #00d4ff;
        }
        
        .chart-timeframe {
          font-size: 12px;
          color: #8b92a8;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }
        
        .chart-controls-toolbar {
          display: flex;
          gap: 8px;
        }
        
        .chart-control-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #8b92a8;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .chart-control-btn:hover {
          background: rgba(0, 212, 255, 0.2);
          color: #00d4ff;
        }
        
        .chart-legend {
          display: flex;
          gap: 20px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
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
        
        .chart-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 450px;
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
          border-radius: 16px;
          color: #8b92a8;
          text-align: center;
        }
        
        .chart-empty-state i {
          font-size: 48px;
          margin-bottom: 16px;
          color: #3a4052;
        }
        
        .chart-empty-state h4 {
          margin-bottom: 8px;
          color: #e1e4e8;
        }
        
        @media (max-width: 768px) {
          .advanced-chart-container {
            padding: 12px;
          }
          
          .chart-symbol {
            font-size: 14px;
          }
          
          .legend-item {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(AdvancedChart);
