import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface SseMessageEvent {
    data: string | object;
    type?: string;
    id?: string;
    retry?: number;
}

@Injectable()
export class SseService {
    private readonly subjects = new Map<string, Subject<SseMessageEvent>>();

    private getSubject(channel: string): Subject<SseMessageEvent> {
        if (!this.subjects.has(channel)) {
            this.subjects.set(channel, new Subject<SseMessageEvent>());
        }
        return this.subjects.get(channel)!;
    }

    emit(channel: string, type: string, data: object = {}) {
        this.getSubject(channel).next({ data: JSON.stringify({ type, ...data }) });
    }

    asObservable(channel: string): Observable<SseMessageEvent> {
        return this.getSubject(channel).asObservable();
    }
}
