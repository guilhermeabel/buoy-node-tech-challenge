import { MikroORM, EntityManager } from '@mikro-orm/core';
import { BookingService } from '../../src/services/booking.service';
import { Accommodation, AccommodationType } from '../../src/entities/accommodation.entity';
import { Booking } from '../../src/entities/booking.entity';
import mikroOrmConfig from '../../src/mikro-orm.config';

describe('Booking Overlap Detection Integration Tests', () => {
	let orm: MikroORM;
	let em: EntityManager;
	let bookingService: BookingService;
	let hotel: Accommodation;
	let apartment: Accommodation;

	beforeAll(async () => {
		orm = await MikroORM.init({
			...mikroOrmConfig,
			dbName: 'test_booking_overlap',
		});

		await orm.getSchemaGenerator().refreshDatabase();
	});

	beforeEach(async () => {
		em = orm.em.fork();
		bookingService = new BookingService(em);

		hotel = em.create(Accommodation, {
			name: 'Test Hotel',
			description: 'A test hotel',
			price: 100,
			location: 'Test City',
			type: AccommodationType.HOTEL
		});

		apartment = em.create(Accommodation, {
			name: 'Test Apartment',
			description: 'A test apartment',
			price: 80,
			location: 'Test City',
			type: AccommodationType.APARTMENT
		});

		await em.persistAndFlush([hotel, apartment]);
	});

	afterEach(async () => {
		await em.nativeDelete(Booking, {});
		await em.nativeDelete(Accommodation, {});
	});

	afterAll(async () => {
		await orm.close();
	});

	describe('Hotel Overlap Behavior', () => {
		it('should allow multiple overlapping bookings for hotels', async () => {
			const booking1 = await bookingService.createBooking({
				accommodationId: hotel.id,
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-01-05'),
				guestName: 'Guest 1'
			});

			// overlapping booking - should succeed for hotels
			const booking2 = await bookingService.createBooking({
				accommodationId: hotel.id,
				startDate: new Date('2024-01-03'), // overlaps with booking1
				endDate: new Date('2024-01-07'),
				guestName: 'Guest 2'
			});

			expect(booking1).toBeDefined();
			expect(booking2).toBeDefined();
			expect(booking1.id).not.toBe(booking2.id);

			// verify both bookings exist in database
			const allBookings = await em.find(Booking, { accommodation: hotel.id });
			expect(allBookings).toHaveLength(2);
		});
	});

	describe('Apartment Overlap Detection', () => {
		beforeEach(async () => {
			// Create an existing booking for overlap testing
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-05'),
				endDate: new Date('2024-01-10'),
				guestName: 'Existing Guest'
			});
		});

		describe('Overlap Scenarios', () => {
			it('should detect when new booking starts during existing booking', async () => {
				// Existing: Jan 5-10, New: Jan 7-12 (starts during existing)
				await expect(
					bookingService.createBooking({
						accommodationId: apartment.id,
						startDate: new Date('2024-01-07'),
						endDate: new Date('2024-01-12'),
						guestName: 'Overlapping Guest'
					})
				).rejects.toThrow('Apartment is not available for the selected dates');
			});

			it('should detect when new booking ends during existing booking', async () => {
				// Existing: Jan 5-10, New: Jan 1-7 (ends during existing)
				await expect(
					bookingService.createBooking({
						accommodationId: apartment.id,
						startDate: new Date('2024-01-01'),
						endDate: new Date('2024-01-07'),
						guestName: 'Overlapping Guest'
					})
				).rejects.toThrow('Apartment is not available for the selected dates');
			});

			it('should detect when new booking completely contains existing booking', async () => {
				// Existing: Jan 5-10, New: Jan 1-15 (contains existing)
				await expect(
					bookingService.createBooking({
						accommodationId: apartment.id,
						startDate: new Date('2024-01-01'),
						endDate: new Date('2024-01-15'),
						guestName: 'Overlapping Guest'
					})
				).rejects.toThrow('Apartment is not available for the selected dates');
			});

			it('should detect when new booking is completely contained by existing booking', async () => {
				// Existing: Jan 5-10, New: Jan 6-8 (contained by existing)
				await expect(
					bookingService.createBooking({
						accommodationId: apartment.id,
						startDate: new Date('2024-01-06'),
						endDate: new Date('2024-01-08'),
						guestName: 'Overlapping Guest'
					})
				).rejects.toThrow('Apartment is not available for the selected dates');
			});

			it('should detect exact same dates overlap', async () => {
				// Existing: Jan 5-10, New: Jan 5-10 (exact same)
				await expect(
					bookingService.createBooking({
						accommodationId: apartment.id,
						startDate: new Date('2024-01-05'),
						endDate: new Date('2024-01-10'),
						guestName: 'Overlapping Guest'
					})
				).rejects.toThrow('Apartment is not available for the selected dates');
			});
		});

		describe('Non-Overlap Scenarios', () => {
			it('should allow booking that ends exactly when existing starts', async () => {
				// Existing: Jan 5-10, New: Jan 1-5 (ends when existing starts)
				const booking = await bookingService.createBooking({
					accommodationId: apartment.id,
					startDate: new Date('2024-01-01'),
					endDate: new Date('2024-01-05'),
					guestName: 'Non-overlapping Guest'
				});

				expect(booking).toBeDefined();
				expect(booking.guestName).toBe('Non-overlapping Guest');
			});

			it('should allow booking that starts exactly when existing ends', async () => {
				// Existing: Jan 5-10, New: Jan 10-15 (starts when existing ends)
				const booking = await bookingService.createBooking({
					accommodationId: apartment.id,
					startDate: new Date('2024-01-10'),
					endDate: new Date('2024-01-15'),
					guestName: 'Non-overlapping Guest'
				});

				expect(booking).toBeDefined();
				expect(booking.guestName).toBe('Non-overlapping Guest');
			});

			it('should allow booking completely before existing booking', async () => {
				// Existing: Jan 5-10, New: Jan 1-3 (completely before)
				const booking = await bookingService.createBooking({
					accommodationId: apartment.id,
					startDate: new Date('2024-01-01'),
					endDate: new Date('2024-01-03'),
					guestName: 'Non-overlapping Guest'
				});

				expect(booking).toBeDefined();
				expect(booking.guestName).toBe('Non-overlapping Guest');
			});

			it('should allow booking completely after existing booking', async () => {
				// Existing: Jan 5-10, New: Jan 12-15 (completely after)
				const booking = await bookingService.createBooking({
					accommodationId: apartment.id,
					startDate: new Date('2024-01-12'),
					endDate: new Date('2024-01-15'),
					guestName: 'Non-overlapping Guest'
				});

				expect(booking).toBeDefined();
				expect(booking.guestName).toBe('Non-overlapping Guest');
			});
		});

		describe('Multiple Existing Bookings', () => {
			beforeEach(async () => {
				// Add another existing booking to create gaps
				await bookingService.createBooking({
					accommodationId: apartment.id,
					startDate: new Date('2024-01-15'),
					endDate: new Date('2024-01-20'),
					guestName: 'Second Existing Guest'
				});
				// Now we have: Jan 5-10 and Jan 15-20
			});

			it('should allow booking in gap between existing bookings', async () => {
				// Existing: Jan 5-10 and Jan 15-20, New: Jan 11-14 (in gap)
				const booking = await bookingService.createBooking({
					accommodationId: apartment.id,
					startDate: new Date('2024-01-11'),
					endDate: new Date('2024-01-14'),
					guestName: 'Gap Guest'
				});

				expect(booking).toBeDefined();
				expect(booking.guestName).toBe('Gap Guest');
			});

			it('should reject booking that overlaps with any existing booking', async () => {
				// Existing: Jan 5-10 and Jan 15-20, New: Jan 8-17 (overlaps both)
				await expect(
					bookingService.createBooking({
						accommodationId: apartment.id,
						startDate: new Date('2024-01-08'),
						endDate: new Date('2024-01-17'),
						guestName: 'Multi-overlap Guest'
					})
				).rejects.toThrow('Apartment is not available for the selected dates');
			});
		});
	});

	describe('Cross-Accommodation Isolation', () => {
		it('should not consider bookings from other accommodations', async () => {
			// Create booking for apartment
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-05'),
				endDate: new Date('2024-01-10'),
				guestName: 'Apartment Guest'
			});

			// Create booking for hotel with same dates - should succeed
			const hotelBooking = await bookingService.createBooking({
				accommodationId: hotel.id,
				startDate: new Date('2024-01-05'),
				endDate: new Date('2024-01-10'),
				guestName: 'Hotel Guest'
			});

			expect(hotelBooking).toBeDefined();
			expect(hotelBooking.guestName).toBe('Hotel Guest');
		});
	});
}); 
