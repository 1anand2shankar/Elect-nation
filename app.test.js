import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    sanitizeInput, 
    showToast, 
    toggleAssistant, 
    appendMessage, 
    renderTimeline,
    getGeminiResponse 
} from './app.js';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
            getGenerativeModel: vi.fn().mockReturnValue({
                generateContent: vi.fn().mockResolvedValue({
                    response: { text: () => 'Mocked Gemini Response' }
                })
            })
        }))
    };
});

// Mock Global Google APIs
global.gapi = {
    load: vi.fn((name, cb) => cb()),
    client: {
        init: vi.fn().mockResolvedValue({}),
        calendar: {
            events: {
                insert: vi.fn().mockResolvedValue({})
            }
        },
        getToken: vi.fn().mockReturnValue('mock-token')
    }
};

global.google = {
    accounts: {
        oauth2: {
            initTokenClient: vi.fn().mockReturnValue({
                requestAccessToken: vi.fn(function() { this.callback({ access_token: 'valid' }); })
            })
        }
    }
};

describe('Voter Compass Comprehensive Test Suite', () => {
    
    beforeEach(() => {
        // Setup DOM for each test
        document.body.innerHTML = `
            <div id="timeline-container"></div>
            <div id="assistant-widget" style="display: none;"></div>
            <div id="chat-messages"></div>
            <div id="toast"></div>
            <input id="user-input" />
        `;
        vi.useFakeTimers();
    });

    describe('Security: Input Sanitization', () => {
        it('should correctly sanitize HTML input to prevent XSS', () => {
            const malicious = '<script>alert("xss")</script>';
            const sanitized = sanitizeInput(malicious);
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        it('should handle empty input gracefully', () => {
            expect(sanitizeInput('')).toBe('');
            expect(sanitizeInput(null)).toBe('');
        });
    });

    describe('UI: Toast Notifications', () => {
        it('should display message and apply correct styles', () => {
            const toast = document.getElementById('toast');
            showToast('Test Message', 'error');
            
            expect(toast.textContent).toBe('Test Message');
            expect(toast.classList.contains('show')).toBe(true);
            expect(toast.style.borderColor).toBe('var(--error)');
        });

        it('should hide toast after timeout', () => {
            const toast = document.getElementById('toast');
            showToast('Test Message');
            
            vi.advanceTimersByTime(3000);
            expect(toast.classList.contains('show')).toBe(false);
        });
    });

    describe('UI: Assistant Widget', () => {
        it('should toggle visibility', () => {
            const widget = document.getElementById('assistant-widget');
            
            toggleAssistant();
            expect(widget.style.display).toBe('flex');
            
            toggleAssistant();
            expect(widget.style.display).toBe('none');
        });
    });

    describe('UI: Chat Logic', () => {
        it('should append messages correctly', () => {
            const messages = document.getElementById('chat-messages');
            appendMessage('user', 'Hello');
            
            expect(messages.children.length).toBe(1);
            expect(messages.querySelector('.message.user').textContent).toBe('Hello');
        });

        it('should auto-scroll to bottom', () => {
            const messages = document.getElementById('chat-messages');
            // Mock scrollHeight and scrollTop
            Object.defineProperty(messages, 'scrollHeight', { value: 1000 });
            
            appendMessage('assistant', 'Replying...');
            expect(messages.scrollTop).toBe(1000);
        });
    });

    describe('UI: Timeline Rendering', () => {
        it('should render all timeline items', () => {
            renderTimeline();
            const items = document.querySelectorAll('.timeline-item');
            expect(items.length).toBe(3); // Based on timelineData in app.js
            expect(items[0].textContent).toContain('Registration Opens');
        });
    });

    describe('Integrations: Gemini API', () => {
        it('should return mocked response', async () => {
            // Ensure API key is "set" for the test
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
            
            const response = await getGeminiResponse('How do I vote?');
            expect(response).toBe('Mocked Gemini Response');
        });

        it('should handle API errors gracefully', async () => {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            GoogleGenerativeAI.mockImplementationOnce(() => ({
                getGenerativeModel: () => ({
                    generateContent: () => { throw new Error('API Down'); }
                })
            }));

            const response = await getGeminiResponse('Fail me');
            expect(response).toContain('trouble connecting');
        });
    });

    describe('Integrations: Google Calendar', () => {
        it('should call gapi.client.calendar.events.insert', async () => {
            // Force gapiInited to true (mocking internal state is hard, but we exported the fn)
            const { addToGoogleCalendar } = await import('./app.js');
            
            // We need to trigger the callback
            addToGoogleCalendar('Vote Day', 'November 5th');
            
            expect(global.gapi.client.calendar.events.insert).toHaveBeenCalled();
        });
    });
});
