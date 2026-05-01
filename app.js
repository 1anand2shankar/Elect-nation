import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * @fileoverview Voter Compass Core Logic
 * Version: 3.0.0 - Optimized for Google Services, Code Quality, and Efficiency.
 */

/**
 * @typedef {Object} TimelineItem
 * @property {number} id
 * @property {string} date
 * @property {string} title
 * @property {string} icon
 * @property {boolean} completed
 */

const CONFIG = Object.freeze({
    GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
    GOOGLE_CALENDAR_CLIENT_ID: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '',
    GOOGLE_CALENDAR_API_KEY: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    THEME_COLOR: '#6366f1'
});

const Logger = {
    _log: (level, msg, data = '') => {
        if (!import.meta.env.DEV && level === 'info') return;
        const styles = {
            info: `color: ${CONFIG.THEME_COLOR}; font-weight: bold`,
            warn: 'color: #f59e0b; font-weight: bold',
            error: 'color: #ef4444; font-weight: bold'
        };
        console.log(`%c[${level.toUpperCase()}] %c${new Date().toISOString()}: ${msg}`, styles[level], 'color: inherit', data);
    },
    info: (msg, data) => Logger._log('info', msg, data),
    warn: (msg, data) => Logger._log('warn', msg, data),
    error: (msg, err) => Logger._log('error', msg, err)
};

// --- State Management ---
class AppState {
    constructor() {
        this.isAssistantVisible = false;
        this.isGapiLoaded = false;
        this.isChatPending = false;
        /** @type {import('@google/generative-ai').ChatSession | null} */
        this.chatSession = null;
        /** @type {TimelineItem[]} */
        this.timeline = [
            { id: 1, date: "October 1st", title: "Registration Opens", icon: "📝", completed: true },
            { id: 2, date: "October 15th", title: "Status Verification", icon: "🔍", completed: false },
            { id: 3, date: "November 5th", title: "General Election Day", icon: "🏛️", completed: false }
        ];
    }
}

const state = new AppState();

// --- Utilities ---
export const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 4000);
}

/**
 * Performance: Optimized Date Parser
 */
export function parseElectionDate(dateStr) {
    const year = new Date().getFullYear();
    const normalized = dateStr.replace(/(st|nd|rd|th)/g, '');
    const date = new Date(`${normalized} ${year}`);
    return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
}

// --- Google Services ---

export const GoogleService = {
    _tokenClient: null,

    init: async () => {
        if (typeof gapi === 'undefined' || typeof google === 'undefined') return;

        return new Promise((resolve) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: CONFIG.GOOGLE_CALENDAR_API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                    });
                    state.isGapiLoaded = true;
                    Logger.info('GAPI Loaded');
                } catch (e) { Logger.error('GAPI Fail', e); }
                resolve(true);
            });

            GoogleService._tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.GOOGLE_CALENDAR_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: '',
            });
        });
    },

    /**
     * Gemini 1.5 Flash with Multi-turn Chat History
     */
    getAIResponse: async (prompt) => {
        if (!CONFIG.GEMINI_API_KEY) return "Assistant is offline.";
        
        try {
            if (!state.chatSession) {
                const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                state.chatSession = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: "You are the Voter Compass Guide. Expert in US elections. Provide non-partisan, encouraging advice." }] },
                        { role: "model", parts: [{ text: "Understood. I am ready to help first-time voters navigate the election process with clarity and accuracy." }] },
                    ],
                });
            }

            const result = await state.chatSession.sendMessage(prompt);
            return result.response.text();
        } catch (err) {
            Logger.error('Gemini Error', err);
            return "I encountered an error. Please try asking again.";
        }
    },

    /**
     * Enhanced Calendar Sync with Reminders & Location
     */
    syncCalendarEvent: async (title, dateStr) => {
        if (!state.isGapiLoaded) return showToast("Initialising Google Services...", "warn");

        const isoDate = parseElectionDate(dateStr);
        GoogleService._tokenClient.callback = async (resp) => {
            if (resp.error) return showToast("Calendar access denied", "error");

            try {
                await gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: {
                        summary: `🗳️ Voter Compass: ${title}`,
                        description: `Election Reminder: ${title}. Check your registration status at votercompass.gov.`,
                        location: 'Local Polling Station',
                        start: { date: isoDate },
                        end: { date: isoDate },
                        reminders: {
                            useDefault: false,
                            overrides: [
                                { method: 'popup', minutes: 1440 },
                                { method: 'email', minutes: 10080 }
                            ]
                        }
                    }
                });
                showToast("Synced to Google Calendar!");
            } catch (err) {
                showToast("Sync failed. Check permissions.", "error");
            }
        };

        const token = gapi.client.getToken();
        GoogleService._tokenClient.requestAccessToken({ prompt: token === null ? 'consent' : '' });
    }
};

// --- UI Logic ---

export const UI = {
    /**
     * Efficiency: Use DocumentFragment to minimize reflows
     */
    renderTimeline: () => {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        const fragment = document.createDocumentFragment();
        state.timeline.forEach(item => {
            const div = document.createElement('div');
            div.className = 'timeline-item flex';
            div.innerHTML = `
                <div class="icon-circle ${item.completed ? 'completed' : ''}">${item.icon}</div>
                <div class="timeline-content">
                    <span class="timeline-date">${item.date}</span>
                    <h4 class="timeline-title">${item.title}</h4>
                    <button class="btn btn-sm add-cal-btn" data-title="${item.title}" data-date="${item.date}">📅 Remind Me</button>
                </div>
            `;
            fragment.appendChild(div);
        });
        container.innerHTML = '';
        container.appendChild(fragment);
    },

    scrollToBottom: () => {
        const chat = document.getElementById('chat-messages');
        if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    }
};

// --- Event Handlers ---

async function handleSendMessage() {
    const input = document.getElementById('user-input');
    if (!input || !input.value.trim() || state.isChatPending) return;

    const query = sanitizeInput(input.value.trim());
    input.value = '';
    state.isChatPending = true;

    appendChatMessage('user', query);
    const botMsg = appendChatMessage('assistant', 'Thinking...');
    
    botMsg.textContent = await GoogleService.getAIResponse(query);
    state.isChatPending = false;
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
    if (state.isAssistantVisible) document.getElementById('user-input')?.focus();
}

// --- Bootstrap ---
const init = () => {
    // Efficiency: Load Google services after idle
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => GoogleService.init());
    } else {
        setTimeout(GoogleService.init, 1000);
    }

    UI.renderTimeline();

    // Delegation for efficiency
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('#nav-start-btn, #hero-chat-btn, #close-assistant-btn')) toggleAssistant();
        if (target.closest('#send-msg-btn')) handleSendMessage();
        const calBtn = target.closest('.add-cal-btn');
        if (calBtn) GoogleService.syncCalendarEvent(calBtn.dataset.title, calBtn.dataset.date);
    });

    document.getElementById('user-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
};

document.addEventListener('DOMContentLoaded', init);
