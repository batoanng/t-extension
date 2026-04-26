import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
@ApiTags('subscription')
export class SubscriptionController {
  constructor(
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('offering')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Return the public Developer Assistant Pro pricing and availability',
  })
  getOffering() {
    return this.subscriptionService.getOffering();
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('jwt')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Return the authenticated user subscription status',
  })
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionService.getSubscriptionStatus(user.sub);
  }

  @Post('checkout-session')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('jwt')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a Stripe Checkout session for Developer Assistant Pro',
  })
  createCheckoutSession(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionService.createCheckoutSession(user.sub);
  }

  @Post('customer-portal')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('jwt')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a Stripe customer portal session',
  })
  createCustomerPortal(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionService.createCustomerPortal(user.sub);
  }

  @Post('webhook/stripe')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive Stripe subscription webhooks',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') stripeSignature: string | undefined,
    @Req()
    request: FastifyRequest & {
      rawBody?: string | Buffer;
    },
  ) {
    const rawBody =
      typeof request.rawBody === 'string'
        ? request.rawBody
        : request.rawBody?.toString('utf8') ?? JSON.stringify(request.body ?? {});

    return this.subscriptionService.handleStripeWebhook(rawBody, stripeSignature);
  }
}
