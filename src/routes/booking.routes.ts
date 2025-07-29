import { FastifyPluginAsync } from 'fastify';
import { Booking } from '../entities/booking.entity';
import { BookingInput, BookingSchema, BookingJsonSchema, BookingParamsSchema } from '../schemas/booking.schema';
import { BookingService } from '../services/booking.service';
import fromZodSchema from 'zod-to-json-schema';

const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      description: 'Get all bookings',
      tags: ['Bookings']
    }
  }, async () => {
    return await fastify.em.find(Booking, {}, { populate: ['accommodation'] });
  });

  fastify.get('/:id', {
    schema: {
      description: 'Get booking by ID',
      tags: ['Bookings'],
      params: fromZodSchema(BookingParamsSchema)
    }
  }, async (request, reply) => {
    const { id } = BookingParamsSchema.parse(request.params);
    const booking = await fastify.em.findOne(Booking, { id }, { populate: ['accommodation'] });

    if (!booking) {
      return reply.status(404).send({ message: 'Booking not found' });
    }

    return booking;
  });

  fastify.post<{ Body: BookingInput }>('/', {
    schema: {
      description: 'Create a new booking',
      tags: ['Bookings'],
      body: BookingJsonSchema
    }
  }, async (request, reply) => {
    try {
      const data = BookingSchema.parse(request.body);
      const bookingService = new BookingService(fastify.em);

      const booking = await bookingService.createBooking({
        accommodationId: data.accommodationId,
        startDate: data.startDate,
        endDate: data.endDate,
        guestName: data.guestName
      });

      return reply.status(201).send(booking);
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message });
      }
      return reply.status(400).send(error);
    }
  });
};

export default bookingRoutes;
