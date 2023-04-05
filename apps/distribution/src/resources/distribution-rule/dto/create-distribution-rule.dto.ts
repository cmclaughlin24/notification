import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMethods } from '@notification/common';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDistributionRuleDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  queue: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  messageType: string;

  @IsEnum(DeliveryMethods, { each: true })
  deliveryMethods: DeliveryMethods[];

  @IsString()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  emailSubject?: string;

  @ApiProperty({
    description:
      'Name of an email template in the Notification Service (overrides "html" property if provided)',
    example: 'template',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  emailTemplate?: string;

  @ApiProperty({
    description:
      'Handlebars HTML template for the email body (overridden if "emailTemplate" property is provided)',
    example: '<body><main><h1>{{title}}</h1></main></body>',
    externalDocs: {
      url: 'https://handlebarsjs.com/',
      description: 'Handlebars',
    },
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  html?: string;
}
