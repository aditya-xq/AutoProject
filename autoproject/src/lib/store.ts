// src/lib/store.ts
import { writable, type Writable } from 'svelte/store';

export interface NotificationType {
    id: number;
    type: 'info' | 'error' | 'success';
    message: string;
}

function createNotificationStore(): {
    subscribe: Writable<NotificationType[]>['subscribe'];
    addNotification: (message: string, type: 'info' | 'error' | 'success') => void;
    removeNotification: (id: number) => void;
} {
    const { subscribe, update } = writable<NotificationType[]>([]);

    return {
        subscribe,
        addNotification: (message, type) => {
            const id = Date.now();
            update(notifications => [...notifications, { message, type, id }]);
            if (type !== 'error') {
                setTimeout(() => {
                    update(notifications => notifications.filter(notification => notification.id !== id));
                }, 5000); // Notification disappears after 5000 ms
            }
        },
        removeNotification: (id) => {
            update(notifications => notifications.filter(notification => notification.id !== id));
        }
    };
}

export const notificationStore = createNotificationStore();
