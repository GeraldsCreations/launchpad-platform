import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract wallet address from JWT token
 */
export const Wallet = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.walletAddress;
  },
);
