# 🧪 Chat & Authentication Testing Guide

Quick guide to test the new authentication and chat features.

---

## 🚀 Quick Start

### 1. Start Backend
```bash
cd /root/.openclaw/workspace/launchpad-platform/backend
npm run start:dev
```

Wait for: `🚀 LaunchPad API running on http://localhost:3000/v1`

### 2. Start Frontend
```bash
cd /root/.openclaw/workspace/launchpad-platform/frontend
npm start
```

Wait for: `Application bundle generation complete.`

### 3. Open Browser
Navigate to: `http://localhost:4200`

---

## ✅ Test Checklist

### Test 1: Authentication Flow
- [ ] Click "Connect Wallet" button (top-right)
- [ ] Select a wallet (Phantom recommended)
- [ ] Approve wallet connection
- [ ] Approve signature request (nonce message)
- [ ] See green toast: "Authenticated - You can now use the chat!"
- [ ] Check browser console: ✅ Authenticated successfully
- [ ] Check localStorage: `auth_token` key exists

**Expected Result:** Wallet connected + authenticated for chat

---

### Test 2: Chat UI Appears
- [ ] Look bottom-right corner
- [ ] See chat box with "Global Chat" header
- [ ] See green pulsing dot (online indicator)
- [ ] See "(X online)" count

**Expected Result:** Chat UI visible and connected

---

### Test 3: Send Messages
- [ ] Click on chat to expand (if minimized)
- [ ] Type "Hello from [your wallet]" in input box
- [ ] Press Enter or click send button
- [ ] See message appear immediately
- [ ] Message shows truncated wallet address (e.g., "4K5c...3b4x")
- [ ] Message shows timestamp (e.g., "14:30")

**Expected Result:** Message sent and displayed instantly

---

### Test 4: Real-Time Chat (2 Browsers)

**Browser 1:**
- [ ] Open `http://localhost:4200` in Chrome
- [ ] Connect wallet A
- [ ] Open chat

**Browser 2:**
- [ ] Open `http://localhost:4200` in Firefox/Incognito
- [ ] Connect wallet B
- [ ] Open chat

**Test:**
- [ ] Send message from Browser 1
- [ ] Message appears in Browser 2 instantly
- [ ] Online count increases when Browser 2 connects
- [ ] Typing indicator appears when typing

**Expected Result:** Real-time bidirectional communication

---

### Test 5: Typing Indicators
- [ ] Start typing in chat input
- [ ] Other users see "4K5c...3b4x is typing..." below messages
- [ ] Stop typing for 2 seconds
- [ ] Typing indicator disappears

**Expected Result:** Typing status broadcasts to other users

---

### Test 6: Minimize/Expand
- [ ] Click on chat header
- [ ] Chat minimizes to just header
- [ ] Click header again
- [ ] Chat expands back
- [ ] Messages still visible

**Expected Result:** Smooth minimize/expand animation

---

### Test 7: Message Sanitization
- [ ] Try sending: `<script>alert('xss')</script>`
- [ ] Message should appear as plain text (no script execution)
- [ ] Try sending: `<b>Bold</b>`
- [ ] Message should appear as "Bold" (HTML stripped)

**Expected Result:** XSS protection works

---

### Test 8: Message Length Limit
- [ ] Try sending a 600-character message
- [ ] Message should be truncated to 500 characters
- [ ] Input field shows max 500 chars

**Expected Result:** Message length enforced

---

### Test 9: Rate Limiting
- [ ] Send 6 messages rapidly (within 1 second)
- [ ] 6th message should fail with 429 error
- [ ] See error in browser console: "Too Many Requests"
- [ ] Wait 1 second
- [ ] Can send again

**Expected Result:** Rate limiting works (5 msg/sec)

---

### Test 10: Disconnect Wallet
- [ ] Click on wallet button (top-right)
- [ ] Click "Disconnect"
- [ ] Chat UI shows lock icon
- [ ] Chat shows "Connect your wallet to join the chat"
- [ ] Input field is disabled

**Expected Result:** Chat requires authentication

---

### Test 11: Reconnect & Restore
- [ ] Disconnect wallet
- [ ] Refresh page
- [ ] Message history loads from server
- [ ] Previous messages still visible
- [ ] Can send new messages after reconnecting

**Expected Result:** Messages persist across sessions

---

### Test 12: Bot API (Optional)

**Using curl:**
```bash
# 1. Get nonce
curl -X POST http://localhost:3000/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"YOUR_WALLET_ADDRESS"}'

# 2. Sign the message with your wallet (use Phantom or CLI)

# 3. Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress":"YOUR_WALLET_ADDRESS",
    "signature":"BASE64_SIGNATURE",
    "message":"Sign this message to authenticate with LaunchPad.\n\nNonce: YOUR_NONCE"
  }'

# 4. Send message
curl -X POST http://localhost:3000/v1/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message":"🤖 Hello from bot!"}'
```

**Expected Result:** Bot message appears in chat with "BOT" badge

---

## 🐛 Common Issues

### Issue: Chat doesn't appear
**Solution:**
- Check browser console for errors
- Ensure backend is running (`npm run start:dev`)
- Check if port 3000 is available
- Verify WebSocket connection: Look for "✅ Chat connected" in console

### Issue: Authentication fails
**Solution:**
- Check wallet is connected
- Try different wallet (Phantom recommended)
- Check backend logs for signature verification errors
- Ensure wallet has signed the correct message

### Issue: Messages don't send
**Solution:**
- Check if rate limited (429 error)
- Verify JWT token exists in localStorage
- Check WebSocket connection status
- Look for error messages in console

### Issue: Real-time not working
**Solution:**
- Check if WebSocket port 3000 is accessible
- Verify CORS settings in backend
- Check firewall/network settings
- Try in incognito mode (disable extensions)

---

## 🔍 Debugging

### Check Backend Logs
```bash
cd backend
tail -f logs/application.log
```

### Check WebSocket Connection
```javascript
// Browser console
const socket = io('http://localhost:3000/chat', {
  auth: { token: localStorage.getItem('auth_token') }
});

socket.on('connect', () => console.log('✅ Connected'));
socket.on('error', (err) => console.error('❌ Error:', err));
```

### Check Auth Token
```javascript
// Browser console
const token = localStorage.getItem('auth_token');
console.log('Token:', token ? '✅ Exists' : '❌ Missing');
```

### Check API Response
```bash
curl http://localhost:3000/v1/chat/rooms/global/info \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Performance Tests

### Load Test: 100 Messages
```javascript
// Browser console
for (let i = 1; i <= 100; i++) {
  setTimeout(() => {
    chatService.sendMessage(`Test message ${i}`);
  }, i * 1000);
}
```

**Expected:** All messages sent and received without errors

### Stress Test: Multiple Connections
- Open 10 browser tabs
- Connect different wallets in each
- Send messages simultaneously
- Check online count updates correctly

**Expected:** System remains stable under load

---

## ✅ Success Criteria

All tests passed if:
- ✅ Authentication works with wallet signature
- ✅ Chat UI appears bottom-right
- ✅ Messages send and receive in real-time
- ✅ Typing indicators work
- ✅ Rate limiting prevents spam
- ✅ XSS protection works
- ✅ Messages persist across sessions
- ✅ Bot API functional
- ✅ Multiple users can chat simultaneously
- ✅ UI is responsive and smooth

---

## 🎯 Next Steps

After all tests pass:
1. Deploy to staging environment
2. Conduct security audit
3. Test with real users
4. Monitor performance metrics
5. Gather feedback
6. Implement Phase 2 features (if needed)

---

**Happy Testing! 🎉**
