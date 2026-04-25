import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import type { AuthenticatedUser } from './current-user.decorator';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MagicLinkStatusDto } from './dto/magic-link-status.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AccessTokenGuard } from './guards/access-token.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Request a magic-link sign-in email',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        authRequestId: { type: 'string' },
        expiresInSeconds: { type: 'number', example: 900 },
      },
    },
  })
  async login(@Body() body: LoginDto, @Req() request: FastifyRequest) {
    return this.authService.requestMagicLink(
      body.email,
      getRequestBaseUrl(request),
    );
  }

  @Get('magic-link-status')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Check whether the latest magic-link request has been completed',
  })
  async magicLinkStatus(@Query() query: MagicLinkStatusDto) {
    return this.authService.getMagicLinkStatus(query.requestId);
  }

  @Get('verify-magic-link')
  @Header('content-type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Complete email verification for a magic-link sign-in request',
  })
  async verifyMagicLink(@Query('token') token: string) {
    await this.authService.verifyMagicLink(token);

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Developer Assistant Pro</title>
          <style>
            body {
              font-family: sans-serif;
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              background: #f5f2ea;
              color: #132121;
            }
            main {
              max-width: 32rem;
              padding: 2rem;
              background: white;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(19, 33, 33, 0.12);
            }
          </style>
        </head>
        <body>
          <main>
            <h1>Email verified</h1>
            <p>Return to the extension. Sign-in will finish automatically.</p>
          </main>
        </body>
      </html>
    `.trim();
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange a valid refresh token for a new token pair',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string', example: 'Bearer' },
        accessTokenExpiresIn: { type: 'number', example: 900 },
        refreshTokenExpiresIn: { type: 'number', example: 604800 },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', example: 'demo@example.com' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Validate a refresh token and acknowledge logout',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Resolve the authenticated user from the access token',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string', example: 'demo@example.com' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}

function getRequestBaseUrl(request: FastifyRequest) {
  const protocolHeader = request.headers['x-forwarded-proto'];
  const hostHeader = request.headers['x-forwarded-host'] ?? request.headers.host;
  const protocol =
    typeof protocolHeader === 'string' && protocolHeader.length > 0
      ? protocolHeader
      : request.protocol;

  return `${protocol}://${hostHeader}`;
}
