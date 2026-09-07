import { Request } from 'express';

export function getClientIp(request: Request): string {
  return (
    request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    request.connection.remoteAddress ||
    request.socket.remoteAddress ||
    '127.0.0.1'
  );
}
