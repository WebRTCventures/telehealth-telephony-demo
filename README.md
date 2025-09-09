# Telehealth Telephony Demo

Direct Twilio-to-LiveKit SIP routing for telehealth calls.

## ⚠️ Demo Only - Not Production Ready

This application is for **demonstration purposes only** and should not be used in production environments. It lacks essential security features including authentication, authorization, CSRF protection, and proper error handling required for healthcare applications.

## Quick Start

1. **Install:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and add:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   LIVEKIT_WS_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   LIVEKIT_SIP_DOMAIN=sip:your-domain.sip.livekit.cloud
   ```

3. **Configure LiveKit:**
   - Create [SIP Trunk](https://docs.livekit.io/sip/trunk-inbound/) in LiveKit Console
   - Set [Dispatch Rule](https://docs.livekit.io/sip/dispatch-rule/) to create the room: `twilio-tgl-{caller_number}`

4. **Configure Twilio:**
   - Configure [Twilio Trunk](https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/) to: `sip:your-domain.sip.livekit.cloud`

5. **Run:**
   ```bash
   npm start
   ```
   Open `http://localhost:3000`

## How It Works

Patient calls → Twilio → LiveKit SIP → Room `twilio-tgl-{number}` → Provider joins via dashboard

## Production Considerations

Before using in production, implement:
- User authentication and authorization
- CSRF protection
- Input validation and sanitization
- Proper error handling and logging
- HIPAA compliance measures
- Rate limiting and security headers