import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const options: RedisOptions = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<number>('REDIS_PORT', 6379)),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: Number(configService.get<number>('REDIS_DB', 0)),
          tls: {},
          retryStrategy: (times: number) => {
            if (times > 3) {
              return;
            }
            return Math.min(times * 200, 2000);
          },
        };

        const redis = new Redis(options);

        redis.on('connect', () => console.log('Redis Connected'));
        redis.on('error', (err) => console.log('Redis error', err));

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
