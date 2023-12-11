import { isRabbitContext } from '@golevelup/nestjs-rabbitmq';
import { IamClientService } from '@hermes/common';
import { AuthType, IamModuleOptions } from '@hermes/iam';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function iamFactory(
  configService: ConfigService,
  iamClientService: IamClientService,
): IamModuleOptions {
  return {
    defaultAuthTypes: [AuthType.BEARER, AuthType.API_KEY],
    apiKeyHeader: configService.get('API_KEY_HEADER'),
    tokenService: iamClientService,
    useContext: (context: ExecutionContext) => !isRabbitContext(context),
  };
}
