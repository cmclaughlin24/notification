import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiResponseDto, DeliveryMethods } from '@notification/common';
import { JobState, Queue } from 'bullmq';
import _ from 'lodash';
import { CreateEmailNotificationDto } from '../../common/dto/create-email-notification.dto';
import { CreatePhoneNotificationDto } from '../../common/dto/create-phone-notification.dto';
import { CreateRadioNotificationDto } from '../../common/dto/create-radio-notification.dto';
import { NotificationDto } from '../../common/interfaces/create-notification-dto.interface';
import { queuePool } from '../../config/bull.config';

@Injectable()
export class NotificationJobService {
  constructor(
    @InjectQueue(process.env.BULLMQ_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {
    // Note: Add NotificationQueue to Bull Board.
    queuePool.add(notificationQueue);
  }

  /**
   * Yields a Job from the notification queue or throws a NotFoundException if
   * the queue yields null or undefined.
   * @param {string} id
   * @returns {Promoise<Job>}
   */
  async findOne(id: string) {
    const job = await this.notificationQueue.getJob(id);

    if (!job) {
      throw new NotFoundException(
        `Job with ${id} not found in '${this.notificationQueue.name}' queue`,
      );
    }

    return job;
  }

  /**
   * Yields a list of Jobs filtered by the state from the notification queue or throws
   * a NotFoundException if the queue yields null, undefined, or an empty list.
   * @param {JobState[]} states
   * @returns {Promise<Job[]>}
   */
  async findAll(states: JobState[]) {
    const jobs = await this.notificationQueue.getJobs(states);

    if (_.isEmpty(jobs)) {
      throw new NotFoundException(
        `Jobs with state(s) ${states.join(', ')} not found`,
      );
    }

    return jobs;
  }

  /**
   * Adds an 'email' job to the notification queue.
   * @param {CreateEmailNotificationDto} createEmailNotificationDto
   * @returns {Promise<ApiResponseDto>}
   */
  async createEmailNotification(
    createEmailNotificationDto: CreateEmailNotificationDto,
  ) {
    return this._createNotification(
      DeliveryMethods.EMAIL,
      createEmailNotificationDto,
    );
  }

  /**
   * Adds a 'sms' job to the notification queue.
   * @param {CreatePhoneNotificationDto} createPhoneNotificationDto
   * @returns {Promise<ApiResponseDto>}
   */
  async createTextNotification(
    createPhoneNotificationDto: CreatePhoneNotificationDto,
  ) {
    return this._createNotification(
      DeliveryMethods.SMS,
      createPhoneNotificationDto,
    );
  }

  /**
   * Adds a 'radio' job to the notification queue.
   * @param {CreateRadioNotificationDto} createRadioNotification
   * @returns {Promise<ApiResponseDto>}
   */
  async createRadioNotification(
    createRadioNotification: CreateRadioNotificationDto,
  ) {
    return this._createNotification(
      DeliveryMethods.RADIO,
      createRadioNotification,
    );
  }

  /**
   * Adds a job to the notification queue.
   * @param {DeliveryMethods} name Name of the job
   * @param {NotificationDto} notificationDto Payload for the job
   * @returns {Promise<ApiResponseDto>}
   */
  private async _createNotification(
    name: DeliveryMethods,
    notificationDto: NotificationDto,
  ) {
    const job = await this.notificationQueue.add(name, notificationDto);

    return new ApiResponseDto(
      `Successfully scheduled ${name} notification`,
      job,
    );
  }
}
