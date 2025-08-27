# Inbound Call Setup Guide

## Quick Setup for Inbound Telehealth Calls

### 1. Twilio Configuration

1. **Purchase a Twilio Phone Number**
   - Go to Twilio Console → Phone Numbers → Manage → Buy a number
   - Choose a number in your desired area code

2. **Configure Webhook**
   - In Twilio Console, go to your phone number settings
   - Set the webhook URL for voice calls to: `http://your-domain.com/api/incoming-call`
   - For local development, use ngrok: `ngrok http 3000`

### 2. LiveKit SIP Configuration

1. **Enable SIP in LiveKit**
   - Go to LiveKit Cloud Console
   - Enable SIP integration for your project
   - Note your SIP domain (usually `sip.livekit.cloud`)

2. **Update Environment Variables**
   ```env
   LIVEKIT_SIP_DOMAIN=sip.livekit.cloud
   ```

### 3. Testing the Flow

1. **Start the server**: `npm start`
2. **Open provider dashboard**: `http://localhost:3000`
3. **Call your Twilio number** from any phone
4. **See the incoming call** appear on the dashboard
5. **Click "Answer Call"** to connect via WebRTC

### 4. Expected Behavior

- **Patient calls** → Hears "Thank you for calling our telehealth clinic..."
- **Provider sees** → Real-time notification with patient's phone number
- **Provider clicks "Answer"** → Automatically joins LiveKit room
- **Patient hears** → "Connecting you to your healthcare provider now"
- **Both parties** → Connected via audio/video call

### 5. Troubleshooting

- **No incoming calls showing**: Check Twilio webhook URL
- **Can't connect to LiveKit**: Verify SIP domain and credentials
- **Audio issues**: Check browser microphone permissions
- **Call drops**: Ensure stable internet connection

### 6. Production Considerations

- Use HTTPS for webhook URLs
- Implement proper authentication
- Add patient identification via caller ID lookup
- Set up call recording if required
- Add call quality monitoring