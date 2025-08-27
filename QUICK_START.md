# Quick Start Guide

## 1. Setup Accounts (5 minutes)

### Twilio:
1. Go to https://console.twilio.com → Sign up
2. Copy **Account SID** and **Auth Token** from dashboard
3. Buy a phone number with Voice capability

### LiveKit:
1. Go to https://cloud.livekit.io → Sign up  
2. Create project → Go to Settings > Keys
3. Copy **API Key**, **API Secret**, and **WebSocket URL**
4. Go to Settings > SIP → Enable SIP

## 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# LiveKit  
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_here
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

## 3. Run the Demo

```bash
npm install
npm start
```

Open http://localhost:3000

## 4. Test the Flow

1. **Click "Call Patient"** → Creates LiveKit room + calls patient phone
2. **Patient answers** → Automatically joins LiveKit room via SIP  
3. **Click "Join Call"** → Provider joins same room via WebRTC
4. **Both can now talk** → Audio flows through LiveKit

## How It Works

```
Patient Phone ←→ Twilio ←→ SIP ←→ LiveKit Room ←→ WebRTC ←→ Provider Browser
```

- Patient gets regular phone call
- Provider gets web-based audio/video
- Both connected through LiveKit Cloud

## Troubleshooting

**Call fails?** Check Twilio credentials and phone number format
**Can't join room?** Verify LiveKit API credentials  
**No audio?** Check browser microphone permissions