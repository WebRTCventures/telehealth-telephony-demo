# Telehealth Telephony Demo

Mini demo of telephony integration into telehealth solution with one-click calls from EHR.

## Features

- **EHR Interface**: Patient chart with "Call Patient" button
- **Twilio VoIP**: PSTN calls to patient phones
- **WebRTC**: Provider joins calls via browser
- **Call Logging**: Metadata automatically logged back to EHR

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

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open the EHR interface:**
   Navigate to `http://localhost:3000`

## How It Works

1. Clinic staff opens patient chart and clicks "Call Patient"
2. EHR triggers Twilio Voice API to call patient's PSTN number
3. Patient answers their phone
4. Provider joins the call via WebRTC in their browser
5. Call metadata is automatically logged in the EHR system

## API Endpoints

- `POST /api/call-patient` - Initiate call to patient
- `GET /api/token/:providerId` - Get WebRTC access token
- `GET /api/call-logs/:patientId` - Retrieve call history
- `POST /api/call-status` - Webhook for call status updates

## Demo Limitations

- Uses in-memory storage (replace with database for production)
- Simplified authentication (implement proper auth for production)
- Basic error handling (enhance for production use)