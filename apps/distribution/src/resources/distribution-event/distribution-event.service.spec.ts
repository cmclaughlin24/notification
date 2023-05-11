import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MockRepository,
  createMockRepository,
} from '../../../test/helpers/database.helpers';
import { DistributionRule } from '../distribution-rule/entities/distribution-rule.entity';
import { SubscriptionFilter } from '../subscription/entities/subscription-filter.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { DistributionEventService } from './distribution-event.service';
import { DistributionEvent } from './entities/distribution-event.entity';

describe('DistributionEventService', () => {
  let service: DistributionEventService;
  let distributionEventModel: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionEventService,
        {
          provide: getModelToken(DistributionEvent),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<DistributionEventService>(DistributionEventService);
    distributionEventModel = module.get<MockRepository>(
      getModelToken(DistributionEvent),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const distributionEvent = {
      id: 'unit-test',
      queue: 'unit-test',
      messageType: 'unit-test',
    } as DistributionEvent;

    afterEach(() => {
      distributionEventModel.findAll.mockClear();
    });

    it('should yield a list of distribution events (w/o rules & subscriptions)', async () => {
      // Arrange.
      const expectedResult = [distributionEvent];
      distributionEventModel.findAll.mockResolvedValue(expectedResult);

      // Act/Assert.
      await expect(service.findAll(false, false)).resolves.toEqual(
        expectedResult,
      );
    });

    it('should yield a list of distribution events (w/rules)', async () => {
      // Arrange.
      const expectedResult = {
        include: [{ model: DistributionRule }],
      };
      distributionEventModel.findAll.mockResolvedValue([distributionEvent]);

      // Act
      await service.findAll(true, false);

      // Assert.
      expect(distributionEventModel.findAll).toHaveBeenCalledWith(
        expectedResult,
      );
    });

    it('should yield a list of distribution events (w/subscriptions)', async () => {
      // Arrange.
      const expectedResult = {
        include: [{ model: Subscription, include: [SubscriptionFilter] }],
      };
      distributionEventModel.findAll.mockResolvedValue([distributionEvent]);

      // Act
      await service.findAll(false, true);

      // Assert.
      expect(distributionEventModel.findAll).toHaveBeenCalledWith(
        expectedResult,
      );
    });

    it('should yield a list of distribution events (w/rules & subscriptions)', async () => {
      // Arrange.
      const expectedResult = {
        include: [
          { model: DistributionRule },
          { model: Subscription, include: [SubscriptionFilter] },
        ],
      };
      distributionEventModel.findAll.mockResolvedValue([distributionEvent]);

      // Act
      await service.findAll(true, true);

      // Assert.
      expect(distributionEventModel.findAll).toHaveBeenCalledWith(
        expectedResult,
      );
    });

    it('should throw a "NotFoundException" if the repository returns null/undefined', async () => {
      // Arrange.
      const expectedResult = new NotFoundException(
        'Distribution events not found!',
      );
      distributionEventModel.findAll.mockResolvedValue(null);

      // Act/Assert.
      await expect(service.findAll(false, false)).rejects.toEqual(
        expectedResult,
      );
    });

    it('should throw a "NotFoundException" if the repository returns an empty list', async () => {
      // Arrange.
      const expectedResult = new NotFoundException(
        'Distribution events not found!',
      );
      distributionEventModel.findAll.mockResolvedValue([]);

      // Act/Assert.
      await expect(service.findAll(false, false)).rejects.toEqual(
        expectedResult,
      );
    });
  });

  describe('findOne()', () => {
    const distributionEvent = {
      id: 'unit-test',
      queue: 'unit-test',
      messageType: 'unit-test',
    } as DistributionEvent;

    afterEach(() => {
      distributionEventModel.findOne.mockClear();
    });

    it('should yield a distribution event (w/o rules & subscriptions)', async () => {
      // Arrange.
      distributionEventModel.findOne.mockResolvedValue(distributionEvent);

      // Act/Assert.
      await expect(
        service.findOne(distributionEvent.queue, distributionEvent.messageType),
      ).resolves.toEqual(distributionEvent);
    });

    it('should yield a distribution event (w/rules)', async () => {
      // Arrange.
      const expectedResult = {
        where: {
          queue: distributionEvent.queue,
          messageType: distributionEvent.messageType,
        },
        include: [{ model: DistributionRule }],
      };
      distributionEventModel.findOne.mockResolvedValue(distributionEvent);

      // Act.
      await service.findOne(
        distributionEvent.queue,
        distributionEvent.messageType,
        true,
      );

      // Assert.
      expect(distributionEventModel.findOne).toHaveBeenCalledWith(
        expectedResult,
      );
    });

    it('should yield a distribution event (w/subscriptions)', async () => {
      // Arrange.
      const expectedResult = {
        where: {
          queue: distributionEvent.queue,
          messageType: distributionEvent.messageType,
        },
        include: [{ model: Subscription, include: [SubscriptionFilter] }],
      };
      distributionEventModel.findOne.mockResolvedValue(distributionEvent);

      // Act.
      await service.findOne(
        distributionEvent.queue,
        distributionEvent.messageType,
        false,
        true,
      );

      // Assert.
      await expect(distributionEventModel.findOne).toHaveBeenCalledWith(
        expectedResult,
      );
    });

    it('should yield a distribution event (w/rules & subscriptions)', async () => {
      // Arrange.
      const expectedResult = {
        where: {
          queue: distributionEvent.queue,
          messageType: distributionEvent.messageType,
        },
        include: [
          { model: DistributionRule },
          { model: Subscription, include: [SubscriptionFilter] },
        ],
      };
      distributionEventModel.findOne.mockResolvedValue(distributionEvent);

      // Act.
      await service.findOne(
        distributionEvent.queue,
        distributionEvent.messageType,
        true,
        true,
      );

      // Assert.
      expect(distributionEventModel.findOne).toHaveBeenCalledWith(
        expectedResult,
      );
    });

    it('should throw a "NotFoundException" if the repository returns null/undefined', async () => {
      // Arrange.
      const expectedResult = new NotFoundException(
        `Distribution Event for queue=${distributionEvent.queue} messageType=${distributionEvent.messageType} not found!`,
      );
      distributionEventModel.findOne.mockResolvedValue(null);

      // Act/Assert.
      expect(
        service.findOne(distributionEvent.queue, distributionEvent.messageType),
      ).rejects.toEqual(expectedResult);
    });
  });

  describe('create()', () => {
    afterEach(() => {
      distributionEventModel.create.mockClear();
    });

    it('should create a distribution event', async () => {
      // Arrange.
      // Act.
      // Assert.
    });

    it('should yield an "ApiResponseDto" object with the create distribution event', async () => {
      // Arrange.
      // Act/Assert.
    });

    it('should throw a "BadRequestException" if a distribution event already exists', async () => {
      // Arrange.
      // Act/Assert.
    });
  });

  describe('update()', () => {
    const distributionEvent = { update: jest.fn() };

    afterEach(() => {
      distributionEvent.update.mockClear();
    });

    it('should update a distribution event', async () => {
      // Arrange.
      // Act
      //Assert.
    });

    it('should yield an "ApiResponseDto" object', async () => {
      // Arrange.
      // Act/Assert.
    });

    it('should throw a "NotFoundException" if the repository returns null/undefined', async () => {
      // Arrange.
      // Act/Assert.
    });
  });

  describe('remove()', () => {
    const distributionEvent = { destroy: jest.fn() };

    afterEach(() => {
      distributionEvent.destroy.mockClear();
    });

    it('should remove a distribution event', async () => {
      // Arrange.
      // Act.
      // Assert.
    });

    it('should yield an "ApiResposneDto" object', async () => {
      // Arrange.
      // Act/Assert.
    });

    it('should yield a "NotFoundException" if the repository returns null/undefined', async () => {
      // Arrange.
      // Act/Assert.
    });
  });
});
