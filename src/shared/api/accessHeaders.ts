import type { GenerationAccess } from '@/shared/model/access';

export function generationAccessHeaders(access: GenerationAccess) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (access.kind === 'byok') {
    headers['x-byok-api-key'] = access.apiKey.trim();
  } else {
    headers.authorization = `Bearer ${access.accessToken}`;
  }

  return headers;
}
