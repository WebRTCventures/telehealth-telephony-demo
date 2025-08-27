# Telehealth Telephony Demo - Inbound Calls

Demo of inbound telephony integration where patients call the clinic and providers answer in their browser.

## Features

- **Provider Dashboard**: Real-time incoming call notifications
- **Twilio VoIP**: Patients call clinic PSTN number
- **WebRTC**: Providers answer calls directly in browser
- **Call Logging**: All call metadata automatically logged

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Twilio:**
   - Copy `.env.example` to `.env`
   - Add your Twilio credentials:
     ```
     TWILIO_ACCOUNT_SID=your_account_sid
     TWILIO_AUTH_TOKEN=your_auth_token
     TWILIO_PHONE_NUMBER=+1234567890
     ```

3. **Configure LiveKit:**
   - Add LiveKit credentials to `.env`:
     ```
     LIVEKIT_API_KEY=your_livekit_api_key
     LIVEKIT_API_SECRET=your_livekit_api_secret
     LIVEKIT_WS_URL=wss://your-project.livekit.cloud
     LIVEKIT_SIP_DOMAIN=sip.livekit.cloud
     ```

4. **Configure Twilio Webhook:**
   - Set your Twilio phone number webhook URL to: `http://your-domain.com/api/incoming-call`
   - For local testing, use ngrok: `ngrok http 3000`

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open the Provider Dashboard:**
   Navigate to `http://localhost:3000`

## How It Works

1. Patient calls the clinic's phone number (PSTN)
2. Twilio receives the call and puts patient on hold with music
3. Provider dashboard shows incoming call notification in real-time
4. Provider clicks "Answer Call" to join via WebRTC in browser
5. Patient is connected to provider through LiveKit SIP bridge
6. Call metadata is automatically logged in the system

## API Endpoints

- `POST /api/incoming-call` - Twilio webhook for incoming calls
- `GET /api/incoming-calls` - Get waiting incoming calls
- `POST /api/answer-call` - Provider answers incoming call
- `GET /api/call-logs` - Retrieve all call history
- `GET /api/call-logs/:phoneNumber` - Get logs for specific phone
- `POST /api/call-status` - Webhook for call status updates

## Setup Instructions

1. Configure your Twilio phone number webhook to: `http://your-domain.com/api/incoming-call`
2. Ensure LiveKit SIP is properly configured
3. Start the server and open the provider dashboard
4. Patients can now call your Twilio number and you'll see incoming calls

## Value to Clinic

- **Universal Access**: Patients without internet can call from any phone
- **Unified Interface**: Providers handle all calls in one browser dashboard
- **No Validation Issues**: No outbound call restrictions or verification needed
- **Cost Effective**: Patients use their existing phone service
- **Professional**: Clinic maintains a single published phone number

**Call Flow**: Patient phone → PSTN → Twilio → LiveKit SIP → WebRTC → Provider browser

## Demo Limitations

- Uses in-memory storage (replace with database for production)
- Simplified authentication (implement proper auth for production)
- Basic error handling (enhance for production use)
- No patient identification (enhance with caller ID lookup)