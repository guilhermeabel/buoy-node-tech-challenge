import { EntityManager } from '@mikro-orm/core';
import { BookingService } from '../../src/services/booking.service';
import { Accommodation, AccommodationType } from '../../src/entities/accommodation.entity';
import { Booking } from '../../src/entities/booking.entity';

const mockEntityManager = {
	findOne: jest.fn(),
	find: jest.fn(),
	create: jest.fn(),
	persistAndFlush: jest.fn(),
	findOneOrFail: jest.fn(),
} as unknown as EntityManager;

describe('BookingService Unit Tests', () => {
	let bookingService: BookingService;

	beforeEach(() => {
		bookingService = new BookingService(mockEntityManager);
		jest.clearAllMocks();
	});

	describe('Hotel Booking Validation', () => {
		it('should allow booking for hotels without overlap check', async () => {
			const hotel = { id: 1, type: AccommodationType.HOTEL } as Accommodation;

			// should not throw for hotels
			await expect(
				bookingService.validateBooking(hotel, new Date('2024-01-01'), new Date('2024-01-05'))
			).resolves.not.toThrow();

			// verify no database queries were made during validation (only overlap check would query)
			expect(mockEntityManager.findOne).not.toHaveBeenCalled();
		});
	});

	describe('Apartment Booking Validation', () => {
		it('should allow booking when no overlapping bookings exist', async () => {
			const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
			(mockEntityManager.findOne as jest.Mock).mockResolvedValue(null);

			await expect(
				bookingService.validateBooking(apartment, new Date('2024-01-01'), new Date('2024-01-05'))
			).resolves.not.toThrow();

			// verify correct overlap query was made
			expect(mockEntityManager.findOne).toHaveBeenCalledWith(Booking, {
				accommodation: 1,
				startDate: { $lt: new Date('2024-01-05') },
				endDate: { $gt: new Date('2024-01-01') }
			});
		});

		it('should reject booking when overlapping booking exists', async () => {
			const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
			const existingBooking = { id: 1 } as Booking;

			(mockEntityManager.findOne as jest.Mock).mockResolvedValue(existingBooking);

			await expect(
				bookingService.validateBooking(apartment, new Date('2024-01-01'), new Date('2024-01-05'))
			).rejects.toThrow('Apartment is not available for the selected dates');
		});

		describe('Overlap Detection Logic', () => {
			it('should use correct standard interval overlap algorithm', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				(mockEntityManager.findOne as jest.Mock).mockResolvedValue(null);

				const newStart = new Date('2024-01-03');
				const newEnd = new Date('2024-01-07');

				await bookingService.validateBooking(apartment, newStart, newEnd);

				// Standard overlap: existing.start < new.end AND existing.end > new.start
				expect(mockEntityManager.findOne).toHaveBeenCalledWith(Booking, {
					accommodation: 1,
					startDate: { $lt: newEnd },
					endDate: { $gt: newStart }
				});
			});

			it('should detect all overlap scenarios with simple logic', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				(mockEntityManager.findOne as jest.Mock).mockResolvedValue(null);

				await bookingService.validateBooking(apartment, new Date('2024-01-03'), new Date('2024-01-05'));

				const calledWith = (mockEntityManager.findOne as jest.Mock).mock.calls[0][1];

				// verify the query would find overlaps using standard algorithm
				expect(calledWith).toEqual({
					accommodation: 1,
					startDate: { $lt: new Date('2024-01-05') },
					endDate: { $gt: new Date('2024-01-03') }
				});
			});
		});
	});

	describe('Next Available Date', () => {
		describe('Hotel Availability', () => {
			it('should return the requested date for hotels', async () => {
				const hotel = { id: 1, type: AccommodationType.HOTEL } as Accommodation;
				(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(hotel);

				const requestedDate = new Date('2024-01-15');
				const result = await bookingService.findNextAvailableDate(1, requestedDate);

				expect(result).toEqual(requestedDate);
				expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(Accommodation, { id: 1 });
			});
		});

		describe('Apartment Availability', () => {
			it('should return the requested date when no bookings exist', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(apartment);
				(mockEntityManager.find as jest.Mock).mockResolvedValue([]);

				const requestedDate = new Date('2024-01-15');
				const result = await bookingService.findNextAvailableDate(1, requestedDate);

				expect(result).toEqual(requestedDate);
				expect(mockEntityManager.find).toHaveBeenCalledWith(Booking, {
					accommodation: 1,
					endDate: { $gt: requestedDate }
				}, {
					orderBy: { startDate: 'ASC' }
				});
			});

			it('should return the requested date when it is before existing bookings', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				const booking1 = {
					startDate: new Date('2024-01-20'),
					endDate: new Date('2024-01-25')
				} as Booking;

				(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(apartment);
				(mockEntityManager.find as jest.Mock).mockResolvedValue([booking1]);

				const requestedDate = new Date('2024-01-15');
				const result = await bookingService.findNextAvailableDate(1, requestedDate);

				expect(result).toEqual(requestedDate);
			});

			it('should return date after booking when requested date conflicts', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				const booking1 = {
					startDate: new Date('2024-01-10'),
					endDate: new Date('2024-01-20')
				} as Booking;

				(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(apartment);
				(mockEntityManager.find as jest.Mock).mockResolvedValue([booking1]);

				const requestedDate = new Date('2024-01-15'); // conflicts with booking
				const result = await bookingService.findNextAvailableDate(1, requestedDate);

				expect(result).toEqual(new Date('2024-01-20'));
			});

			it('should find gap between multiple bookings', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				const booking1 = {
					startDate: new Date('2024-01-05'),
					endDate: new Date('2024-01-10')
				} as Booking;
				const booking2 = {
					startDate: new Date('2024-01-20'),
					endDate: new Date('2024-01-25')
				} as Booking;

				(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(apartment);
				(mockEntityManager.find as jest.Mock).mockResolvedValue([booking1, booking2]);

				const requestedDate = new Date('2024-01-12');
				const result = await bookingService.findNextAvailableDate(1, requestedDate);

				expect(result).toEqual(requestedDate); // Should fit in the gap
			});

			it('should return date after last booking when all earlier dates conflict', async () => {
				const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
				const booking1 = {
					startDate: new Date('2024-01-05'),
					endDate: new Date('2024-01-15')
				} as Booking;
				const booking2 = {
					startDate: new Date('2024-01-15'),
					endDate: new Date('2024-01-25')
				} as Booking;

				(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(apartment);
				(mockEntityManager.find as jest.Mock).mockResolvedValue([booking1, booking2]);

				const requestedDate = new Date('2024-01-10');
				const result = await bookingService.findNextAvailableDate(1, requestedDate);

				expect(result).toEqual(new Date('2024-01-25'));
			});
		});

		it('should handle accommodation not found', async () => {
			(mockEntityManager.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Accommodation not found'));

			await expect(
				bookingService.findNextAvailableDate(999, new Date('2024-01-15'))
			).rejects.toThrow('Accommodation not found');
		});
	});

	describe('Booking Creation', () => {
		it('should create booking successfully when validation passes', async () => {
			// successful validation (hotel)
			const hotel = { id: 1, type: AccommodationType.HOTEL } as Accommodation;
			(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(hotel);

			const mockBooking = { id: 1, guestName: 'Test Guest' } as Booking;
			(mockEntityManager.create as jest.Mock).mockReturnValue(mockBooking);
			(mockEntityManager.persistAndFlush as jest.Mock).mockResolvedValue(undefined);

			const result = await bookingService.createBooking({
				accommodationId: 1,
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-01-05'),
				guestName: 'Test Guest'
			});

			expect(result).toBe(mockBooking);
			expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(Accommodation, { id: 1 });
			expect(mockEntityManager.create).toHaveBeenCalledWith(Booking, {
				accommodation: hotel,
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-01-05'),
				guestName: 'Test Guest'
			});
			expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockBooking);
		});

		it('should fail to create booking when validation fails', async () => {
			// apartment with overlapping booking
			const apartment = { id: 1, type: AccommodationType.APARTMENT } as Accommodation;
			(mockEntityManager.findOneOrFail as jest.Mock).mockResolvedValue(apartment);
			(mockEntityManager.findOne as jest.Mock).mockResolvedValue({ id: 1 }); // overlapping booking found

			await expect(
				bookingService.createBooking({
					accommodationId: 1,
					startDate: new Date('2024-01-01'),
					endDate: new Date('2024-01-05'),
					guestName: 'Test Guest'
				})
			).rejects.toThrow('Apartment is not available for the selected dates');

			// verify accommodation was fetched
			expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(Accommodation, { id: 1 });
			// verify booking was not created
			expect(mockEntityManager.create).not.toHaveBeenCalled();
			expect(mockEntityManager.persistAndFlush).not.toHaveBeenCalled();
		});

		it('should fail to create booking when accommodation not found', async () => {
			(mockEntityManager.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Accommodation not found'));

			await expect(
				bookingService.createBooking({
					accommodationId: 999,
					startDate: new Date('2024-01-01'),
					endDate: new Date('2024-01-05'),
					guestName: 'Test Guest'
				})
			).rejects.toThrow('Accommodation not found');

			// verify accommodation lookup was attempted
			expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(Accommodation, { id: 999 });
			// verify booking was not created
			expect(mockEntityManager.create).not.toHaveBeenCalled();
			expect(mockEntityManager.persistAndFlush).not.toHaveBeenCalled();
		});
	});
}); 
