const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const { AccessToken, RoomServiceClient, CreateRoomRequest } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory call logs (replace with database in production)
const callLogs = [];
const videoSessions = [];
const activeCalls = new Map(); // Track active calls and their LiveKit rooms

// Initialize LiveKit Room Service Client
const roomService = new RoomServiceClient(
  process.env.LIVEKIT_WS_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

// Initiate call to patient
app.post('/api/call-patient', async (req, res) => {
  const { patientId, patientPhone, providerId } = req.body;
  
  try {
    // Create LiveKit room for the call
    const roomName = `call-${patientId}-${Date.now()}`;
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 10
    });

    // Initiate Twilio call with SIP integration
    const call = await client.calls.create({
      url: `${req.protocol}://${req.get('host')}/api/twiml/connect-sip?room=${roomName}`,
      to: patientPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${req.protocol}://${req.get('host')}/api/call-status`,
      statusCallbackEvent: ['initiated', 'answered', 'completed']
    });

    const callLog = {
      id: call.sid,
      patientId,
      providerId,
      patientPhone,
      roomName,
      status: 'initiated',
      timestamp: new Date().toISOString()
    };
    
    callLogs.push(callLog);
    activeCalls.set(call.sid, { roomName, patientId, providerId });
    
    res.json({ 
      success: true, 
      callId: call.sid,
      roomName,
      message: 'Call initiated to patient'
    });
  } catch (error) {
    console.error('Call initiation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// TwiML response to connect patient to LiveKit via SIP
app.post('/api/twiml/connect-sip', (req, res) => {
  const { room } = req.query;
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say('Connecting you to your healthcare provider.');
  
  // Connect directly to LiveKit SIP endpoint
  const dial = twiml.dial({ timeout: 30 });
  dial.sip(`sip:${room}@${process.env.LIVEKIT_SIP_DOMAIN}`);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle call completion
app.post('/api/call-completed', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Thank you for using our telehealth service. Goodbye.');
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle call status updates
app.post('/api/call-status', async (req, res) => {
  const { CallSid, CallStatus } = req.body;
  
  const callLog = callLogs.find(log => log.id === CallSid);
  if (callLog) {
    callLog.status = CallStatus;
    callLog.lastUpdated = new Date().toISOString();
  }
  
  // Clean up LiveKit room when call ends
  if (CallStatus === 'completed' || CallStatus === 'failed') {
    const callInfo = activeCalls.get(CallSid);
    if (callInfo) {
      try {
        // Optionally end the LiveKit room
        // await roomService.deleteRoom(callInfo.roomName);
        activeCalls.delete(CallSid);
      } catch (error) {
        console.error('Error cleaning up room:', error);
      }
    }
  }
  
  res.sendStatus(200);
});

// Get call logs for EHR
app.get('/api/call-logs/:patientId', (req, res) => {
  const { patientId } = req.params;
  const logs = callLogs.filter(log => log.patientId === patientId);
  res.json(logs);
});

// Get active calls for provider dashboard
app.get('/api/active-calls/:providerId', (req, res) => {
  const { providerId } = req.params;
  const providerCalls = [];
  
  for (const [callId, callInfo] of activeCalls.entries()) {
    if (callInfo.providerId === providerId) {
      const callLog = callLogs.find(log => log.id === callId);
      providerCalls.push({
        callId,
        ...callInfo,
        status: callLog?.status || 'unknown'
      });
    }
  }
  
  res.json(providerCalls);
});

// Generate LiveKit access token for healthcare workers
app.post('/api/livekit-token', (req, res) => {
  const { participantName, roomName, participantType = 'provider' } = req.body;
  
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return res.status(500).json({ error: 'LiveKit credentials not configured' });
  }

  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantName,
    ttl: '1h'
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  res.json({ 
    token: token.toJwt(),
    wsUrl: process.env.LIVEKIT_WS_URL,
    roomName
  });
});

// Get call room info for provider to join
app.get('/api/call-room/:callId', (req, res) => {
  const { callId } = req.params;
  const callInfo = activeCalls.get(callId);
  
  if (!callInfo) {
    return res.status(404).json({ error: 'Call not found' });
  }
  
  res.json(callInfo);
});

// Join existing call room (for providers)
app.post('/api/join-call', async (req, res) => {
  const { callId, providerId } = req.body;
  
  const callInfo = activeCalls.get(callId);
  if (!callInfo) {
    return res.status(404).json({ error: 'Call not found or ended' });
  }
  
  try {
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: `provider-${providerId}`,
      ttl: '1h'
    });

    token.addGrant({
      room: callInfo.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    res.json({
      success: true,
      token: token.toJwt(),
      wsUrl: process.env.LIVEKIT_WS_URL,
      roomName: callInfo.roomName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video sessions
app.get('/api/video-sessions/:patientId', (req, res) => {
  const { patientId } = req.params;
  const sessions = videoSessions.filter(session => session.patientId === patientId);
  res.json(sessions);
});

app.listen(port, () => {
  console.log(`Telehealth telephony demo running on port ${port}`);
});