import axios from 'axios';

export const backendClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 8000,
});

export interface BackendCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BackendChartResponse {
  symbol: string;
  chart_type: 'candlestick' | 'line' | 'area';
  timeframe: '1m' | '2m' | '3m' | '5m';
  points: BackendCandle[];
  window_minutes: number;
}

export const fetchBackendChart = async (
  symbol: string,
  timeframe: BackendChartResponse['timeframe'],
  chartType: BackendChartResponse['chart_type']
): Promise<BackendChartResponse> => {
  const { data } = await backendClient.get<BackendChartResponse>(`/chart/${symbol}`, {
    params: { timeframe, chart_type: chartType },
  });
  return data;
};
