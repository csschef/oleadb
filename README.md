# OleaDB

A full-stack recipe management system built with **Node.js, Express & PostgreSQL**.  
Designed to run on a self-hosted Windows server and stay live 24/7 inside a home network.

---

## About

OleaDB is a structured recipe database where each recipe can contain:

- Multiple steps  
- Ingredients per step  
- Categories (many-to-many)  
- Images  
- Portion scaling  

The backend serves both:

- REST API  
- Static frontend  

The application runs locally on a Windows server using **PM2** and includes automated PostgreSQL backups.

---

## Demo view recipe

[![OleaDB Demo](https://img.youtube.com/vi/mswEZ2LkbjM/hqdefault.jpg)](https://youtu.be/mswEZ2LkbjM)

## Demo create recipe

[![OleaDB Demo](https://img.youtube.com/vi/-R2ygTnwDQ0/hqdefault.jpg)](https://youtu.be/-R2ygTnwDQ0)

---

## Features

- Create, edit & delete recipes  
- Multi-step recipes  
- Ingredients per step  
- Category system (many-to-many relation)  
- Search by name  
- Filter by categories  
- Image upload (Multer)  
- Portion scaling  
- Autocomplete for ingredients  
- Unit validation against database values  
- Automatic daily PostgreSQL backup (03:00)  
- Runs as persistent Windows service (PM2)  
- Responsive design  

---

## Tech Stack

- HTML  
- CSS (custom design system)  
- Vanilla JavaScript (ES Modules)  
- Node.js  
- Express  
- PostgreSQL  
- pg (node-postgres)  
- Multer  
- PM2  
- Windows Task Scheduler  

---

## Architecture
Frontend (HTML / CSS / JS)  
↓  
Express API (Node.js)  
↓  
PostgreSQL  

Backend listens on port: 3000

---

## What I Practiced

- Full CRUD implementation  
- Relational database design  
- Many-to-many mapping tables  
- Transaction handling (BEGIN / COMMIT / ROLLBACK)  
- REST API structure  
- File upload handling  
- Server-side validation  
- State management in vanilla JS  
- Modular frontend structure  
- Process management with PM2  
- Windows server configuration  
- Automated database backups  

---

## Server & Deployment

- Runs on Windows 11 (Beelink mini PC)  
- Managed with PM2 as Windows service  
- PostgreSQL running as Windows service  
- Accessible in local network via: http://<server-ip>:3000

---

## Installation

### Clone the repository

```
git clone https://github.com/csschef/oleadb.git
cd oleadb
npm install
```

### Create a .env file
Create a .env file

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recipes
DB_USER=postgres
DB_PASSWORD=your_password
```

### Start the server

```
npm start
```

visit: http://localhost:3000

---

## Database

This repository does **not** include the live PostgreSQL database.

The full database structure (schema) can be found here: /database/schema.sql

The schema file contains:

- Tables  
- Foreign keys  
- Indexes  
- Sequences  
- Constraints  

---

### Recreate the Database

1️⃣ Create the database:

```
createdb oleadb
psql -U postgres -d oleadb -f database/schema.sql
```

---

## Security

- Backend validates units against the database
- Transactions are used during create/update operations
- Image uploads are stored locally
- No external exposure (LAN-only setup)

---

## Production (Windows Server Setup)

The application runs on:

- Windows 11
- Node.js
- PM2 as a Windows service

```
pm2 start api/server.js --name oleadb
pm2 save
```

---

## Automatic Database Backup

A backup script runs daily at 03:00 via Windows Task Scheduler.

The backup script:

- Uses pg_dump
- Saves to C:\Backups\OleaDB
- Cleans up old backups
- Exits properly with exit 0
