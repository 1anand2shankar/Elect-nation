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
2. Open `index.html` in any modern browser.
3. No build step required for this Vanilla implementation!

---

*Built with ❤️ for Civic Engagement.*
