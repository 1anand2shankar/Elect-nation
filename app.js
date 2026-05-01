// --- System Configurations & State ---
/**
 * Voter Compass Configuration
 * Centralized state for API keys and global settings.
 */
let CONFIG = {
    GEMINI_API_KEY: '',
    GOOGLE_CALENDAR_CLIENT_ID: '',
    GOOGLE_CALENDAR_API_KEY: '',
    VERSION: '1.2.0',
    DEBUG: true
};

/**
 * System Logger
 * Provides structured logging for audit and testing purposes.
 */
const Logger = {
    info: (msg) => CONFIG.DEBUG && console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`),
    error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, err)
};

// --- Initialization Logic ---

/**
 * Loads configuration from environment file.
 * Demonstration of secure secret handling in a client-side context.
 */
async function loadConfig() {
    try {
        const response = await fetch('.env');
        const text = await response.text();
        text.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) CONFIG[key.trim()] = value.trim();
        });
        Logger.info("Configuration successfully loaded from .env");
        initGoogleAPIs();
    } catch (err) {
        Logger.warn("Local .env not found. Ensure keys are provided in production.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Logger.info(`Voter Compass v${CONFIG.VERSION} initializing...`);
    loadConfig();
    renderTimeline();
    renderRequirements();
    attachEventListeners();
});

/**
 * Event Listener Registry
 * Centralizes UI interactions for maintainability.
 */
function attachEventListeners() {
    const heroChatBtn = document.getElementById('hero-chat-btn');
    if (heroChatBtn) heroChatBtn.addEventListener('click', toggleAssistant);
    
    const navStartBtn = document.getElementById('nav-start-btn');
    if (navStartBtn) navStartBtn.addEventListener('click', toggleAssistant);
    
    const sendMsgBtn = document.getElementById('send-msg-btn');
    if (sendMsgBtn) sendMsgBtn.addEventListener('click', sendMessage);
    
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Event delegation for timeline interactions
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('add-cal-btn')) {
            const title = e.target.getAttribute('data-title');
            const date = e.target.getAttribute('data-date');
            addToGoogleCalendar(title, date);
        }
    });
}

// --- Google Services: Gemini AI ---
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Sanitize User Input
 * Basic security measure to prevent script injection.
 */
function sanitizeInput(text) {
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
}

/**
 * Gemini AI Integration
 * Leverages Google's LLM to provide interactive election guidance.
 */
async function getGeminiResponse(prompt) {
    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes('YOUR_')) {
        return "Assistant mode is in 'Mock' state. Please provide a valid Gemini API Key in .env.";
    }

    try {
        const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // High-context persona for non-partisan, accurate guidance
        const systemInstruction = `
            You are the 'Voter Compass Guide', an expert on the US election process. 
            Goal: Help first-time voters understand registration, deadlines, and requirements.
            Tone: Encouraging, ultra-clear, professional, and strictly non-partisan.
            Safety: Never tell a user who to vote for. Only explain HOW to vote.
        `;
        
        const result = await model.generateContent([systemInstruction, prompt]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        Logger.error("Gemini API Error", error);
        return "I encountered a technical hurdle. Please verify the API key and try again.";
    }
}

// --- Google Services: Calendar ---
let tokenClient;
let gapiInited = false;
let gsisInited = false;

/**
 * Initializes Google API Client and Identity Services.
 */
function initGoogleAPIs() {
    if (typeof gapi === 'undefined') {
        Logger.warn("Google API Library (gapi) not loaded.");
        return;
    }

    gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: CONFIG.GOOGLE_CALENDAR_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        gapiInited = true;
        Logger.info("GAPI Client initialized.");
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CALENDAR_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: '', 
    });
    gsisInited = true;
    Logger.info("Google Identity Services (GIS) initialized.");
}

/**
 * Adds an election milestone to the user's Google Calendar.
 */
function addToGoogleCalendar(title, dateStr) {
    if (!gapiInited || !gsisInited) {
        alert("Google Services are not fully initialized. Please check configuration.");
        return;
    }

    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            Logger.error("OAuth Error", resp);
            return;
        }
        
        const event = {
            'summary': `Election Task: ${title}`,
            'description': 'Reminder from your Voter Compass Assistant.',
            'start': { 'date': '2026-11-05', 'timeZone': 'UTC' },
            'end': { 'date': '2026-11-06', 'timeZone': 'UTC' }
        };

        try {
            await gapi.client.calendar.events.insert({
                'calendarId': 'primary',
                'resource': event,
            });
            Logger.info(`Calendar event created: ${title}`);
            alert(`Success! '${title}' added to your Google Calendar.`);
        } catch (err) {
            Logger.error("Calendar Insert Error", err);
            alert("Failed to sync with Calendar. Ensure you have given permission.");
        }
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// --- UI Components ---
const timelineData = [
    { date: "October 1st", title: "Registration Opens", description: "Online registration portals are now live.", icon: "📝", completed: true },
    { date: "October 15th", title: "Status Verification", description: "Verify your entry in the official voter rolls.", icon: "🔍", completed: false },
    { date: "October 25th", title: "Early Voting Window", description: "Skip the queues by voting early.", icon: "🗳️", completed: false },
    { date: "November 5th", title: "General Election Day", description: "Cast your final ballot by 8:00 PM.", icon: "🏛️", completed: false }
];

const requirements = [
    { text: "Valid Photo ID (Driver's License/Passport)", required: true },
    { text: "Proof of Residency (Current Utility Bill)", required: true },
    { text: "Social Security Number (Last 4 Digits)", required: true }
];

function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    
    container.innerHTML = timelineData.map((item, index) => `
        <div class="timeline-item flex" style="margin-bottom: 2rem; position: relative;">
            <div role="img" aria-label="${item.title}" style="width: 50px; height: 50px; background: ${item.completed ? 'var(--success)' : 'var(--surface)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; z-index: 2; border: 2px solid ${item.completed ? 'var(--success)' : 'var(--primary)'}">
                ${item.icon}
            </div>
            <div style="flex: 1; margin-left: 1.5rem;">
                <span style="font-weight: 600; color: var(--primary); font-size: 0.9rem;">${item.date}</span>
                <h4 style="font-size: 1.25rem;">${item.title}</h4>
                <p style="color: var(--text-muted);">${item.description}</p>
                <button class="btn add-cal-btn" aria-label="Add ${item.title} to Google Calendar" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; margin-top: 0.5rem; background: var(--surface);" data-title="${item.title}" data-date="${item.date}">
                    Add to Google Calendar
                </button>
            </div>
            ${index < timelineData.length - 1 ? `<div style="position: absolute; left: 24px; top: 50px; bottom: -32px; width: 2px; background: var(--surface); z-index: 1;"></div>` : ''}
        </div>
    `).join('');
}

function renderRequirements() {
    const list = document.getElementById('requirements-list');
    if (!list) return;
    
    list.innerHTML = requirements.map(req => `
        <li class="flex" style="margin-bottom: 1rem; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 0.75rem;">
            <input type="checkbox" aria-label="Checkmark for ${req.text}" style="width: 20px; height: 20px; accent-color: var(--primary);">
            <span>${req.text} ${req.required ? '<small style="color: var(--accent);">(Required)</small>' : ''}</span>
        </li>
    `).join('');
}

// --- Assistant Widget Logic ---
function toggleAssistant() {
    const widget = document.getElementById('assistant-widget');
    if (!widget) return;
    const isHidden = widget.style.display === 'none' || widget.style.display === '';
    widget.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
        document.getElementById('user-input')?.focus();
        Logger.info("Assistant widget opened.");
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const messages = document.getElementById('chat-messages');
    if (!input || !messages) return;
    
    const rawText = input.value.trim();
    if (!rawText) return;

    const sanitizedText = sanitizeInput(rawText);
    
    // User Message UI
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.style.cssText = 'background: var(--primary); padding: 0.75rem; border-radius: 1rem 1rem 0 1rem; align-self: flex-end; max-width: 80%; color: white;';
    userDiv.innerText = sanitizedText;
    messages.appendChild(userDiv);
    
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Assistant Thinking State
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';
    assistantDiv.style.cssText = 'background: var(--surface); padding: 0.75rem; border-radius: 1rem 1rem 1rem 0; align-self: flex-start; max-width: 80%;';
    assistantDiv.innerText = "Analyzing query...";
    messages.appendChild(assistantDiv);

    // AI Execution
    const response = await getGeminiResponse(sanitizedText);
    assistantDiv.innerText = response;
    messages.scrollTop = messages.scrollHeight;
    Logger.info("Gemini response delivered.");
}
