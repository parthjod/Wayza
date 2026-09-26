# 🚗 Wayza — Campus Ride-Sharing Coordination Platform

<p align="center">
  <strong>🌱 Smarter • 💰 Cheaper • 🛡️ Safer Campus Rides for University Students</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Socket.io-4-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/AWS-Integrated-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Nginx-Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
</p>

---

## 📖 Table of Contents

- [🎯 Overview](#-overview)
- [🧩 Problem Wayza Solves](#-problem-wayza-solves)
- [✨ Key Features](#-key-features)
- [☁️ AWS Cloud Architecture & Integration](#️-aws-cloud-architecture--integration)
  - [🏛️ Cloud Architecture Diagram](#️-cloud-architecture-diagram)
  - [🛠️ Detailed AWS Service Breakdown](#️-detailed-aws-service-breakdown)
  - [⚙️ AWS Environment Configuration](#️-aws-environment-configuration)
  - [🚀 Step-by-Step AWS Production Deployment Guide](#-step-by-step-aws-production-deployment-guide)
- [🛠️ Tech Stack](#️-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 How to Run After Cloning Repo (First-Time Setup)](#-how-to-run-after-cloning-repo-first-time-setup)
- [⚡ How to Run Again (After Laptop Restart / Daily Workflow)](#-how-to-run-again-after-laptop-restart--daily-workflow)
- [🧪 Testing & Development Tips](#-testing--development-tips)
- [📂 Project Directory Structure](#-project-directory-structure)
- [📜 License](#-license)

---

## 🎯 Overview

**Wayza** is an end-to-end, real-time ride-sharing and carpool coordination platform engineered specifically for university ecosystems (initially designed for **MIT-WPU, Pune**). 

Instead of riding solo in expensive cabs or dealing with messy WhatsApp chats, Wayza allows verified students to discover peers heading in the same direction, form carpool groups instantly, coordinate via real-time WebSocket chat, exchange phone numbers securely, synchronize trip progress, and split fares automatically down to the exact rupee at the end of the trip.

---

## 🧩 Problem Wayza Solves

| ❌ The Status Quo Problem | ✅ The Wayza Solution |
| :--- | :--- |
| **💸 Sky-High Daily Commute Costs**<br>Students ride solo in cabs or auto-rickshaws, frequently subjected to surge prices during peak college hours. | **🤝 Smart Peer Grouping**<br>Matches 2 to 4 students traveling along identical routes, slashing individual travel expenses by up to **75%**. |
| **📢 Cluttered & Ineffective Chat Groups**<br>WhatsApp, Telegram, and Discord groups are unorganized, unsearchable, noisy, and full of expired requests. | **📍 Live Geospatial Discovery**<br>Instantly locates students heading in your direction within a customizable search radius (**500m to 5km**) in real time. |
| **⚠️ Personal Safety & Stranger Anxiety**<br>Hitchhiking or sharing rides with unknown strangers poses serious security risks. | **🔒 Verified College Community**<br>Access is domain-restricted to verified college emails (`@mitwpu.edu.in`) and two-factor mobile SMS OTP authentication. |
| **🧮 Awkward Fare Splitting & Unpaid Dues**<br>Calculating who owes what at the drop-off curb causes delays, friction, and awkward payment reminders. | **⚡ Automated Fare Calculation**<br>Enter total meter fare; Wayza computes exact per-head shares and provides one-tap digital acknowledgements. |
| **🚦 Campus Gate Congestion & Emissions**<br>Hundreds of single-occupancy vehicles cause massive traffic jams and excessive carbon emissions. | **🌱 Sustainable University Mobility**<br>Fewer vehicles on campus roads translates directly to reduced carbon footprints and smoother traffic flow. |

---

## ✨ Key Features

- **📍 Real-Time Proximity Matching**: Check in at campus POIs or type any custom destination in Pune; search for peers nearby within a customizable radius (**500m – 5km**).
- **🔒 Verified Student Identity**: Domain-locked college email authentication (`@mitwpu.edu.in`) with Amazon SES confirmation links, plus mobile SMS OTP via Amazon SNS.
- **💬 Low-Latency Group Chat**: Real-time WebSocket messaging powered by `Socket.io`, featuring live presence, auto-scroll, and dynamic confirmation indicators.
- **📞 One-Tap Contact Sharing**: Share phone numbers securely with a modern frosted-glass banner featuring direct **Call** (`tel:`) and **Copy** buttons.
- **🚗 Synchronized Journey Pipeline**: Multi-stage trip state machine (`FORMING` ➔ `CONFIRMED` ➔ `JOURNEY_STARTED` ➔ `JOURNEY_ENDED`) synchronized across all group members.
- **💸 Automated Fare Splitting**: Group leader inputs the total fare; Wayza divides the cost equally and logs acknowledgements from all riders.
- **🛡️ Built-in Incident Reporting**: Submit safety, punctuality, or conduct reports with live character counters directly for administrative review.
- **🗺️ Zero-API-Key Geocoding**: Powered by OpenStreetMap (Photon & Nominatim) for instant autocomplete across Pune and India without paid Google Cloud billing accounts.

---

## ☁️ AWS Cloud Architecture & Integration

Wayza is architected cloud-native and integrates with **Amazon Web Services (AWS)** for high availability, enterprise-grade student identity verification, secure object storage, low-latency edge caching, and scalable compute.

### 🏛️ Cloud Architecture Diagram

```
                               ┌────────────────────────────────────────┐
                               │         🎓 Student Web Client          │
                               │        (React 18 + Vite + PWA)         │
                               └───────────────────┬────────────────────┘
                                                   │ HTTPS / WSS
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │        🌐 AWS Route 53 DNS             │
                               │   Latency Routing & ACM SSL (TLS 1.3)  │
                               └───────────────────┬────────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼                                                   ▼
       ┌────────────────────────────────────┐             ┌────────────────────────────────────┐
       │      ⚡ AWS CloudFront CDN         │             │      🖥️ AWS EC2 / ECS Cluster       │
       │   Edge Caching for Static Assets   │             │   Nginx Reverse Proxy + Node.js    │
       │     & Student Profile Avatars      │             │   Express API & Socket.io Server   │
       └─────────────────┬──────────────────┘             └───────┬───────────┬────────────┬───┘
                         │                                        │           │            │
                         ▼                                        ▼           ▼            ▼
                ┌─────────────────┐                      ┌─────────────────┐ ┌──────────┐ ┌────────┐
                │ 🪣 AWS S3 Bucket│                      │ 🗄️ AWS RDS      │ │ ⚡ AWS   │ │ ✉️ AWS │
                │ Private Storage │                      │ PostgreSQL 16   │ │ Elasti-  │ │ SES    │
                │ (User Avatars)  │                      │ (PostGIS Geo)   │ │ Cache    │ │ Emails │
                └─────────────────┘                      └─────────────────┘ │ (Redis 7)│ └────────┘
                                                                             └──────────┘     │
                                                                                              ▼
                                                                                     ┌─────────────────┐
                                                                                     │ 📱 AWS SNS SMS   │
                                                                                     │ Mobile Phone OTP│
                                                                                     └─────────────────┘
```

---

### 🛠️ Detailed AWS Service Breakdown

Wayza's backend codebase incorporates production-ready AWS SDK v3 clients (`@aws-sdk/client-s3`, `@aws-sdk/client-ses`, `@aws-sdk/client-sns`). Below is how each AWS service integrates with the application:

#### 1. 🪣 Amazon S3 (Simple Storage Service)
- **Role**: Secure, durable object storage for student profile pictures and uploaded avatar images.
- **Codebase Location**: [`server/src/config/s3.ts`](file:///c:/Users/parth/Downloads/wayza/server/src/config/s3.ts)
- **How it Works**:
  - Avatar uploads are validated on the backend (MIME type check, image size limits, and sanitization).
  - Images are streamed to the S3 bucket using `PutObjectCommand` with unique UUID keys and `Cache-Control: public, max-age=31536000` headers.
  - The S3 bucket is configured as **Private** (no public bucket access) to prevent unauthorized file manipulation or hotlinking.
  - Returns a clean public CDN URL pointing to the CloudFront distribution: `https://${AWS_CLOUDFRONT_DOMAIN}/${key}`.
  - When a student updates or deletes their avatar, `DeleteObjectCommand` purges the old image from S3.

#### 2. ⚡ Amazon CloudFront (Global Content Delivery Network)
- **Role**: High-speed edge caching, SSL termination, and media distribution.
- **Codebase Location**: Express security middleware in [`server/src/app.ts`](file:///c:/Users/parth/Downloads/wayza/server/src/app.ts) & [`deployment/nginx.conf`](file:///c:/Users/parth/Downloads/wayza/deployment/nginx.conf)
- **How it Works**:
  - Acts as an edge reverse-proxy in front of the private S3 bucket via **Origin Access Control (OAC)** or **Origin Access Identity (OAI)**.
  - Student profile images are cached across CloudFront's edge locations worldwide (especially in India edge nodes: Mumbai, Delhi, Chennai, Bangalore, Hyderabad), delivering sub-20ms asset load times.
  - **Security Integration**: Strict Content Security Policy (`CSP`) headers configured via `helmet` allow image and media rendering exclusively from the verified CloudFront domain (`img-src 'self' data: https://*.cloudfront.net;`).

#### 3. ✉️ Amazon SES (Simple Email Service)
- **Role**: Transactional college email verification and signup validation.
- **Codebase Location**: [`server/src/config/ses.ts`](file:///c:/Users/parth/Downloads/wayza/server/src/config/ses.ts)
- **How it Works**:
  - When a student registers, Wayza generates a secure, cryptographically signed verification token with a 24-hour expiration.
  - Sends a responsive HTML email via `SendEmailCommand` from `noreply@wayza.in` directly to the student's `@mitwpu.edu.in` inbox.
  - Configured with **DKIM (DomainKeys Identified Mail)**, **SPF (Sender Policy Framework)**, and **DMARC** records in Route 53 to ensure 99.9% inbox deliverability without landing in spam.
  - **Development Mode Fallback**: In local development (`NODE_ENV=development`), email sending gracefully logs the verification link directly to the server terminal console without requiring live AWS credentials.

#### 4. 📱 Amazon SNS (Simple Notification Service)
- **Role**: Instant transactional mobile SMS delivery for phone number verification (OTP).
- **Codebase Location**: [`server/src/config/sns.ts`](file:///c:/Users/parth/Downloads/wayza/server/src/config/sns.ts)
- **How it Works**:
  - Uses `PublishCommand` to dispatch 6-digit OTP verification codes directly to Indian mobile numbers (`+91XXXXXXXXXX`).
  - Sets message attribute `AWS.SNS.SMS.SMSType` to `Transactional` for highest delivery priority over carrier networks.
  - Sets message attribute `AWS.SNS.SMS.SenderID` to `WAYZA` (or registered 6-character DLT alphanumeric header).
  - OTPs expire after 5 minutes and are validated against HMAC hashes stored in Redis.
  - **Development Mode Fallback**: In local development (`NODE_ENV=development`), OTP codes are displayed directly in the terminal for rapid local testing.

#### 5. 🗄️ Amazon RDS for PostgreSQL (with PostGIS Extension)
- **Role**: Managed, highly-available relational database for user profiles, groups, chat history, trips, and geospatial coordinates.
- **Geospatial Capabilities**:
  - Wayza runs the **PostGIS** extension (`CREATE EXTENSION IF NOT EXISTS postgis;`) on AWS RDS PostgreSQL 16.
  - Proximity search queries use spatial indexing (`GIST`) and `ST_DWithin` functions to perform lightning-fast bounding-box calculations to find nearby students within 500m to 5km.
  - Automated daily snapshots, Multi-AZ replication, and point-in-time recovery ensure zero data loss.

#### 6. ⚡ Amazon ElastiCache for Redis
- **Role**: In-memory data store for live presence, rate limiting, and real-time WebSocket scaling.
- **How it Works**:
  - **Ephemeral Heartbeats**: Active student locations are stored with a 15-second TTL (`LOCATION_TTL_SECONDS`). If a student closes their browser, their presence automatically expires without stale database writes.
  - **WebSocket Scalability**: Configured with the `@socket.io/redis-adapter` to allow multiple Node.js server instances across EC2 or ECS to broadcast chat messages and group updates seamlessly across instances.
  - **Auth Caching**: Stores blacklisted JWT tokens, active OTP attempts, and rate-limiting counters.

#### 7. 🖥️ Amazon EC2 / ECS / AWS App Runner (Compute)
- **Role**: Hosting the containerized backend Node.js API and WebSocket server.
- **How it Works**:
  - Nginx acts as a high-performance reverse proxy handling SSL termination (Let's Encrypt / ACM), Gzip compression, and rate limiting (10 req/s on API, 2 req/s on Auth).
  - Handles WebSocket upgrades:
    ```nginx
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ```
  - Dockerized containers deployed on Amazon Elastic Container Service (ECS) with Fargate or on an EC2 instance managed by PM2.

#### 8. 🌐 Amazon Route 53 & AWS Certificate Manager (ACM)
- **Role**: Domain name system (DNS) routing and automated SSL/TLS certificates.
- **How it Works**:
  - Routes traffic to CloudFront (frontend & avatars) and EC2/ALB (backend API).
  - Issues free, auto-renewing TLS 1.3 certificates for `wayza.in` and `*.wayza.in`.

#### 9. 🔐 AWS IAM & Security Best Practices
- **Role**: Principle of least privilege.
- **Implementation**:
  - EC2 / ECS instances use **IAM Roles (Instance Profiles)** in production rather than hardcoded access keys.
  - IAM Policy grants access strictly to the Wayza S3 bucket, SES sending domain, and SNS SMS publish permissions:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": ["s3:PutObject", "s3:DeleteObject"],
          "Resource": "arn:aws:s3:::wayza-avatars/*"
        },
        {
          "Effect": "Allow",
          "Action": ["ses:SendEmail"],
          "Resource": "*"
        },
        {
          "Effect": "Allow",
          "Action": ["sns:Publish"],
          "Resource": "*"
        }
      ]
    }
    ```

---

### ⚙️ AWS Environment Configuration

To connect Wayza to your AWS account, configure the following keys in `server/.env`:

| Environment Variable | Description | Example Value |
| :--- | :--- | :--- |
| `AWS_REGION` | Target AWS datacenter region | `ap-south-1` *(Mumbai)* |
| `AWS_ACCESS_KEY_ID` | IAM User Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAM User Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_S3_BUCKET` | S3 bucket name for avatars & media | `wayza-avatars-production` |
| `AWS_CLOUDFRONT_DOMAIN` | CloudFront distribution domain | `d123456abcdef8.cloudfront.net` |
| `AWS_SES_FROM_EMAIL` | Verified sender email for student verification | `noreply@wayza.in` |
| `AWS_SNS_SENDER_ID` | Alphanumeric SMS sender ID | `WAYZA` |

---

### 🚀 Step-by-Step AWS Production Deployment Guide

#### 1️⃣ S3 & CloudFront Setup
1. Log in to the **AWS Management Console** and select region `ap-south-1` (Mumbai).
2. Create an S3 Bucket: `wayza-avatars`. Keep **Block all public access** enabled.
3. Open **CloudFront** and create a new distribution:
   - **Origin Domain**: Select `wayza-avatars.s3.ap-south-1.amazonaws.com`.
   - **Origin Access**: Choose **Origin Access Control (OAC)** and let CloudFront create the bucket policy.
   - **Viewer Protocol Policy**: Select **Redirect HTTP to HTTPS**.
4. Attach the generated policy to your S3 bucket permissions.

#### 2️⃣ Amazon SES Setup
1. Open **Amazon SES** and navigate to **Identities**.
2. Add your custom domain (`wayza.in`) or verify an identity email (`noreply@wayza.in`).
3. Add the generated **DKIM TXT/CNAME records** to your DNS provider (e.g., Route 53 or Cloudflare).
4. Request production access in SES to move out of the Amazon SES Sandbox.

#### 3️⃣ Amazon SNS SMS Setup
1. Open **Amazon SNS** and go to **Text messaging (SMS)**.
2. In India, TRAI mandates **DLT (Distributed Ledger Technology)** registration. Register your entity (Wayza) and header (`WAYZA`) on a telecom portal (e.g. Jio / Airtel / Vodafone DLT).
3. Set your monthly SMS spend limit and default sender ID in AWS SNS settings.

#### 4️⃣ Amazon RDS & ElastiCache Setup
1. Create an **Amazon RDS for PostgreSQL** instance (PostgreSQL 16, db.t4g.micro or higher).
2. Connect to the database and enable PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Create an **Amazon ElastiCache for Redis** cluster (cache.t4g.micro or higher) inside the same VPC.

#### 5️⃣ Deploy Backend on EC2 / ECS
1. Launch an Ubuntu EC2 instance or ECS task within the same VPC.
2. Clone the repository and configure `server/.env` with your RDS, Redis, and AWS keys.
3. Build and launch with Docker or PM2:
   ```bash
   cd server
   npm install && npm run build
   npx prisma migrate deploy
   pm2 start dist/server.js --name "wayza-api"
   ```
4. Copy `deployment/nginx.conf` to `/etc/nginx/sites-available/wayza.conf` and restart Nginx.

---

## 🛠️ Tech Stack

```text
Frontend:          ⚛️ React 18 • 📘 TypeScript • ⚡ Vite • 🎨 Tailwind CSS • 🔣 Lucide Icons
Backend:           🟢 Node.js 20 • 🚂 Express 4 • 📘 TypeScript • 🔌 Socket.io 4
Database & Cache:  🐘 PostgreSQL 16 + 🌐 PostGIS • 🔴 Redis 7 • 💎 Prisma ORM
Cloud & Infra:     ☁️ Amazon Web Services (S3 • CloudFront • SES • SNS • RDS • ElastiCache)
Maps & Geocoding:  🗺️ OpenStreetMap (Photon & Nominatim) • 📍 HTML5 Geolocation API
Networking:        🐻 Zustand • 🔄 Axios • ⚡ React Query • 🔐 JWT (Access & Refresh)
Deployment:        🐳 Docker & Docker Compose • 🌐 Nginx Reverse Proxy • 🛡️ Certbot SSL
```

---

## 📋 Prerequisites

Before setting up Wayza, ensure your computer has the following tools installed:

- 🟢 **[Node.js](https://nodejs.org/)** (`v18.0.0` or higher)
- 📦 **[npm](https://www.npmjs.com/)** (included with Node.js)
- 🐳 **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** *(recommended for launching PostgreSQL & Redis with 1 command)*
- 🐙 **[Git](https://git-scm.com/)**

---

## 🚀 How to Run After Cloning Repo (First-Time Setup)

Follow this simple 5-step walkthrough to get Wayza running locally in minutes:

### 1️⃣ Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/wayza.git
cd wayza
```

---

### 2️⃣ Step 2: Start PostgreSQL & Redis
The fastest way to spin up the required database and cache is via Docker Compose:
```bash
docker compose up -d
```
> **💡 What this starts**:
> - 🐘 **PostgreSQL 16 with PostGIS** on port `5432` (`db: wayza`, `user: postgres`, `password: password`)
> - 🔴 **Redis 7** on port `6379`

*(Note: If you run PostgreSQL and Redis directly on your OS, simply make sure both services are active and credentials match `server/.env`).*

---

### 3️⃣ Step 3: Setup and Start Backend Server

Open your **first terminal**:

```bash
# 1. Enter server directory
cd server

# 2. Install backend dependencies
npm install

# 3. Create .env configuration from example
cp .env.example .env

# 4. Generate Prisma client & apply database migrations
npm run db:generate
npm run db:migrate

# 5. Seed default MIT-WPU campus drop points & destinations
npm run db:seed

# 6. Start the development server
npm run dev
```
> 🚀 Backend server is now running live at: **`http://localhost:4000`**

---

### 4️⃣ Step 4: Setup and Start Frontend Client

Open a **second terminal**:

```bash
# 1. Enter client directory
cd client

# 2. Install frontend dependencies
npm install

# 3. Create .env configuration from example
cp .env.example .env

# 4. Start Vite development server
npm run dev
```
> 🌐 Frontend application is now running live at: **`http://localhost:5173`**

---

### 5️⃣ Step 5: Open in Your Browser
Open your browser and visit:
👉 **`http://localhost:5173`**

---

## ⚡ How to Run Again (After Laptop Restart / Daily Workflow)

Once the first-time setup is finished, you **never** need to re-install packages, re-migrate, or re-seed. When you restart your laptop or start a new coding session, simply run:

```bash
# 1. Ensure Docker database services are running
docker compose up -d

# 2. Terminal 1: Start Backend API
cd server
npm run dev

# 3. Terminal 2: Start Frontend App
cd client
npm run dev
```

Visit **`http://localhost:5173`** and you're good to go! 🚗💨

---

## 🧪 Testing & Development Tips

- **🔑 Local OTP Bypass**: In development mode (`NODE_ENV=development`), OTP verification codes are printed directly to the server terminal console — no real SMS or email credentials needed for local testing!
- **👥 Multi-Student Simulation**:
  1. Open **`http://localhost:5173`** in **Google Chrome** (sign in as Student 1).
  2. Open an **Incognito Window** or another browser like **Brave/Edge/Firefox** (sign in as Student 2).
  3. Pick matching destinations (e.g. *Swargate* or *Kothrud*) to test live discovery, real-time group chat, contact sharing, and fare splitting!
- **📍 Dynamic Geocoding**: Allow browser location access when prompted. You can also type custom Pune locations (*Swargate, Baner, Pune Station, Viman Nagar, Hinjewadi*) into the custom location input to test live OpenStreetMap autocomplete.

---

## 📂 Project Directory Structure

```text
wayza/
├── 🤖 .github/
│   └── workflows/ci.yml           # GitHub Actions CI pipeline (lint, test, build)
│
├── 🌐 client/                     # Frontend Single Page App (React 18 + Vite)
│   ├── public/                    # Static assets & icons
│   │   ├── favicon.svg            # Wayza brand favicons (ico, png, svg)
│   │   └── videos/                # Background video loops (wayzaLoginVid, wayzaVid)
│   ├── src/
│   │   ├── api/                   # Typed Axios API clients (auth, chat, group, journey, etc.)
│   │   ├── components/            # UI component system
│   │   │   ├── layout/            # ErrorBoundary, ProtectedRoute
│   │   │   └── ui/                # Avatar, Modal, OTPInput, Spinner, Toast
│   │   ├── hooks/                 # Custom React hooks (useAuth, useLocation, useSocket)
│   │   ├── pages/                 # Route pages (Landing, Home, Chat, Profile, VerifyEmail)
│   │   ├── store/                 # Zustand state stores (authStore)
│   │   ├── types/                 # Shared TypeScript interfaces & types
│   │   ├── utils/                 # Client utilities (constants, formatDistance, phone)
│   │   ├── App.tsx                # App routing & React Query / Toast providers
│   │   ├── index.css              # Custom styling & glassmorphism design system
│   │   └── main.tsx               # Client entry point
│   ├── package.json               # Client dependencies & scripts
│   └── vite.config.ts             # Vite dev server & build configuration
│
├── ⚙️ server/                     # Backend Node.js API & Real-time WebSocket Server
│   ├── cron/                      # Scheduled maintenance jobs (purge-old-data.ts)
│   ├── prisma/                    # Database schema & migrations
│   │   ├── schema.prisma          # PostgreSQL models (User, Group, Message, Trip, etc.)
│   │   ├── seed.ts                # Default MIT-WPU campus drop points seeder
│   │   └── migrations/            # Version-controlled SQL migration files
│   ├── src/
│   │   ├── config/                # Environment, DB, Redis, AWS (S3, SES, SNS)
│   │   ├── middleware/            # JWT authentication, rate limiting, error handling
│   │   ├── modules/               # Domain-driven backend modules
│   │   │   ├── admin/             # Admin moderation & telemetry endpoints
│   │   │   ├── auth/              # College email verification & SMS OTP controllers
│   │   │   ├── chat/              # Chat message history & persistence
│   │   │   ├── discovery/         # PostGIS geospatial student proximity discovery
│   │   │   ├── fare/              # Split-fare calculation & confirmation tracking
│   │   │   ├── group/             # Dynamic group formation & membership lifecycle
│   │   │   ├── journey/           # Journey state machine (started / ended)
│   │   │   ├── location/          # OpenStreetMap geocoding & heartbeats
│   │   │   ├── report/            # Student conduct & safety reporting
│   │   │   └── user/              # Student profile management & avatar uploads
│   │   ├── socket/                # Socket.io connection lifecycle & room events
│   │   ├── utils/                 # JWT tokens, OTP hashing, Haversine distance
│   │   ├── app.ts                 # Express application setup & middleware stack
│   │   └── server.ts              # HTTP & WebSocket server bootstrap
│   ├── ecosystem.config.js        # PM2 process manager configuration for production
│   ├── package.json               # Server dependencies & scripts
│   └── tsconfig.json              # TypeScript compiler configuration
│
├── 🚀 deployment/
│   └── nginx.conf                 # Production Nginx reverse-proxy (SSL, WSS, Rate Limits)
│
├── 🐳 docker-compose.yml          # Local PostgreSQL 16 (PostGIS) & Redis 7 services
├── 🗄️ init-db.sql                  # Automated PostGIS extension database initializer
├── 📜 setup-local-env.sh          # One-step local environment initialization script
└── 📖 README.md                   # Complete platform documentation & setup guide
```

---

## 📜 License

Built with ❤️ for university students. Licensed under the [MIT License](LICENSE).
