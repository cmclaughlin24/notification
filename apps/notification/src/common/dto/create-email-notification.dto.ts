import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { TemplateExists } from '../decorators/template-exists.decorator';

export class CreateEmailNotificationDto {
  @IsEmail()
  to: string;

  @IsEmail()
  @IsOptional()
  from: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  subject: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  text: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  html: string;

  @IsString()
  @IsOptional()
  @TemplateExists()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  template: string;

  @IsObject()
  @IsOptional()
  context: any;
}
