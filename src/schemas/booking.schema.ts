import { z } from 'zod';

export const BookingSchema = z.object({
  accommodationId: z.number().positive('Invalid accommodation ID'),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format, expected yyyy-mm-dd'
  }).transform(val => new Date(val)),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format, expected yyyy-mm-dd'
  }).transform(val => new Date(val)),
  guestName: z.string().min(2, 'Guest name must be at least 2 characters')
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date'
});

export const BookingJsonSchema = {
  type: 'object',
  properties: {
    accommodationId: { type: 'number' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    guestName: { type: 'string' }
  },
  required: ['accommodationId', 'startDate', 'endDate', 'guestName']
};

export type BookingInput = z.infer<typeof BookingSchema>;

export const BookingParamsSchema = z.object({ id: z.coerce.number() });