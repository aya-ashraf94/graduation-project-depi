# 💻 Frontend Client — Market.Arch (Nafa3ni)

> **Modern Single Page Application built on Angular 21 with a bold Neo-Brutalist design system, GSAP animations, Signals state management, and real-time Socket.io integration.**

---

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/GSAP-v3.15-88CE02?style=for-the-badge&logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/Socket.io_Client-v4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Design-Neo--Brutalist-yellow?style=for-the-badge" alt="Neo-Brutalist" />
</p>

---

## ✨ Features & Architecture

### 🎨 1. Neo-Brutalist Design & Motion Engine
* **Aesthetic Standard**: Heavy high-contrast borders (`3px solid var(--black)`), hard offset geometric drop shadows (`4px 4px 0 var(--black)`), and curated typography (Outfit & Inter).
* **GSAP Splash Loader**: High-fidelity brand entrance animation on initial visit and browser refresh.
* **Micro-Animations**: Tactile button presses, hover lifts, dynamic status badges, and custom branded cursor.

### 🧩 2. Core Feature Modules (`src/app/features/`)
* **`auth/`**: Multi-step registration, login with automatic JWT refresh interceptor, and token-based password reset flows.
* **`home/`**: Interactive hero sections, category navigation cards, live flash sale countdowns, and featured listings.
* **`product/`**: Marketplace catalog, faceted filtering by dynamic category attributes, product detail views with multi-image gallery, and interactive **Make Offer** negotiation.
* **`admin/`**: Executive command center with real-time metrics, revenue graphs, category & dynamic attribute schema editor, flash sale creator, coupon manager, and report dispute resolution.
* **`chat/`**: Live peer-to-peer messaging threads powered by Socket.io client.
* **`profile/` & `wallet/`**: User account settings, order history (My Sales & My Purchases), earnings balance, and withdrawal requests.
* **`scratch-card/`**: Gamified canvas scratch-off mini-game to unlock exclusive promo coupons.

### 🌟 3. Global Interactive Components (`src/app/shared/components/`)
* **`compare-bar`**: Floating multi-item comparison tray with side-by-side spec comparisons and **direct PDF export** via `jspdf` and `html2canvas`.
* **`lucky-cat`**: Interactive floating gamified mascot that dispenses promotional coupons.
* **`flash-sale-banner`**: Real-time broadcast banner displaying active flash sales and synchronized countdown timers.
* **`toast` & `confirm`**: Global reactive notification banners and confirmation modal dialogs.

---

## 🛠️ Local Development

### 1. Prerequisites
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)

### 2. Installation & Run
```bash
# Navigate to the Frontend directory
cd Frontend

# Install dependencies
npm install

# Start the Angular development server
npm start
```

Navigate to [http://localhost:4200](http://localhost:4200) to view the application.

---

## 🏗️ Directory Topology

```text
Frontend/src/app/
├── core/
│   ├── guards/         # Route navigation guards (authGuard, adminGuard)
│   ├── interceptors/   # Auth interceptor with automatic JWT refresh flow
│   ├── models/         # TypeScript interfaces & domain models
│   └── services/       # Centralized HTTP & state services (Signals-based)
├── features/
│   ├── admin/          # Admin management dashboards, categories & coupons
│   ├── auth/           # Login, Register, Forgot & Reset Password
│   ├── chat/           # Real-time WebSocket messaging UI
│   ├── earnings/       # Seller revenue & payout summaries
│   ├── home/           # Main portal & discovery feeds
│   ├── product/        # Catalog, product details, dynamic listing forms
│   ├── profile/        # User profile, sales, and purchase management
│   ├── scratch-card/   # Interactive gamification scratch game
│   ├── search/         # Search results & filtering
│   ├── support/        # Help center, FAQs, guidelines & legal terms
│   └── wallet/         # Balance ledger & payout request modal
└── shared/
    ├── components/     # Loading-screen, compare-bar, lucky-cat, flash-sale-banner, navbar, footer, toast
    ├── directives/     # Dynamic image fallbacks
    └── pipes/          # Currency formatters & humanized time-ago pipes
```
