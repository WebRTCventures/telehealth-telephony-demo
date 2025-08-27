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
const incomingCalls = new Map(); // Track incoming calls waiting for provider
const activeCalls = new Map(); // Track active calls and their LiveKit rooms

// Initialize LiveKit Room Service Client
const roomService = new RoomServiceClient(
  process.env.LIVEKIT_WS_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

// Handle incoming calls from patients
app.post('/api/incoming-call', async (req, res) => {
  const { CallSid, From, To } = req.body;
  
  log.info('Incoming call received', { CallSid, From, To });
  
  try {
    // Create LiveKit room for the incoming call
    const roomName = `incoming-${CallSid}`;
    log.info('Creating LiveKit room for incoming call', { roomName, CallSid });
    
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 10
    });
    
    log.info('LiveKit room created for incoming call', { roomName, CallSid });

    // Store incoming call info
    const callInfo = {
      callSid: CallSid,
      patientPhone: From,
      clinicPhone: To,
      roomName,
      status: 'ringing',
      timestamp: new Date().toISOString()
    };
    
    incomingCalls.set(CallSid, callInfo);
    
    // Generate TwiML to put caller on hold while waiting for provider
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Thank you for calling our telehealth clinic. Please hold while we connect you to a healthcare provider.');
    twiml.play({ loop: 10 }, 'https://com-twilio-sounds-music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.wav');
    
    // Set up webhook for when provider answers
    twiml.redirect(`/api/twiml/wait-for-provider?callSid=${CallSid}`);
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    log.error('Failed to handle incoming call', { CallSid, error: error.message });
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We apologize, but we are unable to connect your call at this time. Please try again later.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// TwiML to wait for provider to answer
app.post('/api/twiml/wait-for-provider', (req, res) => {
  const { callSid } = req.query;
  
  log.info('Patient waiting for provider', { callSid });
  
  const callInfo = incomingCalls.get(callSid);
  if (!callInfo) {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Call session expired. Please call again.');
    twiml.hangup();
    res.type('text/xml');
    return res.send(twiml.toString());
  }
  
  // Check if provider has answered
  if (callInfo.status === 'answered') {
    const sipUri = `sip:${callInfo.roomName}@${process.env.LIVEKIT_SIP_DOMAIN}`;
    log.info('Connecting patient to provider via SIP', { callSid, sipUri });
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Connecting you to your healthcare provider now.');
    
    const dial = twiml.dial({ timeout: 30 });
    dial.sip(sipUri);
    
    res.type('text/xml');
    res.send(twiml.toString());
  } else {
    // Continue waiting
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Please continue to hold. A provider will be with you shortly.');
    twiml.pause({ length: 3 });
    twiml.redirect(`/api/twiml/wait-for-provider?callSid=${callSid}`);
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
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
  const { CallSid, CallStatus, CallDuration } = req.body;
  
  log.info('Call status update received', { CallSid, CallStatus, CallDuration });

  // Update call log if exists
  const callLog = callLogs.find(log => log.id === CallSid);
  if (callLog) {
    callLog.status = CallStatus;
    callLog.lastUpdated = new Date().toISOString();
    if (CallDuration) callLog.duration = CallDuration;
    log.info('Updated call log', { CallSid, newStatus: CallStatus });
  }
  
  // Clean up when call ends
  if (CallStatus === 'completed' || CallStatus === 'failed') {
    // Clean up incoming calls
    if (incomingCalls.has(CallSid)) {
      log.info('Cleaning up incoming call', { CallSid });
      incomingCalls.delete(CallSid);
    }
    
    // Clean up active calls
    const callInfo = activeCalls.get(CallSid);
    if (callInfo) {
      try {
        log.info('Cleaning up active call resources', { CallSid, roomName: callInfo.roomName });
        activeCalls.delete(CallSid);
        log.info('Call cleanup completed', { CallSid });
      } catch (error) {
        log.error('Error cleaning up call resources', { CallSid, error: error.message });
      }
    }
  }
  
  res.sendStatus(200);
});

// Get call logs by phone number
app.get('/api/call-logs/:phoneNumber', (req, res) => {
  const { phoneNumber } = req.params;
  log.info('Retrieving call logs by phone', { phoneNumber });
  
  const logs = callLogs.filter(log => log.patientPhone === phoneNumber);
  log.info('Call logs retrieved', { phoneNumber, logCount: logs.length });
  
  res.json(logs);
});

// Get all recent call logs for clinic dashboard
app.get('/api/call-logs', (req, res) => {
  log.info('Retrieving all call logs');
  
  const recentLogs = callLogs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50); // Last 50 calls
  
  log.info('All call logs retrieved', { logCount: recentLogs.length });
  res.json(recentLogs);
});

// Get incoming calls waiting for provider
app.get('/api/incoming-calls', (req, res) => {
  log.info('Retrieving incoming calls');
  
  const waitingCalls = [];
  
  for (const [callSid, callInfo] of incomingCalls.entries()) {
    if (callInfo.status === 'ringing') {
      waitingCalls.push({
        callSid,
        patientPhone: callInfo.patientPhone,
        roomName: callInfo.roomName,
        timestamp: callInfo.timestamp,
        waitTime: Math.floor((Date.now() - new Date(callInfo.timestamp).getTime()) / 1000)
      });
    }
  }
  
  log.info('Incoming calls retrieved', { waitingCallCount: waitingCalls.length });
  res.json(waitingCalls);
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

// Get active call info
app.get('/api/active-calls', (req, res) => {
  log.info('Retrieving all active calls');
  
  const activeCallsList = [];
  
  for (const [callSid, callInfo] of activeCalls.entries()) {
    activeCallsList.push({
      callSid,
      patientPhone: callInfo.patientPhone,
      providerId: callInfo.providerId,
      roomName: callInfo.roomName,
      status: callInfo.status,
      timestamp: callInfo.timestamp,
      answeredAt: callInfo.answeredAt
    });
  }
  
  log.info('Active calls retrieved', { activeCallCount: activeCallsList.length });
  res.json(activeCallsList);
});

// Provider answers incoming call
app.post('/api/answer-call', async (req, res) => {
  const { callSid, providerId } = req.body;
  
  log.info('Provider answering incoming call', { callSid, providerId });
  
  const callInfo = incomingCalls.get(callSid);
  if (!callInfo) {
    log.warn('Incoming call not found', { callSid, providerId });
    return res.status(404).json({ error: 'Call not found or expired' });
  }
  
  try {
    // Mark call as answered
    callInfo.status = 'answered';
    callInfo.providerId = providerId;
    callInfo.answeredAt = new Date().toISOString();
    
    // Move to active calls
    activeCalls.set(callSid, callInfo);
    
    // Generate token for provider
    const participantIdentity = `provider-${providerId}`;
    log.info('Generating token for provider to answer call', { 
      callSid, 
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
    
    // Log the call
    const callLog = {
      id: callSid,
      patientPhone: callInfo.patientPhone,
      providerId,
      roomName: callInfo.roomName,
      status: 'answered',
      timestamp: callInfo.timestamp,
      answeredAt: callInfo.answeredAt
    };
    callLogs.push(callLog);
    
    log.info('Provider successfully answered call', { callSid, providerId, roomName: callInfo.roomName });

    res.json({
      success: true,
      token: token.toJwt(),
      wsUrl: process.env.LIVEKIT_WS_URL,
      roomName: callInfo.roomName,
      patientPhone: callInfo.patientPhone
    });
  } catch (error) {
    log.error('Failed to answer call', { callSid, providerId, error: error.message });
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
  log.info('Webhook URL for Twilio:', `http://localhost:${port}/api/incoming-call`);
  log.info('Configure your Twilio phone number webhook to point to the above URL');
});