export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}
