# ⚙️ Backend API — Market.Arch (Nafa3ni)

> Express.js REST API powered by Node.js, MongoDB, Mongoose, and JWT authentication.

---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-4ea94b?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/JWT-Protected-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>

---

## 🚀 Key Features

* **JSON Web Token (JWT) Flow**: Security token generation with 7-day expirations via `jsonwebtoken` and header authentication checks.
* **Bcrypt Password Encryption**: Safe password hashing prior to saving credentials in the database.
* **CORS Support**: Cross-Origin Resource Sharing enabled for seamless integration with Angular frontend on port `4200`.
* **Structured MVC Routing**: Clean separation of routes, middlewares, controllers, and models.

---

## 🗄️ Database Schemas

### 1. User Model
Represented by the Mongoose model schema:
* `name` (String, required): Student's full name.
* `email` (String, required, unique): Student's academic or verified email.
* `password` (String, required): Hashed password.
* `timestamps`: Tracks creation and modification dates (`createdAt`, `updatedAt`).

### 2. Product Model
Represented by the Mongoose model schema:
* `title` (String, required): Name of the item.
* `description` (String, required): Detailed description.
* `price` (Number, required): Cost of the item.
* `currency` (String, default: `"EGP"`): Localized price currency.
* `categoryId` (String, required): Item taxonomy categorizer.
* `condition` (String, enum: `["new", "used"]`, default: `"used"`): Product wear level.
* `brand` (String, optional): Manufacturer brand.
* `images` (Array of Strings, default: `[]`): Image URIs for previews.
* `attributes` (Object, optional): Custom specs like color or storage (`attributes: { color, storage }`).
* `location` (Object, optional): Meetup location coordinates or names (`location: { city, area }`).
* `userId` (String, required): Reference to the listing owner.
* `status` (String, default: `"active"`): Controls public listing display visibility.

---

## 🗺️ REST API Endpoint Guide

### Authentication Endpoint System

| Method | Endpoint | Access | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Public | `{ name, email, password }` | Registers a new user. Performs email validation and checks if the user already exists. |
| **POST** | `/api/auth/login` | Public | `{ email, password }` | Authenticates credentials and returns a JWT token under the `token` key, plus the `user` object. |

#### Example Login Success Response:
```json
{
  "message": "Login Success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "603f75...",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

---

### Products Endpoint System

| Method | Endpoint | Access | Headers | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/products` | Public | None | None | Retrieves all active listings, sorted by newest first. |
| **POST** | `/api/products` | Public* | None | `{ title, description, price, categoryId, userId, ... }` | Creates a new product listing. |

> [!NOTE]
> **Extended Route Controller Functions**:
> The controller (`Backend/controllers/productController.js`) also contains implementations for:
> * `getUserProducts` (`GET /api/products/user/:userId`) — Retrieve listings owned by a specific user.
> * `updateProduct` (`PUT /api/products/:id`) — Modify attributes of an existing item.
> * `deleteProduct` (`DELETE /api/products/:id`) — Permanently remove a listing from the database.
>
> These endpoints can be fully integrated with routes as the frontend features scale.

---

## 🔒 JWT Security Gateway (Middleware)

The backend features `authMiddleware.js` which verifies JSON Web Tokens.
* **Header Key**: `x-auth-token`
* **Workflow**:
  1. Extract the token from the header.
  2. If missing, return `401 Unauthorized` with `{ "msg": "No token, authorization denied" }`.
  3. Verify token authenticity using `process.env.JWT_SECRET`. If signature is invalid, return `401 Unauthorized` with `{ "msg": "Token is not valid" }`.

---

## 🛠️ Configuration & Run Instructions

### 1. Prerequisites
Make sure you have MongoDB running locally (`mongodb://127.0.0.1:27017`) or have a remote MongoDB Atlas connection URI ready.

### 2. Setup Environment Variables
Create a file named `.env` in the `Backend/` directory:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nafa3ni
JWT_SECRET=your_super_secret_signing_key_here
```

### 3. Run Backend Server

```bash
# Move to the Backend directory
cd Backend

# Install dependencies
npm install

# Run server with live nodemon reload
npm run dev

# Run in production mode
npm start
```
The server will output:
```text
Server Running On Port 5000
MongoDB Connected
```

---

## 🗄️ Database Exporting & Seeding (Syncing Data)

To keep your local databases synchronized with other developers:

### 1. Export local database state
Run this command from inside the `Backend/` directory:
```bash
npm run export-db
```
This dumps your local MongoDB collections into JSON backup files located at `Backend/data/`. Push these JSON files to GitHub.

### 2. Seed/Import shared database state
To import the shared database status:
```bash
npm run seed
```
> [!NOTE]
> Seeding is now non-destructive! Instead of deleting all documents, the script uses a bulk-upsert mechanism to add or update records based on their `_id`, keeping your other local custom test listings intact.

### 3. Generate Official Store Catalog Data
To generate the official Nafa3ni Store admin profile and load the database with 32 premium official listings across all categories, run:
```bash
npm run generate-official
```
This runs the generation script which populates official products with complete specifications, location coordinates, and stock graphics, and updates local data templates.
