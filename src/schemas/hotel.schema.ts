import { z } from 'zod';
import { AccommodationType } from '../entities/accommodation.entity';

export const HotelSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters'),
	description: z.string().optional(),
	price: z.number().positive('Price must be positive'),
	location: z.string().min(2, 'Location must be at least 2 characters'),
	type: z.literal(AccommodationType.HOTEL).default(AccommodationType.HOTEL)
});

export type HotelInput = z.infer<typeof HotelSchema>;

export const HotelParamsSchema = z.object({ id: z.coerce.number() }); 
