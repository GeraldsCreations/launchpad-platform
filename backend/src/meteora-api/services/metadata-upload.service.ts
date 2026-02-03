import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import axios from 'axios';

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
    
    this.logger.log('🔍 Checking NFT.storage API key...');
    this.logger.log(`   Raw value: ${this.nftStorageApiKey ? `${this.nftStorageApiKey.substring(0, 10)}...` : '(empty)'}`);
    this.logger.log(`   Length: ${this.nftStorageApiKey.length} characters`);
    
    if (!this.nftStorageApiKey || this.nftStorageApiKey.trim() === '') {
      this.logger.warn('⚠️  NFT_STORAGE_API_KEY not set. Using placeholder URIs.');
      this.logger.warn('⚠️  Get a free key at: https://nft.storage');
    } else {
      this.logger.log('✅ NFT.storage API key configured successfully!');
      this.logger.log(`✅ Key starts with: ${this.nftStorageApiKey.substring(0, 15)}...`);
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
      // Debug: Show API key status
      this.logger.log(`🔑 API Key check: ${this.nftStorageApiKey ? 'SET' : 'NOT SET'}`);
      if (this.nftStorageApiKey) {
        this.logger.log(`🔑 Key length: ${this.nftStorageApiKey.length}`);
        this.logger.log(`🔑 Key preview: ${this.nftStorageApiKey.substring(0, 15)}...`);
      }
      
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
    } catch (error: any) {
      this.logger.error('Failed to upload metadata:', error.message || 'Unknown error');
      this.logger.error('Error type:', error.constructor?.name);
      this.logger.error('Error stack:', error.stack);
      if (error.cause) {
        this.logger.error('Error cause:', error.cause);
      }
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

    this.logger.log('Creating FormData...');
    this.logger.log(`FormData type: ${typeof FormData}`);
    this.logger.log(`FormData constructor: ${FormData.name}`);

    // Create form data (Node.js style)
    let formData: FormData;
    try {
      formData = new FormData();
      this.logger.log(`FormData instance created: ${typeof formData}`);
      this.logger.log(`Has append method: ${typeof formData.append}`);
      
      // Try simple append first
      try {
        formData.append('file', buffer, filename);
        this.logger.log('File appended to FormData (simple)');
      } catch (appendError: any) {
        this.logger.error('Append failed:', appendError);
        // Try with options
        formData.append('file', buffer, {
          filename,
          contentType: mimeType,
        } as any);
        this.logger.log('File appended to FormData (with options)');
      }
    } catch (error: any) {
      this.logger.error('FormData creation failed!');
      this.logger.error('Error is null/undefined:', error === null || error === undefined);
      if (error) {
        this.logger.error('Error message:', error?.message || '(no message)');
        this.logger.error('Error name:', error?.name || '(no name)');
        this.logger.error('Error constructor:', error?.constructor?.name || '(no constructor)');
      }
      throw new Error(`FormData creation failed: ${error}`);
    }

    this.logger.log('Sending request to NFT.storage (image)...');

    try {
      const response = await axios.post('https://api.nft.storage/upload', formData, {
        headers: {
          'Authorization': `Bearer ${this.nftStorageApiKey}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      this.logger.log(`Response status: ${response.status} ${response.statusText}`);
      this.logger.log(`Upload result: ${JSON.stringify(response.data)}`);
      
      return `ipfs://${response.data.value.cid}`;
    } catch (error: any) {
      this.logger.error('Image upload error:', error.message);
      if (error.response) {
        this.logger.error(`Image upload response status: ${error.response.status}`);
        this.logger.error(`Image upload response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
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
    } as any);

    this.logger.log('Sending request to NFT.storage (metadata JSON)...');

    try {
      const response = await axios.post('https://api.nft.storage/upload', formData, {
        headers: {
          'Authorization': `Bearer ${this.nftStorageApiKey}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      this.logger.log(`Response status: ${response.status} ${response.statusText}`);
      this.logger.log(`Metadata upload result: ${JSON.stringify(response.data)}`);
      
      return `ipfs://${response.data.value.cid}`;
    } catch (error: any) {
      this.logger.error('Metadata JSON upload error:', error.message);
      if (error.response) {
        this.logger.error(`Metadata upload response status: ${error.response.status}`);
        this.logger.error(`Metadata upload response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
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
