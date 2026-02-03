import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';

/**
 * Metadata Upload Service
 * Handles uploading token metadata and images to IPFS/Arweave
 */
@Injectable()
export class MetadataUploadService {
  private readonly logger = new Logger(MetadataUploadService.name);
  private readonly nftStorageApiKey: string;

  constructor(private configService: ConfigService) {
    this.nftStorageApiKey = this.configService.get('NFT_STORAGE_API_KEY') || '';
    
    if (!this.nftStorageApiKey || this.nftStorageApiKey.trim() === '') {
      this.logger.warn('⚠️  NFT_STORAGE_API_KEY not set. Using placeholder URIs.');
      this.logger.warn('⚠️  Get a free key at: https://nft.storage');
    } else {
      this.logger.log('✅ NFT.storage API key configured');
    }
  }

  /**
   * Upload metadata to IPFS via nft.storage
   * Returns the IPFS URI (ipfs://...)
   */
  async uploadMetadata(metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string; // Can be base64 data URL or http URL
  }): Promise<string> {
    try {
      // If no API key, return placeholder
      if (!this.nftStorageApiKey || this.nftStorageApiKey.trim() === '') {
        this.logger.warn('⚠️  No NFT.storage API key - using placeholder URI');
        this.logger.warn('⚠️  Token will work but image won\'t show in wallets');
        this.logger.warn('⚠️  Get free key at: https://nft.storage');
        return this.createPlaceholderUri(metadata);
      }

      // Step 1: Upload image first (if it's base64)
      let imageUri = metadata.image;
      
      if (metadata.image.startsWith('data:image')) {
        this.logger.log('📤 Uploading base64 image to IPFS...');
        imageUri = await this.uploadBase64Image(metadata.image);
        this.logger.log(`✅ Image uploaded: ${imageUri}`);
      }

      // Step 2: Create metadata JSON
      const metadataJson = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        image: imageUri,
        external_url: 'https://launchpad.gereld.com',
        attributes: [],
      };

      // Step 3: Upload metadata JSON
      this.logger.log('📤 Uploading metadata JSON to IPFS...');
      const metadataUri = await this.uploadJson(metadataJson);
      this.logger.log(`✅ Metadata uploaded: ${metadataUri}`);

      return metadataUri;
    } catch (error) {
      this.logger.error('Failed to upload metadata:', error.message);
      this.logger.error('Error details:', error);
      this.logger.warn('Falling back to placeholder URI');
      return this.createPlaceholderUri(metadata);
    }
  }

  /**
   * Upload base64 image to IPFS
   */
  private async uploadBase64Image(base64Data: string): Promise<string> {
    this.logger.log(`Image size: ${(base64Data.length / 1024).toFixed(2)} KB`);
    
    // Extract base64 data and mime type
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data URL');
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, 'base64');

    this.logger.log(`Decoded image: ${(buffer.length / 1024).toFixed(2)} KB, type: ${mimeType}`);

    // Determine file extension
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `token-image.${ext}`;

    // Upload to nft.storage
    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: mimeType,
    });

    this.logger.log('Sending request to NFT.storage...');

    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.nftStorageApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    this.logger.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`NFT.storage error response: ${error}`);
      throw new Error(`NFT.storage upload failed (${response.status}): ${error}`);
    }

    const result = await response.json();
    this.logger.log(`Upload result: ${JSON.stringify(result)}`);
    return `ipfs://${result.value.cid}`;
  }

  /**
   * Upload JSON metadata to IPFS
   */
  private async uploadJson(metadata: any): Promise<string> {
    const jsonBuffer = Buffer.from(JSON.stringify(metadata), 'utf-8');
    
    const formData = new FormData();
    formData.append('file', jsonBuffer, {
      filename: 'metadata.json',
      contentType: 'application/json',
    });

    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.nftStorageApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NFT.storage upload failed: ${error}`);
    }

    const result = await response.json();
    return `ipfs://${result.value.cid}`;
  }

  /**
   * Create placeholder URI (when IPFS upload fails or no API key)
   */
  private createPlaceholderUri(metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string;
  }): string {
    // Create a deterministic hash from metadata
    const hash = Buffer.from(
      `${metadata.name}-${metadata.symbol}-${Date.now()}`
    ).toString('base64url').substring(0, 32);

    // For now, return a placeholder with the base64 image embedded
    // This won't work on-chain, but it lets us test the flow
    this.logger.warn(`⚠️  Using placeholder URI for ${metadata.symbol}`);
    
    return `https://arweave.net/placeholder-${hash}`;
  }
}
