import React, { useEffect, useState } from 'react';
import type { StockHistory } from '../api';

interface ChartComponentProps {
  data: StockHistory | null;
  type: 'candlestick' | 'line';
  symbol: string;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ data, type, symbol }) => {
  const [isLoading] = useState(false);

  useEffect(() => {
    // Chart rendering logic here
  }, [data, type, symbol]);

  if (isLoading) {
    return <div className="chart-loading">Loading chart...</div>;
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="chart-empty-state">
        <i className="fas fa-chart-line"></i>
        <h4>No chart data available</h4>
        <p>Select a stock to view its price chart</p>
      </div>
    );
  }

  // Simple line chart visualization
  const points = data.data.slice(-50);
  const maxPrice = Math.max(...points.map(p => p.high));
  const minPrice = Math.min(...points.map(p => p.low));
  const height = 300;
  const width = 800;

  const getY = (price: number) => height - ((price - minPrice) / (maxPrice - minPrice)) * height;

  return (
    <div className="simple-chart">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '400px', background: '#1a1f2e', borderRadius: '8px' }}>
        {type === 'line' && (
          <polyline
            points={points.map((p, i) => `${(i / (points.length - 1)) * width},${getY(p.close)}`).join(' ')}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={(i / (points.length - 1)) * width} cy={getY(p.close)} r="3" fill="#00d4ff" />
        ))}
      </svg>
      <style>{`
        .simple-chart {
          width: 100%;
          overflow-x: auto;
        }
        .chart-empty-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        .chart-empty-state i {
          font-size: 48px;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};

export default React.memo(ChartComponent);
