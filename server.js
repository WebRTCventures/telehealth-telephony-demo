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
const activeCalls = new Map(); // Track active calls by room name

// Initialize LiveKit Room Service Client
const roomService = new RoomServiceClient(
  process.env.LIVEKIT_WS_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

// Get active LiveKit rooms to detect incoming calls
app.get('/api/active-rooms', async (req, res) => {
  try {
    const rooms = await roomService.listRooms();
    const twilioRooms = rooms.filter(room => room.name.startsWith('twilio-tgl-'));
    
    const activeRooms = twilioRooms.map(room => {
      const phoneNumber = room.name.replace('twilio-tgl-', '');
      return {
        roomName: room.name,
        phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        participantCount: Number(room.numParticipants),
        createdAt: new Date(Number(room.creationTime) * 1000).toISOString()
      };
    });
    
    res.json(activeRooms);
  } catch (error) {
    log.error('Failed to list rooms', { error: error.message });
    res.status(500).json({ error: error.message });
  }
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



// Join LiveKit room (for provider to answer call)
app.post('/api/join-room', async (req, res) => {
  const { roomName, providerId } = req.body;
  
  log.info('Provider joining room', { roomName, providerId });
  
  try {
    const participantIdentity = `provider-${providerId}`;
    
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      ttl: '1h'
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });
    
    // Track active call
    const phoneNumber = roomName.replace('twilio-tgl-', '');
    activeCalls.set(roomName, {
      roomName,
      phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
      providerId,
      joinedAt: new Date().toISOString()
    });
    
    log.info('Provider token generated', { roomName, providerId });

    res.json({
      success: true,
      token: token.toJwt(),
      wsUrl: process.env.LIVEKIT_WS_URL,
      roomName
    });
  } catch (error) {
    log.error('Failed to join room', { roomName, providerId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});



app.listen(port, () => {
  log.info(`Telehealth telephony demo server started`, { port, env: process.env.NODE_ENV || 'development' });
  log.info('Configuration check', {
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    livekitConfigured: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    sipDomain: process.env.LIVEKIT_SIP_DOMAIN
  });
  log.info('Direct SIP routing: Twilio → LiveKit SIP → Room: twilio-tgl-{caller_number}');
});