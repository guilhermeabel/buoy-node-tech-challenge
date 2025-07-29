import { FastifyPluginAsync } from 'fastify';
import { Accommodation, AccommodationType } from '../entities/accommodation.entity';
import { ApartmentSchema, ApartmentInput, ApartmentParamsSchema } from '../schemas/apartment.schema';
import fromZodSchema from 'zod-to-json-schema';

const apartmentRoutes: FastifyPluginAsync = async (fastify) => {
	fastify.get('/', {
		schema: {
			description: 'Get all apartments',
			tags: ['Apartments']
		}
	}, async () => {
		return await fastify.em.find(Accommodation, { type: AccommodationType.APARTMENT });
	});

	fastify.get('/:id', {
		schema: {
			description: 'Get apartment by ID',
			tags: ['Apartments'],
			params: fromZodSchema(ApartmentParamsSchema)
		}
	}, async (request, reply) => {
		const { id } = ApartmentParamsSchema.parse(request.params);
		const apartment = await fastify.em.findOne(Accommodation, { id, type: AccommodationType.APARTMENT });

		if (!apartment) {
			return reply.status(404).send({ message: 'Apartment not found' });
		}

		return apartment;
	});

	fastify.post<{ Body: ApartmentInput }>('/', {
		schema: {
			description: 'Create a new apartment',
			tags: ['Apartments'],
			body: fromZodSchema(ApartmentSchema)
		}
	}, async (request, reply) => {
		try {
			const data = ApartmentSchema.parse(request.body);
			const apartment = fastify.em.create(Accommodation, data);
			await fastify.em.persistAndFlush(apartment);
			return reply.status(201).send(apartment);
		} catch (error) {
			return reply.status(400).send(error);
		}
	});
};

export default apartmentRoutes; 
