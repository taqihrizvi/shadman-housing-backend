# Shadman Housing - Backend API (PostgreSQL)

Backend API for Shadman Housing Management System built with Node.js, Express, Prisma ORM and PostgreSQL.

## Features

- 🔐 JWT Authentication & Authorization
- 🏘️ Inventory Management (Properties/Plots)
- 👥 Customer Management
- 📝 Forms Management (Biyana, Sale Agreement, Transfer)
- 🧾 Voucher/Receipt Management
- 📊 Reports & Analytics
- 🔒 Role-based Access Control

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** Helmet, CORS, bcryptjs

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Quick Start

### 1. Install PostgreSQL

**Windows:** Download from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

**macOS:** `brew install postgresql@15 && brew services start postgresql@15`

**Linux:** `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`

### 2. Create Database

```bash
psql -U postgres
CREATE DATABASE shadman_housing;
\q
```

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/shadman_housing?schema=public"
```

### 4. Run Migrations & Seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Server starts at `http://localhost:5000`

## Default Credentials

- **Admin:** admin@shadmanhousing.com / admin123
- **Agent:** ali@shadmanhousing.com / agent123

## API Documentation

See full API documentation in the complete README or visit `/api/health` to verify server status.

## Prisma Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open database GUI
- `npx prisma migrate dev --name name` - Create new migration

## License

ISC
