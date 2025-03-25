import sqlite3 from 'sqlite3';
import * as sqlite from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open a database connection
export async function open() {
  return await sqlite.open({
    filename: ':memory:', // In-memory database
    driver: sqlite3.Database
  });
}

// Initialize the database with schema and data
export async function initializeDatabase() {
  const db = await open();
  
  // Create tables
  await db.exec(`
    CREATE TABLE region (
      region_id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_name TEXT NOT NULL,
      total_esr_integrated INTEGER,
      fully_completed_esr INTEGER,
      partial_esr INTEGER,
      total_villages_integrated INTEGER,
      fully_completed_villages INTEGER,
      total_schemes_integrated INTEGER,
      fully_completed_schemes INTEGER
    );
    
    CREATE TABLE scheme_status (
      scheme_id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_name TEXT NOT NULL,
      region_name TEXT,
      agency TEXT,
      total_villages_in_scheme INTEGER,
      total_esr_in_scheme INTEGER,
      villages_integrated_on_iot INTEGER,
      fully_completed_villages INTEGER,
      esr_request_received INTEGER,
      esr_integrated_on_iot INTEGER,
      fully_completed_esr INTEGER,
      balance_for_fully_completion INTEGER,
      fm_integrated INTEGER,
      rca_integrated INTEGER,
      pt_integrated INTEGER,
      scheme_completion_status TEXT
    );
  `);
  
  // Insert region data
  await db.exec(`
    INSERT INTO region (region_name, total_esr_integrated, fully_completed_esr, partial_esr, total_villages_integrated, fully_completed_villages, total_schemes_integrated, fully_completed_schemes)
    VALUES 
    ('Nagpur', 117, 58, 59, 91, 38, 15, 9),
    ('Chhatrapati Sambhajinagar', 142, 73, 69, 130, 71, 8, 2),
    ('Pune', 97, 31, 66, 53, 16, 9, 0),
    ('Konkan', 11, 1, 10, 11, 0, 4, 0),
    ('Amravati', 145, 59, 86, 119, 24, 11, 1),
    ('Nashik', 70, 23, 46, 44, 4, 11, 2);
  `);
  
  // Insert scheme data for Nashik
  await db.exec(`
    INSERT INTO scheme_status (scheme_name, region_name, agency, total_villages_in_scheme, total_esr_in_scheme, villages_integrated_on_iot, fully_completed_villages, esr_request_received, esr_integrated_on_iot, fully_completed_esr, balance_for_fully_completion, fm_integrated, rca_integrated, pt_integrated, scheme_completion_status)
    VALUES
    ('Nampur and 4 villages RR Tal Baglan (C 39)', 'Nashik', 'M/S Ceinsys', 5, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 'Not-Connected'),
    ('Bargaonpimpri & 6 VRWSS Tal Sinnar', 'Nashik', 'M/S Ceinsys', 0, 16, 5, 0, 16, 11, 0, 16, 7, 11, 0, 'Partial'),
    ('Nirhale-Fatehpur and 5 villages, Tal. Sinnar', 'Nashik', 'M/S Ceinsys', 5, 11, 3, 0, 8, 2, 0, 11, 3, 2, 1, 'Partial'),
    ('Retro.Lasalgaon Vinchur 16 villages, Tal. Nifad', 'Nashik', 'M/S Ceinsys', 0, 26, 0, 0, 0, 0, 0, 26, 0, 0, 0, 'Not-Connected'),
    ('Retrofitting To Yeola 38 Villages', 'Nashik', 'M/S Ceinsys', 28, 30, 0, 0, 5, 0, 0, 30, 0, 0, 0, 'Not-Connected'),
    ('78 villages in Nandgaon, Malegaon and Deola talukas', 'Nashik', 'M/S Ceinsys', 78, 137, 0, 0, 0, 0, 0, 137, 0, 0, 0, 'Not-Connected'),
    ('Dhahiwal &25 Villages WSS Tal Malegaon', 'Nashik', 'M/S Ceinsys', 20, 33, 0, 0, 0, 0, 0, 33, 0, 0, 0, 'Not-Connected'),
    ('Malmatha and 25 villages Ta. Malegaon', 'Nashik', 'M/S Ceinsys', 10, 12, 0, 0, 0, 0, 0, 12, 0, 0, 0, 'Not-Connected'),
    ('Retro.Chandwad and WSS 44 villages. Ta. Chandwad', 'Nashik', 'M/S Ceinsys', 58, 68, 7, 0, 25, 7, 0, 68, 0, 2, 5, 'Partial'),
    ('Retrofitting To Wadzire (Naigaon) & 4 Villages RRWSS', 'Nashik', 'M/S Ceinsys', 4, 5, 1, 0, 4, 1, 0, 5, 1, 1, 0, 'Partial'),
    ('Ozar-Sakore & 2 Villages', 'Nashik', 'M/S Ceinsys', 4, 10, 4, 1, 9, 8, 5, 5, 6, 7, 5, 'Partial'),
    ('Paldhi (bk& Kh) RR Tal DHARANGAON', 'Nashik', 'M/S Ceinsys', 2, 6, 2, 2, 5, 5, 5, 1, 5, 5, 5, 'Fully-Completed'),
    ('Lasur and 9 villages RRWSS. Ta. Chopda', 'Nashik', 'M/S Ceinsys', 10, 20, 0, 0, 0, 0, 0, 20, 0, 0, 0, 'Not-Connected'),
    ('Dondigar-Rohini & 15 Villages WSS', 'Nashik', 'M/S Ceinsys', 17, 35, 0, 0, 0, 0, 0, 35, 0, 0, 0, 'Not-Connected'),
    ('Retro.Sonai Karjgaon and 16 villages, Tal. Nevasa', 'Nashik', 'M/S Ceinsys', 18, 35, 5, 0, 6, 6, 0, 35, 4, 5, 0, 'Partial')
  `);
  
  // Insert scheme data for Amravati
  await db.exec(`
    INSERT INTO scheme_status (scheme_name, region_name, agency, total_villages_in_scheme, total_esr_in_scheme, villages_integrated_on_iot, fully_completed_villages, esr_request_received, esr_integrated_on_iot, fully_completed_esr, balance_for_fully_completion, fm_integrated, rca_integrated, pt_integrated, scheme_completion_status)
    VALUES
    ('83 Village RRWS Scheme MJP RR (C 39)', 'Amravati', 'M/S Ceinsys', 87, 124, 24, 8, 27, 27, 24, 100, 27, 27, 24, 'Partial'),
    ('Nandgaon Peth & 32 Villages', 'Amravati', 'M/S Ceinsys', 33, 52, 0, 0, 0, 0, 0, 52, 0, 0, 0, 'Not-Connected'),
    ('105 villages RRWSS', 'Amravati', 'M/S Ceinsys', 113, 173, 41, 1, 63, 52, 10, 163, 51, 14, 40, 'Partial'),
    ('Shahanur & 9 Villages RRWS', 'Amravati', 'M/S Ceinsys', 10, 14, 7, 1, 8, 8, 3, 11, 6, 6, 6, 'Partial'),
    ('Chirodi & 4 Villages RRWS', 'Amravati', 'M/S Ceinsys', 5, 12, 0, 0, 0, 0, 0, 12, 0, 0, 0, 'Not-Connected'),
    ('Padli and 5 villages', 'Amravati', 'M/S Ceinsys', 6, 7, 6, 6, 7, 7, 7, 0, 7, 7, 7, 'Fully-Completed')
  `);
  
  // Insert scheme data for Pune
  await db.exec(`
    INSERT INTO scheme_status (scheme_name, region_name, agency, total_villages_in_scheme, total_esr_in_scheme, villages_integrated_on_iot, fully_completed_villages, esr_request_received, esr_integrated_on_iot, fully_completed_esr, balance_for_fully_completion, fm_integrated, rca_integrated, pt_integrated, scheme_completion_status)
    VALUES
    ('Wangani RRWSS', 'Pune', 'Chetas', 3, 6, 4, 0, 6, 6, 0, 6, 6, 4, 0, 'Partial'),
    ('RR Girvi WSS', 'Pune', NULL, 4, 5, 5, 0, 5, 5, 2, 3, 5, 5, 2, 'Partial'),
    ('Peth & two Villages', 'Pune', NULL, 3, 5, 3, 0, 5, 5, 0, 5, 4, 5, 0, 'Partial'),
    ('MURTI & 7 VILLAGES RRWSS', 'Pune', NULL, 6, 13, 7, 2, 13, 13, 6, 7, 13, 5, 7, 'Partial'),
    ('HOL SASTEWADI', 'Pune', NULL, 4, 8, 2, 0, 8, 8, 3, 5, 8, 7, 3, 'Partial')
  `);
  
  // Insert scheme data for Nagpur
  await db.exec(`
    INSERT INTO scheme_status (scheme_name, region_name, agency, total_villages_in_scheme, total_esr_in_scheme, villages_integrated_on_iot, fully_completed_villages, esr_request_received, esr_integrated_on_iot, fully_completed_esr, balance_for_fully_completion, fm_integrated, rca_integrated, pt_integrated, scheme_completion_status)
    VALUES
    ('20036500 Vyahad & 2 Village RR WSS', 'Nagpur', 'M/S Rite Water', 3, 5, 3, 0, 3, 3, 0, 5, 3, 3, 0, 'Partial'),
    ('20036536 Bothali & 7 Villages Rrwss', 'Nagpur', 'M/S Rite Water', 8, 8, 8, 6, 8, 8, 5, 3, 8, 8, 5, 'Partial'),
    ('20036862 Bor Chandli 5 Village Rr Wss', 'Nagpur', 'M/S Rite Water', 5, 5, 5, 5, 5, 5, 5, 0, 5, 5, 5, 'Fully-Completed'),
    ('2009882 Ghot Rrwss', 'Nagpur', 'M/S Rite Water', 3, 4, 3, 3, 4, 4, 4, 0, 4, 4, 3, 'Fully-Completed'),
    ('GOREGAON RR Retrofitting (20019216)', 'Nagpur', 'M/S Rite Water', 5, 7, 5, 5, 7, 7, 7, 0, 7, 7, 5, 'Fully-Completed')
  `);
  
  return db;
}

// Export the function to initialize the database
export default { open, initializeDatabase };
