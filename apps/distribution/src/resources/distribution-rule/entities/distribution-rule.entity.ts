import { DeliveryMethods } from '@notification/common';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { DistributionEvent } from '../../distribution-event/entities/distribution-event.entity';

@Table({
  indexes: [
    {
      unique: true,
      fields: ['distributionEventId', 'metadata'],
    },
  ],
})
export class DistributionRule extends Model {
  @Column({ primaryKey: true, type: DataType.UUID })
  @ForeignKey(() => DistributionEvent)
  distributionEventId: string;

  @Column({
    allowNull: true,
    primaryKey: true,
  })
  metadata: string;

  @Column({
    type: DataType.ARRAY(
      DataType.ENUM(
        DeliveryMethods.EMAIL,
        DeliveryMethods.SMS,
        DeliveryMethods.RADIO,
      ),
    ),
  })
  deliveryMethods: DeliveryMethods[];

  @Column
  emailSubject: string;

  @Column({ type: DataType.STRING(2000), allowNull: true })
  emailTemplate: string;

  @Column({ type: DataType.STRING(2000), allowNull: true })
  html: string;

  @Column
  text: string;

  @Default(false)
  @Column
  checkDeliveryWindow: boolean;

  @BelongsTo(() => DistributionEvent)
  event: DistributionEvent;
}
