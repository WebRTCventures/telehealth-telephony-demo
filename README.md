# Telehealth Telephony Demo - Direct SIP Routing

Demo of direct Twilio-to-LiveKit SIP routing where patients call the clinic and are automatically routed to LiveKit rooms.

## Features

- **Direct SIP Routing**: Twilio routes calls directly to LiveKit SIP
- **Auto Room Creation**: Calls create rooms with pattern `twilio-tgl-{caller_number}`
- **Provider Dashboard**: Real-time monitoring of active LiveKit rooms
- **WebRTC**: Providers join calls directly in browser
- **No Webhooks**: Simplified architecture with direct SIP integration

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure LiveKit SIP:**
   - Set up SIP Trunk in LiveKit Console
   - Configure Dispatch Rule: `twilio-tgl-{caller_number}`
   - Note your SIP domain from LiveKit

3. **Configure Twilio:**
   - Copy `.env.example` to `.env`
   - Add your credentials:
     ```
     TWILIO_ACCOUNT_SID=your_account_sid
     TWILIO_AUTH_TOKEN=your_auth_token
     TWILIO_PHONE_NUMBER=+1234567890
     LIVEKIT_WS_URL=wss://your-project.livekit.cloud
     LIVEKIT_API_KEY=your_livekit_api_key
     LIVEKIT_API_SECRET=your_livekit_api_secret
     LIVEKIT_SIP_DOMAIN=sip:your-domain.sip.livekit.cloud
     ```

4. **Configure Twilio Phone Number:**
   - Point your Twilio phone number directly to LiveKit SIP URI
   - No webhook needed - direct SIP routing

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open the Provider Dashboard:**
   Navigate to `http://localhost:3000`

## How It Works

1. Patient calls the clinic's Twilio phone number
2. Twilio routes call directly to LiveKit SIP endpoint
3. LiveKit creates room: `twilio-tgl-{caller_number}`
4. Provider dashboard detects new room with 1 participant
5. Provider clicks "Answer Call" to join the room
6. Both parties connected via LiveKit WebRTC

## API Endpoints

- `GET /api/active-rooms` - Get active LiveKit rooms
- `POST /api/join-room` - Provider joins LiveKit room
- `POST /api/livekit-token` - Generate LiveKit access token

## Configuration

### Twilio Phone Number Setup
Configure your Twilio phone number to route directly to:
```
sip:your-domain.sip.livekit.cloud
```

### LiveKit Dispatch Rule
Set up dispatch rule in LiveKit Console:
- Pattern: `twilio-tgl-{caller_number}`
- This creates unique rooms for each caller

## Value to Clinic

- **Simplified Architecture**: No webhooks or complex routing
- **Direct Connection**: Minimal latency with direct SIP routing  
- **Auto Scaling**: LiveKit handles room creation automatically
- **Universal Access**: Patients call from any phone
- **Real-time Dashboard**: Providers see incoming calls instantly

**Call Flow**: Patient phone → PSTN → Twilio → LiveKit SIP → Room `twilio-tgl-{number}` → Provider WebRTC

## Demo Limitations

- Uses in-memory storage (replace with database for production)
- Simplified authentication (implement proper auth for production)
- Basic error handling (enhance for production use)
- No call recording (add if required for compliance)