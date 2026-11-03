import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const check = await client.execute("SELECT id, tgId, name, plan, createdAt FROM users WHERE tgId LIKE 'guest_%' OR name = 'Web Operative'");
  console.log(`Found ${check.rows.length} guest records in Turso.`);
  for (const r of check.rows) {
    console.log(`[${r.id}] tgId: ${r.tgId} | name: ${r.name}`);
  }

  if (check.rows.length > 0) {
    const del = await client.execute("DELETE FROM users WHERE tgId LIKE 'guest_%' OR name = 'Web Operative'");
    console.log(`Deleted ${del.rowsAffected} guest records from Turso database.`);
  }

  const remaining = await client.execute("SELECT id, tgId, name, username, plan FROM users ORDER BY id ASC");
  console.log(`\nRemaining real users (${remaining.rows.length}):`);
  for (const r of remaining.rows) {
    console.log(`- ID ${r.id}: ${r.name} (@${r.username || 'none'}) [tgId: ${r.tgId}] [plan: ${r.plan}]`);
  }
}

main().catch(console.error);
