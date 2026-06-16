# RongRani Backend Server API

[![NodeJS](https://img.shields.io/badge/Node.js-18.0.0+-green.svg)](https://nodejs.org/)
[![ExpressJS](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-blue.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

RongRani Backend is a RESTful API server powered by Node.js, Express, and MongoDB. It manages the core transactional logic, authentication, products, order processing pipelines, and third-party API configurations for the RongRani platform.

---

## 🌟 Key Features

- **Robust REST API**: Complete routes for products, categories, orders, user accounts, analytics, coupons, banners, and chat history.
- **Secure JWT Authentication**: Role-based access control protecting client and admin operations with secure JSON Web Token verification.
- **Real-Time WebSockets**: Live data syncing for order updates and customer service messages powered by `socket.io`.
- **Steadfast Courier API Integration**: Automatic shipping allocation and consignment dispatch commands to Bangladesh's Steadfast courier portal.
- **Transactional Emails (Brevo API)**: Auto-delivery of welcome letters, receipt alerts, order status progress logs, and password reset requests.
- **Dynamic Invoicing (PDFKit)**: Generates premium downloadable PDF receipts for customers.
- **Advanced Fraud Detection**: Automated verification parameters checking BKash, Nagad, and SSLCommerz payment credentials.

---

## 🛠️ Technology Stack

- **Core**: Node.js, Express, Mongoose (MongoDB ODM)
- **Real-Time Events**: Socket.io
- **Security & Optimization**: Helmet, CORS configurations, Express Rate Limit, Compression
- **Authentication**: JWT (JsonWebToken), BcryptJS password hashing, Passport OAuth (Google/Facebook log-ins)
- **Utilities**: NodeMailer (SMTP) / Axios (Brevo API), PDFKit (invoice builder), Multer (image uploads), Sharp (image processing)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (version `>= 16.0.0`) and **MongoDB** (local server or MongoDB Atlas URL) ready.

### Installation

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Create a `.env` file inside the `backend/` directory (refer to `.env.example` for instructions):
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   CLIENT_URL=http://localhost:5173
   ADMIN_URL=http://localhost:5174
   BREVO_API_KEY=your_brevo_api_key
   SUPER_ADMIN_EMAIL=admin@rongrani.com
   SUPER_ADMIN_PASSWORD=your_super_admin_password
   STEADFAST_API_KEY=your_steadfast_api_key
   STEADFAST_API_SECRET=your_steadfast_api_secret
   ```

### Running Locally

To start the API server in development mode (with auto-restart support):
```bash
npm run dev
```
The server API endpoints will be accessible at **`http://localhost:5000`**.

### Database Seeding

To seed database with mock categories and products during installation:
- Seed categories: `npm run seed-categories`
- Seed products: `npm run seed-products`

---

## 📂 Project Structure

```
backend/
├── config/                 # Database and passport configurations
├── controllers/            # Request handlers (auth, product, order, admin)
├── middlewares/            # Auth, admin, rate limit, upload controllers
├── models/                 # Mongoose schemas (User, Product, Order, Coupon)
├── routes/                 # API endpoint routing mapping
├── scripts/                # Database seeding & clean-up scripts
├── services/               # Transactional email service & PDF invoicing logic
├── utils/                  # Core helpers (Steadfast Courier, Fraud Detection, AI helper)
├── app.js                  # Express middleware settings configuration
└── server.js               # Entry point (HTTP server + WebSockets setup)
```

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.
