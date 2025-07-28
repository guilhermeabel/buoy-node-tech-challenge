import { Entity, Property, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import { Booking } from './booking.entity';

@Entity()
export class Accommodation {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal' })
  price!: number;

  @Property()
  location!: string;

  @OneToMany(() => Booking, booking => booking.accommodation)
  bookings = new Collection<Booking>(this);
}
