import { DistributionQueues } from '@notification/common';
import {
  Column,
  CreatedAt,
  DataType,
  Model,
  Table,
  UpdatedAt
} from 'sequelize-typescript';

@Table
export class DistributionLog extends Model {
  @Column({
    primaryKey: true,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    type: DataType.ENUM(DistributionQueues.DISTRIBUTE),
  })
  queue: string

  @Column
  rule: string;

  @Column
  state: string;

  @Column
  attempts: number;

  @Column({ type: DataType.JSON })
  data: string;

  @Column({ allowNull: true, type: DataType.JSON })
  result: string;

  @Column({ allowNull: true, type: DataType.JSON })
  error: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
