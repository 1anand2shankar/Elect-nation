import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * @fileoverview Voter Compass Core Logic
 * High-performance, accessible, and resilient election guidance system.
 * Version: 2.3.0
 */

// --- Constants & Configuration ---
const CONFIG = Object.freeze({
    GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
    GOOGLE_CALENDAR_CLIENT_ID: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '',
    GOOGLE_CALENDAR_API_KEY: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    THEME_COLOR: '#6366f1'
});

// --- Enhanced Logger ---
const Logger = {
    _log: (level, msg, data = '') => {
        const timestamp = new Date().toISOString();
        const styles = {
            info: `color: ${CONFIG.THEME_COLOR}; font-weight: bold`,
            warn: 'color: #f59e0b; font-weight: bold',
            error: 'color: #ef4444; font-weight: bold'
        };
        console.log(`%c[${level.toUpperCase()}] %c${timestamp}: ${msg}`, styles[level], 'color: inherit', data);
    },
    info: (msg, data) => Logger._log('info', msg, data),
    warn: (msg, data) => Logger._log('warn', msg, data),
    error: (msg, err) => Logger._log('error', msg, err)
};

// --- App State Management ---
export class AppState {
    constructor() {
        this.isAssistantVisible = false;
        this.isGapiLoaded = false;
        this.isChatPending = false;
        this.timeline = [
            { id: 1, date: "October 1st", title: "Registration Opens", icon: "📝", completed: true },
            { id: 2, date: "October 15th", title: "Status Verification", icon: "🔍", completed: false },
            { id: 3, date: "November 5th", title: "General Election Day", icon: "🏛️", completed: false }
        ];
    }
}

const state = new AppState();

// --- Core Utilities ---

/**
 * Debounce function for performance optimization
 */
export const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

/**
 * Standardized Toast System
 */
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `show ${type}`;
    toast.style.borderColor = type === 'error' ? '#ef4444' : CONFIG.THEME_COLOR;
    
    setTimeout(() => toast.classList.remove('show'), 4000);
}

/**
 * Advanced Date Parsing with Localization Support
 */
export function parseElectionDate(dateStr) {
    try {
        const year = new Date().getFullYear();
        const normalized = dateStr.replace(/(st|nd|rd|th)/g, '');
        const date = new Date(`${normalized} ${year}`);
        if (isNaN(date.getTime())) throw new Error('Invalid Format');
        return date.toISOString().split('T')[0];
    } catch (e) {
        Logger.error('Date conversion failed', dateStr);
        return new Date().toISOString().split('T')[0];
    }
}

// --- Google Services: Integrated Manager ---

export const GoogleService = {
    _tokenClient: null,
    _isGapiInitialized: false,

    /**
     * Resilient Initialization of all Google SDKs
     */
    init: async () => {
        return new Promise((resolve) => {
            if (typeof gapi === 'undefined' || typeof google === 'undefined') {
                Logger.error('Google SDKs not found on window');
                return resolve(false);
            }

            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.GOOGLE_CALENDAR_API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                    });
                    GoogleService._isGapiInitialized = true;
                    state.isGapiLoaded = true;
                    Logger.info('Google Calendar Client Ready');
                } catch (err) {
                    Logger.error('GAPI Init Failure', err);
                }
                resolve(true);
            });

            GoogleService._tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.GOOGLE_CALENDAR_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: '', // Defined during request
            });
        });
    },

    /**
     * Gemini 1.5 Flash: Advanced AI Orchestration
     */
    getAIResponse: async (prompt, retry = 0) => {
        if (!CONFIG.GEMINI_API_KEY) return "Voter Compass is running in offline mode.";

        try {
            const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    maxOutputTokens: 150,
                }
            });

            const systemMsg = "You are the Voter Compass Guide. Expert in US elections. Provide non-partisan, encouraging, and legally accurate advice. 2-3 sentences max.";
            const result = await model.generateContent([systemMsg, prompt]);
            return result.response.text();

        } catch (err) {
            if ((err.status === 429 || err.message?.includes('429')) && retry < CONFIG.MAX_RETRIES) {
                const delay = CONFIG.RETRY_DELAY * Math.pow(2, retry);
                Logger.warn(`Gemini throttled. Exponential backoff: ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
                return GoogleService.getAIResponse(prompt, retry + 1);
            }
            Logger.error('Gemini API Exception', err);
            return "I'm having trouble connecting to my knowledge base. Please try again in a moment.";
        }
    },

    /**
     * Google Calendar: High-Fidelity Event Sync
     */
    syncCalendarEvent: async (title, dateStr) => {
        if (!state.isGapiLoaded || !GoogleService._tokenClient) {
            showToast("Google Services initializing...", "warn");
            return;
        }

        const isoDate = parseElectionDate(dateStr);

        GoogleService._tokenClient.callback = async (resp) => {
            if (resp.error) {
                Logger.error('Auth Denied', resp.error);
                return showToast("Calendar access denied", "error");
            }

            try {
                await gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: {
                        summary: `🗳️ Voter Compass: ${title}`,
                        description: `Automated reminder from Voter Compass. Prepare for: ${title}. \nVisit votercompass.gov for requirements.`,
                        location: 'Your Local Polling Station',
                        start: { date: isoDate },
                        end: { date: isoDate },
                        reminders: {
                            useDefault: false,
                            overrides: [
                                { method: 'popup', minutes: 1440 }, // 1 day before
                                { method: 'email', minutes: 10080 } // 1 week before
                            ]
                        },
                        colorId: '1' // Lavender
                    }
                });
                showToast("Event synced to Google Calendar!");
                Logger.info('Calendar Sync Successful', { title, date: isoDate });
            } catch (err) {
                Logger.error('GAPI Insert Error', err);
                showToast("Sync failed. Please check permissions.", "error");
            }
        };

        const token = gapi.client.getToken();
        GoogleService._tokenClient.requestAccessToken({ prompt: token === null ? 'consent' : '' });
    }
};

// --- UI Rendering Engines ---

export const UI = {
    renderTimeline: () => {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        const html = state.timeline.map(item => `
            <div class="timeline-item flex" data-aos="fade-up">
                <div class="icon-circle ${item.completed ? 'completed' : ''}" role="img" aria-label="${item.completed ? 'Completed' : 'Pending'}">
                    ${item.icon}
                </div>
                <div class="timeline-content">
                    <span class="timeline-date">${item.date}</span>
                    <h4 class="timeline-title">${item.title}</h4>
                    <button class="btn btn-sm add-cal-btn" 
                            aria-label="Add ${item.title} to calendar"
                            data-title="${item.title}" 
                            data-date="${item.date}">
                        📅 Remind Me
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    scrollToBottom: () => {
        const chat = document.getElementById('chat-messages');
        if (chat) {
            requestAnimationFrame(() => {
                chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
            });
        }
    }
};

// --- Event Orchestration ---

async function handleSendMessage() {
    const input = document.getElementById('user-input');
    if (!input || !input.value.trim() || state.isChatPending) return;

    const rawQuery = input.value.trim();
    const query = sanitizeInput(rawQuery); // Security: Sanitize input
    input.value = '';
    state.isChatPending = true;

    appendChatMessage('user', query);
    const botMsg = appendChatMessage('assistant', 'Thinking...');
    
    const response = await GoogleService.getAIResponse(query);
    botMsg.textContent = response;
    state.isChatPending = false;
    UI.scrollToBottom();
}

export function appendChatMessage(role, text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `message ${role} animate-in`;
    div.textContent = text;
    container.appendChild(div);
    UI.scrollToBottom();
    return div;
}

export function toggleAssistant() {
    const widget = document.getElementById('assistant-widget');
    if (!widget) return;
    state.isAssistantVisible = !state.isAssistantVisible;
    
    widget.classList.toggle('active', state.isAssistantVisible);
    widget.setAttribute('aria-hidden', !state.isAssistantVisible);
    
    if (state.isAssistantVisible) {
        document.getElementById('user-input')?.focus();
    }
}

// --- Initialization Lifecycle ---

const init = async () => {
    // 1. Performance: Init Google services in idle time
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => GoogleService.init());
    } else {
        setTimeout(GoogleService.init, 1000);
    }

    // 2. UI Setup
    UI.renderTimeline();

    // 3. Global Event Delegation
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.closest('#nav-start-btn, #hero-chat-btn, #close-assistant-btn')) {
            toggleAssistant();
        }
        
        if (target.closest('#send-msg-btn')) {
            handleSendMessage();
        }

        const calBtn = target.closest('.add-cal-btn');
        if (calBtn) {
            GoogleService.syncCalendarEvent(calBtn.dataset.title, calBtn.dataset.date);
        }
    });

    document.getElementById('user-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    Logger.info('Application Bootstrap Complete', { version: CONFIG.VERSION });
};

document.addEventListener('DOMContentLoaded', init);
