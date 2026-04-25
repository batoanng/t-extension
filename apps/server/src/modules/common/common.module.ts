import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './controller';
import { LogInterceptor } from './flow';
import { configProvider, PrismaService } from './provider';

@Module({
  imports: [TerminusModule],
  providers: [configProvider, PrismaService, LogInterceptor],
  exports: [configProvider, PrismaService, LogInterceptor],
  controllers: [HealthController],
})
export class CommonModule {}
