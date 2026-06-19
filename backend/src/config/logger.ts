import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env, isProduction, isTest } from './env';

const logsDir = path.join(process.cwd(), 'logs');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${String(timestamp)}] ${level}: ${String(message)}${metaStr}`;
  }),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    silent: isTest,
    format: consoleFormat,
  }),
];

if (isProduction) {
  transports.push(
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      level: 'info',
    }),
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: 'error',
    }),
  );
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.json()),
  transports,
  exitOnError: false,
});
