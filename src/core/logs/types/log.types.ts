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

export type JsonObject = Record<string, unknown>;

export interface SerializedError extends JsonObject {
  message: string;
  stack?: string;
  name?: string;
}

export interface LogContext extends JsonObject {
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
  metadata?: JsonObject;
  statusCode?: number;
  duration?: number;
  error?:
    | SerializedError
    | JsonObject;
}

export interface AuditChangeData {
  before?: JsonObject;
  after?: JsonObject;
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
  metadata?: JsonObject;
}
