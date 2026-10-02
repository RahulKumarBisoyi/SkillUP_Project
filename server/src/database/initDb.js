import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { seedOpportunities } from './seedOpportunities.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Safe, reproducible, idempotent migration for Milestone 7.
 * Adds nullable `opportunity_id` (FK -> opportunities.id ON DELETE SET NULL)
 * and `target_skill` columns to `learning_tracks` while preserving all existing rows.
 */
export async function migrateLearningTracksOpportunityColumns(connection, databaseName = null) {
  const dbName = databaseName || process.env.DB_NAME || 'skillup_db';

  // 1. Check existing columns on learning_tracks
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'learning_tracks'`,
    [dbName]
  );
  const existingCols = new Set(columns.map((c) => c.COLUMN_NAME));

  if (!existingCols.has('opportunity_id')) {
    console.log('[Database Migration] Adding nullable opportunity_id column to learning_tracks...');
    await connection.query(
      `ALTER TABLE learning_tracks
       ADD COLUMN opportunity_id INT NULL DEFAULT NULL AFTER user_id`
    );
  }

  if (!existingCols.has('target_skill')) {
    console.log('[Database Migration] Adding nullable target_skill column to learning_tracks...');
    await connection.query(
      `ALTER TABLE learning_tracks
       ADD COLUMN target_skill VARCHAR(255) NULL DEFAULT NULL AFTER opportunity_id`
    );
  }

  // 2. Check existing index on opportunity_id
  const [indexes] = await connection.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'learning_tracks' AND COLUMN_NAME = 'opportunity_id'`,
    [dbName]
  );
  if (indexes.length === 0) {
    console.log('[Database Migration] Adding index idx_tracks_opportunity_id on learning_tracks(opportunity_id)...');
    await connection.query(
      `ALTER TABLE learning_tracks
       ADD INDEX idx_tracks_opportunity_id (opportunity_id)`
    );
  }

  // 3. Check existing foreign key constraint on opportunity_id
  const [fks] = await connection.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'learning_tracks'
       AND COLUMN_NAME = 'opportunity_id'
       AND REFERENCED_TABLE_NAME = 'opportunities'`,
    [dbName]
  );
  if (fks.length === 0) {
    console.log('[Database Migration] Adding foreign key fk_tracks_opportunity on learning_tracks(opportunity_id)...');
    await connection.query(
      `ALTER TABLE learning_tracks
       ADD CONSTRAINT fk_tracks_opportunity
       FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL`
    );
  }
}

export async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'skillup_db';

  console.log(`[Database Init] Connecting to MySQL server on ${host}:${port}...`);

  let connection;
  try {
    // Connect without database first to ensure it exists
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`[Database Init] Ensuring database '${database}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    // Read and run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[Database Init] Executing schema.sql tables setup...');
    await connection.query(schemaSql);

    console.log('[Database Init] Running Milestone 7 idempotent schema migrations...');
    await migrateLearningTracksOpportunityColumns(connection, database);

    console.log('[Database Init] Seeding verified opportunities idempotently...');
    const seededCount = await seedOpportunities(connection);
    console.log(`[Database Init] Upserted ${seededCount} verified opportunities.`);

    console.log('[Database Init] Database schema and seed data initialized successfully!');
  } catch (error) {
    console.error('[Database Init Error] Failed to initialize database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run when executed directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  initDatabase();
}


