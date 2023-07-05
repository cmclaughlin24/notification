import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis, { Cluster } from 'ioredis';
import {
  REDIS_OPTIONS_TOKEN,
  REDIS_OPTIONS_TYPE,
} from '../redis-health.module-definition';

@Injectable()
export class RedisHealthIndicator
  extends HealthIndicator
  implements OnApplicationShutdown
{
  private connection: Redis | Cluster;

  constructor(@Inject(REDIS_OPTIONS_TOKEN) options: typeof REDIS_OPTIONS_TYPE) {
    super();
    this._connect(options);
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    let pingError: Error;

    try {
      if (!this.connection) {
        throw new Error('A Redis connection does not exist');
      }

      await this.connection.ping();
    } catch (error) {
      pingError = error;
    }

    const result = this.getStatus(key, !pingError, {
      error: pingError?.message,
    });

    if (!pingError) {
      return result;
    }

    throw new HealthCheckError('Redis Error', result);
  }

  private _connect(options: typeof REDIS_OPTIONS_TYPE): void {
    if (options instanceof Cluster) {
      this.connection = options;
    } else {
      this.connection = new Redis(options.port, options.host, options.options);
    }
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    await this.connection?.quit();
  }
}
