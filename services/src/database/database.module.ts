import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import ws from 'ws';
import { ConfigService } from '@nestjs/config';

export const DRIZZLE_DB = 'DRIZZLE_DB';
// neonConfig.webSocketConstructor = ws;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        // console.log('>>> Loaded DATABASE_URL:', connectionString);
        if (!connectionString) {
          throw new Error('DATABASE_URL is not set in environment variables');
        }
        // const pool = new Pool({ connectionString });
        return drizzle(connectionString.trim(), { schema } as any);
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
