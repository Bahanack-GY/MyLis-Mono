import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../contexts/SocketContext';

export function useBrowserNotifications() {
    const { socket } = useSocket();
    const { t } = useTranslation();
    const permissionRef = useRef(typeof Notification !== 'undefined' ? Notification.permission : 'denied');

    // Request permission on mount
    useEffect(() => {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                permissionRef.current = perm;
            });
        }
    }, []);

    // Listen for notification:push events
    useEffect(() => {
        if (!socket) return;

        const handler = (payload: { title: string; body: string; type: string }) => {
            if (typeof Notification === 'undefined') return;
            if (permissionRef.current !== 'granted') {
                // Try requesting again
                if (Notification.permission === 'default') {
                    Notification.requestPermission().then(perm => {
                        permissionRef.current = perm;
                        if (perm === 'granted') showNotification(payload);
                    });
                }
                return;
            }
            showNotification(payload);
        };

        const showNotification = (payload: { title: string; body: string; type: string }) => {
            const typeKey = `browserNotifications.${payload.type}`;
            const translatedTitle = t(typeKey, { defaultValue: payload.title });

            const notification = new Notification(translatedTitle, {
                body: payload.body,
                icon: '/favicon.ico',
                tag: `${payload.type}-${Date.now()}`,
                silent: false,
            });

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        };

        socket.on('notification:push', handler);
        return () => { socket.off('notification:push', handler); };
    }, [socket, t]);
}
