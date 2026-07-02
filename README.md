# 🎬 BookShow

<div align="center">

**A full-stack movie & show ticket booking web application powered by live TMDB data**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Server-brightgreen?style=for-the-badge&logo=vercel)](https://book-show-server.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/AAyushPatil195/BookShow)
[![JavaScript](https://img.shields.io/badge/JavaScript-98.8%25-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://github.com/AAyushPatil195/BookShow)
[![TMDB](https://img.shields.io/badge/Powered%20by-TMDB-01B4E4?style=for-the-badge&logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org/)

</div>

---

## 📌 Overview

**BookShow** is a full-stack movie & show ticket booking web application inspired by BookMyShow. It fetches **real-time movie and show data** from The Movie Database (TMDB) API, ensuring listings are always current and never outdated. Users can browse what's showing today, view details, select seats, and complete bookings — all backed by a live REST API.

Authentication is handled by **Clerk**, a production-grade user management platform, with user sync events processed reliably via **Inngest** — a durable event-driven workflow engine. This combination makes BookShow a genuinely production-ready application, not a static demo.

---

## 🚀 Live Demo

| Component | URL |
|-----------|-----|
| 🖥️ Backend API | [book-show-server.vercel.app](https://book-show-server.vercel.app) |
| 💻 Frontend | *(add your deployed frontend URL here)* |

---

## ✨ Features

- 🎥 **Live Movie & Show Listings** — Real-time data fetched from TMDB, always showing what's current
- 🔐 **Clerk Authentication** — Secure sign-up, login, and session management via Clerk
- 🔄 **Webhook Sync with Inngest** — Clerk user events (create/update/delete) are reliably handled as background jobs using Inngest, keeping the database in sync
- 🎫 **Seat Selection** — Interactive seat picker to choose preferred seats for a show
- 📋 **Booking Management** — Create, view, and manage ticket bookings per user
- 🗄️ **Persistent Storage** — All bookings and user data stored in MongoDB Atlas
- 🌐 **RESTful Backend** — Clean, structured Express API endpoints
- 📱 **Responsive Design** — Works seamlessly across desktop and mobile devices

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React.js** | UI library for building component-based interfaces |
| **Vite** | Fast build tool and development server |
| **React Router DOM** | Client-side routing and navigation |
| **Axios** | HTTP client for API communication |
| **Clerk (React SDK)** | Pre-built auth UI components and session hooks |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime environment |
| **Express.js** | Web framework for the REST API |
| **MongoDB** | NoSQL database for bookings and user data |
| **Mongoose** | ODM library for MongoDB schema modeling |
| **Clerk (Node SDK)** | Server-side user verification and webhook validation |
| **Inngest** | Durable event-driven job runner for processing Clerk webhooks |
| **TMDB API** | Live movie and show data (titles, posters, dates, ratings) |
| **CORS** | Cross-origin request handling |
| **dotenv** | Environment variable management |

### Services & Deployment
| Service | Usage |
|---------|-------|
| **Vercel** | Backend API deployment |
| **MongoDB Atlas** | Cloud-hosted database |
| **Clerk** | User authentication & management platform |
| **Inngest** | Background job & webhook processing infrastructure |
| **TMDB** | The Movie Database — live entertainment data source |

---

## 🏗️ Architecture Highlights

```
User Action                What Happens Under the Hood
─────────────────────────────────────────────────────────────────
User signs up/logs in  →   Handled entirely by Clerk
                           ↓
Clerk fires a webhook  →   Received by Express endpoint
                           ↓
                           Inngest queues it as a durable job
                           ↓
                           User record created/synced in MongoDB

User browses movies    →   Server calls TMDB API with today's date
                           ↓
                           Live results returned — always up-to-date

User books a ticket    →   Seat + booking saved to MongoDB
                           Booking linked to Clerk user ID
```

---

## 📁 Project Structure

```
BookShow/
│
├── client/                   # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── services/         # Axios API call functions
│   │   ├── context/          # React context for global state
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
├── server/                   # Express.js backend
│   ├── models/               # Mongoose data models (User, Booking, Show)
│   ├── routes/               # Express route definitions
│   ├── controllers/          # Business logic handlers
│   ├── middleware/            # Clerk auth middleware
│   ├── inngest/              # Inngest functions for Clerk webhook events
│   ├── config/               # DB connection
│   ├── index.js              # Server entry point
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [MongoDB](https://www.mongodb.com/cloud/atlas) Atlas account
- [Clerk](https://clerk.com/) account (free tier works)
- [TMDB API key](https://developer.themoviedb.org/docs/getting-started) (free)
- [Inngest](https://www.inngest.com/) account (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/AAyushPatil195/BookShow.git
cd BookShow
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# Clerk
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_signing_secret

# TMDB
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

PORT=5000
```

```bash
npm run dev
```

Server runs at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in `client/`:

```env
VITE_API_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Inngest Dev Server (for local webhook testing)

In a separate terminal:

```bash
npx inngest-cli@latest dev
```

This starts the Inngest dev server locally so Clerk webhook events are processed during development.

---

## 🔌 API Endpoints

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/clerk` | Receives Clerk user events; queued and processed via Inngest |

### Movies & Shows (via TMDB)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies/now-playing` | Fetch movies currently in theatres (live from TMDB) |
| `GET` | `/api/movies/:id` | Get full details of a specific movie |
| `GET` | `/api/shows` | Fetch current TV shows from TMDB |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bookings` | Get all bookings for the authenticated user |
| `POST` | `/api/bookings` | Create a new booking |
| `GET` | `/api/bookings/:id` | Get a specific booking |
| `DELETE` | `/api/bookings/:id` | Cancel a booking |

> All booking routes are protected — requests must include a valid Clerk session token.

---

## 🖼️ Screenshots

> *(Add screenshots of your running app here — home, movie listing, seat selection, booking confirmation)*

| Home Page | Now Playing | Seat Selection | Booking Confirmation |
|-----------|-------------|----------------|----------------------|
| ![Home](#) | ![Movies](#) | ![Seats](#) | ![Confirm](#) |

---

## 📚 Key Learnings & Highlights

- Integrated **TMDB API** to serve always-current movie data — the app never becomes outdated
- Replaced custom auth with **Clerk**, gaining production-grade session management, OAuth, and user dashboards with minimal code
- Used **Inngest** to handle Clerk webhook events as durable background jobs — ensuring reliable user sync even if the server restarts mid-execution
- Built a fully decoupled **MERN stack** with a clear separation of concerns between data fetching (TMDB), auth (Clerk), event processing (Inngest), and business logic (Express + MongoDB)
- Deployed the backend on **Vercel** with proper environment configuration for all third-party services

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

---

## 👨‍💻 Author

**Aayush Patil**

[![GitHub](https://img.shields.io/badge/GitHub-AAyushPatil195-181717?style=flat-square&logo=github)](https://github.com/AAyushPatil195)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ using React · Express · MongoDB · Clerk · TMDB · Inngest</sub>
</div>