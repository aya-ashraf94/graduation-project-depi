# 🛒 Market.Arch (Nafa3ni) — Full-Stack Monorepo

> A premium, full-stack campus peer-to-peer trading hub built on **Angular 21** and **Node.js/Express**, featuring a bold, high-fidelity **Neo-Brutalist** design system.

---

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-v15+-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle--ORM-v0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/JWT-Protected-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Design-Neo--Brutalist-yellow?style=for-the-badge" alt="Neo-Brutalist" />
</p>

## 🏛️ System Architecture

The following diagram illustrates how the **Angular 21** frontend communicates with the **Node.js & Express** API endpoints, which are validated by **JWT authentication guards** and mapped to **PostgreSQL** relational tables via **Drizzle ORM**.

```mermaid
flowchart TD
    subgraph Frontend [Angular Client]
        Pages[Angular Components & Pages]
        Services[Angular Services]
        Guards[Route Guards]
        Interceptors[HTTP Interceptors]
        Pages --> Services
        Pages --> Guards
        Services --> Interceptors
    end

    subgraph Backend [Express API Server]
        Server[server.js Engine]
        AuthMiddleware[authMiddleware.js JWT Gate]
        Routes[API Routers: Auth, Products, Conversations, Orders, Reviews, Reports, Support, Admin, Wishlist, Notification]
        Controllers[API Controllers: Auth, Products, Conversations, Orders, Reviews, Admin, Wishlist, Notification]

        Server --> Routes
        Routes -.->|Requires Auth| AuthMiddleware
        AuthMiddleware --> Controllers
        Routes --> Controllers
    end

    subgraph Database [Neon PostgreSQL]
        DBModels[(Drizzle Schema Tables: users, products, orders, reviews, conversations, messages, notifications, reports, wishlist)]
    end

    Interceptors -->|HTTP Requests with JWT| Server
    Controllers <--> DBModels
```

---

## 📂 Monorepo Directory Layout

```text
graduation-project-depi/
├── Frontend/               # Angular 21 Single Page Application
│   ├── src/                # Component architecture, styles, assets
│   ├── package.json        # Frontend specific scripts & node modules
│   └── README.md           # [Detailed Frontend documentation]
│
├── Backend/                # Express.js REST API Server
│   ├── config/             # Connection settings (PostgreSQL pool, Cloudinary)
│   ├── controllers/        # Request handlers & logic (Auth, Product, Chat, Order, Review, Admin, Wishlist, Notification)
│   ├── db/                 # Drizzle Database initialization & relational schema (schema.js)
│   ├── middleware/         # Security & JWT validators
│   ├── routes/             # Express routes defining API endpoints (10 routers)
│   ├── server.js           # Server application startup & middleware setup
│   ├── package.json        # Backend specific scripts & node modules
│   └── README.md           # [Detailed Backend documentation]
│
├── package.json            # Monorepo command runner definitions
└── README.md               # Monorepo main overview (this file)
```

---

## ✨ Design Concept: Neo-Brutalist Aesthetics

Our frontend uses a curated **Neo-Brutalist Architectural Design System**:
* **High Contrast Borders**: Hard-coded thick dark outlines (`3px solid var(--black)`).
* **Flat Offset Drop Shadows**: Solid geometric shadows (`box-shadow: 4px 4px 0 var(--black)`) on cards, inputs, and buttons.
* **Vibrant Typography**: Modern, crisp editorial text layout leveraging Outfit and Inter fonts.
* **Active Status Feedback**: Highly interactive hover micro-animations and status badges to guide student navigation.

---

## 🛠️ Installation & Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher)
* **PostgreSQL** (Local instance or remote Neon PostgreSQL Connection URL)

### 2. Workspace Setup
Clone the repository and install dependencies for both components simultaneously from the root directory:
```bash
# Clone the repository
git clone https://github.com/aya-ashraf94/graduation-project-depi.git
cd graduation-project-depi

# Run automated dependency install script for both Frontend & Backend
npm run install-all
```

### 3. Backend Environment Setup
Create a `.env` file in the `Backend/` directory:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/storeDB
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Running the Complete App
Launch both the **Frontend** development server and the **Backend** API concurrently with a single command from the root directory:
```bash
npm run dev
```

* **Frontend**: Accessible at [http://localhost:4200](http://localhost:4200) (Angular Dev Server)
* **Backend API**: Accessible at [http://localhost:3000](http://localhost:3000) (Express Server)

### 5. Database Synchronization (Seeding)
To keep the database data (especially categories, products, and default users) in sync across all team members' devices without cloud services:
* **Workflow Best Practice**:
  - **Do NOT** run `npm run db:export` during regular development. This prevents overwriting the clean test templates in `Backend/data/` with your local testing history.
  - Keep your local orders, test accounts, and reviews stored locally in your database instance, and only commit code to GitHub.
* **To Export Data (Optional/Shared Defaults Update)**: If you have created new default categories, users, or products that the whole team needs as a starting template, run:
  ```bash
  npm run db:export
  ```
  This exports your database tables into JSON backup files under `Backend/data/`. Commit and push these updated JSON files to GitHub.
* **To Seed/Import Data (After pulling changes)**: When other team members pull the latest commits from GitHub, they can sync their local PostgreSQL database with the shared state by running:
  ```bash
  npm run db:seed
  ```
  > [!NOTE]
  > Running `db:seed` is now non-destructive! It uses a safe SQL bulk-upsert process that inserts or updates standard categories, users, and products by their primary keys without affecting other custom local data.
* **To Generate Official Store Data**: To generate the official Nafa3ni Store admin user and populate the database with 32 premium/official campus listings across all categories, run:
  ```bash
  npm run db:official
  ```
  This script creates the official listings with detailed dynamic attributes and high-quality stock images, and automatically exports them into the shared data templates.

---

## 🔔 Wishlist & Real-Time Notification Engines

Market.Arch features fully integrated, database-backed subsystems for wishlists and in-app notifications to drive campus engagement:

### 1. Persistent Wishlists
* **PostgreSQL Relational DB Storage**: Wishlist records are stored in a relational junction table (`wishlist` table) connecting users and products. Toggling items syncs to `/api/wishlist/toggle` instantly.
* **Optimistic UI Rendering**: The Angular client updates state indicators reactively using `signal()` patterns, ensuring instantaneous toggle transitions while syncing with the server in the background.

### 2. Event-Driven Notifications
* **Automated Dispatch**: System triggers generate tailored notification entries inside PostgreSQL when specific events occur:
  - **New Orders**: Informs the seller with direct navigation link to their "My Sales" tab.
  - **Order Shipping/Delivery/Cancellations**: Automatically coordinates between counterparties to update order steps.
  - **Reviews**: Notifies sellers when they receive a rating and review comments.
  - **Chat Messages**: Sends in-app prompts when someone receives new direct messages.
* **Smart Navigation Routing**: Clicking a notification reads its `linkedRoute` property and uses `router.navigateByUrl()` to transition the user directly to the target tab (and automatically scrolls to the sub-view section, such as **My Sales** or **My Purchases**).

---

## 🤝 Collaborative Setup (GitHub Workflow)

To contribute to this codebase smoothly:
1. Always pull the latest version of the default branch: `git pull origin main`
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes and push to origin: `git push origin feature/your-feature-name`
4. Open a Pull Request for peer code and design system validation review.

---

## 🔗 Sub-Component Documentation
* 💻 [Angular Frontend Documentation](./Frontend/README.md)
* ⚙️ [Express Backend Documentation](./Backend/README.md)
