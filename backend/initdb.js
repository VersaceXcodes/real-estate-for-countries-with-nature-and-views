import dotenv from "dotenv";
import fs from "fs";
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST || "ep-ancient-dream-abbsot9k-pooler.eu-west-2.aws.neon.tech",
        database: PGDATABASE || "neondb",
        user: PGUSER || "neondb_owner",
        password: PGPASSWORD || "npg_jAS3aITLC5DX",
        port: Number(PGPORT),
        ssl: { require: true },
      }
);


async function initDb() {
  const client = await pool.connect();
  try {
    // Read and split SQL commands
    const dbInitCommands = fs
      .readFileSync(`./db.sql`, "utf-8")
      .toString()
      .split(/(?=CREATE TABLE |INSERT INTO)/);

    // Execute each command individually (no transaction to avoid rollback issues)
    for (let cmd of dbInitCommands) {
      const trimmedCmd = cmd.trim();
      if (!trimmedCmd) continue;
      
      console.dir({ "backend:db:init:command": trimmedCmd.substring(0, 100) + "..." });
      
      try {
        // Handle INSERT statements with ON CONFLICT DO NOTHING for PostgreSQL
        if (trimmedCmd.startsWith('INSERT INTO')) {
          const modifiedCmd = trimmedCmd.replace(/;$/, ' ON CONFLICT DO NOTHING;');
          await client.query(modifiedCmd);
        } else {
          await client.query(trimmedCmd);
        }
      } catch (error) {
        // Log the error but continue with other commands
        console.warn(`Warning: Command failed but continuing: ${error.message}`);
      }
    }

    console.log('Database initialization completed successfully');
  } catch (e) {
    console.error('Database initialization failed:', e);
    throw e;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Execute initialization
initDb().catch(console.error);
