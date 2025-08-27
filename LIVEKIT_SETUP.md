# LiveKit Cloud Setup Guide

## Step 1: Create LiveKit Cloud Account

1. Go to https://cloud.livekit.io
2. Sign up with your email
3. Verify your email and log in

## Step 2: Create a New Project

1. Click **"Create Project"**
2. Enter project name: `telehealth-demo`
3. Choose a region close to you
4. Click **Create**

## Step 3: Get API Credentials

1. In your project dashboard, go to **Settings > Keys**
2. Copy these values:
   - **API Key** (starts with `API`)
   - **API Secret** (long string)
   - **WebSocket URL** (looks like `wss://telehealth-demo-xxxxxxx.livekit.cloud`)

## Step 4: Enable SIP Integration

1. In your project, go to **Settings > SIP**
2. Toggle **"Enable SIP"** to ON
3. Note the **SIP URI**: `sip.livekit.cloud` (this is your SIP domain)

## Step 5: Configure Your .env File

```env
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_very_long_secret_here
LIVEKIT_WS_URL=wss://telehealth-demo-xxxxxxx.livekit.cloud
LIVEKIT_SIP_DOMAIN=sip.livekit.cloud
```

## Step 6: Test SIP Integration (Optional)

1. In LiveKit dashboard, go to **Rooms**
2. Create a test room manually
3. Try calling the SIP endpoint to verify it works

## That's It for LiveKit!

The SIP integration is automatically enabled when you turn on the SIP feature. LiveKit will:
1. Accept SIP calls at `sip.livekit.cloud`
2. Route them to the correct room based on the SIP URI
3. Handle audio bridging between SIP and WebRTC participants