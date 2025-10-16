import pino from 'pino';

let loggerSingleton: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (loggerSingleton) return loggerSingleton;
  loggerSingleton = pino({
    name: process.env.SERVICE_NAME || 'service',
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', singleLine: false }
    } : undefined
  });
  return loggerSingleton;
}


