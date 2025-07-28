import { Migration } from '@mikro-orm/migrations';

export class Migration20241214221109 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "accommodation" ("id" serial primary key, "name" varchar(255) not null, "description" text null, "price" numeric(10,0) not null, "location" varchar(255) not null);');

    this.addSql('create table "booking" ("id" serial primary key, "accommodation_id" int not null, "start_date" timestamptz(0) not null, "end_date" timestamptz(0) not null, "guest_name" varchar(255) not null);');

    this.addSql('alter table "booking" add constraint "booking_accommodation_id_foreign" foreign key ("accommodation_id") references "accommodation" ("id") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "booking" drop constraint "booking_accommodation_id_foreign";');

    this.addSql('drop table if exists "accommodation" cascade;');

    this.addSql('drop table if exists "booking" cascade;');
  }

}
