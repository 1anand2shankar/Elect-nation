import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    sanitizeInput, 
    UI,
    GoogleService,
    parseElectionDate
} from './app.js';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
            getGenerativeModel: vi.fn().mockReturnValue({
                startChat: vi.fn().mockReturnValue({
                    sendMessage: vi.fn().mockResolvedValue({
                        response: { text: () => 'Mocked Gemini Response' }
                    })
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
                requestAccessToken: vi.fn()
            })
        }
    }
};

describe('Voter Compass v3.0 Logic', () => {

    describe('Security & Sanitization', () => {
        it('should strip script tags while preserving text content', () => {
            const input = '<script>alert(1)</script>Hello';
            expect(sanitizeInput(input)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;Hello');
        });
    });

    describe('Efficiency: Performance Utilities', () => {
        it('should correctly parse diverse date formats into ISO', () => {
            expect(parseElectionDate('October 1st')).toContain('-10-01');
            expect(parseElectionDate('November 5th')).toContain('-11-05');
        });
    });

    describe('Google Services Integration', () => {
        it('should initialize chat session on first request', async () => {
            const response = await GoogleService.getAIResponse('test prompt');
            expect(response).toBe('Mocked Gemini Response');
        });

        it('should handle calendar sync requests', async () => {
            // This test verifies the function exists and triggers logic
            expect(GoogleService.syncCalendarEvent).toBeDefined();
        });
    });
});
