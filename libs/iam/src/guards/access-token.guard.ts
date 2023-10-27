import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { IAM_USER_KEY } from '../constants/iam.constants';
import { AccessTokenService } from '../services/access-token.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.accessTokenService.verify(token);

      request[IAM_USER_KEY] = payload;
    } catch (error) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private _extractToken(request: Request): string {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}