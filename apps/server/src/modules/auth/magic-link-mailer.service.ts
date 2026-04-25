import { Inject, Injectable } from '@nestjs/common';

import type { Config } from '../../types/config';
import { Service } from '../tokens';

@Injectable()
export class MagicLinkMailerService {
  constructor(
    @Inject(Service.CONFIG) private readonly config: Config,
  ) {}

  async sendMagicLink(input: { email: string; verifyUrl: string }) {
    if (!this.config.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.EMAIL_FROM,
        to: [input.email],
        subject: 'Sign in to Developer Assistant Pro',
        html: `
          <p>Use the link below to sign in to Developer Assistant Pro.</p>
          <p><a href="${input.verifyUrl}">Sign in with magic link</a></p>
          <p>If you did not request this email, you can ignore it.</p>
        `.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error('Unable to send magic link email.');
    }
  }
}
