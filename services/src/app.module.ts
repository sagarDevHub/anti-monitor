import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { APIKeyModule } from './modules/api-key/api-key.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './infra/cache.module';
import { RedisModule } from './infra/redis.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    RedisModule,
    CacheModule,
    APIKeyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
