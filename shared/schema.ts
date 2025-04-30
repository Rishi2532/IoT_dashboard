import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp,
  varchar,
  decimal,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with admin role
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

export const registerUserSchema = insertUserSchema
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterCredentials = z.infer<typeof registerUserSchema>;

// Region table - using the correct table name "region" instead of "regions"
export const regions = pgTable("region", {
  region_id: serial("region_id").primaryKey(),
  region_name: text("region_name").notNull(),
  total_esr_integrated: integer("total_esr_integrated"),
  fully_completed_esr: integer("fully_completed_esr"),
  partial_esr: integer("partial_esr"),
  total_villages_integrated: integer("total_villages_integrated"),
  fully_completed_villages: integer("fully_completed_villages"),
  total_schemes_integrated: integer("total_schemes_integrated"),
  fully_completed_schemes: integer("fully_completed_schemes"),
  flow_meter_integrated: integer("flow_meter_integrated"),
  rca_integrated: integer("rca_integrated"),
  pressure_transmitter_integrated: integer("pressure_transmitter_integrated"),
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  region_id: true,
});

export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

// SchemeStatus table - with updated structure as per requirements
export const schemeStatuses = pgTable("scheme_status", {
  sr_no: integer("sr_no"), // Serial number - can be used as a unique identifier
  scheme_id: text("scheme_id").notNull(), // Scheme ID (not primary key)
  region: text("region"), // Region name
  circle: text("circle"), // Circle
  division: text("division"), // Division
  sub_division: text("sub_division"), // Sub Division
  block: text("block"), // Block
  scheme_name: text("scheme_name").notNull(), // Scheme Name
  agency: text("agency"), // Agency that manages the scheme
  number_of_village: integer("number_of_village"), // Number of village
  total_villages_integrated: integer("total_villages_integrated"), // Total Villages Integrated

  no_of_functional_village: integer("no_of_functional_village"), // No. of Functional Village
  no_of_partial_village: integer("no_of_partial_village"), // No. of Partial Village
  no_of_non_functional_village: integer("no_of_non_functional_village"), // No. of Non-Functional Village
  fully_completed_villages: integer("fully_completed_villages"), // Fully completed Villages
  total_number_of_esr: integer("total_number_of_esr"), // Total Number of ESR
  scheme_functional_status: text("scheme_functional_status"), // Scheme Functional Status
  total_esr_integrated: integer("total_esr_integrated"), // Total ESR Integrated on IoT
  no_fully_completed_esr: integer("no_fully_completed_esr"), // No. Fully Completed ESR
  balance_to_complete_esr: integer("balance_to_complete_esr"), // Balance to Complete ESR
  flow_meters_connected: integer("flow_meters_connected"), // Flow Meters C
  pressure_transmitter_connected: integer("pressure_transmitter_connected"), // Pressure Transmitter Connected

  residual_chlorine_analyzer_connected: integer(
    "residual_chlorine_analyzer_connected",
  ), // Residual Chlorine Analyzer Connected

  fully_completion_scheme_status: text("fully_completion_scheme_status"), // Scheme Status (Fully Completion Scheme Status)
  dashboard_url: text("dashboard_url"), // URL to access the PI Vision dashboard for this scheme
  // No primary key - allows multiple entries with the same scheme_id and block
});

export const insertSchemeStatusSchema = createInsertSchema(schemeStatuses);
export const updateSchemeStatusSchema = createInsertSchema(schemeStatuses);

export type InsertSchemeStatus = z.infer<typeof insertSchemeStatusSchema>;
export type UpdateSchemeStatus = z.infer<typeof updateSchemeStatusSchema>;
export type SchemeStatus = typeof schemeStatuses.$inferSelect;

// App state table for storing persistent application state
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertAppStateSchema = createInsertSchema(appState);

export type InsertAppState = z.infer<typeof insertAppStateSchema>;
export type AppState = typeof appState.$inferSelect;

// Water Scheme Data table for LPCD tracking
export const waterSchemeData = pgTable("water_scheme_data", {
  // Region information
  region: text("region"),
  circle: text("circle"),
  division: text("division"),
  sub_division: text("sub_division"),
  block: text("block"),
  
  // Scheme identification
  scheme_id: varchar("scheme_id", { length: 100 }),
  scheme_name: text("scheme_name"),
  village_name: text("village_name"),
  
  // Population and infrastructure
  population: integer("population"),
  number_of_esr: integer("number_of_esr"),
  
  // Water values for different days
  water_value_day1: decimal("water_value_day1", { precision: 20, scale: 6 }),
  water_value_day2: decimal("water_value_day2", { precision: 20, scale: 6 }),
  water_value_day3: decimal("water_value_day3", { precision: 20, scale: 6 }),
  water_value_day4: decimal("water_value_day4", { precision: 20, scale: 6 }),
  water_value_day5: decimal("water_value_day5", { precision: 20, scale: 6 }),
  water_value_day6: decimal("water_value_day6", { precision: 20, scale: 6 }),
  
  // LPCD values for different days
  lpcd_value_day1: decimal("lpcd_value_day1", { precision: 20, scale: 6 }),
  lpcd_value_day2: decimal("lpcd_value_day2", { precision: 20, scale: 6 }),
  lpcd_value_day3: decimal("lpcd_value_day3", { precision: 20, scale: 6 }),
  lpcd_value_day4: decimal("lpcd_value_day4", { precision: 20, scale: 6 }),
  lpcd_value_day5: decimal("lpcd_value_day5", { precision: 20, scale: 6 }),
  lpcd_value_day6: decimal("lpcd_value_day6", { precision: 20, scale: 6 }),
  lpcd_value_day7: decimal("lpcd_value_day7", { precision: 20, scale: 6 }),
  
  // Dates for water measurements
  water_date_day1: varchar("water_date_day1", { length: 20 }),
  water_date_day2: varchar("water_date_day2", { length: 20 }),
  water_date_day3: varchar("water_date_day3", { length: 20 }),
  water_date_day4: varchar("water_date_day4", { length: 20 }),
  water_date_day5: varchar("water_date_day5", { length: 20 }),
  water_date_day6: varchar("water_date_day6", { length: 20 }),
  
  // Dates for LPCD measurements
  lpcd_date_day1: varchar("lpcd_date_day1", { length: 20 }),
  lpcd_date_day2: varchar("lpcd_date_day2", { length: 20 }),
  lpcd_date_day3: varchar("lpcd_date_day3", { length: 20 }),
  lpcd_date_day4: varchar("lpcd_date_day4", { length: 20 }),
  lpcd_date_day5: varchar("lpcd_date_day5", { length: 20 }),
  lpcd_date_day6: varchar("lpcd_date_day6", { length: 20 }),
  lpcd_date_day7: varchar("lpcd_date_day7", { length: 20 }),
  
  // Status counters
  consistent_zero_lpcd_for_a_week: integer("consistent_zero_lpcd_for_a_week"),
  below_55_lpcd_count: integer("below_55_lpcd_count"),
  above_55_lpcd_count: integer("above_55_lpcd_count"),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.scheme_id, table.village_name] }),
  };
});

export const insertWaterSchemeDataSchema = createInsertSchema(waterSchemeData);
export const updateWaterSchemeDataSchema = createInsertSchema(waterSchemeData).omit({
  scheme_id: true
});

export type InsertWaterSchemeData = z.infer<typeof insertWaterSchemeDataSchema>;
export type UpdateWaterSchemeData = z.infer<typeof updateWaterSchemeDataSchema>;
export type WaterSchemeData = typeof waterSchemeData.$inferSelect;

// Chlorine Data table for ESR-level chlorine monitoring
export const chlorineData = pgTable("chlorine_data", {
  // Location information
  region: varchar("region", { length: 100 }),
  circle: varchar("circle", { length: 100 }),
  division: varchar("division", { length: 100 }),
  sub_division: varchar("sub_division", { length: 100 }),
  block: varchar("block", { length: 100 }),
  
  // Identification
  scheme_id: varchar("scheme_id", { length: 100 }),
  scheme_name: varchar("scheme_name", { length: 255 }),
  village_name: varchar("village_name", { length: 255 }),
  esr_name: varchar("esr_name", { length: 255 }),
  
  // Chlorine measurements for different days (lowercase field names with unlimited precision)
  chlorine_value_1: decimal("chlorine_value_1"), // Removed precision/scale constraints to handle large values
  chlorine_value_2: decimal("chlorine_value_2"), 
  chlorine_value_3: decimal("chlorine_value_3"),
  chlorine_value_4: decimal("chlorine_value_4"),
  chlorine_value_5: decimal("chlorine_value_5"),
  chlorine_value_6: decimal("chlorine_value_6"),
  chlorine_value_7: decimal("chlorine_value_7"),
  
  // Dates for chlorine measurements (lowercase field names)
  chlorine_date_day_1: varchar("chlorine_date_day_1", { length: 15 }),
  chlorine_date_day_2: varchar("chlorine_date_day_2", { length: 15 }),
  chlorine_date_day_3: varchar("chlorine_date_day_3", { length: 15 }),
  chlorine_date_day_4: varchar("chlorine_date_day_4", { length: 15 }),
  chlorine_date_day_5: varchar("chlorine_date_day_5", { length: 15 }),
  chlorine_date_day_6: varchar("chlorine_date_day_6", { length: 15 }),
  chlorine_date_day_7: varchar("chlorine_date_day_7", { length: 15 }),
  
  // Analysis fields (lowercase field names with unlimited precision)
  number_of_consistent_zero_value_in_chlorine: integer("number_of_consistent_zero_value_in_chlorine"),
  chlorine_less_than_02_mgl: decimal("chlorine_less_than_02_mgl"), // Removed precision/scale constraints
  chlorine_between_02_05_mgl: decimal("chlorine_between_02_05_mgl"), // Removed precision/scale constraints
  chlorine_greater_than_05_mgl: decimal("chlorine_greater_than_05_mgl"), // Removed precision/scale constraints
}, (table) => {
  return {
    // Composite primary key to uniquely identify each ESR
    pk: primaryKey({ columns: [table.scheme_id, table.village_name, table.esr_name] }),
  };
});

export const insertChlorineDataSchema = createInsertSchema(chlorineData);
export const updateChlorineDataSchema = createInsertSchema(chlorineData).omit({
  scheme_id: true,
  village_name: true,
  esr_name: true
});

export type InsertChlorineData = z.infer<typeof insertChlorineDataSchema>;
export type UpdateChlorineData = z.infer<typeof updateChlorineDataSchema>;
export type ChlorineData = typeof chlorineData.$inferSelect;

// Pressure Data table for ESR-level pressure monitoring
export const pressureData = pgTable("pressure_data", {
  // Location information
  region: text("region"),
  circle: text("circle"),
  division: text("division"),
  sub_division: text("sub_division"),
  block: text("block"),
  
  // Identification
  scheme_id: text("scheme_id"),
  scheme_name: text("scheme_name"),
  village_name: text("village_name"),
  esr_name: text("esr_name"),
  
  // Pressure measurements for different days
  pressure_value_1: decimal("pressure_value_1", { precision: 12, scale: 2 }),
  pressure_value_2: decimal("pressure_value_2", { precision: 12, scale: 2 }),
  pressure_value_3: decimal("pressure_value_3", { precision: 12, scale: 2 }),
  pressure_value_4: decimal("pressure_value_4", { precision: 12, scale: 2 }),
  pressure_value_5: decimal("pressure_value_5", { precision: 12, scale: 2 }),
  pressure_value_6: decimal("pressure_value_6", { precision: 12, scale: 2 }),
  pressure_value_7: decimal("pressure_value_7", { precision: 12, scale: 2 }),
  
  // Dates for pressure measurements
  pressure_date_day_1: varchar("pressure_date_day_1", { length: 15 }),
  pressure_date_day_2: varchar("pressure_date_day_2", { length: 15 }),
  pressure_date_day_3: varchar("pressure_date_day_3", { length: 15 }),
  pressure_date_day_4: varchar("pressure_date_day_4", { length: 15 }),
  pressure_date_day_5: varchar("pressure_date_day_5", { length: 15 }),
  pressure_date_day_6: varchar("pressure_date_day_6", { length: 15 }),
  pressure_date_day_7: varchar("pressure_date_day_7", { length: 15 }),
  
  // Analysis fields
  number_of_consistent_zero_value_in_pressure: integer("number_of_consistent_zero_value_in_pressure"),
  pressure_less_than_02_bar: decimal("pressure_less_than_02_bar", { precision: 12, scale: 2 }),
  pressure_between_02_07_bar: decimal("pressure_between_02_07_bar", { precision: 12, scale: 2 }),
  pressure_greater_than_07_bar: decimal("pressure_greater_than_07_bar", { precision: 12, scale: 2 }),
}, (table) => {
  return {
    // Composite primary key to uniquely identify each ESR
    pk: primaryKey({ columns: [table.scheme_id, table.village_name, table.esr_name] }),
  };
});

export const insertPressureDataSchema = createInsertSchema(pressureData);
export const updatePressureDataSchema = createInsertSchema(pressureData).omit({
  scheme_id: true,
  village_name: true,
  esr_name: true
});

export type InsertPressureData = z.infer<typeof insertPressureDataSchema>;
export type UpdatePressureData = z.infer<typeof updatePressureDataSchema>;
export type PressureData = typeof pressureData.$inferSelect;
