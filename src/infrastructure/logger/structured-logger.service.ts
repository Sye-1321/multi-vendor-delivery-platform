import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { TYPES } from 'src/application/constants/types';
import { IContextService } from '../context/context-service.interface';

type LogMetadata = Record<string, unknown>;

const redactedKeys = new Set([
  'address',
  'authorization',
  'cookie',
  'email',
  'password',
  'phone',
  'phonenumber',
  'refreshtoken',
  'secret',
  'token',
]);

@Injectable()
export class StructuredLogger {
  private readonly logger: winston.Logger;

  constructor(
    private readonly config: ConfigService,
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
  ) {
    const level = config.getOrThrow<string>('logging.level');
    const directory = config.getOrThrow<string>('logging.directory');
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    this.logger = winston.createLogger({
      level,
      format,
      defaultMeta: {
        service: config.getOrThrow<string>('app.name'),
        environment: config.getOrThrow<string>('app.nodeEnv'),
      },
      transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
          dirname: directory,
          filename: '%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
      exitOnError: false,
    });
  }

  info(event: string, metadata: LogMetadata = {}): void {
    this.logger.info(event, this.enrich(metadata));
  }

  warn(event: string, metadata: LogMetadata = {}): void {
    this.logger.warn(event, this.enrich(metadata));
  }

  error(event: string, error?: unknown, metadata: LogMetadata = {}): void {
    this.logger.error(
      event,
      this.enrich({
        ...metadata,
        ...(error instanceof Error && {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        }),
      }),
    );
  }

  debug(event: string, metadata: LogMetadata = {}): void {
    this.logger.debug(event, this.enrich(metadata));
  }

  private enrich(metadata: LogMetadata): LogMetadata {
    return this.redact({
      ...this.requestContext(),
      ...metadata,
    }) as LogMetadata;
  }

  private requestContext(): LogMetadata {
    try {
      const context = this.contextService.getContext();
      return {
        correlationId: context.correlationId,
        actorId: context.userId,
        actorRole: context.role,
      };
    } catch {
      return {};
    }
  }

  private redact(value: unknown, key?: string): unknown {
    if (key && redactedKeys.has(key.toLowerCase())) {
      return '[REDACTED]';
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.redact(entry));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([entryKey, entryValue]) => [
          entryKey,
          this.redact(entryValue, entryKey),
        ]),
      );
    }

    return value;
  }
}
