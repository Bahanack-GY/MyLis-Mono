import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogsService } from './logs.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
    constructor(private readonly logsService: LogsService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        if (req.method === 'GET') return next.handle();

        return next.handle().pipe(
            tap((response) => {
                try {
                    // userId comes from JWT (userId) or local auth strategy (id)
                    const userId = req.user?.userId || req.user?.id;
                    if (!userId) return;

                    const path: string = req.url || '';
                    const segments = path.split('/').filter(Boolean);
                    const entity = (segments[0] || 'unknown').replace(/s$/, '');

                    // Determine action from HTTP method + special paths
                    let action = 'UPDATE';
                    if (req.method === 'POST') action = 'CREATE';
                    else if (req.method === 'DELETE') action = 'DELETE';

                    if (path.includes('/login')) action = 'LOGIN';
                    else if (path.includes('/send')) action = 'SEND';
                    else if (path.includes('/pay')) action = 'PAY';
                    else if (path.includes('/reject')) action = 'REJECT';
                    else if (path.includes('/assign')) action = 'ASSIGN';
                    else if (path.includes('/close')) action = 'CLOSE';

                    // Extract a human-readable target name from the response
                    const target =
                        response?.name ||
                        response?.invoiceNumber ||
                        response?.title ||
                        response?.firstName ||
                        '';

                    this.logsService.create(action, userId, {
                        entity,
                        target,
                        userEmail: req.user?.email,
                        userRole: req.user?.role,
                    }).catch(() => { });
                } catch {
                    // Never let logging break the request
                }
            }),
        );
    }
}
