import { Controller, Get, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { SseService, SseMessageEvent } from '../sse/sse.service';

@Controller('tickets')
export class TicketsSseController {
    constructor(private readonly sseService: SseService) {}

    @Sse('sse')
    sse(@Query('token') token: string): Observable<SseMessageEvent> {
        if (!token) throw new UnauthorizedException();
        try {
            jwt.verify(token, process.env.JWT_SECRET || 'changeme');
        } catch {
            throw new UnauthorizedException();
        }
        return this.sseService.asObservable('tickets');
    }
}
