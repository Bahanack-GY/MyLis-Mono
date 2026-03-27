import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3025';

/**
 * Opens an SSE connection to `path?token=<jwt>` and invalidates the given
 * React Query keys whenever the server pushes an event.
 *
 * The connection is automatically re-established on error (exponential backoff)
 * and torn down when the component unmounts or the user logs out.
 */
export function useSSE(path: string, queryKeys: unknown[][]): void {
    const qc = useQueryClient();
    const esRef = useRef<EventSource | null>(null);
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryDelay = useRef(1000);

    useEffect(() => {
        let destroyed = false;

        function connect() {
            const token = localStorage.getItem('access_token');
            if (!token || destroyed) return;

            const url = `${API_URL}${path}?token=${encodeURIComponent(token)}`;
            const es = new EventSource(url);
            esRef.current = es;

            es.onmessage = () => {
                // Reset back-off on successful message
                retryDelay.current = 1000;
                queryKeys.forEach(key => qc.invalidateQueries({ queryKey: key }));
            };

            es.onerror = () => {
                es.close();
                esRef.current = null;
                if (!destroyed) {
                    retryRef.current = setTimeout(() => {
                        retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
                        connect();
                    }, retryDelay.current);
                }
            };
        }

        connect();

        return () => {
            destroyed = true;
            esRef.current?.close();
            esRef.current = null;
            if (retryRef.current) clearTimeout(retryRef.current);
        };
        // Only re-run if the path changes (query keys are stable refs from hooks)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);
}
