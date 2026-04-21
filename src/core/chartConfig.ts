export type ChartType = 'candlestick' | 'line' | 'area';
export type ChartTimeframe = '1m' | '2m' | '3m' | '5m';

export const CHART_TYPES: ChartType[] = ['candlestick', 'line', 'area'];
export const CHART_TIMEFRAMES: ChartTimeframe[] = ['1m', '2m', '3m', '5m'];
export const CHART_WINDOW_MINUTES = 60;

export const DEFAULT_CHART_SETTINGS = {
  chartType: 'candlestick' as ChartType,
  timeframe: '1m' as ChartTimeframe,
  refreshRateMs: 2000,
};
