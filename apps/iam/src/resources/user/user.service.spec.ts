import {
  ExistsException,
  MissingException,
  PostgresError,
} from '@hermes/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  MockRepository,
  createMockRepository,
} from '../../../test/helpers/database.helper';
import { HashingService } from '../../common/services/hashing.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

type MockHashingService = Partial<Record<keyof HashingService, jest.Mock>>;

const createHashingServiceMock = (): MockHashingService => ({
  hash: jest.fn(),
});

describe('UserService', () => {
  let service: UserService;
  let repository: MockRepository;
  let hashingService: MockHashingService;

  const user: User = {
    id: randomUUID(),
    email: 'amy.hedgehog@sega.com',
    phoneNumber: '+18888888888',
    password: 'sonic-the-hedgehog',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
        {
          provide: HashingService,
          useValue: createHashingServiceMock(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<MockRepository>(getRepositoryToken(User));
    hashingService = module.get<MockHashingService>(HashingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll()', () => {
    afterEach(() => {
      repository.find.mockClear();
    });

    it('should yield a list of user', async () => {
      // Arrange.
      const expectedResult = [user];
      repository.find.mockResolvedValue(expectedResult);

      // Act/Assert.
      await expect(service.findAll()).resolves.toEqual(expectedResult);
    });

    it('should yield an empty list if the repository returns an empty list', async () => {
      // Arrange.
      repository.find.mockResolvedValue([]);

      // Act/Assert.
      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  describe('findById()', () => {
    afterEach(() => {
      repository.findOneBy.mockClear();
    });

    it('should yield a user', async () => {
      // Arrange.
      repository.findOneBy.mockResolvedValue(user);

      // Act/Assert.
      await expect(service.findById(user.id)).resolves.toEqual(user);
    });

    it('should yield null if the repository returns null/undefined', async () => {
      // Arrange.
      repository.findOneBy.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.findById(user.id)).resolves.toBeNull();
    });
  });

  describe('findByEmail()', () => {
    afterEach(() => {
      repository.findOneBy.mockClear();
    });

    it('should yield a user', async () => {
      // Arrange.
      repository.findOneBy.mockResolvedValue(user);

      // Act/Assert.
      await expect(service.findByEmail(user.email)).resolves.toEqual(user);
    });

    it('should yield null if the repository returns null/undefined', async () => {
      // Arrange.
      repository.findOneBy.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.findByEmail(user.email)).resolves.toBeNull();
    });
  });

  describe('create()', () => {
    const createUserInput: CreateUserInput = {
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: user.password,
    };

    beforeEach(() => {
      hashingService.hash.mockResolvedValue(null);
    });

    afterEach(() => {
      repository.create.mockClear();
      repository.save.mockClear();
      hashingService.hash.mockClear();
    });

    it('should create a user', async () => {
      // Arrange.
      repository.save.mockResolvedValue(null);

      // Act.
      await service.create(createUserInput);

      // Assert.
      expect(repository.create).toHaveBeenCalled();
    });

    it("should hash the user's password", async () => {
      // Arrange.
      repository.save.mockResolvedValue(null);

      // Act.
      await service.create(createUserInput);

      // Assert.
      expect(hashingService.hash).toHaveBeenCalled();
    });

    it('should yield the created user', async () => {
      // Arrange.
      repository.save.mockResolvedValue(user);

      // Act/Assert.
      await expect(service.create(createUserInput)).resolves.toEqual(user);
    });

    it('should throw an "ExistsException" if the email or phone number is already in use', async () => {
      // Arrange.
      const expectedResult = new ExistsException(
        `User with email=${createUserInput.email} or phoneNumber=${createUserInput.phoneNumber} already exists!`,
      );
      repository.save.mockRejectedValue({
        code: PostgresError.UNIQUE_VIOLATION,
      });

      // Act/Assert.
      await expect(service.create(createUserInput)).rejects.toEqual(
        expectedResult,
      );
    });
  });

  describe('update()', () => {
    const updateUserInput: UpdateUserInput = {
      email: 'blaze.cat@sega.com',
    };

    afterEach(() => {
      repository.preload.mockClear();
      repository.save.mockClear();
    });

    it('should update a user', async () => {
      // Arrange.
      repository.preload.mockResolvedValue({});
      repository.save.mockResolvedValue(null);

      // Act.
      await service.update(user.id, updateUserInput);

      // Assert.
      expect(repository.preload).toHaveBeenCalled();
    });

    it('should yield the updated user', async () => {
      // Arrange.
      const expectedResult = { ...user, ...updateUserInput };
      repository.preload.mockResolvedValue(expectedResult);
      repository.save.mockResolvedValue(expectedResult);

      // Act/Assert.
      await expect(service.update(user.id, updateUserInput)).resolves.toEqual(
        expectedResult,
      );
    });

    it('should throw a "MissingException" if the repository returns null/undefined', async () => {
      // Arrange.
      const expectedResult = new MissingException(
        `User userId=${user.id} not found!`,
      );
      repository.preload.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.update(user.id, updateUserInput)).rejects.toEqual(
        expectedResult,
      );
    });
  });

  describe('remove()', () => {
    afterEach(() => {
      repository.findOneBy.mockClear();
      repository.remove.mockClear();
    });

    it('should remove a user', async () => {
      // Arrange.
      repository.findOneBy.mockResolvedValue(user);

      // Act.
      await service.remove(user.id);

      // Assert.
      expect(repository.remove).toHaveBeenCalledWith(user);
    });

    it('should yield the removed user', async () => {
      // Arrange.
      repository.findOneBy.mockResolvedValue(user);
      repository.remove.mockResolvedValue(user);

      // Act/Assert.
      await expect(service.remove(user.id)).resolves.toEqual(user);
    });

    it('should throw a "MissingException" if the repository returns null/undefined', async () => {
      // Arrange.
      const expectedResult = new MissingException(
        `User userId=${user.id} not found!`,
      );
      repository.findOneBy.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.remove(user.id)).rejects.toEqual(expectedResult);
    });
  });
});
