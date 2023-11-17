import { ExecutionContext } from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { AuthType } from './auth-type.type';

export interface IamModuleOptions {
  /**
   * Optional parameter for specifying the default authentication types.
   */
  defaultAuthTypes?: AuthType[];

  /**
   * Optional parameter for specifying the enabled authentication types. If not provided,
   * the default is all.
   */
  enableAuthTypes?: AuthType[];

  /**
   * Optional parameter for a function that checks if `AuthenticationGuard` should be
   * exectued against the current execution context.
   * @param {ExecutionContext} context
   * @returns {boolean}
   */
  useContext?: (context: ExecutionContext) => boolean;

  /**
   * Optional parameter for specifying the name of the request header used for
   * the Api Key. If not provided, defaults to `Api-Key`.
   */
  apiKeyHeader?: string;

  /**
   * Optional parameter for specifying multiple Api Key(s). The keys should be
   * provided as a comma-separated string. If not provided, defaults to `pass123`.
   * @examples
   * - key1
   * - key1,key2,key3
   */
  apiKeys?: string;

  /**
   * Optional parameter represents an instance of a service that extends the `TokenService`
   * abstract class. It is used to validate and decode access tokens to ensure the
   * authenticity of the requesting entity.
   * 
   * Note: This paremeter is required if the `AuthType.BEARER` is enabled.
   */
  tokenService?: TokenService;
}
