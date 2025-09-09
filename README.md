# Telehealth Telephony Demo

Direct Twilio-to-LiveKit SIP routing for telehealth calls.

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
   - Create SIP Trunk in LiveKit Console
   - Set Dispatch Rule: `twilio-tgl-{caller_number}`

4. **Configure Twilio:**
   - Point phone number to: `sip:your-domain.sip.livekit.cloud`

5. **Run:**
   ```bash
   npm start
   ```
   Open `http://localhost:3000`

## How It Works

Patient calls → Twilio → LiveKit SIP → Room `twilio-tgl-{number}` → Provider joins via dashboard