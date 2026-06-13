# SplitEase Tech Stack

SplitEase is a modern, high-performance full-stack web application built with the latest technologies. Below is a comprehensive breakdown of the entire technology stack powering the application.

---

## 🎨 Frontend Stack

The frontend is a highly interactive Single Page Application (SPA) focused on smooth animations and a premium user experience.

### Core Architecture
- **React (v19)**: The core UI library used for building interactive components.
- **TypeScript**: Provides strict static typing for enhanced developer experience and fewer runtime errors.
- **Vite (v8)**: An ultra-fast, next-generation build tool and development server that replaces older tools like Webpack.

### Styling & UI
- **Tailwind CSS (v4)**: The latest version of the utility-first CSS framework. We use the brand new `@tailwindcss/vite` plugin for lightning-fast compilation and zero-config styling.
- **Framer Motion**: The industry-standard animation library for React. Powers all the complex layout transitions, modal pop-ups, and interactive micro-animations (like the hovering avatars and expanding cards).
- **Lucide React**: A beautiful, clean open-source icon library.
- **Lenis**: A lightweight smooth-scrolling library that gives the entire homepage a premium, buttery-smooth scrolling physics effect.

### Data Processing & Integration
- **PapaParse**: Used for lightning-fast, client-side parsing of CSV files (used in the "Import Expenses" feature).
- **Firebase**: Originally integrated for authentication scaffolding, though the current application logic uses a sophisticated custom mock-backend flow for rapid local development.

---

## ⚙️ Backend Stack

The backend is a robust API server designed to handle user data, complex group splitting logic, and secure authentication.

### Core Architecture
- **Node.js**: The Javascript runtime environment.
- **Express**: A fast, unopinionated web framework for Node.js used to build the REST API endpoints.
- **TypeScript**: Used on the backend to share types with the frontend and ensure data integrity across the network boundary.

### Database Layer
- **PostgreSQL (`pg` driver)**: The primary, production-grade relational database currently powering the backend. It enforces strict data integrity (like Foreign Keys) to ensure expense records are never orphaned.
- **SQLite (`sqlite3` driver)**: The legacy database originally used for local prototyping before the migration to Postgres.

### Security & Utilities
- **JSON Web Token (`jsonwebtoken`)**: Used for creating and verifying secure, stateless authentication tokens.
- **JWKS-RSA**: Used for retrieving RSA signing keys to verify JWTs securely.
- **CORS**: Middleware used to allow the frontend to securely make API requests to the backend server.
- **Dotenv**: Manages sensitive environment variables (like the `DATABASE_URL` connection string).
