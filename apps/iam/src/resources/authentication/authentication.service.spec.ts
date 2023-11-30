import { MissingException } from '@hermes/common';
import { ActiveEntityData } from '@hermes/iam';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import {
  MockHashingService,
  MockJwtService,
  MockUserService,
  createConfigServiceMock,
  createHashingServiceMock,
  createJwtServiceMock,
  createUserServiceMock,
} from '../../../test/helpers/provider.helper';
import { HashingService } from '../../common/services/hashing.service';
import { VerifyTokenService } from '../../common/services/verify-token.service';
import { UserService } from '../user/user.service';
import { AuthenticationService } from './authentication.service';
import { SignInInput } from './dto/sign-in.input';
import { SignUpInput } from './dto/sign-up.input';
import { InvalidPasswordException } from './errors/invalid-password.exception';
import { InvalidTokenException } from './errors/invalid-token.exception';
import { RefreshTokenStorage } from './refresh-token.storage';

type MockVerifyTokenService = Partial<
  Record<keyof VerifyTokenService, jest.Mock>
>;

const createVerifyTokenService = (): MockVerifyTokenService => ({
  verifyAccessToken: jest.fn(),
});

type MockRefreshTokenStorage = Partial<
  Record<keyof RefreshTokenStorage, jest.Mock>
>;

const createRefreshTokenStorage = (): MockRefreshTokenStorage => ({
  insert: jest.fn(),
  validate: jest.fn(),
  remove: jest.fn(),
});

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: MockUserService;
  let hashingService: MockHashingService;
  let verifyTokenSerivce: MockVerifyTokenService;
  let jwtService: MockJwtService;
  let refreshTokenStorage: MockRefreshTokenStorage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: UserService,
          useValue: createUserServiceMock(),
        },
        {
          provide: HashingService,
          useValue: createHashingServiceMock(),
        },
        {
          provide: VerifyTokenService,
          useValue: createVerifyTokenService(),
        },
        {
          provide: RefreshTokenStorage,
          useValue: createRefreshTokenStorage(),
        },
        {
          provide: JwtService,
          useValue: createJwtServiceMock(),
        },
        {
          provide: ConfigService,
          useValue: createConfigServiceMock(),
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    userService = module.get<MockUserService>(UserService);
    hashingService = module.get<MockHashingService>(HashingService);
    verifyTokenSerivce = module.get<MockVerifyTokenService>(VerifyTokenService);
    jwtService = module.get<MockJwtService>(JwtService);
    refreshTokenStorage =
      module.get<MockRefreshTokenStorage>(RefreshTokenStorage);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp()', () => {
    const signUpInput: SignUpInput = {
      email: 'falco.lombardi@nintendo.com',
      phoneNumber: '+19999999999',
      password: 'star-fox',
    };

    afterEach(() => {
      userService.create.mockClear();
    });

    it('should yield true if the sign up was successful', async () => {
      // Arrange.
      userService.create.mockResolvedValue({});

      // Act/Assert.
      await expect(service.signUp(signUpInput)).resolves.toBeTruthy();
    });

    it('should yield false otherwise', async () => {
      // Arrange.
      userService.create.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.signUp(signUpInput)).resolves.toBeFalsy();
    });
  });

  describe('signIn()', () => {
    const signInInput: SignInInput = {
      email: 'proto.man@sega.com',
      password: 'megaman',
    };

    afterEach(() => {
      userService.findByEmail.mockClear();
      hashingService.compare.mockClear();
      jwtService.signAsync.mockClear();
      refreshTokenStorage.insert.mockClear();
    });

    it('should yield a tuple with the access and refresh tokens', async () => {
      // Arrange.
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NmUxMTAyNS0wMDMxLTQ0MjYtOTVlNC0yOTQ0YTY3MzRiZGUiLCJpYXQiOjE2OTk2NzEzNjUsImV4cCI6MTY5OTY3NDk2NSwiYXVkIjoibG9jYWxob3N0OjMwMDIiLCJpc3MiOiJsb2NhbGhvc3Q6MzAwMiJ9.TGElk96Qag9BcsJNYl-17Yjk4Xo4AxDY5DB5iKR4h_Q';
      userService.findByEmail.mockResolvedValue({ password: 'asdp897asdfa' });
      hashingService.compare.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue(token);

      // Act/Assert.
      await expect(service.signIn(signInInput)).resolves.toEqual([
        token,
        token,
      ]);
    });

    it('should insert the refresh token id into storage', async () => {
      // Arrange.
      userService.findByEmail.mockResolvedValue({ password: '00pmk00832809k' });
      hashingService.compare.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('');

      // Act
      await service.signIn(signInInput);

      // Assert.
      expect(refreshTokenStorage.insert).toHaveBeenCalled();
    });

    it('should throw a "MissingException" if the user does not exist', async () => {
      // Arrange.
      const expectedResult = new MissingException(
        `User with email=${signInInput.email} not found!`,
      );
      userService.findByEmail.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.signIn(signInInput)).rejects.toEqual(expectedResult);
    });

    it('should throw an "InvalidPasswordException" if the password is incorrect', async () => {
      // Arrange.
      userService.findByEmail.mockResolvedValue({ password: 'ao23lkj12j' });
      hashingService.compare.mockResolvedValue(false);

      // Act/Assert.
      await expect(service.signIn(signInInput)).rejects.toBeInstanceOf(
        InvalidPasswordException,
      );
    });
  });

  describe('verifyToken()', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZDU2Yjg4MC1lODBjLTQzZDMtYjk5MC00MmVlMGMxMDQ0MDQiLCJpYXQiOjE3MDAwNzU5NzUsImV4cCI6MTcwMDA3OTU3NSwiYXVkIjoibG9jYWxob3N0OjMwMDIiLCJpc3MiOiJsb2NhbGhvc3Q6MzAwMiJ9.lDB66KMBkrDV8T4xu3kXVBlF0yvWUsYVTCG1rfWH-uU';

    afterEach(() => {
      verifyTokenSerivce.verifyAccessToken.mockClear();
    });

    it('should yield an "ActiveEntityData" object if the token is valid', async () => {
      // Arrange.
      const expectedResult: ActiveEntityData = {
        sub: randomUUID(),
        authorization_details: [],
      };
      verifyTokenSerivce.verifyAccessToken.mockResolvedValue(expectedResult);

      // Act/Assert.
      await expect(service.verifyToken(token)).resolves.toEqual(expectedResult);
    });

    it('should throw an "InvalidTokenException" if the token is invalid', async () => {
      // Arrange.
      verifyTokenSerivce.verifyAccessToken.mockRejectedValue(new Error());

      // Act/Assert.
      await expect(service.verifyToken(token)).rejects.toBeInstanceOf(
        InvalidTokenException,
      );
    });
  });

  describe('refreshToken()', () => {
    const userId = randomUUID();
    const refreshTokenId = randomUUID();
    const refreshToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NmUxMTAyNS0wMDMxLTQ0MjYtOTVlNC0yOTQ0YTY3MzRiZGUiLCJyZWZyZXNoVG9rZW5JZCI6IjQ2M2I1NjI5LTExOTUtNDk4YS1iZTk4LTY0M2NjMGU1MjA0NiIsImlhdCI6MTY5OTk3ODQzNiwiZXhwIjoxNzAwMDY0ODM2LCJhdWQiOiJsb2NhbGhvc3Q6MzAwMiIsImlzcyI6ImxvY2FsaG9zdDozMDAyIn0.TZ4bP0GDB2EzEQDG31rG6TaY7nChija4JZBUF3jwU88';

    afterEach(() => {
      jwtService.verifyAsync.mockClear();
      userService.findById.mockClear();
      refreshTokenStorage.validate.mockClear();
      refreshTokenStorage.remove.mockClear();
    });

    it('should yield a tuple with the access and refresh tokens if the token is valid', async () => {
      // Arrange.
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NmUxMTAyNS0wMDMxLTQ0MjYtOTVlNC0yOTQ0YTY3MzRiZGUiLCJpYXQiOjE2OTk2NzEzNjUsImV4cCI6MTY5OTY3NDk2NSwiYXVkIjoibG9jYWxob3N0OjMwMDIiLCJpc3MiOiJsb2NhbGhvc3Q6MzAwMiJ9.TGElk96Qag9BcsJNYl-17Yjk4Xo4AxDY5DB5iKR4h_Q';
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        refreshTokenId,
      });
      userService.findById.mockResolvedValue({ id: userId });
      refreshTokenStorage.validate.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue(token);

      // Act/Assert.
      await expect(service.refreshToken(refreshToken)).resolves.toEqual([
        token,
        token,
      ]);
    });

    it('should invalidate the refresh token from storage after it has been redeemed', async () => {
      // Arrange.
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        refreshTokenId,
      });
      userService.findById.mockResolvedValue({ id: userId });
      refreshTokenStorage.validate.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('');

      // Act.
      await service.refreshToken(refreshToken);

      // Assert.
      expect(refreshTokenStorage.remove).toHaveBeenCalledWith(userId);
    });

    it('should invalidate the refresh token from storage if an attempt to redeem an old token is made', async () => {
      // Arrange.
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        refreshTokenId,
      });
      userService.findById.mockResolvedValue({ id: userId });
      refreshTokenStorage.validate.mockResolvedValue(false);

      // Act.
      await service.refreshToken(refreshToken).catch(() => {});

      // Assert.
      expect(refreshTokenStorage.remove).toHaveBeenCalledWith(userId);
    });

    it('should throw an "InvalidTokenException" if the token is invalid', async () => {
      // Arrange.
      jwtService.verifyAsync.mockRejectedValue(new Error());

      // Act/Assert.
      await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(
        InvalidTokenException,
      );
    });

    it('should throw an "InvalidTokenException" if the token as been redeemed previously', async () => {
      // Arrange.
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        refreshTokenId,
      });
      userService.findById.mockResolvedValue({ id: userId });
      refreshTokenStorage.validate.mockResolvedValue(false);

      // Act/Assert.
      await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(
        InvalidTokenException,
      );
    });
  });
});
