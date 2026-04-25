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
  status: 'pending' | 'completed' | 'expired';
  auth?: AuthResponse;
}
