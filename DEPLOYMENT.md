# HeyHey Deployment Guide

This guide covers deploying HeyHey to production using **Vercel** (frontend) and **Railway** (backend).

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │ ──────► │    Railway      │
│  (React Client) │  WS/HTTP│  (Node Server)  │
│                 │ ◄────── │  (Socket.io)    │
└─────────────────┘         └─────────────────┘
```

## Prerequisites

- GitHub repository with the code
- Vercel account (free tier works)
- Railway account ($5/mo hobby plan recommended for no cold starts)

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your HeyHey repository
4. Railway will auto-detect the monorepo

### 1.2 Configure Railway Service

1. In your project, click on the service
2. Go to **Settings** → **Root Directory**: Set to `packages/server`
3. Go to **Variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `CLIENT_URL` | `https://your-app.vercel.app` | Your Vercel frontend URL (add after Vercel deploy) |
| `PORT` | `3000` | (Optional, Railway sets this automatically) |

4. Go to **Settings** → **Networking** → Generate a domain (e.g., `heyhey-server.up.railway.app`)

### 1.3 Verify Deployment

Visit `https://your-railway-domain.up.railway.app/health` - should return:
```json
{"status":"ok","timestamp":"..."}
```

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project" → Import your GitHub repo
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `packages/client`
   - **Build Command**: (leave default, vercel.json handles it)
   - **Output Directory**: `dist`

### 2.2 Configure Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SERVER_URL` | `https://your-railway-domain.up.railway.app` | Your Railway backend URL |

### 2.3 Deploy

Click "Deploy" - Vercel will build and deploy automatically.

## Step 3: Update Railway CORS

After Vercel deploys, go back to Railway and update:

| Variable | Value |
|----------|-------|
| `CLIENT_URL` | `https://your-app.vercel.app` |

For multiple origins (e.g., preview deployments):
```
CLIENT_URL=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

## Environment Variables Reference

### Server (Railway)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port (Railway sets automatically) |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed CORS origins (comma-separated) |

### Client (Vercel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SERVER_URL` | Yes | `http://localhost:3000` | Socket.io server URL |

## Deployment Checklist

- [ ] Railway backend deployed and healthy
- [ ] Railway domain generated
- [ ] Vercel frontend deployed
- [ ] `VITE_SERVER_URL` set in Vercel to Railway URL
- [ ] `CLIENT_URL` set in Railway to Vercel URL
- [ ] Test WebSocket connection in production
- [ ] Test multiplayer game flow

## Troubleshooting

### WebSocket Connection Fails

1. Check browser console for CORS errors
2. Verify `CLIENT_URL` in Railway includes your Vercel domain
3. Ensure Railway is using HTTPS (not HTTP)

### "Cannot connect to server"

1. Check Railway deployment logs for errors
2. Verify `/health` endpoint responds
3. Check `VITE_SERVER_URL` is correct (no trailing slash)

### Build Fails on Vercel

1. Check that `npm run build:shared` runs before client build
2. Verify monorepo dependencies are correct
3. Check Vercel build logs for specific errors

## Local Development

```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Start client
npm run dev:client
```

Both default to localhost URLs, no env vars needed for local dev.

## Updating Deployments

Both services auto-deploy on push to main:
- **Vercel**: Rebuilds on every push
- **Railway**: Rebuilds on every push

For manual redeploy:
- Vercel: Project → Deployments → Redeploy
- Railway: Service → Deployments → Redeploy

---

## iOS Build & TestFlight Deployment

### Prerequisites

- macOS with Xcode 16.0+
- Apple Developer account with signing certificates configured
- Xcode command line tools: `xcode-select --install`

### Build Pipeline

The iOS build runs in this order:

```
build:shared → build:client → cap sync → xcodebuild
```

| Command | Description |
|---------|-------------|
| `npm run build:ios` | Full pipeline: build web + Simulator debug build |
| `npm run build:ios -- release` | Full pipeline: build web + Release archive |
| `npm run cap:sync -w @heyhey/client` | Sync web assets to iOS project |
| `npm run cap:open -w @heyhey/client` | Open Xcode project |

### Debug Build (Simulator)

```bash
npm run build:ios
```

Builds shared + client web assets, syncs to the iOS project, and compiles a debug build for the iOS Simulator (iPad 10th generation).

### Release Build (TestFlight)

```bash
npm run build:ios -- release
```

Runs the full pipeline and produces an `.xcarchive` at `build/ios/HeyHey.xcarchive`, then exports an IPA using `scripts/ExportOptions.plist`.

### Uploading to TestFlight

After a release build:

```bash
xcrun altool --upload-app \
  -f build/ios/export/HeyHey.ipa \
  -t ios \
  -u YOUR_APPLE_ID \
  -p @keychain:AC_PASSWORD
```

Or open `build/ios/HeyHey.xcarchive` in Xcode Organizer and use "Distribute App".

### Syncing Web Assets Only

After changing web code without a full rebuild:

```bash
npm run build:shared && npm run build:client
npm run cap:sync -w @heyhey/client
```

### Build Configurations

| Configuration | Use Case | Optimizations |
|--------------|----------|---------------|
| Debug | Development, Simulator | Disabled, testability enabled |
| Release | TestFlight, App Store | Full optimization |

### iOS Project Structure

```
packages/client/
├── ios/
│   ├── App/
│   │   ├── App.xcodeproj/           # Xcode project
│   │   │   └── xcshareddata/xcschemes/
│   │   │       └── App.xcscheme     # Shared build scheme
│   │   └── App/
│   │       ├── AppDelegate.swift
│   │       ├── Info.plist
│   │       └── Assets.xcassets/
│   └── CapApp-SPM/                  # Capacitor SPM deps
├── capacitor.config.ts
└── dist/                            # Built web assets (webDir)
scripts/
├── build-ios.sh                     # iOS build script
└── ExportOptions.plist              # TestFlight export config
```

### iOS Troubleshooting

**"No signing certificate"**: Sign in to Xcode > Settings > Accounts with your Apple Developer account.

**"cap sync" fails**: Ensure web assets are built first: `npm run build:client`

**Simulator not found**: List available simulators with `xcrun simctl list devices available`. Edit `scripts/build-ios.sh` to change the target device.
