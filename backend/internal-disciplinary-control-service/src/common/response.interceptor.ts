import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T> | any> {
        return next.handle().pipe(
            map(data => {
                // Si la respuesta tiene el formato de OnlyOffice callback (con 'error' definido),
                // devolverla sin envolver para compatibilidad con OnlyOffice Document Server
                if (data && typeof data === 'object' && 'error' in data) {
                    return data;
                }

                return {
                    success: true,
                    data,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
