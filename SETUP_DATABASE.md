# ShootFlow Database Setup Guide (Railway PostgreSQL)

## Step 1: Add PostgreSQL Database to Railway

1. Go to your **[Railway Dashboard](https://railway.com)**
2. Open your project
3. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
4. Wait for the database to provision (~30 seconds)

## Step 2: Deploy the API Server

1. In Railway, click **"+ New"** → **"GitHub Repo"**
2. Select your `pre-production-poc` repo
3. **IMPORTANT**: Set the root directory to `server`
   - Click on the new service
   - Go to **Settings** → **Build** → **Root Directory**
   - Set it to: `server`
4. Railway will auto-deploy the API

## Step 3: Connect Database to API

1. Click on your **API service** in Railway
2. Go to **Variables** tab
3. Click **"Add Variable Reference"**
4. Select your PostgreSQL database
5. Add the `DATABASE_URL` variable

## Step 4: Get the API URL

1. Click on your **API service**
2. Go to **Settings** → **Networking** → **Generate Domain**
3. Copy the generated URL (e.g., `https://shootflow-api-production.up.railway.app`)

## Step 5: Configure Frontend

1. Click on your **Frontend service** (the main app)
2. Go to **Variables** tab
3. Add this variable:

```
VITE_API_URL=https://your-api-service.up.railway.app
```

Replace with your actual API URL from Step 4.

## Step 6: Redeploy

Railway will automatically redeploy both services. Wait ~2 minutes.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Browser A     │     │   Browser B     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  Frontend (Railway)    │
         │  React + Vite          │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  API Server (Railway)  │
         │  Express + Node.js     │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  PostgreSQL (Railway)  │
         │  Shared Database       │
         └───────────────────────┘
```

## Troubleshooting

### API not connecting to database
- Make sure `DATABASE_URL` variable is set in the API service
- Check API logs in Railway for connection errors

### Frontend not loading data
- Make sure `VITE_API_URL` is set correctly
- Check browser console for CORS errors
- Verify API is running by visiting `https://your-api-url/api/health`

### Data not syncing
- Check API logs for errors
- Verify database tables exist by checking PostgreSQL in Railway
