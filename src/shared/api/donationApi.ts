import { requestJson } from './httpClient';

interface DonationCheckoutSessionResponse {
  url: string;
}

export async function createDonationCheckoutSession(input: {
  amountAudCents: number;
  serverBaseUrl: string;
}) {
  const response = await requestJson<DonationCheckoutSessionResponse>({
    baseUrl: input.serverBaseUrl,
    data: {
      amountAudCents: input.amountAudCents,
    },
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
    pathname: '/api/v1/donations/checkout-session',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to open coffee checkout.');
  }

  return response.data;
}
