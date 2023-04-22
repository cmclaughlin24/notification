import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';
import { ExpressAdapter } from '@bull-board/express';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

export async function bullFactory(
  configService: ConfigService,
): Promise<QueueOptions> {
  const host = configService.get('REDIS_HOST');
  const port = configService.get('REDIS_PORT');
  let connection: any = { host, port };

  if (configService.get('ENABLE_REDIS_CLUSTER') === 'true') {
    // Note: Redis requires one start up node and will use it to identify other nodes
    //       within the cluster. 
    connection = new Redis.Cluster([{ host, port }]);
  }

  return {
    connection,
    defaultJobOptions: {
      attempts: configService.get('RETRY_ATTEMPTS'),
      backoff: {
        type: 'exponential',
        delay: configService.get('RETRY_DELAY'),
      },
    },
  };
}

export const queuePool = new Set<Queue>();

function getBullBoardQueues(): BaseAdapter[] {
  const adapters: BaseAdapter[] = [];

  for (const queue of queuePool) {
    adapters.push(new BullAdapter(queue as any));
  }

  return adapters;
}

export function setupBullBoard(app: INestApplication): void {
  const serverAdapter = new ExpressAdapter();
  const queues = getBullBoardQueues();

  serverAdapter.setBasePath('/queues/admin');
  app.use('/queues/admin', serverAdapter.getRouter());

  const { addQueue } = createBullBoard({ queues: [], serverAdapter });

  queues.forEach((queue) => addQueue(queue));
}
