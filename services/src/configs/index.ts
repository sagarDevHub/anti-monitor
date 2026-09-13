export const VERSION = 'v1';

export type CachedKey = {
  userId: string;
  apiKeyDigest: string;
  expiresAt: number;
};

export const LAST_USED_HASH = `amn:api_key:last_used:${VERSION}`;
