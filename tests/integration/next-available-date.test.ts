import { MikroORM, EntityManager } from '@mikro-orm/core';
import { Accommodation, AccommodationType } from '../../src/entities/accommodation.entity';
import { Booking } from '../../src/entities/booking.entity';
import { BookingService } from '../../src/services/booking.service';
import mikroOrmConfig from '../../src/mikro-orm.config';

describe('Next Available Date Integration Tests', () => {
	let orm: MikroORM;
	let em: EntityManager;
	let bookingService: BookingService;
	let hotel: Accommodation;
	let apartment: Accommodation;

	beforeAll(async () => {
		orm = await MikroORM.init({
			...mikroOrmConfig,
			dbName: 'test_next_available_date',
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

	describe('Hotel Next Available Date', () => {
		it('should always return the requested date for hotels', async () => {
			// Create some bookings for the hotel
			await bookingService.createBooking({
				accommodationId: hotel.id,
				startDate: new Date('2024-01-05'),
				endDate: new Date('2024-01-10'),
				guestName: 'Guest 1'
			});

			await bookingService.createBooking({
				accommodationId: hotel.id,
				startDate: new Date('2024-01-07'),
				endDate: new Date('2024-01-12'),
				guestName: 'Guest 2'
			});

			// Request date that overlaps with existing bookings
			const requestedDate = new Date('2024-01-08');
			const result = await bookingService.findNextAvailableDate(hotel.id, requestedDate);

			expect(result).toEqual(requestedDate);
		});
	});

	describe('Apartment Next Available Date', () => {
		it('should return the requested date when no bookings exist', async () => {
			const requestedDate = new Date('2024-01-15');
			const result = await bookingService.findNextAvailableDate(apartment.id, requestedDate);

			expect(result).toEqual(requestedDate);
		});

		it('should return the requested date when it is before existing bookings', async () => {
			// Create a booking in the future
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-20'),
				endDate: new Date('2024-01-25'),
				guestName: 'Future Guest'
			});

			const requestedDate = new Date('2024-01-15');
			const result = await bookingService.findNextAvailableDate(apartment.id, requestedDate);

			expect(result).toEqual(requestedDate);
		});

		it('should return date after booking when requested date conflicts', async () => {
			// Create a booking that will conflict with our request
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-10'),
				endDate: new Date('2024-01-20'),
				guestName: 'Blocking Guest'
			});

			const requestedDate = new Date('2024-01-15'); // conflicts with booking
			const result = await bookingService.findNextAvailableDate(apartment.id, requestedDate);

			expect(result).toEqual(new Date('2024-01-20'));
		});

		it('should find available date in gap between bookings', async () => {
			// Create two bookings with a gap
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-05'),
				endDate: new Date('2024-01-10'),
				guestName: 'First Guest'
			});

			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-20'),
				endDate: new Date('2024-01-25'),
				guestName: 'Second Guest'
			});

			const requestedDate = new Date('2024-01-12'); // fits in the gap
			const result = await bookingService.findNextAvailableDate(apartment.id, requestedDate);

			expect(result).toEqual(requestedDate);
		});

		it('should return date after last booking when all gaps are filled', async () => {
			// Create consecutive bookings
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-05'),
				endDate: new Date('2024-01-15'),
				guestName: 'First Guest'
			});

			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-15'),
				endDate: new Date('2024-01-25'),
				guestName: 'Second Guest'
			});

			const requestedDate = new Date('2024-01-10');
			const result = await bookingService.findNextAvailableDate(apartment.id, requestedDate);

			expect(result).toEqual(new Date('2024-01-25'));
		});

		it('should handle complex booking scenarios', async () => {
			// Create multiple overlapping and non-overlapping bookings
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-01-05'),
				guestName: 'Guest 1'
			});

			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-10'),
				endDate: new Date('2024-01-15'),
				guestName: 'Guest 2'
			});

			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-20'),
				endDate: new Date('2024-01-30'),
				guestName: 'Guest 3'
			});

			// Test various scenarios
			expect(await bookingService.findNextAvailableDate(apartment.id, new Date('2024-01-03')))
				.toEqual(new Date('2024-01-05'));

			expect(await bookingService.findNextAvailableDate(apartment.id, new Date('2024-01-06')))
				.toEqual(new Date('2024-01-06'));

			expect(await bookingService.findNextAvailableDate(apartment.id, new Date('2024-01-12')))
				.toEqual(new Date('2024-01-15'));

			expect(await bookingService.findNextAvailableDate(apartment.id, new Date('2024-01-25')))
				.toEqual(new Date('2024-01-30'));
		});
	});

	describe('Cross-Accommodation Isolation', () => {
		it('should not consider bookings from other accommodations', async () => {
			// Create booking for apartment
			await bookingService.createBooking({
				accommodationId: apartment.id,
				startDate: new Date('2024-01-10'),
				endDate: new Date('2024-01-20'),
				guestName: 'Apartment Guest'
			});

			// Hotel should still return the requested date even though apartment is booked
			const requestedDate = new Date('2024-01-15');
			const hotelResult = await bookingService.findNextAvailableDate(hotel.id, requestedDate);
			expect(hotelResult).toEqual(requestedDate);

			// Different apartment should also return the requested date
			const otherApartment = em.create(Accommodation, {
				name: 'Other Apartment',
				description: 'Another test apartment',
				price: 90,
				location: 'Test City',
				type: AccommodationType.APARTMENT
			});
			await em.persistAndFlush(otherApartment);

			const otherResult = await bookingService.findNextAvailableDate(otherApartment.id, requestedDate);
			expect(otherResult).toEqual(requestedDate);
		});
	});

	describe('Error Handling', () => {
		it('should throw error for non-existent accommodation', async () => {
			await expect(
				bookingService.findNextAvailableDate(999, new Date('2024-01-15'))
			).rejects.toThrow();
		});
	});
}); 
