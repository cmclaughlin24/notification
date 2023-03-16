import {
  BelongsTo,
  Column,
  ForeignKey,
  HasMany,
  Model,
  Table
} from 'sequelize-typescript';
import { SubscriptionFilterJoinOps } from '../../../common/constants/subscription-filter.constants';
import { DistributionRule } from '../../distribution-rule/entities/distribution-rule.entity';
import { SubscriptionFilter } from './subscription-filter.entity';

@Table
export class Subscription extends Model {
  @Column({
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => DistributionRule)
  distributionRuleId: string;

  @Column
  url: string;

  @Column
  filterJoin: SubscriptionFilterJoinOps;

  @BelongsTo(() => DistributionRule)
  distributionRule: DistributionRule;

  @HasMany(() => SubscriptionFilter)
  filters: SubscriptionFilter[];
}
