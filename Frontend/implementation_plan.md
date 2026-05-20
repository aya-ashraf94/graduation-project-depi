# Market.Arch — Full Preparation Plan
> Build everything backend-ready with mock data now, swap to real API later.

---

## Strategy: Mock-First, API-Ready

Every service will have:
- A **mock data layer** that works right now (no backend needed)
- An **HTTP-ready interface** — just swap the mock return for a real `HttpClient` call later
- **TypeScript interfaces** in `core/models/` so the whole app is type-safe

---

## Phase 1 — Core Models (`core/models/`)

| File | Contents |
|------|----------|
| `user.model.ts` | `User`, `UserRole`, `UserProfile` |
| `product.model.ts` | `Product`, `ProductCondition`, `ProductStatus`, `ProductCategory` |
| `message.model.ts` | `Message`, `Conversation` |
| `api-response.model.ts` | `ApiResponse<T>`, `PaginatedResponse<T>` |

---

## Phase 2 — Core Services (`core/services/`)

| File | Mock Now | API-Ready Hook |
|------|----------|---------------|
| `auth.ts` | localStorage token, mock login/register | `POST /auth/login`, `/auth/register` |
| `product.service.ts` | in-memory product array | `GET /products`, `POST /products`, etc. |
| `user.service.ts` | mock user profile | `GET /users/:id` |
| `chat.service.ts` | mock conversations | `GET /conversations`, `POST /messages` |

---

## Phase 3 — Interceptors & Environment (`core/interceptors/`)

| File | Purpose |
|------|---------|
| `auth.interceptor.ts` | Reads token from localStorage, attaches `Authorization: Bearer <token>` header to every request |
| `environments/` | `environment.ts` with `apiUrl` so you change one string to point to your real backend |

---

## Phase 4 — Shared Pipes & Directives

| File | What it does |
|------|-------------|
| `shared/pipes/time-ago.pipe.ts` | "Listed 2 days ago" |
| `shared/pipes/currency-format.pipe.ts` | "$1,200" formatting |
| `shared/directives/image-fallback.directive.ts` | Shows placeholder if product image fails to load |

---

## Phase 5 — Update Routes (`app.routes.ts`)

Group routes under layout shell, apply guard to protected ones:
```
/                 → Home (public)
/auth/login       → Login (public)
/auth/register    → Register (public)
/products         → Product List (public)
/products/:id     → Product Detail (public)
/listings/create  → Create Listing (protected)
/listings/:id/edit → Edit Listing (protected)
/profile/:id      → Profile (public view)
/profile/me       → My Profile (protected)
/chat             → Chat (protected)
```

---

## Phase 6 — Missing Feature Pages (shell components)

| Page | Path | Guard |
|------|------|-------|
| Register | `auth/pages/register-page/` | public |
| Product Detail | `product/pages/product-detail/` | public |
| Create Listing | `product/pages/create-listing/` | ✅ protected |
| Edit Listing | `product/pages/edit-listing/` | ✅ protected |
| My Profile | `profile/pages/my-profile/` | ✅ protected |
| Seller Profile | `profile/pages/seller-profile/` | public |
| My Listings | `profile/pages/my-listings/` | ✅ protected |
| Chat | `chat/pages/chat-page/` | ✅ protected |

---

## Clean Up

- Remove duplicate guard file `auth-guard.ts` (keep `auth.guard.ts`)
- Move inline `Product` interface out of `product-list.ts` → use `core/models/product.model.ts`
