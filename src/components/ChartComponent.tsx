/**
 * Chart Component - Legacy/Backup Chart Component
 * Simple chart component for fallback when AdvancedChart is loading
 */

import React, { useEffect, useRef } from 'react';
import type { StockHistory } from '../api';
import { formatCurrency } from '../utils';

interface ChartComponentProps {
  data: StockHistory | null;
  type: 'candlestick' | 'line';
  symbol: string;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, type, symbol }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || !data.data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    const points = data.data.slice(-100);
    const maxPrice = Math.max(...points.map(p => p.high));
    const minPrice = Math.min(...points.map(p => p.low));
    const priceRange = maxPrice - minPrice;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0e1a');
    gradient.addColorStop(1, '#1a1f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = height - (i * height / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Price labels
      const price = minPrice + (priceRange * i / 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`₹${price.toFixed(2)}`, 5, y - 3);
    }

    // Draw volume bars
    const maxVolume = Math.max(...points.map(p => p.volume));
    const volumeHeight = height * 0.2;
    const volumeYOffset = height - volumeHeight;
    
    points.forEach((point, i) => {
      const x = (i / (points.length - 1)) * width;
      const barWidth = Math.max(2, width / points.length * 0.7);
      const volumeBarHeight = (point.volume / maxVolume) * volumeHeight;
      const isGreen = point.close >= point.open;
      
      ctx.fillStyle = isGreen ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 68, 68, 0.3)';
      ctx.fillRect(x - barWidth / 2, volumeYOffset + volumeHeight - volumeBarHeight, barWidth, volumeBarHeight);
    });

    if (type === 'line') {
      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((point.close - minPrice) / priceRange) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw points
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((point.close - minPrice) / priceRange) * height;
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    } 
    else if (type === 'candlestick') {
      const candleWidth = Math.max(2, width / points.length * 0.7);
      
      points.forEach((point, i) => {
        const x = (i / (points.length - 1)) * width;
        const openY = height - ((point.open - minPrice) / priceRange) * height;
        const closeY = height - ((point.close - minPrice) / priceRange) * height;
        const highY = height - ((point.high - minPrice) / priceRange) * height;
        const lowY = height - ((point.low - minPrice) / priceRange) * height;
        
        const isGreen = point.close >= point.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.abs(closeY - openY);
        
        // Draw wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.strokeStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw body
        ctx.fillStyle = isGreen ? '#00e676' : '#ff4444';
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyHeight));
      });
    }

  }, [data, type]);

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="simple-chart-empty">
        <i className="fas fa-chart-line"></i>
        <p>Select a stock to view chart</p>
        <style>{`
          .simple-chart-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
            border-radius: 16px;
            color: #6b7280;
          }
          .simple-chart-empty i {
            font-size: 48px;
            margin-bottom: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="simple-chart-container">
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '400px', borderRadius: '12px' }}
      />
      <style>{`
        .simple-chart-container {
          width: 100%;
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
          border-radius: 16px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default React.memo(ChartComponent);
