import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { TokenRepository } from '../../database/repositories/token.repository';
import { BlockchainService } from './blockchain.service';
import { NotFoundException } from '@nestjs/common';

describe('TokenService', () => {
  let service: TokenService;
  let tokenRepository: jest.Mocked<TokenRepository>;
  let blockchainService: jest.Mocked<BlockchainService>;

  beforeEach(async () => {
    const mockTokenRepository = {
      findByAddress: jest.fn(),
      findTrending: jest.fn(),
      findNew: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    const mockBlockchainService = {
      calculatePrice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: TokenRepository,
          useValue: mockTokenRepository,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    tokenRepository = module.get(TokenRepository);
    blockchainService = module.get(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getToken', () => {
    it('should return a token when found', async () => {
      const mockToken = {
        address: 'ABC123',
        name: 'Test Token',
        symbol: 'TEST',
      };

      tokenRepository.findByAddress.mockResolvedValue(mockToken as any);

      const result = await service.getToken('ABC123');
      expect(result).toEqual(mockToken);
      expect(tokenRepository.findByAddress).toHaveBeenCalledWith('ABC123');
    });

    it('should throw NotFoundException when token not found', async () => {
      tokenRepository.findByAddress.mockResolvedValue(null);

      await expect(service.getToken('NOTFOUND')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTrendingTokens', () => {
    it('should return trending tokens', async () => {
      const mockTokens = [
        { address: 'ABC1', name: 'Token 1', volume24h: 100 },
        { address: 'ABC2', name: 'Token 2', volume24h: 90 },
      ];

      tokenRepository.findTrending.mockResolvedValue(mockTokens as any);

      const result = await service.getTrendingTokens(2);
      expect(result).toEqual(mockTokens);
      expect(tokenRepository.findTrending).toHaveBeenCalledWith(2);
    });
  });

  describe('searchTokens', () => {
    it('should return search results', async () => {
      const mockTokens = [{ address: 'ABC1', name: 'Test Token', symbol: 'TEST' }];

      tokenRepository.search.mockResolvedValue(mockTokens as any);

      const result = await service.searchTokens('test', 10);
      expect(result).toEqual(mockTokens);
      expect(tokenRepository.search).toHaveBeenCalledWith('test', 10);
    });
  });
});
