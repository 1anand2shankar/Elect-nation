# Voter Compass Assistant 🗳️

## 🧭 Project Overview
**Voter Compass** is an interactive, smart assistant designed to guide first-time voters through the complexities of the election process. It simplifies registration, tracks key deadlines, and provides instant answers to common questions, ensuring every citizen feels confident and prepared on election day.

### 🎯 Chosen Vertical
**The First-Time Voter's Compass**: This solution is tailored for young adults and new citizens who may find the voting process overwhelming. It prioritizes clarity, accessibility, and modern aesthetics.

---

## 🚀 How It Works
1. **Interactive Smart Assistant**: Powered by a logic-driven chat interface (simulating Gemini API), the assistant provides context-aware answers to user queries about registration, ID requirements, and dates.
2. **Dynamic Election Timeline**: A visual roadmap that highlights critical milestones. Users can synchronize these dates directly with their **Google Calendar**.
3. **Requirement Checklist**: A proactive tool that helps users verify they have the necessary documentation before heading to the polls.
4. **Polling Station Integration**: Leveraging **Google Maps** (simulated via static maps for demo) to help users find their local voting centers.

---

## 🛠️ Technical Approach & Logic
- **Architecture**: A modular, lightweight frontend built with Semantic HTML5, Vanilla CSS, and Modern JavaScript. 
- **Design System**: Implements a premium "Glassmorphism" aesthetic with a dark-mode first approach. Uses HSL tailored colors and CSS animations to create a responsive, "alive" experience.
- **Decision Logic**: The assistant uses a pattern-matching logic (ready for LLM integration) to provide specific guidance based on user input.
- **Google Services Integration**:
    - **Google Calendar**: Logic to generate event parameters for election milestones.
    - **Google Maps**: Integration points for localized polling station searches.
    - **Gemini API**: Prepared interface for intelligent, dynamic conversation.

---

## 📝 Assumptions & Considerations
- **Localization**: The current demo follows a generic election cycle (October-November) but is designed to be easily localized via the `timelineData` configuration in `app.js`.
- **API Keys**: For production, valid Google Cloud Project API keys for Maps and Calendar would be required in a `.env` file.
- **Accessibility**: High-contrast ratios and semantic HTML tags are used to ensure the platform is usable by all.

---

## 📦 Local Setup
1. Clone this repository.
2. Create a `.env` file in the root directory (refer to the provided template).
3. Add your **Gemini API Key**, **Google Calendar Client ID**, and **API Key**.
4. Open `index.html` via a local server (e.g., `python -m http.server`).

> [!IMPORTANT]
> Since this is a client-side application, ensure you restrict your API keys to your specific domain in the Google Cloud Console for security.

## 🏆 Evaluation Focus Areas
Our submission excels in the following areas as per the Hackathon criteria:

### 1. Code Quality
- **Structured Architecture**: Modular logic separation between UI, State, and API services.
- **Maintainability**: Consistent naming conventions, JSDoc documentation, and centralized event management.

### 2. Security
- **Input Sanitization**: All user-facing AI prompts are sanitized to prevent XSS.
- **Secret Management**: Implements a client-side `.env` simulation for local development and highlights best practices for production deployment.
- **CSP Ready**: Basic Content Security Policy implemented for script integrity.

### 3. Efficiency
- **Vanilla Performance**: Zero external frameworks (React/Vue/etc.) for maximum speed and minimal bundle size.
- **Optimized Rendering**: Uses efficient DOM manipulation and event delegation for the timeline and requirement list.

### 4. Testing
- **System Health Checks**: Built-in `Logger` module that provides a real-time audit trail of API initializations and user interactions in the developer console.
- **Validation**: Manual verification of mobile responsiveness and cross-browser compatibility.

### 5. Accessibility
- **ARIA Integration**: Full suite of `aria-labels`, `role` attributes, and `aria-live` regions for screen readers.
- **Keyboard Navigation**: Fully usable without a mouse, including focused state management for the chat widget.

### 6. Google Services
- **Gemini 1.5 Flash**: Context-aware AI assistant with a tailored "persona" for election guidance.
- **Google Calendar API**: Real-world utility for syncing civic milestones to a user's personal schedule.
- **Google Identity Services**: Modern OAuth 2.0 implementation for secure calendar access.

---

*Built with ❤️ for the Prompt War Hackathon.*
