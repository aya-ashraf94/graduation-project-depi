# Market.Arch (Nafa3ni) — Full-Stack Monorepo

Welcome to the **Market.Arch (Nafa3ni)** graduation project repository. This repository has been structured as a full-stack monorepo containing both the Frontend (Angular) and the Backend (Express & MongoDB) systems.

---

## 📂 Project Structure

```text
graduation-project-depi/
├── Frontend/          # Angular 21 application
│   ├── src/           # Angular source code
│   ├── package.json   # Frontend dependencies and scripts
│   └── README.md      # Detailed Frontend documentation
│
├── Backend/           # Express.js REST API
│   ├── controllers/   # Request handlers
│   ├── models/        # MongoDB Mongoose schemas
│   ├── routes/        # Express routers
│   ├── server.js      # Main Express application entrypoint
│   ├── package.json   # Backend dependencies and scripts
│   └── README.md      # Detailed Backend documentation
│
├── package.json       # Monorepo configuration and scripts
└── README.md          # Project overview and root configuration (this file)
```

---

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have the following installed on your local environment:
- **Node.js** (v18.x or higher recommended)
- **MongoDB** (local installation or MongoDB Atlas URI)
- **Angular CLI** (v17.x or higher)

---

### 2. Installation

You can install all dependencies for both the frontend and backend concurrently from the root directory using the root-level scripts:

```bash
# Install dependencies for both Frontend and Backend
npm run install-all
```

Alternatively, you can install them individually:
```bash
# Frontend
cd Frontend && npm install

# Backend
cd ../Backend && npm install
```

---

### 3. Local Development

To run the application, configure your environments:

#### Backend Environment Setup:
Create a `.env` file inside the `Backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nafa3ni
JWT_SECRET=your_jwt_secret_key_here
```

#### Run both Frontend & Backend concurrently:
From the root directory, run:
```bash
npm run dev
```
This will start:
- The **Backend API** at `http://localhost:5000` (using `nodemon`)
- The **Frontend App** at `http://localhost:4200` (using Angular dev server)

---

## 🧪 Service Architecture

### 🏛️ Frontend (Angular)
Implements a bold **Neo-Brutalist** Architectural Design System with strict brand visuals, universal modern dialogs, multi-state authorization, split hero dashboard, active search engine, and P2P communication simulation hub.

For more details, see the [Frontend README](file:///d:/AngPath/GIGS/FinalProject/Frontend/README.md).

### ⚙️ Backend (Node.js & Express)
A robust Node.js backend using Express, MongoDB, and JWT authentication. It manages:
- **Authentication**: JWT token issuance, password hashing (bcrypt), and authentication middleware.
- **Product Listings**: CRUD endpoints for listings.
- **Chat/Messages**: P2P communication services.

For more details, see the [Backend README](file:///d:/AngPath/GIGS/FinalProject/Backend/README.md).
