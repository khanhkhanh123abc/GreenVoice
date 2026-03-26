# COMP1640 Enterprise Web

## Cách chạy

### 1. Backend (server)
```bash
cd server
npm install
npm run dev
```
Server chạy tại: http://localhost:5000

### 2. Frontend (client)
Mở terminal mới:
```bash
cd client
npm install
npm run dev
```
Frontend chạy tại: http://localhost:5173

## Cấu trúc project
```
COMP1640_EnterpriseWeb-main/
├── server/          ← Express + MongoDB API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
└── client/          ← React + Vite frontend
    └── src/
        ├── api/
        ├── context/
        ├── components/
        └── pages/
```
