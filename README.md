
# MPM Fracture Visualizer

This project is a React application built with Vite.

## How to Build and Deploy

Since this project uses TypeScript and React (JSX), it must be "built" before it can run on a standard web host like GitHub Pages.

### Prerequisites

*   **Node.js**: Must have Node.js installed on computer. [Download here](https://nodejs.org/).

### 1. Setup

1.  Download all the provided files (`package.json`, `vite.config.ts`, `index.html`, `App.tsx`, etc.) into a folder.
2.  Open terminal/command prompt.
3.  Navigate to the folder:
    ```
    cd path/to/folder
    ```
4.  Install dependencies:
    ```
    npm install
    ```

### 2. Local Development (Optional)

To run the app on computer to test it:
```
npm run dev
```
Open the URL shown (usually `http://localhost:5173`) in browser.

### 3. Build for Production

To create the files for deployment:
```bash
npm run build
```
This will create a new folder named **`dist`** in project directory. This folder contains the optimization HTML, CSS, and JavaScript files.

### 4. Manual Deployment to GitHub Pages

1.  Create a new repository
2.  **Crucial Step**: Only need to upload the **contents** of the `dist` folder, not the source code (unless you want to store the source code there too).
    *   *Option A (Source + Site)*: Commit the whole project. Push to GitHub. Go to Settings > Pages. Select "GitHub Actions" or configure it to serve from a `/docs` (`/dist` rename or copy to `/docs`).
    *   *Option B (Manual Drag & Drop)*:
        1. Open repo on GitHub.com.
        2. Click "Add file" > "Upload files".
        3. Drag **all files inside the `dist` folder** (index.html, assets folder, etc.) into the browser window.
        4. Commit changes.
        5. Go to **Settings > Pages**.
        6. Under "Build and deployment", select **Deploy from a branch**.
        7. Select **main** (or master) branch and root folder **/**.
        8. Click Save.

site will be live at `https://<myUsername>.github.io/<repo-name>/`.
