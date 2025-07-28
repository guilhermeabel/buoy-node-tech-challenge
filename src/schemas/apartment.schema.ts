import { z } from 'zod';
import { AccommodationType } from '../entities/accommodation.entity';

export const ApartmentSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters'),
	description: z.string().optional(),
	price: z.number().positive('Price must be positive'),
	location: z.string().min(2, 'Location must be at least 2 characters'),
	type: z.literal(AccommodationType.APARTMENT).default(AccommodationType.APARTMENT)
});

export type ApartmentInput = z.infer<typeof ApartmentSchema>;

export const ApartmentParamsSchema = z.object({ id: z.coerce.number() }); 
