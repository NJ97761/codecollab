# 🚀 CodeCollab Deployment Guide

## Architecture Overview
- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway (Node.js + Socket.IO)
- **Database**: Firestore (Google Firebase)

---

## Prerequisites
- ✅ GitHub account with repository connected
- ✅ Vercel account (connected to GitHub)
- ✅ Railway account (connected to GitHub)
- ✅ Firebase project with service account key

---

## Step 1: Set Up Firebase

### Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key** (save as JSON)
5. Copy the credentials (you'll need these)

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project** → **Deploy from GitHub**
3. Select your `codecollab` repository
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

### 2.2 Add Environment Variables
In Railway Project Settings → Variables, add:

```
PORT=3001
FIREBASE_SERVICE_ACCOUNT_JSON=<paste your Firebase service account JSON>
```

### 2.3 Deploy
Click **Deploy** and wait for it to finish.

**Get your Railway URL**: Should look like `https://your-app.railway.app`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select your `codecollab` repository
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)

### 3.2 Add Environment Variables
In Vercel Project Settings → Environment Variables, add:

```
VITE_SERVER_URL=https://your-railway-app.railway.app
VITE_FIREBASE_API_KEY=<from Firebase>
VITE_FIREBASE_AUTH_DOMAIN=<from Firebase>
VITE_FIREBASE_PROJECT_ID=<from Firebase>
VITE_FIREBASE_STORAGE_BUCKET=<from Firebase>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase>
VITE_FIREBASE_APP_ID=<from Firebase>
```

### 3.3 Deploy
Click **Deploy** and wait for it to finish.

**Your app will be live at**: `https://your-project.vercel.app`

---

## Step 4: Test the Deployment

1. Open your Vercel URL in browser
2. Try to:
   - ✅ Sign in with Firebase
   - ✅ Create a new project
   - ✅ Test real-time collaboration (open in 2 tabs)
   - ✅ Run code
   - ✅ Add comments

---

## Step 5: Continuous Deployment

Every time you push to `main` branch:
- ✅ Vercel automatically deploys frontend
- ✅ Railway automatically deploys backend

To manually trigger:
- Vercel: Push to main or manually trigger from dashboard
- Railway: Push to main or manually trigger from dashboard

---

## Troubleshooting

### Frontend-Backend Connection Issues
**Symptom**: Can't join rooms, "WebSocket connection failed"

**Fix**:
1. Check `VITE_SERVER_URL` is correct in Vercel env vars
2. Check Railway backend is running (`Status: Success`)
3. Check CORS is configured correctly in `server/index.js`

### Firebase Not Connecting
**Symptom**: Can't sign in, Firestore errors in console

**Fix**:
1. Verify Firebase service account JSON is valid
2. Check Firebase project ID matches in code
3. Ensure Firestore database is created

### Build Fails on Vercel
**Symptom**: Deployment error with TypeScript/build errors

**Fix**:
1. Run `npm run build` locally to check for errors
2. Run `npm run typecheck` to verify TypeScript
3. Commit and push fixes to trigger redeploy

---

## Environment Variables Reference

### Frontend (.env.local)
```
VITE_SERVER_URL=http://localhost:3001              # Dev: localhost, Prod: Railway URL
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Backend (Railway)
```
PORT=3001
FIREBASE_SERVICE_ACCOUNT_JSON=... # Full JSON as string
```

---

## Useful Links
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://railway.app/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Socket.IO Docs](https://socket.io/docs/)

---

## Need Help?
- Check logs: Railway Dashboard → Monitor → View Logs
- Check logs: Vercel Dashboard → Deployments → Logs
- Check browser console for errors
