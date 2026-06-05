# Deployment Guide - Vercel

This guide will help you deploy the TCGPlayer Manager to Vercel.

## Prerequisites
- GitHub account
- Vercel account (free)
- Your code pushed to a GitHub repository
- PostgreSQL database (Neon, Supabase, or Railway)

## Option 1: Full Vercel Deployment (Recommended)

### Step 1: Set up PostgreSQL Database

1. Go to [Neon.tech](https://neon.tech) (free PostgreSQL)
2. Create a new database
3. Copy the connection string

### Step 2: Push Code to GitHub

```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/tcgplayer-manager.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_API_URL`: Your backend URL (or use same domain)
   - `DATABASE_URL`: Your PostgreSQL connection string
6. Click "Deploy"

### Step 4: Deploy Backend as Serverless Functions

The backend needs to be converted to Vercel serverless functions. This requires restructuring the code.

## Option 2: Hybrid Approach (Easier)

### Deploy Frontend to Vercel, Backend to Render

1. **Frontend (Vercel)**:
   - Follow steps above for frontend only
   - Set `VITE_API_URL` to your Render backend URL

2. **Backend (Render)**:
   - Use the `render.yaml` file
   - Deploy only the backend service
   - Get the backend URL from Render

### Step 1: Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
6. Click "Deploy"

### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://your-backend.onrender.com`)
6. Click "Deploy"

## Free Tier Limitations

**Vercel:**
- 100GB bandwidth per month
- Unlimited deployments
- Automatic HTTPS
- No server spin-down

**Render:**
- Backend spins down after 15 minutes inactivity
- Cold start ~30 seconds
- Free PostgreSQL included

## Important Notes

- The auto-import feature relies on local file paths (C:\Users\giofl\Downloads)
- For cloud deployment, you'll need to modify the auto-import to use file uploads or cloud storage
- Automatic backups are handled by your PostgreSQL provider
- The app will be accessible from any device via the provided URL
