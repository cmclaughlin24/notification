import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { hasSelectors } from '@hermes/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';
import { Queue } from 'bullmq';
import { validateOrReject } from 'class-validator';
import * as _ from 'lodash';
import { DistributionMessageDto } from '../../../common/dto/distribution-message.dto';
import { SubscriptionDataDto } from '../../../common/dto/subscription-data.dto';
import { MqInterceptor } from '../../../common/interceptors/mq/mq.interceptor';
import { SubscriptionDataService } from '../../../common/providers/subscription-data/subscription-data.service';
import { createNotificationJobs } from '../../../common/utils/notification-job.utils';
import { filterSubscriptions } from '../../../common/utils/subscription-filter.utils';
import { DistributionEventService } from '../../../resources/distribution-event/distribution-event.service';
import { DistributionEvent } from '../../../resources/distribution-event/entities/distribution-event.entity';
import { DistributionRule } from '../../../resources/distribution-rule/entities/distribution-rule.entity';
import { Subscription } from '../../../resources/subscription/entities/subscription.entity';
import { MqResponse } from '../../classes/mq-response.class';
import { MqUnrecoverableError } from '../../classes/mq-unrecoverable-error.class';
import { MqConsumer } from '../mq-consumer/mq.consumer';

@UseInterceptors(MqInterceptor)
@Injectable()
export class DistributionConsumer extends MqConsumer {
  private readonly logger = new Logger(DistributionConsumer.name);
  private DISTRIBUTION_QUEUE: string;

  constructor(
    @InjectQueue(process.env.BULLMQ_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
    private readonly distributionEventService: DistributionEventService,
    private readonly subscriptionDataService: SubscriptionDataService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.DISTRIBUTION_QUEUE = this.configService.get(
      'RABBITMQ_DISTRIBUTION_QUEUE',
    );
  }

  @RabbitSubscribe({
    queue: process.env.RABBITMQ_DISTRIBUTION_QUEUE,
    queueOptions: {
      // Note: If RABBITMQ_DL_EXCHANGE and RABBITMQ_DISTRIBUTION_DL_ROUTING_KEY are null/undefined,
      //       message will not be retried.
      deadLetterExchange: process.env.RABBITMQ_DL_EXCHANGE,
      deadLetterRoutingKey: process.env.RABBITMQ_DISTRIBUTION_DL_ROUTING_KEY,
    },
  })
  async subscribe(message: any, amqpMsg: ConsumeMessage) {
    const logPrefix = this.createLogPrefix(this.subscribe.name, message.id);

    this.logger.log(
      `${logPrefix}: Processing distribution event ${JSON.stringify(message)}`,
    );

    try {
      const messageDto = await this.createMessageDto(message);
      const distributionEvent = await this.distributionEventService.findOne(
        this.DISTRIBUTION_QUEUE,
        messageDto.type,
        true,
        true,
      );
      const distributionRule = this._getDistributionRule(
        distributionEvent,
        messageDto.metadata,
      );
      const subscriptonDtos = await this._getSubscriptionData(
        messageDto,
        distributionEvent.subscriptions,
        distributionRule.bypassSubscriptions,
      );

      if (_.isEmpty(subscriptonDtos)) {
        return new MqResponse('');
      }

      const jobs = createNotificationJobs(
        distributionRule,
        subscriptonDtos,
        messageDto,
      );

      if (_.isEmpty(jobs)) {
        return new MqResponse('');
      }

      await this.notificationQueue.addBulk(jobs);

      return new MqResponse('');
    } catch (error) {
      // Note: The MqInterceptor will be handled the error and determine if a message
      //       should be retried or not.
      throw error;
    }
  }

  /**
   * Yields a DistributionMessageDto or throws a MqUnrecoverableError if the message properties
   * fail validation.
   * @param {any} message
   * @returns {Promise<DistributionMessageDto>}
   */
  override async createMessageDto(
    message: any,
  ): Promise<DistributionMessageDto> {
    const messageDto = new DistributionMessageDto();

    messageDto.id = message.id;
    messageDto.type = message.type;
    messageDto.metadata = message.metadata;
    messageDto.payload = message.payload;
    messageDto.addedAt = message.addedAt;
    messageDto.timeZone = message.timeZone;
    messageDto.recipients = message.recipients;

    try {
      await validateOrReject(messageDto);
    } catch (errors) {
      const validationErrors = errors
        .map((error) => error.toString())
        .join(', ');
      throw new MqUnrecoverableError(validationErrors);
    }

    return messageDto;
  }

  /**
   * Yields a DistributionRule that should be applied for an event based on the selectors
   * in a message's metadata. All selectors must match for a rule to be selected, otherwise,
   * the default rule will be choosen.
   * @param {DistributionEvent} distributionEvent
   * @param {any} metadata
   * @returns {DistributionRule}
   */
  private _getDistributionRule(
    distributionEvent: DistributionEvent,
    metadata: any,
  ): DistributionRule {
    let rule = distributionEvent.rules.find((rule) =>
      hasSelectors(
        distributionEvent.metadataLabels,
        JSON.parse(rule.metadata),
        metadata,
      ),
    );

    if (!rule) {
      rule = distributionEvent.rules.find((rule) => rule.metadata === null);

      if (!rule) {
        throw new MqUnrecoverableError(
          `Distribution Event queue=${distributionEvent.queue} eventType=${distributionEvent.eventType} does not have a default distribution rule defined!`,
        );
      }
    }

    return rule;
  }

  /**
   * Yields a list of SubscriptionDataDtos that should receive a notification for an event.
   * @param {DistributionMessageDto} message
   * @param {Subscription[]} subscriptions List of Subscriptions for a DistributionEvent (ignored if bypassSubscriptions is true)
   * @param {boolean} bypassSubscriptions Ignore the Subscriptions and use the MessageDto "recipients" property
   * @returns {Promise<SubscriptionDataDto[]>}
   */
  private async _getSubscriptionData(
    message: DistributionMessageDto,
    subscriptions: Subscription[],
    bypassSubscriptions: boolean,
  ): Promise<SubscriptionDataDto[]> {
    if (bypassSubscriptions) {
      return this.subscriptionDataService.mapToUserSubscriptionDtos(
        message.recipients,
      );
    }

    const filteredSubs = filterSubscriptions(subscriptions, message.payload);

    if (_.isEmpty(filteredSubs)) {
      return [null, null];
    }

    return this.subscriptionDataService.get(filteredSubs);
  }
}
