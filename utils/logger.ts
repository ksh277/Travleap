/**
 * 통합 로깅 시스템
 * Phase 5-3: Logging System for Debugging and Monitoring
 *
 * 기능:
 * - 구조화된 로그 (Structured Logging)
 * - 로그 레벨 (DEBUG, INFO, WARN, ERROR)
 * - 컨텍스트 정보 (요청 ID, 사용자 ID, 타임스탬프)
 * - 환경별 로그 레벨 (개발/프로덕션)
 * - 로그 파일 저장 (향후 확장)
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogContext {
  requestId?: string;
  userId?: number;
  vendorId?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;
  private context: LogContext;

  constructor(minLevel: LogLevel = LogLevel.INFO, context: LogContext = {}) {
    this.minLevel = minLevel;
    this.context = context;
  }

  /**
   * 로그 레벨 설정 (환경 변수 기반)
   */
  static getLogLevel(): LogLevel {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL;

    if (logLevel) {
      switch (logLevel.toUpperCase()) {
        case 'DEBUG': return LogLevel.DEBUG;
        case 'INFO': return LogLevel.INFO;
        case 'WARN': return LogLevel.WARN;
        case 'ERROR': return LogLevel.ERROR;
      }
    }

    // 기본값: 개발 환경은 DEBUG, 프로덕션은 INFO
    return env === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  /**
   * 새로운 컨텍스트로 Logger 인스턴스 생성
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(this.minLevel, { ...this.context, ...additionalContext });
  }

  /**
   * 로그 엔트리 생성
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      data
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }

    return entry;
  }

  /**
   * 로그 출력
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, error);

    // 콘솔 출력
    const output = this.formatConsoleOutput(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }

    // 향후 확장: 파일 저장, 외부 로깅 서비스 (Sentry, DataDog 등)
    this.persistLog(entry);
  }

  /**
   * 콘솔 출력 포맷팅
   */
  private formatConsoleOutput(entry: LogEntry): string {
    const { timestamp, level, message, context, data, error } = entry;

    let output = `[${timestamp}] [${level}]`;

    if (context?.requestId) {
      output += ` [${context.requestId}]`;
    }

    output += ` ${message}`;

    if (data) {
      output += `\n  Data: ${JSON.stringify(data, null, 2)}`;
    }

    if (context && Object.keys(context).length > 0) {
      output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }

    if (error) {
      output += `\n  Error: ${error.name}: ${error.message}`;
      if (error.stack) {
        output += `\n${error.stack}`;
      }
    }

    return output;
  }

  /**
   * 로그 영속화 (파일, DB, 외부 서비스)
   */
  private persistLog(entry: LogEntry): void {
    // 향후 구현:
    // - 로그 파일 저장 (winston, pino)
    // - 외부 로깅 서비스 (Sentry, DataDog, CloudWatch)
    // - 데이터베이스 저장 (중요 로그만)

    // 현재는 ERROR 레벨만 추적
    if (entry.level === 'ERROR' && typeof window === 'undefined') {
      // 서버 사이드에서만 실행
      // TODO: 외부 에러 추적 서비스 연동
    }
  }

  /**
   * DEBUG 레벨 로그
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * INFO 레벨 로그
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * WARN 레벨 로그
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * ERROR 레벨 로그
   */
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * 성능 측정 헬퍼
   */
  time(label: string): () => void {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.debug(`⏱️  ${label}`, { duration: `${duration}ms` });
    };
  }
}

// 싱글톤 인스턴스
export const logger = new Logger(Logger.getLogLevel());

/**
 * 렌트카 전용 로거
 */
export const rentcarLogger = logger.child({ module: 'rentcar' });

/**
 * API 로거 (요청/응답 로깅)
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  params?: any
): () => void {
  const requestId = generateRequestId();
  const apiLogger = logger.child({ requestId, method, endpoint });

  apiLogger.info(`→ API Request`, { params });

  const endTimer = apiLogger.time(`${method} ${endpoint}`);

  return (response?: any, error?: Error) => {
    endTimer();

    if (error) {
      apiLogger.error(`✗ API Error`, error, { response });
    } else {
      apiLogger.info(`✓ API Success`, { response });
    }
  };
}

/**
 * 데이터베이스 쿼리 로거
 */
export function logDatabaseQuery(
  operation: string,
  table: string,
  params?: any
): () => void {
  const dbLogger = logger.child({ operation, table });

  dbLogger.debug(`🗄️  DB Query`, { params });

  const endTimer = dbLogger.time(`${operation} ${table}`);

  return (result?: any, error?: Error) => {
    endTimer();

    if (error) {
      dbLogger.error(`✗ DB Error`, error);
    } else {
      dbLogger.debug(`✓ DB Success`, {
        rowsAffected: result?.affectedRows || result?.length || 0
      });
    }
  };
}

/**
 * 캐시 로거
 */
export const cacheLogger = {
  hit: (key: string) => {
    logger.debug(`🎯 Cache HIT`, { key });
  },

  miss: (key: string) => {
    logger.debug(`❌ Cache MISS`, { key });
  },

  set: (key: string, ttl?: number) => {
    logger.debug(`💾 Cache SET`, { key, ttl: ttl ? `${ttl}ms` : 'default' });
  },

  delete: (key: string) => {
    logger.debug(`🗑️  Cache DELETE`, { key });
  },

  clear: () => {
    logger.info(`🧹 Cache CLEAR`);
  }
};

/**
 * 비즈니스 로직 로거
 */
export const businessLogger = {
  bookingCreated: (bookingId: number, vehicleId: number, userId: number) => {
    rentcarLogger.info(`📅 Booking Created`, { bookingId, vehicleId, userId });
  },

  bookingCancelled: (bookingId: number, reason?: string) => {
    rentcarLogger.info(`🚫 Booking Cancelled`, { bookingId, reason });
  },

  paymentProcessed: (bookingId: number, amount: number, paymentMethod: string) => {
    rentcarLogger.info(`💳 Payment Processed`, { bookingId, amount, paymentMethod });
  },

  vehicleAvailabilityChecked: (vehicleId: number, dates: { from: string, to: string }, available: boolean) => {
    rentcarLogger.debug(`🚗 Vehicle Availability Check`, { vehicleId, dates, available });
  },

  vendorStatusChanged: (vendorId: number, oldStatus: string, newStatus: string) => {
    rentcarLogger.info(`🏢 Vendor Status Changed`, { vendorId, oldStatus, newStatus });
  }
};

/**
 * 요청 ID 생성
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default logger;
