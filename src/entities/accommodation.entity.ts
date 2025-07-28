import { Entity, Property, PrimaryKey, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { Booking } from './booking.entity';

export enum AccommodationType {
  HOTEL = 'hotel',
  APARTMENT = 'apartment'
}

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

  @Enum(() => AccommodationType)
  type!: AccommodationType;

  @OneToMany(() => Booking, booking => booking.accommodation)
  bookings = new Collection<Booking>(this);
}
