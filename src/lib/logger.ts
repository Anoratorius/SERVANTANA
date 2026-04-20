/**
 * Structured JSON Logger
 * Production-grade logging with context, request IDs, and log levels
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  path?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Log level priority for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level from environment (default: info in prod, debug in dev)
const MIN_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format an error for logging
 */
function formatError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    // Filter out undefined values
    entry.context = Object.fromEntries(
      Object.entries(context).filter(([, v]) => v !== undefined)
    ) as LogContext;
  }

  if (error) {
    entry.error = formatError(error);
  }

  return entry;
}

/**
 * Output a log entry
 */
function outputLog(entry: LogEntry): void {
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Main logger object
 */
export const logger = {
  /**
   * Debug level logging (development only by default)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) return;
    outputLog(createLogEntry("debug", message, context));
  },

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) return;
    outputLog(createLogEntry("info", message, context));
  },

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog("warn")) return;
    outputLog(createLogEntry("warn", message, context));
  },

  /**
   * Error level logging
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog("error")) return;
    outputLog(createLogEntry("error", message, context, error));
  },

  /**
   * Log an HTTP request (info level)
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>
  ): void {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    if (!shouldLog(level)) return;

    outputLog(
      createLogEntry(level, `${method} ${path} ${statusCode} ${duration}ms`, {
        method,
        path,
        statusCode,
        duration,
        ...context,
      })
    );
  },

  /**
   * Create a child logger with preset context
   */
  child(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...baseContext, ...context }),
      error: (message: string, error?: unknown, context?: LogContext) =>
        logger.error(message, error, { ...baseContext, ...context }),
    };
  },
};

/**
 * Request logger middleware helper
 * Use in API routes to log request timing
 */
export function createRequestLogger(request: Request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const url = new URL(request.url);

  return {
    requestId,
    /**
     * Log the completed request
     */
    logResponse(response: Response) {
      const duration = Date.now() - startTime;
      logger.request(request.method, url.pathname, response.status, duration, {
        requestId,
      });
    },
    /**
     * Get a child logger with request context
     */
    getLogger() {
      return logger.child({
        requestId,
        path: url.pathname,
        method: request.method,
      });
    },
  };
}

export default logger;
