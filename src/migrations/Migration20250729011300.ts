import { Migration } from '@mikro-orm/migrations';

export class Migration20250729011300 extends Migration {

	async up(): Promise<void> {
		this.addSql('alter table "accommodation" add column "type" text check ("type" in (\'hotel\', \'apartment\')) not null;');
	}

	async down(): Promise<void> {
		this.addSql('alter table "accommodation" drop column "type";');
	}

} 
