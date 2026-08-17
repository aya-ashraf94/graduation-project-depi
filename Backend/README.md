# ⚙️ Backend REST API — Market.Arch (Nafa3ni)

> **High-performance REST API and real-time WebSocket backend powered by Node.js, Express, PostgreSQL, Drizzle ORM, and Socket.io.**

---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-v15+-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle--ORM-v0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Socket.io-v4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/JWT-Dual_Token-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>

---

## 🚀 Key Architectural Highlights

* **PostgreSQL & Drizzle ORM**: Fully typed relational schema mapping users, products, categories, orders, offers, reviews, flash sales, and coupons with foreign key constraints.
* **Dual-Token JWT Security**: Short-lived access tokens paired with secure refresh tokens (`/api/auth/refresh-token`) for seamless session continuity.
* **Socket.io Real-Time Engine**: Powers live peer-to-peer chat threads, instant offer notifications, and synchronized flash sale countdown alerts.
* **Modular MVC Structure**: Organized across dedicated controllers, middleware validators, and 22 feature-specific route modules.
* **Platform Fee Engine & Stripe Payments**: Configurable multi-tier commission calculations, seller earnings wallet balances, and Stripe card checkout.

---

## 🗄️ Database Schema Overview (`db/schema.js`)

| Table | Purpose |
| :--- | :--- |
| `users` | User credentials, roles (`user`, `admin`), profile details, verification status, and ratings. |
| `categories` & `category_attributes` | Taxonomy hierarchy and dynamic facet attributes (e.g., storage, color, condition). |
| `products` | Peer-to-peer listings, dynamic specs, pricing, images, verification status, and views. |
| `orders` | Completed checkouts, shipping address, payment method, tracking numbers, and delivery status. |
| `offers` | Buyer price negotiations, counter-offers, and acceptance status. |
| `conversations` & `messages` | Direct messaging threads between buyers and sellers with read receipts. |
| `coupons` | Promo codes with fixed/percentage discount rules, user usage limits, and expiration dates. |
| `flash_sales` & `flash_sale_items` | Scheduled time-limited discount events with custom promotional pricing. |
| `reviews` | Customer ratings, verified purchase badges, and seller feedback. |
| `notifications` | System alerts with actionable deep routes (`linkedRoute`). |
| `user_wishlist` | Relational junction table mapping user saved items. |
| `platform_settings` & `seller_tiers` | Global commission fees, tier configurations, and system parameters. |

---

## 🗺️ REST API Endpoints

### 1. Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new account.
* `POST /api/auth/login` — Authenticate credentials and receive access + refresh tokens.
* `POST /api/auth/refresh-token` — Exchange valid refresh token for a new access token.
* `POST /api/auth/forgot-password` — Request a password reset link/token.
* `POST /api/auth/reset-password` — Complete password reset using token.

### 2. Products & Search (`/api/products`)
* `GET /api/products` — Retrieve active listings with search, price, and category filters.
* `GET /api/products/:id` — Retrieve detailed listing specs and seller profile.
* `POST /api/products` — Create a new listing *(Authenticated)*.
* `PUT /api/products/:id` — Update listing attributes *(Owner/Admin)*.
* `DELETE /api/products/:id` — Soft-delete / remove a listing *(Owner/Admin)*.

### 3. Price Offers & Negotiation (`/api/offers`)
* `POST /api/offers` — Submit a price offer on a listing.
* `GET /api/offers/my-offers` — Get outgoing and incoming offers for the current user.
* `PATCH /api/offers/:id/status` — Accept, reject, or counter-offer.

### 4. Flash Sales & Coupons (`/api/flash-sales` & `/api/coupons`)
* `GET /api/flash-sales/active` — Fetch currently running flash sales.
* `POST /api/coupons/validate` — Validate a promo coupon code (`LUCKY20`, `SCRATCH50`, etc.).

### 5. Chat & Real-Time Messaging (`/api/conversations`)
* `GET /api/conversations` — Fetch user's conversation inbox.
* `GET /api/conversations/:id/messages` — Retrieve message history for a conversation.
* `POST /api/conversations/:id/messages` — Send a direct message (also broadcasted via Socket.io).

### 6. Orders, Wallet & Stripe Payments (`/api/orders`, `/api/payments`, `/api/payouts`)
* `POST /api/orders` — Create a new purchase order.
* `POST /api/payments/create-intent` — Initialize Stripe payment intent.
* `GET /api/payouts/wallet` — Fetch seller wallet balance and transaction ledger.
* `POST /api/payouts/request` — Submit seller payout withdrawal request.

### 7. Administration (`/api/admin`)
* `GET /api/admin/metrics` — Aggregate system revenue, order volume, and active user metrics.
* `GET /api/admin/revenue-overview` — Historical revenue chart data.
* `GET /api/admin/categories` & `POST /api/admin/categories` — Manage categories & attributes.
* `POST /api/admin/flash-sales` — Create and schedule live flash sales.
* `GET /api/admin/reports` & `PATCH /api/admin/reports/:id` — Moderate reported content.

---

## 🛠️ Utility & Database Scripts

All database maintenance scripts are organized inside the `scripts/` directory:

```bash
# Seed initial categories, demo users, coupons, and products
npm run seed

# Seed or promote an admin account
npm run seed:admin

# Export database tables to JSON backup templates
npm run export-db

# Generate 32 official store listings and update data backups
npm run generate-official

# Run Drizzle database migrations
npm run db:migrate
```
