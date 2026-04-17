# 🛒 ForgeCart – Full-Stack Premium E-Commerce Platform

<img width="2879" height="941" alt="image" src="https://github.com/user-attachments/assets/30c7a3d1-cbfa-4f3d-88c9-36a855d87538" />



## 📌 Overview

**ForgeCart** is a complete, full-stack e-commerce web application developed for the **BackForge Hackathon**. Originally designed as a frontend prototype, this repository has been rigorously transformed into a highly capable, backend-driven platform utilizing **Node.js, Express, and a live MongoDB Atlas Cloud Cluster**.

This project provides a true end-to-end shopping experience, from browsing rich product catalogs to securely authenticating users, managing live carts, and simulating payment checkouts.

---

## 🚀 Key Highlights

* **Live Database Integration**: Powered by MongoDB Atlas via direct connection strings, totally bypassing legacy SRV query bugs on Windows.
* **Modern E-Commerce UI/UX**: Distinct glassmorphic aesthetics, dark themes, and buttery smooth hover transitions.
* **Zero-Friction Authentication**: Robust JWT token-based auth for secure logins and account protection.
* **Role-Based Command Center**: A dedicated Admin Dashboard with live stats on revenue, users, and low-stock items.
* **Resilient Infrastructure**: Includes automated Bootstrapping tools (`start-backend.bat`) for instant 1-click developer setup.

---

## 🏗️ System Architecture

ForgeCart operates on a robust Service-Oriented backend bridging a lightweight static frontend layout.

### 🔹 1. Frontend (Client)
* **Tech**: Vanilla HTML5, CSS3, JavaScript.
* **Logic**: Intercepts DOM commands seamlessly, communicating with the API via asynchronous `fetch` calls housed inside `js/shared.js`.
* **Design Systems**: Inter / Outfit fonts, absolute modern design tokens, custom Toast notification systems.

### 🔹 2. Backend (Server)
* **Tech**: Node.js & Express.
* **Routing**: Extensively tiered API logic covering `/api/products`, `/api/auth`, `/api/cart`, `/api/orders`, and `/api/admin`.
* **Middleware**: JWT authentication protection wrapping secure endpoints.

### 🔹 3. Database (Cloud)
* **Tech**: MongoDB Atlas.
* **ORM**: Mongoose schemas enforcing structured data schemas for `Cart`, `User`, `Product`, `Order`, and `Category`.

---

## 🛍️ Core Features

### 🔐 Security & Identity
* Seamless User Registration and Logins (Try `demo@backforge.com` / `demo1234`!).
* Root Admin tracking & capabilities.
* UI dynamically morphs to welcome users by name.

### 📦 Dynamic Cart Engine
* Real-time backend sync. Updating quantities pushes seamlessly to the server.
* Interactive navbar cart badge tracking live inventories.
* State-of-the-art success micro-animations upon clicking "Add to Cart".

### 💳 Checkout Sandbox
* Compiles orders asynchronously.
* Simulates payment gateway processing.
* Migrates cart payloads directly to immutable execution logs (Orders).

### 📊 Admin Command Center
* Granular breakdown of system statistics.
* Watches total users, generated revenue, and flags low-stock products.

---

## 💻 Local Setup & Execution 

Get up and running locally in mere seconds.

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas Account (Or local MongoDB server)

### 1-Click Startup (Windows)
We've included a powerful bootstrap script directly inside the repository.
1. Navigate to the `backend/` directory.
2. Double-click **`start-backend.bat`**.
3. *This script will automatically*: Fix your PATH environment variables, run `npm install`, seed your database with dummy products, and spin up the Express server.
4. Open the `index.html` file in your browser to start shopping!

### Manual Execution (Mac/Linux)
```bash
# 1. Enter backend
cd backend

# 2. Install dependencies
npm install

# 3. Configure Environments
# Confirm your MongoDB Atlas cluster URI is loaded into backend/.env
# e.g., MONGO_URI=mongodb://usr:pwd@cloud.mongodb.net/forgecart...

# 4. Seed Dummy Data (One time only)
node seed/seedData.js

# 5. Start the Server
npm start
``` 

---

## ⚠️ Known Limitations
- Payment Gateway integration is logically mocked for hackathon safety considerations.
- Static file serving is managed via raw `file://` protocols on the client side, while the backend lives on `http://localhost:5000`.

---

## 🔮 Future Enhancements
* Implementing Redis caching layers for raw product queries.
* Next.js / React migration for complex Single Page Application logic.
* Expanding Role-Based Access Controls to Vendor portals.

---

## 🤝 Contribution
This platform was significantly enhanced to integrate live databases and full-stack functionalities for the **BackForge Hackathon**. Feel free to fork, experiment, and mutate the codebase. 

💡 *Build fast. Ship faster. Forge better.*
