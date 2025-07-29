import { FastifyPluginAsync } from 'fastify';
import { Accommodation } from '../entities/accommodation.entity';
import { AccommodationSchema, AccommodationInput, AccommodationParamsSchema, NextAvailableDateQuerySchema, NextAvailableDateQuery } from '../schemas/accommodation.schema';
import { BookingService } from '../services/booking.service';
import fromZodSchema from 'zod-to-json-schema';


const accommodationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      description: 'Get all accommodations',
      tags: ['Accommodations']
    }
  }, async () => {
    return await fastify.em.find(Accommodation, {});
  });

  fastify.get('/:id', {
    schema: {
      description: 'Get accommodation by ID',
      tags: ['Accommodations'],
      params: fromZodSchema(AccommodationParamsSchema)
    }
  }, async (request, reply) => {
    const { id } = AccommodationParamsSchema.parse(request.params);
    const accommodation = await fastify.em.findOne(Accommodation, { id });

    if (!accommodation) {
      return reply.status(404).send({ message: 'Accommodation not found' });
    }

    return accommodation;
  });

  fastify.get<{ Params: { id: number }, Querystring: NextAvailableDateQuery }>('/:id/next-available-date', {
    schema: {
      description: 'Get next available date for accommodation',
      tags: ['Accommodations'],
      params: fromZodSchema(AccommodationParamsSchema),
      querystring: fromZodSchema(NextAvailableDateQuerySchema)
    }
  }, async (request, reply) => {
    try {
      const { id } = AccommodationParamsSchema.parse(request.params);
      const { date } = NextAvailableDateQuerySchema.parse(request.query);

      const bookingService = new BookingService(fastify.em);
      const nextAvailableDate = await bookingService.findNextAvailableDate(id, date);

      return {
        accommodationId: id,
        requestedDate: date.toISOString().split('T')[0],
        nextAvailableDate: nextAvailableDate.toISOString().split('T')[0]
      };
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ message: error.message });
      }
      return reply.status(400).send(error);
    }
  });

  fastify.post<{ Body: AccommodationInput }>('/', {
    schema: {
      description: 'Create a new accommodation',
      tags: ['Accommodations'],
      body: fromZodSchema(AccommodationSchema)
    }
  }, async (request, reply) => {
    try {
      const data = AccommodationSchema.parse(request.body);
      const accommodation = fastify.em.create(Accommodation, data);
      await fastify.em.persistAndFlush(accommodation);
      return reply.status(201).send(accommodation);
    } catch (error) {
      return reply.status(400).send(error);
    }
  });
};

export default accommodationRoutes;
