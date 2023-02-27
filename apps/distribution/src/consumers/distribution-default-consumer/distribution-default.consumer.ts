import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { DistributionQueues, NotificationQueues } from '@notification/common';
import { Job, JobId, Queue } from 'bull';
import { DistributionRuleService } from '../../resources/distribution-rule/distribution-rule.service';

@Processor(DistributionQueues.DEFAULT)
export class DistributionDefaultConsumer {
  private readonly logger = new Logger(DistributionDefaultConsumer.name);

  constructor(
    @InjectQueue(NotificationQueues.DEFAULT)
    private readonly notificationQueue: Queue,
    private readonly distributionRuleService: DistributionRuleService,
  ) {}

  @Process('*')
  async process(job: Job) {
    const logPrefix = this._createLogPrefix(this.process.name, job.id);
    const jobName = job.name;

    job.log(`${logPrefix}: Processing ${jobName}`);

    try {
      job.log(`${logPrefix}: Retrieving ${jobName} distribution rule`);

      const distributionRule = await this.distributionRuleService.findOne(
        jobName,
        true,
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Yields a formatted string with the class's name and function's name in square brackets
   * followed by the Bull job id. (e.g. [ClassName FunctionName] Job JobId)
   * @param {string} functionName
   * @param {JobId} jobId
   * @returns {string}
   */
  private _createLogPrefix(functionName: string, jobId: JobId): string {
    return `[${DistributionDefaultConsumer.name} ${functionName}] Job ${jobId}`;
  }
}
