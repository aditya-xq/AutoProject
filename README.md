# 🚀 AutoProject

**AutoProject** is a simple application blending AI-generated tasks with streamlined productivity. This project seamlessly integrates LLMs and Linear to empower your team with automatically created Project Requirements Documents (PRDs) and task lists, eliminating manual drudgery. Enjoy the super-efficient workflow as your AI-generated task list converts directly into issues on Linear, freeing up your creativity for the big stuff!

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
- **SvelteKit**: For a swift, smooth, and modern frontend experience.
- **Tailwind CSS**: Because good looks matter.

## 🚀 Getting Started
### Prerequisites
- **Node.js**: Make sure you have the latest version of Node installed.
- **Linear Account**: Create an account on [Linear](https://linear.app/) and generate your API key.
- **Gemini API Key**: Apply for API access.

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
    bun install
    cd auto-project-ui
    bun install
    ```
4. Create a `.env` file and add your API keys:
    ```plaintext
    GEMINI_API_KEY=<Your-Gemini-API-Key>
    LINEAR_API_KEY=<Your-Linear-API-Key>
    ```

### Running the Project
1. Start the server:
    ```bash
    bun server.ts
    ```
2. Start the SvelteKit frontend:
    ```bash
    cd auto-project-ui
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

### Ready to let the AI take over some of your mundane planning? Join us in this workflow revolution!
