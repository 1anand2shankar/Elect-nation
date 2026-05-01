import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    sanitizeInput, 
    showToast, 
    toggleAssistant, 
    appendChatMessage, 
    UI,
    GoogleService,
    parseElectionDate
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

describe('Voter Compass Google Services Test Suite', () => {
    
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="timeline-container"></div>
            <div id="assistant-widget"></div>
            <div id="chat-messages"></div>
            <div id="toast"></div>
            <input id="user-input" />
        `;
        vi.useFakeTimers();
        // Reset GoogleService state
        GoogleService._isGapiInitialized = true; 
    });

    describe('AI: Gemini Orchestration', () => {
        it('should return a response from Gemini', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
            const response = await GoogleService.getAIResponse('Hello');
            expect(response).toBe('Mocked Gemini Response');
        });

        it('should handle rate limits with backoff', async () => {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const mockGenerate = vi.fn()
                .mockRejectedValueOnce(new Error('429'))
                .mockResolvedValueOnce({
                    response: { text: () => 'Succeeded' }
                });

            GoogleGenerativeAI.mockImplementation(() => ({
                getGenerativeModel: () => ({ generateContent: mockGenerate })
            }));

            const responsePromise = GoogleService.getAIResponse('Retry me');
            await vi.runAllTimersAsync();
            const response = await responsePromise;

            expect(mockGenerate).toHaveBeenCalledTimes(2);
            expect(response).toBe('Succeeded');
        });
    });

    describe('Calendar: Event Synchronization', () => {
        it('should correctly format calendar events with metadata', async () => {
            // Mock token client
            GoogleService._tokenClient = global.google.accounts.oauth2.initTokenClient();
            
            await GoogleService.syncCalendarEvent('Election Day', 'November 5th');
            
            expect(global.gapi.client.calendar.events.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    resource: expect.objectContaining({
                        summary: expect.stringContaining('Election Day'),
                        description: expect.stringContaining('Voter Compass'),
                        reminders: expect.any(Object)
                    })
                })
            );
        });
    });

    describe('Lifecycle: Initialization', () => {
        it('should initialize clients correctly', async () => {
            const success = await GoogleService.init();
            expect(success).toBe(true);
            expect(global.gapi.load).toHaveBeenCalledWith('client', expect.any(Function));
        });
    });
});
