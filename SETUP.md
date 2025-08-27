# LiveKit + Twilio SIP Integration Setup

## Prerequisites

1. **LiveKit Cloud Account**: Sign up at https://cloud.livekit.io
2. **Twilio Account**: Sign up at https://twilio.com

## Step 1: Configure LiveKit Cloud

1. Create a new project in LiveKit Cloud
2. Enable SIP integration in your project settings
3. Note down your:
   - API Key
   - API Secret
   - WebSocket URL (wss://your-project.livekit.cloud)
   - SIP Domain (usually sip.livekit.cloud)

## Step 2: Configure Twilio SIP Trunking

1. In Twilio Console, go to **Voice > SIP Trunking**
2. Create a new SIP Trunk with these settings:
   - **Friendly Name**: LiveKit Integration
   - **Request URL**: `https://your-domain.com/api/twiml/connect-sip`
   - **Authentication**: None (or configure as needed)

3. Configure SIP Domain:
   - Go to **Voice > SIP Domains**
   - Create domain pointing to your LiveKit SIP endpoint
   - URL: `sip.livekit.cloud` (or your custom SIP domain)

## Step 3: Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
LIVEKIT_SIP_DOMAIN=sip.livekit.cloud

PORT=3000
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Test the Integration

1. Start the server:
   ```bash
   npm start
   ```

2. Open http://localhost:3000

3. Click "Call Patient" - this will:
   - Create a LiveKit room
   - Call the patient's phone via Twilio
   - Connect patient to LiveKit room via SIP

4. Click "Join Call" - this will:
   - Connect the provider to the same LiveKit room
   - Enable audio/video communication

## Troubleshooting

### Common Issues:

1. **SIP Connection Failed**
   - Verify LiveKit SIP domain is correctly configured
   - Check Twilio SIP trunk settings
   - Ensure firewall allows SIP traffic

2. **LiveKit Connection Failed**
   - Verify API credentials
   - Check WebSocket URL format
   - Ensure room creation permissions

3. **Audio Issues**
   - Check browser microphone permissions
   - Verify SIP audio codecs compatibility
   - Test with different browsers

### Debug Mode:

Enable debug logging by adding to your `.env`:
```env
DEBUG=livekit*
```

## Production Considerations

1. **Security**: Implement proper authentication
2. **Database**: Replace in-memory storage with persistent database
3. **Error Handling**: Add comprehensive error handling
4. **Monitoring**: Add call quality monitoring
5. **Scaling**: Consider load balancing for multiple concurrent calls