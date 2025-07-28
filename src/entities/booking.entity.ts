import { Entity, Property, PrimaryKey, ManyToOne } from '@mikro-orm/core';
import { Accommodation } from './accommodation.entity';

@Entity()
export class Booking {
  @PrimaryKey()
  id!: number;

  @ManyToOne()
  accommodation!: Accommodation;

  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date;

  @Property()
  guestName!: string;
}
