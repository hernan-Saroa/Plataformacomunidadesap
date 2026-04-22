import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorPayload = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const payload = this.buildPayload(exception, status);

    this.logException(exception, request, status, payload);
    response.status(status).json(payload);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildPayload(exception: unknown, status: number): ErrorPayload {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        statusCode: status,
        message: 'Internal server error',
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode: status,
          message: response,
        };
      }

      if (response && typeof response === 'object') {
        const body = response as Record<string, unknown>;
        return {
          statusCode:
            typeof body.statusCode === 'number' ? body.statusCode : status,
          message:
            typeof body.message === 'string' || Array.isArray(body.message)
              ? (body.message as string | string[])
              : exception.message,
          ...(typeof body.error === 'string' ? { error: body.error } : {}),
        };
      }
    }

    return {
      statusCode: status,
      message: 'Unexpected error',
    };
  }

  private logException(
    exception: unknown,
    request: Request,
    status: number,
    payload: ErrorPayload,
  ): void {
    const context = `${request.method} ${request.originalUrl}`;
    const summary = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const detail =
        exception instanceof Error ? exception.stack || exception.message : String(exception);
      this.logger.error(`${context} -> ${status}: ${summary}`, detail);
      return;
    }

    this.logger.warn(`${context} -> ${status}: ${summary}`);
  }
}
