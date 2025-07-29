import { z } from 'zod';
import { AccommodationType } from '../entities/accommodation.entity';

export const AccommodationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  type: z.nativeEnum(AccommodationType)
});

export type AccommodationInput = z.infer<typeof AccommodationSchema>;

export const AccommodationParamsSchema = z.object({ id: z.coerce.number() });

export const NextAvailableDateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').transform(str => new Date(str))
});

export type NextAvailableDateQuery = z.infer<typeof NextAvailableDateQuerySchema>;
