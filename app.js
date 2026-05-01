// Voter Compass - Application Logic

const timelineData = [
    {
        date: "October 1st",
        title: "Registration Opens",
        description: "Begin your journey by registering to vote online or at your local DMV.",
        icon: "📝",
        completed: true
    },
    {
        date: "October 15th",
        title: "Check Your Status",
        description: "Verify your registration details and polling location.",
        icon: "🔍",
        completed: false
    },
    {
        date: "October 25th",
        title: "Early Voting Starts",
        description: "Skip the lines by casting your vote early at designated centers.",
        icon: "🗳️",
        completed: false
    },
    {
        date: "November 5th",
        title: "Election Day",
        description: "The big day! Polls are open from 7 AM to 8 PM.",
        icon: "🏛️",
        completed: false
    }
];

const requirements = [
    { id: 1, text: "Government Issued Photo ID", required: true },
    { id: 2, text: "Proof of Residency (Utility Bill/Lease)", required: true },
    { id: 3, text: "Completed Registration Form", required: true },
    { id: 4, text: "Ballot Guide (Recommended)", required: false }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    renderTimeline();
    renderRequirements();
});

function renderTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = timelineData.map((item, index) => `
        <div class="timeline-item flex" style="margin-bottom: 2rem; position: relative;">
            <div style="width: 50px; height: 50px; background: ${item.completed ? 'var(--success)' : 'var(--surface)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; z-index: 2; border: 2px solid ${item.completed ? 'var(--success)' : 'var(--primary)'}">
                ${item.icon}
            </div>
            <div style="flex: 1; margin-left: 1.5rem;">
                <span style="font-weight: 600; color: var(--primary); font-size: 0.9rem;">${item.date}</span>
                <h4 style="font-size: 1.25rem;">${item.title}</h4>
                <p style="color: var(--text-muted);">${item.description}</p>
                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; margin-top: 0.5rem; background: var(--surface);" onclick="addToGoogleCalendar('${item.title}', '${item.date}')">
                    Add to Google Calendar
                </button>
            </div>
            ${index < timelineData.length - 1 ? `<div style="position: absolute; left: 24px; top: 50px; bottom: -32px; width: 2px; background: var(--surface); z-index: 1;"></div>` : ''}
        </div>
    `).join('');
}

function renderRequirements() {
    const list = document.getElementById('requirements-list');
    list.innerHTML = requirements.map(req => `
        <li class="flex" style="margin-bottom: 1rem; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 0.75rem;">
            <input type="checkbox" style="width: 20px; height: 20px; accent-color: var(--primary);">
            <span>${req.text} ${req.required ? '<small style="color: var(--accent);">(Required)</small>' : ''}</span>
        </li>
    `).join('');
}

// Assistant Logic
function toggleAssistant() {
    const widget = document.getElementById('assistant-widget');
    widget.style.display = widget.style.display === 'none' ? 'flex' : 'none';
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const messages = document.getElementById('chat-messages');
    const text = input.value.trim();
    
    if (!text) return;

    // User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.style.cssText = 'background: var(--primary); padding: 0.75rem; border-radius: 1rem 1rem 0 1rem; align-self: flex-end; max-width: 80%; color: white;';
    userDiv.innerText = text;
    messages.appendChild(userDiv);
    
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Simulate Assistant Response (Integrating logic for "Smart Assistant")
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';
    assistantDiv.style.cssText = 'background: var(--surface); padding: 0.75rem; border-radius: 1rem 1rem 1rem 0; align-self: flex-start; max-width: 80%;';
    assistantDiv.innerText = "...";
    messages.appendChild(assistantDiv);

    // Mock Gemini API Call
    setTimeout(() => {
        assistantDiv.innerText = getAssistantResponse(text);
        messages.scrollTop = messages.scrollHeight;
    }, 1000);
}

function getAssistantResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('register')) return "You can register online at your state's election website or by mail. Would you like me to find your specific state portal?";
    if (q.includes('id') || q.includes('documents')) return "Most states require a photo ID. In our requirements section, we've listed the most common documents needed.";
    if (q.includes('date') || q.includes('when')) return "The general election is on November 5th. However, early voting starts on October 25th in many locations.";
    return "That's a great question about the voting process! I'm here to help with registration, deadlines, and requirements. Is there something specific you'd like to know?";
}

// Google Services Integration (Mock)
function addToGoogleCalendar(title, date) {
    // In a real app, this would use the Google Calendar API
    // Here we simulate the action
    alert(`Generating Google Calendar event for: ${title} on ${date}`);
    console.log(`OAuth2 call to Google Calendar API for event: ${title}`);
}

function initMap() {
    // This would be called by the Google Maps API script
    console.log("Google Maps API initialized");
    // Mocking map interaction
    const mapPlaceholder = document.getElementById('map-placeholder');
    mapPlaceholder.style.background = "url('https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=13&size=400x200&key=YOUR_API_KEY')";
    mapPlaceholder.style.backgroundSize = "cover";
}
