# Backend API

This is a Node.js backend with Express, MongoDB, and JWT authentication.

## Installation

npm install

## Usage

Create a .env file with your MongoDB URI and JWT secret.

Run `npm run dev` for development.

Run `npm start` for production.

## API Endpoints

### Auth

- POST /api/auth/register

- POST /api/auth/login

### Products

- GET /api/products

- POST /api/products (requires auth)
