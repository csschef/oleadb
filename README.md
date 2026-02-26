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

Backend listens on port: Backend listens on port: 3000

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
