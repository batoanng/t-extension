import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Config } from '../../types/config';
import { PrismaService } from '../common/provider';
import { Service } from '../tokens';

const activeStatuses = new Set(['active', 'trialing']);
const stripeApiBaseUrl = 'https://api.stripe.com/v1';
const stripeWebhookToleranceSeconds = 300;
const proPlan = 'pro';

interface StripeCheckoutSessionResponse {
  url: string;
}

interface StripeCustomerResponse {
  id: string;
}

interface StripePortalSessionResponse {
  url: string;
}

interface StripeEvent {
  type: string;
  data?: {
    object?: {
      id?: string;
      customer?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
      items?: {
        data?: Array<{
          price?: {
            id?: string;
          };
        }>;
      };
    };
  };
}

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(Service.CONFIG) private readonly config: Config,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
  ) {}

  getOffering() {
    return {
      enabled:
        Boolean(this.config.DEEPSEEK_API_KEY) &&
        Boolean(this.config.STRIPE_SECRET_KEY) &&
        Boolean(this.config.STRIPE_PRO_MONTHLY_PRICE_ID),
      currency: 'AUD' as const,
      plan: proPlan,
      priceAudMonthly: this.config.PROMPT_OPTIMIZER_PRO_PRICE_AUD_MONTHLY,
      provider: 'deepseek' as const,
    };
  }

  async getSubscriptionStatus(userId: string) {
    const [user, subscription] = await Promise.all([
      this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
      }),
      this.prismaService.subscription.findUnique({
        where: {
          userId_plan: {
            plan: proPlan,
            userId,
          },
        },
      }),
    ]);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      plan: subscription && activeStatuses.has(subscription.status) ? proPlan : 'free',
      promptOptimization: {
        enabled: Boolean(subscription && activeStatuses.has(subscription.status)),
        provider:
          subscription && activeStatuses.has(subscription.status)
            ? ('deepseek' as const)
            : ('byok' as const),
        status: subscription?.status ?? 'inactive',
        currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      },
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async assertHostedOptimizationAccess(userId: string) {
    if (!this.config.DEEPSEEK_API_KEY) {
      throw new BadRequestException('Hosted optimization is unavailable.');
    }

    const subscription = await this.prismaService.subscription.findUnique({
      where: {
        userId_plan: {
          plan: proPlan,
          userId,
        },
      },
    });

    if (!subscription) {
      return {
        status: 'missing' as const,
      };
    }

    if (!activeStatuses.has(subscription.status)) {
      return {
        status: 'inactive' as const,
        subscription,
      };
    }

    return {
      status: 'active' as const,
      subscription,
    };
  }

  async createCheckoutSession(userId: string) {
    this.assertStripeConfigured();

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const customerId =
      user.stripeCustomerId ?? (await this.createStripeCustomer(user.email));

    if (!user.stripeCustomerId) {
      await this.prismaService.user.update({
        where: {
          id: user.id,
        },
        data: {
          stripeCustomerId: customerId,
        },
      });
    }

    const response = await this.postStripeForm<StripeCheckoutSessionResponse>(
      '/checkout/sessions',
      {
        cancel_url: this.config.STRIPE_CANCEL_URL,
        customer: customerId,
        mode: 'subscription',
        success_url: this.config.STRIPE_SUCCESS_URL,
        'line_items[0][price]': this.config.STRIPE_PRO_MONTHLY_PRICE_ID!,
        'line_items[0][quantity]': '1',
      },
    );

    return response;
  }

  async createCustomerPortal(userId: string) {
    this.assertStripeConfigured();

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No active Stripe customer found.');
    }

    const response = await this.postStripeForm<StripePortalSessionResponse>(
      '/billing_portal/sessions',
      {
        customer: user.stripeCustomerId,
        return_url: this.config.STRIPE_SUCCESS_URL,
      },
    );

    return response;
  }

  async handleStripeWebhook(rawBody: string, signature: string | undefined) {
    this.assertStripeConfigured();

    if (!signature || !this.isValidStripeSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid Stripe signature.');
    }

    const event = JSON.parse(rawBody) as StripeEvent;

    if (!event.type.startsWith('customer.subscription.')) {
      return {
        received: true,
      };
    }

    const payload = event.data?.object;
    const stripeCustomerId = payload?.customer;
    const stripeSubscriptionId = payload?.id;

    if (!stripeCustomerId || !stripeSubscriptionId) {
      throw new BadRequestException('Stripe payload missing subscription data.');
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        stripeCustomerId,
      },
    });

    if (!user) {
      throw new BadRequestException('No user mapped to Stripe customer.');
    }

    await this.prismaService.subscription.upsert({
      where: {
        userId_plan: {
          plan: proPlan,
          userId: user.id,
        },
      },
      update: {
        cancelAtPeriodEnd: Boolean(payload.cancel_at_period_end),
        currentPeriodEnd: payload.current_period_end
          ? new Date(payload.current_period_end * 1000)
          : null,
        status: payload.status ?? 'inactive',
        stripePriceId: payload.items?.data?.[0]?.price?.id ?? null,
        stripeSubscriptionId,
      },
      create: {
        cancelAtPeriodEnd: Boolean(payload.cancel_at_period_end),
        currentPeriodEnd: payload.current_period_end
          ? new Date(payload.current_period_end * 1000)
          : null,
        plan: proPlan,
        status: payload.status ?? 'inactive',
        stripePriceId: payload.items?.data?.[0]?.price?.id ?? null,
        stripeSubscriptionId,
        userId: user.id,
      },
    });

    return {
      received: true,
    };
  }

  private assertStripeConfigured() {
    if (
      !this.config.STRIPE_SECRET_KEY ||
      !this.config.STRIPE_WEBHOOK_SECRET ||
      !this.config.STRIPE_PRO_MONTHLY_PRICE_ID
    ) {
      throw new BadRequestException('Subscription billing is unavailable.');
    }
  }

  private async createStripeCustomer(email: string) {
    const response = await this.postStripeForm<StripeCustomerResponse>(
      '/customers',
      {
        email,
      },
    );

    return response.id;
  }

  private async postStripeForm<T>(
    pathname: string,
    form: Record<string, string>,
  ): Promise<T> {
    const body = new URLSearchParams(form);
    const response = await fetch(`${stripeApiBaseUrl}${pathname}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new BadRequestException('Stripe request failed.');
    }

    return (await response.json()) as T;
  }

  private isValidStripeSignature(rawBody: string, signatureHeader: string) {
    const timestampMatch = /t=(\d+)/.exec(signatureHeader);
    const signatureMatch = /v1=([0-9a-f]+)/.exec(signatureHeader);

    if (!timestampMatch || !signatureMatch || !this.config.STRIPE_WEBHOOK_SECRET) {
      return false;
    }

    const timestamp = Number(timestampMatch[1]);

    if (Number.isNaN(timestamp)) {
      return false;
    }

    if (Math.abs(Date.now() / 1000 - timestamp) > stripeWebhookToleranceSeconds) {
      return false;
    }

    const expectedSignature = createHmac(
      'sha256',
      this.config.STRIPE_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const receivedSignature = signatureMatch[1];

    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature),
    );
  }
}
