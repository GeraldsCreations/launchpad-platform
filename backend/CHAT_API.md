# Chat & Authentication API Documentation

## Authentication Endpoints

### POST /v1/auth/nonce
Generate a nonce for wallet signature authentication.

**Request:**
```json
{
  "walletAddress": "string"
}
```

**Response:**
```json
{
  "nonce": "uuid-string",
  "message": "Sign this message to authenticate with LaunchPad.\n\nNonce: {nonce}"
}
```

### POST /v1/auth/login
Login with wallet signature.

**Request:**
```json
{
  "walletAddress": "string",
  "signature": "base64-string",
  "message": "string"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "expiresIn": 86400,
  "walletAddress": "string"
}
```

### POST /v1/auth/verify
Verify JWT token (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "valid": true,
  "walletAddress": "string"
}
```

### POST /v1/auth/logout
Logout (client should delete token).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Chat REST API Endpoints

All chat endpoints require JWT authentication.

### GET /v1/chat/messages
Get messages for a chat room.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `tokenAddress` (optional): Token address for token-specific chat. Omit for global chat.
- `limit` (optional): Number of messages to return (default: 50, max: 100)
- `before` (optional): Message ID for pagination

**Response:**
```json
[
  {
    "id": "uuid",
    "walletAddress": "string",
    "tokenAddress": "string | null",
    "message": "string",
    "createdAt": "timestamp",
    "isBot": false,
    "replyToId": "uuid | null"
  }
]
```

### POST /v1/chat/messages
Send a message (REST API - for bots).

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "message": "string (max 500 chars)",
  "tokenAddress": "string (optional)",
  "replyToId": "uuid (optional)"
}
```

**Rate Limit:** 5 messages per second per wallet

**Response:**
```json
{
  "id": "uuid",
  "walletAddress": "string",
  "tokenAddress": "string | null",
  "message": "string",
  "createdAt": "timestamp",
  "isBot": true
}
```

### DELETE /v1/chat/messages/:id
Delete a message (only own messages).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Message deleted"
}
```

### GET /v1/chat/rooms/:tokenAddress
Get room info for a token.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "uuid",
  "tokenAddress": "string",
  "messageCount": 123,
  "isActive": true,
  "onlineCount": 45,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### GET /v1/chat/rooms/global/info
Get global chat room info.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "room": "global",
  "onlineCount": 45
}
```

---

## WebSocket Chat Gateway

### Connection
Connect to: `ws://localhost:3000/chat`

**Authentication:**
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' }
});
```

### Events (Client → Server)

#### joinRoom
Join a chat room.

**Emit:**
```javascript
socket.emit('joinRoom', {
  tokenAddress: 'string (optional)' // Omit for global chat
});
```

**Response:**
```javascript
socket.on('roomHistory', (messages) => {
  // Array of ChatMessage objects
});
```

#### sendMessage
Send a message.

**Emit:**
```javascript
socket.emit('sendMessage', {
  tokenAddress: 'string (optional)',
  message: 'string',
  replyToId: 'uuid (optional)'
});
```

#### typing
Send typing indicator.

**Emit:**
```javascript
socket.emit('typing', {
  tokenAddress: 'string (optional)',
  isTyping: true
});
```

#### leaveRoom
Leave current room.

**Emit:**
```javascript
socket.emit('leaveRoom', {
  tokenAddress: 'string (optional)'
});
```

### Events (Server → Client)

#### roomHistory
Receive message history after joining a room.

```javascript
socket.on('roomHistory', (messages) => {
  console.log('Message history:', messages);
});
```

#### newMessage
Receive new message in real-time.

```javascript
socket.on('newMessage', (message) => {
  console.log('New message:', message);
});
```

#### userTyping
User typing indicator.

```javascript
socket.on('userTyping', (data) => {
  console.log(`${data.walletAddress} is typing:`, data.isTyping);
});
```

#### userJoined
User joined the room.

```javascript
socket.on('userJoined', (data) => {
  console.log('User joined:', data.walletAddress);
});
```

#### userLeft
User left the room.

```javascript
socket.on('userLeft', (data) => {
  console.log('User left:', data.walletAddress);
});
```

#### error
Error occurred.

```javascript
socket.on('error', (error) => {
  console.error('Chat error:', error.message);
});
```

---

## Bot Integration Example

### Node.js Bot

```javascript
const axios = require('axios');
const io = require('socket.io-client');

class ChatBot {
  constructor(apiUrl, walletAddress, signature, message) {
    this.apiUrl = apiUrl;
    this.token = null;
  }

  async authenticate(walletAddress, signature, message) {
    const response = await axios.post(`${this.apiUrl}/auth/login`, {
      walletAddress,
      signature,
      message
    });
    
    this.token = response.data.token;
    console.log('✅ Authenticated');
  }

  async sendMessage(message, tokenAddress = null) {
    const response = await axios.post(
      `${this.apiUrl}/chat/messages`,
      { message, tokenAddress },
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.data;
  }

  async getMessages(tokenAddress = null, limit = 50) {
    const params = { limit };
    if (tokenAddress) params.tokenAddress = tokenAddress;
    
    const response = await axios.get(`${this.apiUrl}/chat/messages`, {
      params,
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.data;
  }

  connectWebSocket() {
    this.socket = io(`${this.apiUrl.replace('/v1', '')}/chat`, {
      auth: { token: this.token }
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.socket.emit('joinRoom', {}); // Join global chat
    });

    this.socket.on('newMessage', (message) => {
      console.log(`💬 ${message.walletAddress}: ${message.message}`);
    });
  }
}

// Usage
const bot = new ChatBot('http://localhost:3000/v1');
await bot.authenticate(walletAddress, signature, message);
await bot.sendMessage('🤖 Bot is online!');
bot.connectWebSocket();
```

---

## Security Features

✅ **Implemented:**
- Wallet signature verification (Solana)
- JWT token authentication (24h expiration)
- Rate limiting (5 msg/sec per wallet, 100 msg/min globally)
- Message sanitization (XSS protection)
- Message length limit (500 chars)
- DDoS protection (Helmet + body size limits)
- Secure WebSocket authentication

🔒 **Recommended for Production:**
- Profanity filter
- Admin moderation tools
- Wallet blacklist/whitelist
- Message reporting system
- Captcha for high-volume senders
- SSL/TLS certificates

---

## Error Codes

- `401 Unauthorized` - Invalid or expired JWT token
- `403 Forbidden` - User is banned from chat
- `404 Not Found` - Message or room not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Environment Variables

```env
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRATION=24h
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
CHAT_MESSAGE_MAX_LENGTH=500
```
