import fastify from 'fastify';
import { MikroORM } from '@mikro-orm/core';
import mikroOrmConfig from './mikro-orm.config';
import accommodationRoutes from './routes/accommodation.routes';
import bookingRoutes from './routes/booking.routes';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

const server = fastify({ logger: true });

async function registerSwagger() {
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'Accommodation Booking API',
        version: '1.0.0'
      }
    }
  });
  await server.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: false
    }
  });
}

const start = async () => {
  try {
    // await 5 seconds before starting the server
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await registerSwagger();

    const orm = await MikroORM.init(mikroOrmConfig);
    await orm.getMigrator().up();

    server.decorate('orm', orm);
    server.decorate('em', orm.em.fork());

    server.register(accommodationRoutes, { prefix: '/accommodations' });
    server.register(bookingRoutes, { prefix: '/bookings' });

    await server.listen({ 
      port: Number(process.env.PORT) || 8006,
      host: '0.0.0.0' 
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
