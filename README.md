# 🚀 AutoProject

Your DIY tool to automate project management with AI powered workflows.

## 🌟 Features
- **Generative PRD Creation**: Feed your project requirements to Google Gemini AI, and get a detailed PRD tailored for your workflow.
- **AI-Powered Task Generation**: Let the AI convert your PRD into a smart, structured task array.
- **Linear Integration**: Push the generated task array directly to Linear as issues with a single click!

## 🛠️ Tech Stack
### **Backend**
- **Node.js**: With Express to handle HTTP requests.
- **Gemini AI**: For that sweet, sweet AI magic.
- **Linear SDK**: To connect with Linear API.

### **Frontend**
- **SvelteKit**: With Svelte 5 For a swift, smooth, and modern frontend experience.
- **Tailwind CSS**: Because good looks matter.

## 🚀 Getting Started
### Prerequisites
- **Node.js**: Make sure you have the latest version of Node installed.
- **Linear Account**: Create an account on [Linear](https://linear.app/) and generate your API key.
- **Gemini API Key**: Get the API key from [https://ai.google.dev/](https://ai.google.dev/).

### Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/aditya-xq/AutoProject.git
    ```
2. Navigate into the directory:
    ```bash
    cd AutoProject
    ```
3. Install dependencies using Bun for both frontend and backend:
    ```bash
    cd frontend
    bun install
    cd ..
    cd backend
    bun install
    ```
4. Create a `.env` file inside the backend folder and add your API keys:
    ```plaintext
    GEMINI_API_KEY=<Your-Gemini-API-Key>
    LINEAR_API_KEY=<Your-Linear-API-Key>
    ```

### Running the Project
1. Start the backend server:
    ```bash
    cd backend
    bun server.ts
    ```
2. Start the SvelteKit frontend:
    ```bash
    cd frontend
    bun --bun run dev
    ```
3. Visit `http://localhost:5173` and let the magic unfold!

## 📜 Usage Guide
1. **Generate PRD**: Describe your requirements and click the **Generate PRD** button.
2. **Generate Tasks**: Review the PRD and click **Generate Tasks**.
3. **Push to Linear**: Finalize the task array and click **Auto-Create Issues** to sync with Linear.

## 🙌 Contributing
Feel free to fork, clone, and submit a PR! Suggestions, bug reports, and feature requests are always welcome.

## 📄 License
This project is licensed under the [MIT License](LICENSE).

---
