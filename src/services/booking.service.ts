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

	async findNextAvailableDate(accommodationId: number, fromDate: Date): Promise<Date> {
		const accommodation = await this.em.findOneOrFail(Accommodation, { id: accommodationId });

		if (accommodation.type === AccommodationType.HOTEL) {
			return fromDate;
		}

		return await this.findNextAvailableDateForApartment(accommodationId, fromDate);
	}

	private async findNextAvailableDateForApartment(accommodationId: number, fromDate: Date): Promise<Date> {
		// Get all future bookings for this apartment, sorted by start date
		const futureBookings = await this.em.find(Booking, {
			accommodation: accommodationId,
			endDate: { $gt: fromDate }
		}, {
			orderBy: { startDate: 'ASC' }
		});

		if (futureBookings.length === 0) {
			return fromDate;
		}

		let candidateDate = new Date(fromDate);

		for (const booking of futureBookings) {
			if (candidateDate < booking.startDate) {
				return candidateDate;
			}

			// If candidate date conflicts with this booking, move to after this booking ends
			if (candidateDate < booking.endDate) {
				candidateDate = new Date(booking.endDate);
			}
		}

		return candidateDate;
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
