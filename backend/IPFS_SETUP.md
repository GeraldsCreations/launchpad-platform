# IPFS Metadata Upload Setup

Token metadata (name, symbol, description, image) needs to be stored on IPFS for on-chain tokens.

## Quick Setup (Free)

### 1. Get NFT.storage API Key

1. Go to https://nft.storage
2. Click "Get Started" or "Sign Up"
3. Sign up with email or GitHub
4. Go to "API Keys" section
5. Click "New Key"
6. Copy your API key

### 2. Add to Environment

Edit `.env` file:

```bash
NFT_STORAGE_API_KEY=your_api_key_here
```

### 3. Restart Backend

```bash
pm2 restart launchpad
```

## What Happens

When a user creates a token:

1. **Image Upload** (if base64):
   - Base64 image → IPFS
   - Returns `ipfs://Qm...` URI

2. **Metadata Upload**:
   - Creates JSON with token details
   - Uploads to IPFS
   - Returns `ipfs://Qm...` URI

3. **On-Chain Storage**:
   - Metadata URI stored with token
   - Image and metadata permanently on IPFS
   - Accessible by anyone via IPFS gateways

## Without API Key

If no API key is set:
- Service falls back to placeholder URIs
- Tokens work but images won't show
- **You need a real key for production!**

## Why NFT.storage?

- ✅ **Free** - No cost for storage
- ✅ **Permanent** - Content stored forever
- ✅ **Decentralized** - Uses IPFS + Filecoin
- ✅ **Fast** - Backed by Protocol Labs
- ✅ **Reliable** - Built for NFTs

## Alternative: Arweave

If you prefer Arweave instead of IPFS:
1. Get Arweave wallet
2. Fund with AR tokens
3. Use `arweave-js` package
4. Update `MetadataUploadService`

## Testing

```bash
# Create a token with image
curl -X POST http://localhost:3000/v1/tokens/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "imageUrl": "data:image/png;base64,...",
    ...
  }'
```

Check logs:
```
📤 Uploading base64 image to IPFS...
✅ Image uploaded: ipfs://Qm...
📤 Uploading metadata JSON to IPFS...
✅ Metadata uploaded: ipfs://Qm...
```

## Production Notes

- API key is **free** and **unlimited**
- Keep your API key **secret** (in .env, not in code)
- NFT.storage rate limits: Very generous for normal use
- Content is **immutable** once uploaded
- Images should be optimized before upload (< 2MB)
