/**
 * Chart Component - Optimized Canvas Rendering
 * Features: Candlestick & Line charts, hover tooltip, crosshair
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
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
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoverData, setHoverData] = useState<StockDataPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update dimensions on resize
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const update = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setDimensions({ width, height: 400 });
      }
    };
    update();
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(update, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, []);

  // Draw chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !data?.data?.length) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const points = data.data;
    const maxPrice = Math.max(...points.map(p => p.high)) * 1.02;
    const minPrice = Math.min(...points.map(p => p.low)) * 0.98;
    const priceRange = maxPrice - minPrice;
    const maxVolume = Math.max(...points.map(p => p.volume));
    const volumeHeight = height * 0.2;
    const volumeY = height - volumeHeight;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0e1a');
    grad.addColorStop(1, '#1a1f2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid & price labels
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = height - (i * height / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px Inter';
      ctx.fillText(`₹${(minPrice + priceRange * i / 4).toFixed(2)}`, 5, y - 3);
    }

    // Volume bars
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const barW = Math.max(2, width / points.length * 0.7);
      const barH = (p.volume / maxVolume) * volumeHeight;
      ctx.fillStyle = p.close >= p.open ? 'rgba(0,230,118,0.3)' : 'rgba(255,68,68,0.3)';
      ctx.fillRect(x - barW/2, volumeY + volumeHeight - barH, barW, barH);
    });

    if (type === 'line') {
      ctx.beginPath();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p.close - minPrice) / priceRange) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // Fill under line
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = 'rgba(0,212,255,0.05)';
      ctx.fill();
    } else {
      // Candlestick
      const candleW = Math.max(2, width / points.length * 0.7);
      points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const openY = height - ((p.open - minPrice) / priceRange) * height;
        const closeY = height - ((p.close - minPrice) / priceRange) * height;
        const highY = height - ((p.high - minPrice) / priceRange) * height;
        const lowY = height - ((p.low - minPrice) / priceRange) * height;
        const isGreen = p.close >= p.open;
        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.strokeStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.stroke();
        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.abs(closeY - openY);
        ctx.fillStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.fillRect(x - candleW/2, bodyTop, candleW, Math.max(1, bodyH));
      });
    }

    // Crosshair & tooltip
    if (hoverData && mousePos.x > 0 && mousePos.x < width && mousePos.y > 0 && mousePos.y < height) {
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, height);
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(width, mousePos.y);
      ctx.stroke();

      const idx = points.findIndex(p => p.timestamp === hoverData.timestamp);
      if (idx !== -1) {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((hoverData.close - minPrice) / priceRange) * height;
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2*Math.PI);
        ctx.fill();

        // Tooltip
        const tipX = Math.min(mousePos.x + 15, width - 170);
        const tipY = Math.max(mousePos.y - 80, 10);
        ctx.fillStyle = 'rgba(10,14,26,0.95)';
        ctx.fillRect(tipX, tipY, 160, 85);
        ctx.strokeStyle = '#00d4ff';
        ctx.strokeRect(tipX, tipY, 160, 85);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 12px Inter';
        ctx.fillText(symbol, tipX+10, tipY+20);
        ctx.fillStyle = '#8b92a8';
        ctx.font = '10px Inter';
        ctx.fillText(formatDate(hoverData.timestamp), tipX+10, tipY+35);
        ctx.fillStyle = hoverData.close >= hoverData.open ? '#00e676' : '#ff4444';
        ctx.font = 'bold 14px Inter';
        ctx.fillText(`₹${hoverData.close.toFixed(2)}`, tipX+10, tipY+55);
        ctx.fillStyle = '#8b92a8';
        ctx.font = '10px Inter';
        ctx.fillText(`H:₹${hoverData.high.toFixed(2)}`, tipX+10, tipY+72);
        ctx.fillText(`L:₹${hoverData.low.toFixed(2)}`, tipX+85, tipY+72);
      }
    }
  }, [data, type, dimensions, hoverData, mousePos, symbol]);

  // Animation loop
  useEffect(() => {
    let frame: number;
    const animate = () => {
      drawChart();
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, [drawChart]);

  // Mouse/touch events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.data) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const canvasX = x * scaleX;
    const canvasY = y * (canvas.height / rect.height);
    setMousePos({ x: canvasX, y: canvasY });
    const points = data.data;
    const idx = Math.round((canvasX / canvas.width) * (points.length - 1));
    if (idx >= 0 && idx < points.length) setHoverData(points[idx]);
    else setHoverData(null);
  };

  const handleMouseLeave = () => {
    setHoverData(null);
    setMousePos({ x: 0, y: 0 });
  };

  if (!data?.data?.length) {
    return (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1f2e', borderRadius: '16px', color: '#8b92a8' }}>
        <div><i className="fas fa-chart-line" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>Select a stock to view chart</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', background: '#0a0e1a', borderRadius: '16px', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '0 8px' }}>
        <div><span style={{ fontWeight: 'bold', color: '#00d4ff' }}>{symbol}</span><span style={{ marginLeft: '12px', fontSize: '12px', color: '#8b92a8' }}>{data.timeframe}</span></div>
        <div><span style={{ fontSize: '12px', color: '#5a6278' }}>🖱️ Hover for details</span></div>
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100%', height: `${dimensions.height}px`, cursor: 'crosshair', borderRadius: '12px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default memo(ChartComponent);
