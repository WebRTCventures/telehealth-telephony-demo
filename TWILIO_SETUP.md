# Twilio Setup Guide

## Step 1: Get Twilio Credentials

1. Go to https://console.twilio.com
2. Sign up or log in
3. From the dashboard, copy:
   - **Account SID** 
   - **Auth Token**

## Step 2: Buy a Phone Number

1. Go to **Phone Numbers > Manage > Buy a number**
2. Choose a number with **Voice** capability
3. Buy the number
4. Copy the phone number (format: +1234567890)

## Step 3: Create TwiML Application (Optional but Recommended)

1. Go to **Voice > TwiML > TwiML Apps**
2. Click **Create new TwiML App**
3. Set:
   - **Friendly Name**: Telehealth Demo
   - **Voice Request URL**: `https://your-domain.com/api/twiml/connect-sip`
   - **Voice Method**: POST
4. Save and copy the **Application SID**

## Step 4: Configure Your .env File

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## That's It for Twilio!

No SIP trunking needed - we're using Twilio's built-in SIP capabilities to connect directly to LiveKit.

The current code will:
1. Make outbound calls using your Twilio number
2. When patient answers, connect them via SIP to LiveKit
3. Provider joins the same LiveKit room via WebRTC