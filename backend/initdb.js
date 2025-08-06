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
    // Read SQL file content
    const sqlContent = fs.readFileSync(`./db.sql`, "utf-8").toString();
    
    // Split SQL content into logical blocks (CREATE TABLE and INSERT INTO blocks)
    const blocks = [];
    const lines = sqlContent.split('\n');
    let currentBlock = '';
    let inInsertStatement = false;
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      // Start of a new CREATE TABLE or INSERT INTO block
      if (trimmedLine.startsWith('CREATE TABLE') || trimmedLine.startsWith('INSERT INTO')) {
        // Save previous block if it exists
        if (currentBlock.trim()) {
          blocks.push(currentBlock.trim());
        }
        currentBlock = line;
        inInsertStatement = trimmedLine.startsWith('INSERT INTO');
      } else {
        // Continue building current block
        currentBlock += '\n' + line;
      }
      
      // End of INSERT statement (ends with semicolon and not inside quotes)
      if (inInsertStatement && trimmedLine.endsWith(';') && !trimmedLine.includes("'")) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
        inInsertStatement = false;
      }
    }
    
    // Add the last block if it exists
    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim());
    }

    // Execute each block individually
    for (let block of blocks) {
      if (!block) continue;
      
      console.dir({ "backend:db:init:command": block.substring(0, 100) + "..." });
      
      try {
        // Handle INSERT statements with ON CONFLICT DO NOTHING for PostgreSQL
        if (block.toUpperCase().startsWith('INSERT INTO')) {
          // Add ON CONFLICT DO NOTHING if not already present
          if (!block.toUpperCase().includes('ON CONFLICT')) {
            block = block.replace(/;$/, ' ON CONFLICT DO NOTHING;');
          }
        }
        
        await client.query(block);
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
