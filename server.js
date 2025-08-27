const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const { AccessToken, RoomServiceClient, CreateRoomRequest } = require('livekit-server-sdk');
require('dotenv').config();

// Simple logger
const log = {
  info: (msg, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, error = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error),
  warn: (msg, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data)
};

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
  
  log.info('Initiating call to patient', { patientId, patientPhone, providerId });
  
  try {
    // Create LiveKit room for the call
    const roomName = `call-${patientId}-${Date.now()}`;
    log.info('Creating LiveKit room', { roomName });
    
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 10
    });
    
    log.info('LiveKit room created successfully', { roomName, roomId: room.name });

    // Initiate Twilio call with SIP integration
    const call = await client.calls.create({
      url: `${req.protocol}://${req.get('host')}/api/twiml/connect-sip?room=${roomName}`,
      to: patientPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${req.protocol}://${req.get('host')}/api/call-status`,
      statusCallbackEvent: ['initiated', 'answered', 'completed']
    });
    
    log.info('Twilio call initiated', { callSid: call.sid, to: patientPhone, roomName });

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
    log.error('Call initiation failed', { patientId, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// TwiML response to connect patient to LiveKit via SIP
app.post('/api/twiml/connect-sip', (req, res) => {
  const { room } = req.query;
  const sipUri = `sip:${room}@${process.env.LIVEKIT_SIP_DOMAIN}`;
  
  log.info('Generating TwiML for SIP connection', { room, sipUri });
  
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Connecting you to your healthcare provider.');
  
  // Connect directly to LiveKit SIP endpoint
  const dial = twiml.dial({ timeout: 30 });
  dial.sip(sipUri);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle call completion
app.post('/api/call-completed', (req, res) => {
  log.info('Call completed, generating goodbye TwiML');
  
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Thank you for using our telehealth service. Goodbye.');
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle call status updates
app.post('/api/call-status', async (req, res) => {
  const { CallSid, CallStatus } = req.body;
  
  log.info('Call status update received', { CallSid, CallStatus });
  
  const callLog = callLogs.find(log => log.id === CallSid);
  if (callLog) {
    callLog.status = CallStatus;
    callLog.lastUpdated = new Date().toISOString();
    log.info('Updated call log', { CallSid, newStatus: CallStatus });
  } else {
    log.warn('Call log not found for status update', { CallSid });
  }
  
  // Clean up LiveKit room when call ends
  if (CallStatus === 'completed' || CallStatus === 'failed') {
    const callInfo = activeCalls.get(CallSid);
    if (callInfo) {
      try {
        log.info('Cleaning up call resources', { CallSid, roomName: callInfo.roomName });
        // Optionally end the LiveKit room
        // await roomService.deleteRoom(callInfo.roomName);
        activeCalls.delete(CallSid);
        log.info('Call cleanup completed', { CallSid });
      } catch (error) {
        log.error('Error cleaning up room', { CallSid, error: error.message });
      }
    }
  }
  
  res.sendStatus(200);
});

// Get call logs for EHR
app.get('/api/call-logs/:patientId', (req, res) => {
  const { patientId } = req.params;
  log.info('Retrieving call logs', { patientId });
  
  const logs = callLogs.filter(log => log.patientId === patientId);
  log.info('Call logs retrieved', { patientId, logCount: logs.length });
  
  res.json(logs);
});

// Get active calls for provider dashboard
app.get('/api/active-calls/:providerId', (req, res) => {
  const { providerId } = req.params;
  log.info('Retrieving active calls for provider', { providerId });
  
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
  
  log.info('Active calls retrieved', { providerId, activeCallCount: providerCalls.length });
  res.json(providerCalls);
});

// Generate LiveKit access token for healthcare workers
app.post('/api/livekit-token', (req, res) => {
  const { participantName, roomName, participantType = 'provider' } = req.body;
  
  log.info('Generating LiveKit token', { participantName, roomName, participantType });
  
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    log.error('LiveKit credentials not configured');
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
  
  log.info('LiveKit token generated successfully', { participantName, roomName });

  res.json({ 
    token: token.toJwt(),
    wsUrl: process.env.LIVEKIT_WS_URL,
    roomName
  });
});

// Get call room info for provider to join
app.get('/api/call-room/:callId', (req, res) => {
  const { callId } = req.params;
  log.info('Retrieving call room info', { callId });
  
  const callInfo = activeCalls.get(callId);
  
  if (!callInfo) {
    log.warn('Call room not found', { callId });
    return res.status(404).json({ error: 'Call not found' });
  }
  
  log.info('Call room info retrieved', { callId, roomName: callInfo.roomName });
  res.json(callInfo);
});

// Join existing call room (for providers)
app.post('/api/join-call', async (req, res) => {
  const { callId, providerId } = req.body;
  
  log.info('Provider attempting to join call', { callId, providerId });
  
  const callInfo = activeCalls.get(callId);
  if (!callInfo) {
    log.warn('Call not found for provider join', { callId, providerId });
    return res.status(404).json({ error: 'Call not found or ended' });
  }
  
  try {
    const participantIdentity = `provider-${providerId}`;
    log.info('Generating token for provider to join call', { 
      callId, 
      providerId, 
      roomName: callInfo.roomName,
      participantIdentity 
    });
    
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      ttl: '1h'
    });

    token.addGrant({
      room: callInfo.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });
    
    log.info('Provider successfully joined call', { callId, providerId, roomName: callInfo.roomName });

    res.json({
      success: true,
      token: token.toJwt(),
      wsUrl: process.env.LIVEKIT_WS_URL,
      roomName: callInfo.roomName
    });
  } catch (error) {
    log.error('Failed to generate token for provider join', { callId, providerId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get video sessions
app.get('/api/video-sessions/:patientId', (req, res) => {
  const { patientId } = req.params;
  log.info('Retrieving video sessions', { patientId });
  
  const sessions = videoSessions.filter(session => session.patientId === patientId);
  log.info('Video sessions retrieved', { patientId, sessionCount: sessions.length });
  
  res.json(sessions);
});

app.listen(port, () => {
  log.info(`Telehealth telephony demo server started`, { port, env: process.env.NODE_ENV || 'development' });
  log.info('Configuration check', {
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    livekitConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    sipDomain: process.env.LIVEKIT_SIP_DOMAIN || 'sip.livekit.cloud'
  });
});