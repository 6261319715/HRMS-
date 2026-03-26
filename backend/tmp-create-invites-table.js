require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(`
      create table if not exists public.employee_invites (
        id serial primary key,
        email varchar(255) not null,
        role varchar(30) not null,
        organization_name varchar(255) not null,
        token varchar(255) not null unique,
        status varchar(20) not null default 'pending',
        invited_by_user_id integer not null references public.users(id) on delete cascade,
        accepted_at timestamp,
        created_at timestamp default now() not null
      );
    `);

    await client.query(`
      create unique index if not exists invite_email_org_unique
      on public.employee_invites(email, organization_name);
    `);

    console.log('employee_invites table ready');
  } catch (e) {
    console.error('invite table migration failed', e.message);
    process.exit(1);
  } finally {
    await client.end().catch(()=>{});
  }
})();
