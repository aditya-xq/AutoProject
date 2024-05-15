# 🚀 AutoProject

Your BYOK tool to automate project management with AI powered workflows.

## 🌟 Features
- **Generative PRD Creation**: Feed your basic requirements, and get a detailed PRD tailored for your workflow.
- **AI-Powered Task Generation**: Let the AI convert your PRD into a smart, structured userstories based on your desired format.
- **Tool Integration**: Push the generated userstories into a brand new project to your preferred PM tool with a single click!

## 🛠️ Tech Stack
### **Backend**
- **Sveltekit**: With Sveltekit api routes to handle HTTP requests.
- **Gemini Pro, Groq, or LM Studio**: Configurable as per preference, for that sweet, sweet AI magic.
- **Linear SDK**: To connect with Linear API.

### **Frontend**
- **SvelteKit**: With Svelte 5 For a swift, smooth, and modern frontend experience.
- **Tailwind CSS**: Because good looks matter.

## 🚀 Getting Started
### Prerequisites
- **Bun**: Make sure you have the latest version of Bun installed.
- **Linear Account**: Create an account on [Linear](https://linear.app/) and generate your API key.
- **Gemini API Key**: Get the API key from [https://ai.google.dev/](https://ai.google.dev/).
- **Groq API Key**: Get the API key from [https://console.groq.com/keys](https://console.groq.com/keys).
- In case you want to run local inference with LM Studio, the server must be kept running in the default port.

### Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/aditya-xq/AutoProject.git
    ```
2. Navigate into the directory:
    ```bash
    cd AutoProject
    ```
3. Install dependencies using Bun:
    ```bash
    cd autoproject
    bun install
    ```
4. Create a `.env` file inside the autoproject folder and add your API keys:
    ```plaintext
    VITE_GEMINI_API_KEY=<Your-Gemini-API-Key>
    VITE_LINEAR_API_KEY=<Your-Linear-API-Key>
    VITE_GROQ_API_KEY=<Your-Groq-API-Key>
    ```

### Running the Project
Start the SvelteKit Webapp:
    ```bash
    cd autoproject
    bun --bun run dev
    ```
3. Visit `http://localhost:5173` and let the magic unfold!

## 📜 Usage Guide
1. **Generate PRD**: Describe your requirements and click the **Generate PRD** button.
2. **Generate Userstories**: Review the PRD and click **Generate Userstories**.
3. **Push to PM Tool**: Click **Auto-Create** to push the stories into a brand new project to your preferred PM tool.
4. Configure the PRD and userstory formats and the AI inference type on settings tab before getting started.

## 🙌 Contributing
Feel free to fork, clone, and submit a PR! Suggestions, bug reports, and feature requests are always welcome.

## 📄 License
This project is licensed under the [MIT License](LICENSE).

---
