# 🚀 AutoProject

Your ultimate BYOK tool to automate product and project management with AI-powered workflows.

## 🌟 Key Features
- **Generative PRD Creation**: Feed your requirements and receive a tailor-made PRD that aligns perfectly with your workflow.
- **AI-Powered User Story Generation**: The AI effortlessly transforms your PRD into smart, structured user stories in your configured format.
- **Tool Integration**: Push the generated user stories as a new project straight to your chosen tool (Linear/Asana/Jira/Plane) with one click.

## 🛠️ Tech Stack
### **Backend**
- **SvelteKit**: With Sveltekit API routes to handle HTTP requests.
- **Gemini, Groq, or LM Studio**: Configurable as per preference for that sweet, sweet AI magic.
- **Linear SDK**: To connect with Linear API.

### **Frontend**
- **SvelteKit**: With Svelte 5 For a swift, smooth, and modern frontend experience.
- **Tailwind CSS v4**: Because good looks matter.

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
    SECRET_GEMINI_API_KEY=<Your-Gemini-API-Key>
    SECRET_LINEAR_API_KEY=<Your-Linear-API-Key>
    SECRET_GROQ_API_KEY=<Your-Groq-API-Key>
    ```

### Running the Project
1. Start the optimized SvelteKit web app:
    ```bash
    cd autoproject
    bun run build
    bun run preview
    ```
2. Visit `http://localhost:4173` and let the magic unfold!

## 📜 Usage Guide
1. **Generate PRD**: Describe your requirements and click the **Generate PRD** button.
2. **Generate users stories**: Review the PRD and click **Generate user stories**.
3. **Push to PM Tool**: Push the stories into a brand new project to your preferred PM tool.
4. Configure the PRD and user story formats and the AI inference type on the settings tab before getting started.

## 🙌 Contributing
Feel free to fork, clone, and submit a PR! Suggestions, bug reports, and feature requests are always welcome.

## 💬 Feedback
Help make AutoProject even better! Share your thoughts and suggestions on Twitter [@xq_is_here](https://twitter.com/xq_is_here)

## 📄 License
This project is licensed under the [MIT License](LICENSE).
