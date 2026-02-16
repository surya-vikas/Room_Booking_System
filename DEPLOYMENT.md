# Deployment Guide

## Backend (Render)
1. Push `smartspace/server` to GitHub.
2. On Render, create a `Web Service` from that repo/folder.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `server/.env.example`.
6. Set `MONGO_URI` to your hosted MongoDB URI.
7. Deploy and note backend URL.

## Frontend (Netlify)
1. Push `smartspace/client` to GitHub.
2. On Netlify, create a new site from repo.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env variable: `VITE_API_URL=<render-backend-url>/api`
6. Deploy.
