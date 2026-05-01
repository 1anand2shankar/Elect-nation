import { GoogleGenerativeAI } from "@google/generative-ai";

// --- System Configurations & State ---
const CONFIG = {
    GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
    GOOGLE_CALENDAR_CLIENT_ID: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '',
    GOOGLE_CALENDAR_API_KEY: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
    VERSION: '2.1.0',
    DEBUG: true
};

const Logger = {
    info: (msg) => CONFIG.DEBUG && console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`),
    error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, err)
};

// --- Core Utilities ---

/**
 * Sanitize User Input to prevent XSS
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeInput(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Custom Toast Notification
 * @param {string} message 
 * @param {string} type 
 */
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.borderColor = type === 'error' ? 'var(--error)' : 'var(--primary)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- API Integrations ---

/**
 * Gemini AI Integration for non-partisan guidance
 */
export async function getGeminiResponse(prompt) {
    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes('YOUR_')) {
        return "Assistant is in demonstration mode. Please configure a valid API key.";
    }

    try {
        const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const systemInstruction = `You are the 'Voter Compass Guide'. Help first-time voters with clear, non-partisan guidance. Keep answers concise.`;
        
        const result = await model.generateContent([systemInstruction, prompt]);
        return result.response.text();
    } catch (error) {
        Logger.error("Gemini API Error", error);
        return "I'm having trouble connecting to the guide. Please check your connection.";
    }
}

// --- Google Calendar Integration ---
let tokenClient;
let gapiInited = false;

function initGoogleAPIs() {
    if (typeof gapi === 'undefined') {
        Logger.warn("GAPI script not loaded yet.");
        return;
    }

    gapi.load('client', async () => {
        try {
            await gapi.client.init({
                apiKey: CONFIG.GOOGLE_CALENDAR_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            gapiInited = true;
            Logger.info("GAPI client initialized.");
        } catch (err) {
            Logger.error("GAPI init error", err);
        }
    });

    if (typeof google !== 'undefined') {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CALENDAR_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: '', 
        });
    }
}

/**
 * Add election milestone to user's Google Calendar
 */
export function addToGoogleCalendar(title, dateStr) {
    if (!gapiInited || !tokenClient) {
        showToast("Google Services not ready. Check your API keys.", "error");
        return;
    }

    // Map month names to numbers for simple date parsing
    const months = { October: '10', November: '11' };
    const parts = dateStr.split(' ');
    const day = parts[1].replace(/\D/g, '').padStart(2, '0');
    const month = months[parts[0]] || '11';
    const isoDate = `2026-${month}-${day}`;

    tokenClient.callback = async (resp) => {
        if (resp.error) {
            showToast("Calendar access denied.", "error");
            return;
        }
        
        const event = {
            'summary': `Election Task: ${title}`,
            'description': `Reminder from Voter Compass for ${dateStr}.`,
            'start': { 'date': isoDate, 'timeZone': 'UTC' },
            'end': { 'date': isoDate, 'timeZone': 'UTC' }
        };

        try {
            await gapi.client.calendar.events.insert({ 'calendarId': 'primary', 'resource': event });
            showToast(`Added to calendar: ${title}`);
        } catch (err) {
            Logger.error("Calendar Insert Error", err);
            showToast("Failed to add event.", "error");
        }
    };

    tokenClient.requestAccessToken({ prompt: gapi.client.getToken() === null ? 'consent' : '' });
}

// --- UI Components & Rendering ---
const timelineData = [
    { date: "October 1st", title: "Registration Opens", icon: "📝", completed: true },
    { date: "October 15th", title: "Status Verification", icon: "🔍", completed: false },
    { date: "November 5th", title: "General Election Day", icon: "🏛️", completed: false }
];

export function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    
    const fragment = document.createDocumentFragment();
    
    timelineData.forEach(item => {
        const div = document.createElement('div');
        div.className = "timeline-item flex";
        div.style.marginBottom = "2rem";
        div.innerHTML = `
            <div role="img" aria-label="${item.title}" class="icon-circle" style="background: ${item.completed ? 'var(--success)' : 'var(--surface)'}; border: 2px solid var(--primary);">
                ${item.icon}
            </div>
            <div class="timeline-content">
                <span class="timeline-date">${item.date}</span>
                <h4 class="timeline-title">${item.title}</h4>
                <button class="btn add-cal-btn" aria-label="Add ${item.title} to Google Calendar" style="padding: 0.5rem; font-size: 0.9rem;" data-title="${item.title}" data-date="${item.date}">
                    📅 Add to Calendar
                </button>
            </div>
        `;
        fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

// --- Event Handlers ---
function attachEventListeners() {
    document.addEventListener('click', async (e) => {
        // Toggle Assistant
        if (e.target.closest('#hero-chat-btn') || e.target.closest('#nav-start-btn') || e.target.closest('#close-assistant-btn')) {
            toggleAssistant();
        }
        
        // Send Message
        if (e.target.closest('#send-msg-btn')) {
            await sendMessage();
        }

        // Calendar Delegation
        const calBtn = e.target.closest('.add-cal-btn');
        if (calBtn) {
            addToGoogleCalendar(calBtn.dataset.title, calBtn.dataset.date);
        }
    });

    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

export function toggleAssistant() {
    const widget = document.getElementById('assistant-widget');
    if (!widget) return;
    const isVisible = widget.style.display === 'flex';
    widget.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) document.getElementById('user-input')?.focus();
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const messages = document.getElementById('chat-messages');
    if (!input || !messages || !input.value.trim()) return;

    const rawText = input.value.trim();
    const text = sanitizeInput(rawText);
    input.value = '';

    appendMessage('user', text);
    const assistantMsg = appendMessage('assistant', 'Consulting the guide...');
    
    const response = await getGeminiResponse(rawText);
    assistantMsg.innerText = response;
    messages.scrollTop = messages.scrollHeight;
}

export function appendMessage(type, text) {
    const messages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.style.cssText = type === 'user' 
        ? 'background: var(--primary); padding: 1rem; border-radius: 1rem 1rem 0 1rem; align-self: flex-end; color: white; max-width: 85%;'
        : 'background: var(--surface); padding: 1rem; border-radius: 1rem 1rem 1rem 0; align-self: flex-start; max-width: 85%;';
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initGoogleAPIs();
    renderTimeline();
    attachEventListeners();
    Logger.info("Voter Compass initialized.");
});
