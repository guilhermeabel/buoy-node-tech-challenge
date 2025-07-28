import { FastifyPluginAsync } from 'fastify';
import { Accommodation } from '../entities/accommodation.entity';
import { AccommodationSchema, AccommodationInput, AccommodationParamsSchema } from '../schemas/accommodation.schema';
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
