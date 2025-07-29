import { EntityManager } from '@mikro-orm/core';
import { Booking } from '../entities/booking.entity';
import { Accommodation, AccommodationType } from '../entities/accommodation.entity';

export class BookingService {
	constructor(private em: EntityManager) { }

	async validateBooking(accommodation: Accommodation, startDate: Date, endDate: Date): Promise<void> {
		if (accommodation.type === AccommodationType.APARTMENT) {
			await this.checkApartmentOverlap(accommodation.id, startDate, endDate);
		}
	}

	private async checkApartmentOverlap(accommodationId: number, startDate: Date, endDate: Date): Promise<void> {
		// They overlap if: existing.startDate < endDate AND startDate < existing.endDate
		const overlappingBooking = await this.em.findOne(Booking, {
			accommodation: accommodationId,
			startDate: { $lt: endDate },
			endDate: { $gt: startDate },
		});

		if (overlappingBooking) {
			throw new Error('Apartment is not available for the selected dates');
		}
	}

	async createBooking(data: {
		accommodationId: number;
		startDate: Date;
		endDate: Date;
		guestName: string;
	}): Promise<Booking> {
		const accommodation = await this.em.findOneOrFail(Accommodation, { id: data.accommodationId });

		await this.validateBooking(accommodation, data.startDate, data.endDate);

		const booking = this.em.create(Booking, {
			accommodation,
			startDate: data.startDate,
			endDate: data.endDate,
			guestName: data.guestName
		});

		await this.em.persistAndFlush(booking);
		return booking;
	}
} 
