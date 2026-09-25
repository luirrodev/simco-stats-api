export enum LogLevel {
  LOG = 'log',
  DEBUG = 'debug',
  WARN = 'warn',
  ERROR = 'error',
}

export enum AuditOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface LogContext {
  requestId: string;
  userId?: number;
  storeId?: number;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface LogData {
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
  statusCode?: number;
  duration?: number;
  error?:
    | {
        message: string;
        stack?: string;
        name?: string;
      }
    | Record<string, any>;
}

export interface AuditChangeData {
  before?: Record<string, any>;
  after?: Record<string, any>;
}

export interface AuditableEntity {
  id: number | string;
  [key: string]: unknown;
}

export interface AuditLogData {
  entityName: string;
  entityId: number | string;
  operation: AuditOperation;
  userId?: number;
  changes: AuditChangeData;
  metadata?: Record<string, any>;
}
