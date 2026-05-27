# Munchies & Shakes - React Frontend

This repository contains the frontend client for the **Munchies & Shakes** application, built with React, Vite, and Tailwind CSS. It handles the customer-facing user interface (including interactive 3D elements) as well as the newly added **Real-Time Admin Dashboard** for order and menu management.

## 🌟 Project Stage: Core Features & Admin Integration
The customer-facing application handles menu browsing, 3D visualizations, and ordering. The system has recently been expanded to include a dedicated `/admin` route, providing a real-time Kanban-style view for tracking orders and a control panel for managing menu item availability.

---

## 🛠️ Technology Stack

*   **Framework:** React
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **3D Rendering:** Three.js, React Three Fiber, React Three Drei
*   **Animations:** Framer Motion
*   **State Management:** React Hooks (`useState`, `useEffect`)
*   **Data Fetching:** Browser `fetch` API

---

## 🚀 Getting Started

Follow these instructions to get the frontend running locally for development.

### Prerequisites

*   Node.js (v18.x or later)
*   `npm` or `yarn`

### Installation

1.  **Clone the repository and navigate to the frontend directory:**
    ```bash
    cd munchies-and-shakes
    ```

2.  **Install project dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env.local` file in the root of this directory. This file will tell the React app where to find the Django backend API.

    ```env
    # URL for the Django backend API
    VITE_API_BASE_URL=http://127.0.0.1:8000/api
    ```

### Available Scripts

In the project directory, you can run:

*   `npm run dev`: Starts the development server, usually on `http://localhost:5173`.
*   `npm run build`: Bundles the app for production into the `dist` folder.
*   `npm run preview`: Serves the production build locally to preview it.

---

## 📁 Key Components

*   **`src/App.jsx`** / **`src/main.jsx`**: Main application entry points that likely handle routing for both the public-facing pages and the restricted admin section.
*   **`src/pages/AdminDashboard.jsx`**: The main component for the entire admin interface. It handles all state, data fetching, and rendering for the Kanban board and menu control panel.
*   **3D Components**: Integrated throughout the customer-facing views using `@react-three/fiber` for premium branding elements.
# munchies-and-shakes