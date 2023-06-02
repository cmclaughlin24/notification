import { ApiResponseDto } from '@hermes/common';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as _ from 'lodash';
import { CreatePushTemplateDto } from './dto/create-push-template.dto';
import { UpdatePushTemplateDto } from './dto/update-push-template.dto';
import { PushTemplate } from './entities/push-template.entity';

@Injectable()
export class PushTemplateService {
  constructor(
    @InjectModel(PushTemplate)
    private readonly pushTemplateModel: typeof PushTemplate,
  ) {}

  /**
   * Yields a list of PushTemplate or throws a NotFoundException if
   * the repository returns null, undefined, or an empty list.
   * @returns {Promise<PushTemplate[]>}
   */
  async findAll() {
    const pushTemplates = await this.pushTemplateModel.findAll();

    if (_.isEmpty(pushTemplates)) {
      throw new NotFoundException(`Push Notification templates not found!`);
    }

    return pushTemplates;
  }

  /**
   * Yields an PushTemplate or throws a NotFoundException if the repository
   * returns null or undefined.
   * @param {string} name Template's name
   * @returns {Promise<PushTemplate>}
   */
  async findOne(name: string) {
    const pushTemplate = await this.pushTemplateModel.findByPk(name);

    if (!pushTemplate) {
      throw new NotFoundException(
        `Push Notification Template with ${name} not found!`,
      );
    }

    return pushTemplate;
  }

  /**
   * Creates a new PushTemplate or throws a BadRequestException if an
   * push notification template name exists in the repository.
   * @param {CreatePushTemplateDto} createPushTemplateDto
   * @returns {Promise<ApiResponseDto<PushTemplate>>}
   */
  async create(createPushTemplateDto: CreatePushTemplateDto) {
    const existingTemplate = await this.pushTemplateModel.findByPk(
      createPushTemplateDto.name,
    );

    if (existingTemplate) {
      throw new BadRequestException(
        `Push Notification Template ${createPushTemplateDto.name} already exists!`,
      );
    }

    const pushTemplate = await this.pushTemplateModel.create({
      ...createPushTemplateDto,
    });

    return new ApiResponseDto<PushTemplate>(
      `Successfully created push notification template ${pushTemplate.name}!`,
      pushTemplate,
    );
  }

  /**
   * Updates a PushTemplate or throws a NotFoundException if the
   * repository returns null or undefined.
   * @param {string} name Template's name
   * @param {UpdatePushTemplateDto} updatePushTemplateDto
   * @returns {Promise<ApiResponseDto<PushTemplate>>}
   */
  async update(name: string, updatePushTemplateDto: UpdatePushTemplateDto) {
    let pushTemplate = await this.pushTemplateModel.findByPk(name);

    if (!pushTemplate) {
      throw new NotFoundException(
        `Push Notification Template with ${name} not found!`,
      );
    }

    pushTemplate = await pushTemplate.update({ ...updatePushTemplateDto });

    return new ApiResponseDto<PushTemplate>(
      `Successfully updated push notification template ${pushTemplate.name}!`,
      pushTemplate,
    );
  }

  /**
   * Removes an PushTemplate or throws a NotFoundException if the
   * repository returns null or undefined.
   * @param {string} name Template's name
   * @returns {Promise<ApiResponseDto>}
   */
  async remove(name: string) {
    const pushTemplate = await this.pushTemplateModel.findByPk(name);

    if (!pushTemplate) {
      throw new NotFoundException(
        `Push Notification Template with ${name} not found!`,
      );
    }

    await pushTemplate.destroy();

    return new ApiResponseDto(`Successfully delete push notification ${name}`);
  }
}