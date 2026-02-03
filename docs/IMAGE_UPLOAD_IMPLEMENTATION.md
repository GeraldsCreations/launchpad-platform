# 🖼️ Token Image Upload Implementation

## Overview

Implemented file upload functionality for token creation, converting images to base64 for storage and display.

---

## Features

### 1. **Image Upload UI**
- Drag-and-drop style upload zone
- Click to browse files
- Image preview after selection
- Remove/replace functionality

### 2. **Validation**
- **File types**: PNG, JPG, JPEG only
- **File size**: Maximum 2MB
- **Visual feedback**: Error notifications for invalid files

### 3. **Base64 Encoding**
- Converts uploaded images to base64 data URIs
- Format: `data:image/png;base64,iVBORw0KGgo...`
- Stored in backend as string (imageUrl field)

---

## Implementation Details

### Frontend Changes

#### Component Template
```html
<div>
  <label>Token Image *</label>
  <div class="image-upload-container">
    <!-- Image preview (if uploaded) -->
    @if (imagePreview) {
      <div class="image-preview">
        <img [src]="imagePreview" alt="Token preview">
        <button (click)="removeImage()">
          <i class="pi pi-times"></i>
        </button>
      </div>
    }
    <!-- Upload zone (if no image) -->
    @else {
      <div class="upload-zone" (click)="fileInput.click()">
        <i class="pi pi-cloud-upload"></i>
        <p>Click to upload image</p>
        <p>PNG or JPG (max 2MB)</p>
      </div>
    }
    <!-- Hidden file input -->
    <input 
      #fileInput
      type="file"
      accept="image/png,image/jpeg,image/jpg"
      (change)="onImageSelect($event)"
      class="hidden">
  </div>
</div>
```

#### Component Logic
```typescript
export class CreateTokenComponent {
  imagePreview: string | null = null;
  imageBase64: string | null = null;

  onImageSelect(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
      this.notificationService.error('Invalid File', 'Please upload a PNG or JPG image');
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.notificationService.error('File Too Large', 'Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.imageBase64 = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = null;
    this.imageBase64 = null;
  }
}
```

#### Validation
```typescript
canCreate(): boolean {
  return this.walletConnected && 
         this.formData.name.length > 0 && 
         this.formData.symbol.length > 0 &&
         this.imageBase64 !== null &&  // ✅ Image now required
         !this.creating;
}
```

#### API Request
```typescript
const requestData = {
  name: this.formData.name,
  symbol: this.formData.symbol,
  description: this.formData.description || undefined,
  imageUrl: this.imageBase64,  // ✅ Send base64 instead of URL
  creator: creatorAddress,
  creatorType: 'human',
  initialBuy: this.formData.initialBuySol > 0 ? this.formData.initialBuySol : undefined
};
```

---

## Backend Handling

### Current Implementation
Backend stores the base64 string directly in the `imageUrl` field:

```typescript
// backend/src/public-api/services/token.service.ts
async createToken(createTokenDto: CreateTokenDto): Promise<Token> {
  const token = await this.tokenRepository.create({
    address: tokenAddress,
    name: createTokenDto.name,
    symbol: createTokenDto.symbol,
    imageUrl: createTokenDto.imageUrl,  // Stores base64 string
    // ... other fields
  });
  
  return token;
}
```

**Pros:**
- ✅ No external storage needed
- ✅ Simple implementation
- ✅ Works for development/testing
- ✅ No additional API keys/services

**Cons:**
- ⚠️ Database size increases (base64 is ~33% larger than binary)
- ⚠️ Not ideal for production at scale
- ⚠️ Limited to 2MB per image (reasonable for profile pics)

### Production Recommendations

For production deployment, consider upgrading to CDN storage:

#### Option 1: AWS S3
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async uploadImage(base64: string): Promise<string> {
  const buffer = Buffer.from(base64.split(',')[1], 'base64');
  const key = `tokens/${uuidv4()}.png`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: 'your-bucket',
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
  }));
  
  return `https://your-cdn.com/${key}`;
}
```

#### Option 2: Cloudflare Images
```typescript
async uploadImage(base64: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', base64);
  
  const response = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/images/v1',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CLOUDFLARE_TOKEN}` },
      body: formData
    }
  );
  
  const data = await response.json();
  return data.result.variants[0];  // CDN URL
}
```

#### Option 3: IPFS (Decentralized)
```typescript
import { create } from 'ipfs-http-client';

async uploadImage(base64: string): Promise<string> {
  const buffer = Buffer.from(base64.split(',')[1], 'base64');
  const ipfs = create({ url: 'https://ipfs.infura.io:5001' });
  
  const { cid } = await ipfs.add(buffer);
  return `https://ipfs.io/ipfs/${cid}`;
}
```

---

## Token Creation Fee

### Updated Fee Structure

**Frontend Display:**
```
Creation fee: 0.02 SOL (platform + network fees)
```

**Breakdown:**
- Network rent: ~0.002 SOL (token account creation)
- Platform fee: ~0.018 SOL (service fee)
- Total: **0.02 SOL** (~$3 at $150/SOL)

**Why this fee?**
- Prevents spam token creation
- Covers Solana network costs
- Funds platform development
- Industry standard (pump.fun, etc.)

---

## User Experience Flow

### 1. **Navigate to Create Token**
- User clicks "Create Token" in nav
- Form loads with empty fields

### 2. **Fill Token Details**
- Enter name (required)
- Enter symbol (required)
- Enter description (optional)
- Upload image (required) ✨ **NEW**

### 3. **Upload Image**
- Click upload zone
- Select PNG/JPG (max 2MB)
- See instant preview
- Remove/replace if needed

### 4. **Review & Create**
- Review all fields
- See fee: 0.02 SOL
- Click "Create Token"
- Confirm wallet transaction

### 5. **Success**
- Token created notification
- Redirect to token page
- Image displays correctly

---

## Validation Rules

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | 1-255 chars |
| Symbol | Yes | 1-10 chars |
| Description | No | Any text |
| Image | Yes ✨ | PNG/JPG, max 2MB |
| Initial Buy | No | Min 0 SOL |

---

## Error Handling

### Frontend Validation Errors

**Invalid file type:**
```
❌ Error: Invalid File
Please upload a PNG or JPG image
```

**File too large:**
```
❌ Error: File Too Large
Image must be less than 2MB
```

**No wallet connected:**
```
⚠️ Connect your wallet to create a token
```

**Missing required fields:**
- Button disabled until all required fields filled
- Image upload required (new!)

---

## Styling

### Upload Zone
```css
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  cursor: pointer;
  background: rgba(139, 92, 246, 0.05);
  border: 2px dashed rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.upload-zone:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.5);
}
```

### Image Preview
```css
.image-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1;  /* Square */
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
}

.remove-image-btn:hover {
  background: rgba(239, 68, 68, 0.9);
  transform: scale(1.1);
}
```

---

## Testing Checklist

### Upload Flow
- [ ] Click upload zone → file picker opens
- [ ] Select PNG → preview shows
- [ ] Select JPG → preview shows
- [ ] Select GIF → error shown
- [ ] Select 3MB file → error shown
- [ ] Click remove → preview clears
- [ ] Upload new image → replaces old

### Creation Flow
- [ ] Form validation with image
- [ ] Submit with valid image → success
- [ ] Token page shows uploaded image
- [ ] Image displays correctly (not broken)

### Edge Cases
- [ ] Very small image (1KB) → works
- [ ] Exactly 2MB → works
- [ ] 2.1MB → error
- [ ] Image with transparency (PNG) → works
- [ ] Multiple rapid uploads → last one wins

---

## Performance Considerations

### Base64 Size
```
Original file: 500 KB
Base64 encoded: ~667 KB (+33%)
```

### Database Impact
- Average token image: ~300-500 KB base64
- 1000 tokens: ~300-500 MB in database
- PostgreSQL handles this fine (for now)

### Network Transfer
- Upload: User → Server (one-time, page load)
- Download: Server → All viewers (repeated)
- Consider caching headers for base64 images

---

## Migration Path to CDN

When ready for production CDN:

### 1. Add Image Upload Service
```typescript
// backend/src/common/services/image-upload.service.ts
@Injectable()
export class ImageUploadService {
  async upload(base64: string): Promise<string> {
    // Upload to S3/Cloudflare/IPFS
    // Return public CDN URL
  }
}
```

### 2. Update Token Service
```typescript
async createToken(createTokenDto: CreateTokenDto): Promise<Token> {
  let imageUrl = createTokenDto.imageUrl;
  
  // If base64, upload to CDN
  if (imageUrl?.startsWith('data:image')) {
    imageUrl = await this.imageUploadService.upload(imageUrl);
  }
  
  const token = await this.tokenRepository.create({
    // ...
    imageUrl,  // Now CDN URL
  });
}
```

### 3. Test & Deploy
- Test with both base64 and CDN URLs
- Migrate existing tokens if needed
- Update frontend if CDN has special requirements

---

## Security Considerations

### File Type Validation
- ✅ Frontend validates MIME type
- ✅ Backend should also validate (add later)
- ✅ Prevent SVG uploads (can contain scripts)

### File Size Limits
- ✅ Frontend enforces 2MB limit
- ✅ Backend should also enforce
- ✅ Prevents DoS via large uploads

### Content Scanning
For production:
- Consider virus scanning uploads
- Image moderation API (NSFW detection)
- Watermark detection (copyright)

---

**Implemented:** 2026-02-03  
**Status:** ✅ Ready for testing  
**Next Step:** Try creating a token with image upload!

---

**Built with 🍆 by Gereld** | *Upload that token pic!*
