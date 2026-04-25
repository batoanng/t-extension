export enum MagicLinkStatus {
  Pending = 'pending',
  Completed = 'completed',
  Expired = 'expired',
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: AuthUser;
}

export interface MagicLinkStatusResponse {
  status: MagicLinkStatus;
  auth?: AuthResponse;
}
