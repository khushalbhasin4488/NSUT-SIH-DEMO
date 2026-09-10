import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message = typeof raw === 'string' ? raw : (raw as { message?: unknown }).message ?? raw;
    response.status(status).json({ error: { code: `HTTP_${status}`, message, requestId: randomUUID() } });
  }
}
