# 🛒 Market.Arch (Nafa3ni) — Full-Stack Marketplace Platform

> **A modern, peer-to-peer marketplace and e-commerce ecosystem built with Angular 21, Node.js/Express, PostgreSQL, Drizzle ORM, and Socket.io, presented in a bold Neo-Brutalist design system.**

---

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon_DB-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle--ORM-v0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Socket.io-v4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/GSAP-v3.15-88CE02?style=for-the-badge&logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/JWT-Protected-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Design-Neo--Brutalist-yellow?style=for-the-badge" alt="Neo-Brutalist" />
</p>

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client [Angular 21 Frontend Client]
        UI[Neo-Brutalist UI Components]
        GSAP[GSAP Splash & Motion Engine]
        Signals[Angular Signals Reactive State]
        HTTP[HTTP Interceptor & Auth Guard]
        SocketClient[Socket.io Real-Time Client]
        
        UI --> Signals
        GSAP --> UI
        Signals --> HTTP
        Signals <--> SocketClient
    end

    subgraph Server [Node.js & Express API Gateway]
        ServerCore[server.js & HTTP Server]
        SocketServer[Socket.io Real-Time Hub]
        AuthGate[JWT Auth & Refresh Interceptor]
        Routers[REST Routers: 22 Endpoint Modules]
        Controllers[Business Logic Controllers]
        
        ServerCore --> Routers
        ServerCore <--> SocketServer
        Routers -.->|Protected Routes| AuthGate
        AuthGate --> Controllers
        Routers --> Controllers
    end

    subgraph Persistence [Neon PostgreSQL Database]
        Drizzle[Drizzle ORM Relational Schema]
        Tables[(22+ Relational Tables: Users, Products, Categories, Orders, Offers, Flash Sales, Coupons, Reviews, Chat, Notifications, Reports, Tiers)]
        Drizzle <--> Tables
    end

    HTTP -->|JWT Bearer REST Requests| Routers
    Controllers <--> Drizzle
    SocketClient <-->|Live Events / Chat / Alerts| SocketServer
```

---

## 🌟 Key Platform Features

### 🎨 1. Neo-Brutalist Aesthetics & Motion Experience
* **Signature Visual System**: Bold high-contrast dark borders (`3px solid var(--black)`), hard offset drop shadows (`4px 4px 0 var(--black)`), vibrant accents, and clean editorial typography (Outfit & Inter).
* **GSAP Splash Intro**: High-end brand entrance animation for initial website loading and page refreshes.
* **Micro-Interactions**: Hover lifts, tactile click feedback, animated badges, custom interactive cursor, and fluid responsive layouts.

### 🔒 2. Authentication, Security & Role-Based Access
* **JWT Access & Refresh Token Flow**: Dual-token authorization model with automatic HTTP token refresh interceptor.
* **Role Guards**: Strict client-side and server-side route guards separating standard users, sellers, and administrators (`authGuard`, `adminGuard`).
* **Password Recovery Flow**: Token-based password reset verification system with expiration timeouts.
* **API Hardening**: `helmet`, `express-rate-limit`, and parameterized SQL queries preventing SQL injections.

### 🛍️ 3. Advanced P2P Marketplace & Catalog
* **Dynamic Attributes Engine**: Category-specific attribute schemas (e.g. storage, condition, brand, color) with custom facet filtering.
* **Interactive Offer & Price Negotiation**: Direct buyer-seller offer engine allowing buyers to propose prices, and sellers to accept, reject, or counter-offer.
* **Product Comparison Matrix**: Floating comparison tray with side-by-side spec comparison and **instant PDF export** (`jspdf`, `html2canvas`).
* **Multi-Image Showcase**: High-resolution image galleries with fallback previews and verification badges.

### ⚡ 4. Real-Time Interactions (Socket.io)
* **Live Direct Chat**: Instant peer-to-peer messaging threads linked directly to listing items with unread indicators.
* **Real-Time Flash Sales**: Live administrative flash sale broadcasts with synchronized countdown banners and system push notifications.
* **Event Notifications**: Instant real-time alerts for incoming orders, status transitions, review submissions, and offer updates with deep-link navigation.

### 🎁 5. Gamification & Discount Management
* **Lucky Cat Companion**: Interactive gamified mascot that reveals promotional coupons and rewards for active shoppers.
* **Scratch Card Experience**: Interactive canvas scratch card for unlocking exclusive store discounts.
* **Coupon Engine**: Flexible fixed and percentage coupon codes (`LUCKY20`, `SCRATCH50`, `SAVE10`) with per-user limits, usage counters, and expiration checks.

### 💳 6. Commerce, Wallet & Tiered Fees
* **Multi-Method Checkout**: Support for Cash on Delivery, Wallet balance, and integrated **Stripe** payment processing.
* **Seller Wallet & Earnings**: Transparent breakdown of gross sales, platform fees, pending balances, and automated payout requests.
* **Tiered Fee Structure**: Dynamic commission management supporting Free, Pro, and Enterprise membership tiers.

### 📊 7. Admin Command Center
* **Executive Metrics Dashboard**: Real-time sales volume, revenue breakdowns, active users, and system transaction trends.
* **Dynamic Category Builder**: Create and edit categories and custom attribute schemas on the fly.
* **Promotion & Flash Sale Hub**: Schedule and launch platform-wide discount campaigns and manage featured listings.
* **Moderation & Reports**: Review and resolve user disputes, reported products, and content moderation queues.

---

## 📂 Project Structure

```text
graduation-project-depi/
├── 📁 Frontend/                     # Angular 21 Single Page Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/               # Guards, Interceptors, Models, Services
│   │   │   ├── features/           # Admin, Auth, Chat, Earnings, Home, Product,
│   │   │   │                       # Profile, Scratch-Card, Search, Support, Wallet
│   │   │   └── shared/             # Loading-Screen, Navbar, Footer, Lucky-Cat,
│   │   │                           # Compare-Bar, Flash-Sale-Banner, Toast, Confirm
│   │   └── index.html
│   ├── package.json
│   └── README.md                   # Detailed Frontend documentation
│
├── 📁 Backend/                      # Node.js & Express REST API Server
│   ├── config/                     # Database connection pool & Cloudinary config
│   ├── controllers/                # 20+ Business logic controllers
│   ├── data/                       # Initial JSON seed datasets & backups
│   ├── db/                         # Drizzle schema definitions & relations
│   ├── drizzle/                    # Generated SQL migration history
│   ├── middleware/                 # JWT Auth, Admin, and Upload middleware
│   ├── routes/                     # 22 Modular Express routers
│   ├── scripts/                    # Database seeders, migrations & export utilities
│   ├── server.js                   # Express app initialization & Socket.io server
│   ├── package.json
│   └── README.md                   # Detailed Backend documentation
│
├── 📁 docs/                         # Architecture reviews & system documentation
├── 📄 package.json                  # Root monorepo dev orchestrator
├── 📄 package-lock.json
├── 📄 .gitignore
└── 📄 README.md                     # Monorepo documentation (this file)
```

---

## 🛠️ Quickstart & Local Setup

### 1. Prerequisites
* **Node.js** (v18.x or higher)
* **PostgreSQL** (Local database or [Neon](https://neon.tech/) connection string)
* **npm** (v9.x or higher)

### 2. Installation
Clone the repository and install all dependencies in one command:
```bash
# Clone the repository
git clone https://github.com/aya-ashraf94/graduation-project-depi.git
cd graduation-project-depi

# Install root, frontend, and backend dependencies
npm run install-all
```

### 3. Backend Configuration
Create a `.env` file inside the `Backend/` directory:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/nafa3ni_db?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
FRONTEND_URL=http://localhost:4200
```

### 4. Database Setup & Seeding
Initialize the database schema and populate it with sample listings and categories:
```bash
# Generate and push Drizzle schema to PostgreSQL
npm run db:migrate --prefix Backend

# Seed default categories, demo users, coupons, and sample listings
npm run db:seed

# (Optional) Populate official 32-product store catalog
npm run db:official
```

### 5. Launch the Application
Start both the Frontend client and Backend API concurrently:
```bash
npm run dev
```

* **Frontend Client**: [http://localhost:4200](http://localhost:4200)
* **Backend REST API**: [http://localhost:3000/api](http://localhost:3000/api)
* **Default Admin Account**: `admin@nafa3ni.com` / `admin123456`
* **Default Demo User**: `user@nafa3ni.com` / `123456`

---

## 🧰 Available Monorepo Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Frontend (`:4200`) and Backend (`:3000`) concurrently. |
| `npm run install-all` | Installs dependencies across both Frontend and Backend workspaces. |
| `npm run start-frontend` | Starts only the Angular development server. |
| `npm run start-backend` | Starts only the Express Node.js server with nodemon. |
| `npm run db:seed` | Safely seeds standard categories, products, and users to the database. |
| `npm run db:export` | Backs up current database records to `Backend/data/*.json`. |
| `npm run db:official` | Generates official store inventory and exports dataset templates. |

---

## 🧪 Tech Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Angular 21, TypeScript 5.9, RxJS, GSAP Animation, HTML5 Canvas, jsPDF |
| **Styling** | Vanilla Neo-Brutalist CSS System, Responsive Flex/Grid Layouts, Google Fonts (Outfit, Inter) |
| **Backend** | Node.js, Express 5, Socket.io 4.8, Bcrypt.js, JSON Web Tokens (JWT), Helmet |
| **Database & ORM** | PostgreSQL (Neon Cloud / Local), Drizzle ORM, Drizzle Kit |
| **Payments** | Stripe API, Integrated Wallet Ledger |
| **Dev Tools** | Concurrently, Nodemon, Git |

---

## 📄 License & Attribution
Developed as a graduation project by the team under the **DEPI** program. Open source under the [ISC License](LICENSE).
