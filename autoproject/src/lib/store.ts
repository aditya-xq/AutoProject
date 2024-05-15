// src/lib/store.ts
import { writable, type Writable } from 'svelte/store';
import type { AIInferenceType, PRDType, ProjectManagementTool, UserStoryType } from './utils/types';
import type { UserStory } from '$lib';
import type { ProjectCreateInput } from '@linear/sdk/dist/_generated_documents';

// Define the Settings type
export interface Settings {
    prdType: PRDType
    userStoryType: UserStoryType
    aiInferenceType: AIInferenceType
    tool: ProjectManagementTool
    aiModel: string
}

export interface AppState {
    requirements: string
    prd: string
    userStories: UserStory[]
    projectDetails: ProjectCreateInput
}

export const settings = writable<Settings>(
    {
        tool: 'Linear',
        prdType: 'Feature Based', 
        userStoryType: 'Role-Feature-Reason', 
        aiInferenceType: 'Gemini Pro',
        aiModel: '',
    }
)

export const appState = writable<AppState>(
    {
        requirements: '',
        prd: '',
        userStories: [],
        projectDetails: {
            name: '',
            description: '',
            teamIds: []
        }
    }
)

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
