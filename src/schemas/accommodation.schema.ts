import { z } from 'zod';

export const AccommodationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  location: z.string().min(2, 'Location must be at least 2 characters')
});

export type AccommodationInput = z.infer<typeof AccommodationSchema>;

export const AccommodationParamsSchema = z.object({ id: z.coerce.number() });