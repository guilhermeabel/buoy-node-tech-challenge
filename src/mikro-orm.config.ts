import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Accommodation } from './entities/accommodation.entity';
import { Booking } from './entities/booking.entity';

const mikroOrmConfig: Options<PostgreSqlDriver> = {
  entities: [Accommodation, Booking],
  dbName: process.env.DB_NAME || 'accommodation_booking',
  type: 'postgresql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  metadataProvider: TsMorphMetadataProvider,
  migrations: {
    path: './src/migrations',
    disableForeignKeys: false
  }
};

export default mikroOrmConfig;
