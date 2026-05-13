# Market.Arch (Nafa3ni) — Student Marketplace Platform
> Built on **Angular 21** featuring high-fidelity **Neo-Brutalist** Architectural System Design.

![Angular](https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production_Ready-10B981?style=for-the-badge)

A premium, highly secure campus peer-to-peer trading hub enabling verified students to safely buy, sell, and trade used academic equipment, electronics, furniture, and literature. Designed from the ground up to prepare for a production microservices backend integration.

---

## ✨ Features Implemented

### 🏛️ Premium Architectural Design System
- **Strict Brand Visuals**: Implements consistent bold borders (`3px solid var(--black)`), high-visibility hard offset drop shadows (`box-shadow: 4px 4px 0 var(--black)`), and customized editorial web typography.
- **Universal Modern Dialogs**: Elegant, high-conversion, accessible pop-up frameworks utilizing native background-blur tinted overlays and smooth interactive component transitions.

### 🔐 Multi-State Authorization Integration
- **Role Differentiation**: Dynamic reactive rendering automatically distinguishes between anonymous public browsers and authenticated full-access members.
- **Action Safeguards**: Strict security-wrapper validation gates P2P messaging networks, reporting dispatches, and permanent wishlist persistence mechanisms.

### 📦 Core Operational Interfaces
- **Immersive Split Hero Dashboard**: Editorial campus liquid asset stats visualization paired with real-time dynamic layout interaction badges.
- **High-Fidelity Archive Views**: Deep multi-column query-filtered grid interfaces for smooth category navigation.
- **P2P Communication Hub**: Fully mock-wired native live messaging threads mapping active product items and historical conversation logs.
- **Listing Engine**: Robust multi-step forms equipped with auto-scaling dynamic attributes and live file-fallback preview directives.
- **Regulatory Frameworks**: Built-in support documentation pages including dynamically rendered legal matrices (Guidelines, Contact APIs, FAQ sections, Terms of Service, and Privacy directives).

---

## 🛠️ Project Workspace Installation

### 1. Prerequisites
Ensure you have Node.js and the Angular CLI globally accessible:
```bash
node -v
npm -v
ng version
```

### 2. Local Initialization
Clone the repository and install the standard Angular dependencies:
```bash
git clone https://github.com/aya-ashraf94/graduation-project-depi.git
cd graduation-project-depi
npm install
```

### 3. Launch Development Console
Launch the local compilation engine with real-time automatic file diff reloads:
```bash
ng serve -o
```
Navigate to `http://localhost:4200/` in your preferred web browser to view the running interface.

---

## 🏗️ Architectural Topology
The application directory tree follows modern feature-based encapsulation principles:
```text
src/app/
├── core/
│   ├── guards/         # Route navigation interceptors (authGuard)
│   ├── models/         # Shared robust TypeScript domain definitions
│   └── services/       # Centralized state stores prepared for HttpClient migration
├── features/
│   ├── auth/           # Login credentials validation & member on-boarding
│   ├── chat/           # Live WebSockets/polling P2P conversation UI
│   ├── home/           # Editorial portal dashboards
│   ├── product/        # Deep marketplace details, inventory archives, and authoring modules
│   ├── profile/        # Member profile settings and synchronized favorite listings
│   └── support/        # Static regulatory and legal communication pages
└── shared/
    ├── directives/     # Dynamic image load state fallbacks
    └── pipes/          # ISO currency and humanized time-ago computational formatters
```

---

## 🤝 Collaborative Setup (GitHub Workflow)
To contribute features without overriding main branch architecture:
1. Always synchronize upstream states before coding: `git pull origin main`
2. Instantiate local feature workspaces: `git checkout -b feature/<your-feature-name>`
3. Package source code cleanly and open Pull Requests for peer architectural review.
