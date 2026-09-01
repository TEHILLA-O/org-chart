const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const people = await client.query('SELECT count(*)::int AS n FROM "Person"');
  const positions = await client.query('SELECT count(*)::int AS n FROM "Position"');
  console.log(JSON.stringify({ people: people.rows[0].n, positions: positions.rows[0].n }));
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
