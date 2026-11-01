import { Injectable } from '@angular/core';
import { environment } from '../../enviroments/environment';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private readonly apiUrl = `${environment.apiUrl}/chat/`;
    async sendMessage(
        question: string,
        onToken: (token: string) => void,
        threadId?: string
    ) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                thread_id: threadId,
            }),
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Response stream is unavailable');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const events = buffer.split(/\r?\n\r?\n/);
                buffer = events.pop() ?? '';

                for (const event of events) {
                    const lines = event.split(/\r?\n/);
                    let eventType = '';
                    let eventData = '';

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            eventType = line.slice(6).trim();
                        }

                        if (line.startsWith('data:')) {
                            eventData += line.slice(5).trim();
                        }
                    }

                    if (!eventType || !eventData) continue;

                    const data = JSON.parse(eventData);

                    if (eventType === 'token') {
                        onToken(data.token);
                    } else if (eventType === 'done') {
                        return data;
                    } else if (eventType === 'error') {
                        throw new Error(
                            data.message || 'Something went wrong'
                        );
                    }
                }
            }

            buffer += decoder.decode();

            throw new Error('Stream ended without a final answer');

        } finally {
            reader.releaseLock();
        }
    }
}