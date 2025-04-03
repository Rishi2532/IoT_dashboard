import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
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

export const registerUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
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

export const insertRegionSchema = createInsertSchema(regions)
  .omit({ region_id: true });

export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

// SchemeStatus table - using the correct table name "scheme_status" instead of "scheme_statuses"
export const schemeStatuses = pgTable("scheme_status", {
  scheme_id: text("scheme_id").primaryKey(), // Scheme ID as primary key
  region_name: text("region_name"), // Region
  scheme_name: text("scheme_name").notNull(), // Scheme Name
  total_villages: integer("total_villages"), // No. of Village
  functional_villages: integer("functional_villages"), // No. of Functional Village
  partial_villages: integer("partial_villages"), // No. of Partial Village
  non_functional_villages: integer("non_functional_villages"), // No. of Non-Functional Village
  fully_completed_villages: integer("fully_completed_villages"), // Fully completed Villages
  villages_integrated: integer("villages_integrated"), // Total Villages Integrated
  total_esr: integer("total_esr"), // Total Number of ESR
  esr_integrated_on_iot: integer("esr_integrated_on_iot"), // Total ESR Integrated on IoT
  scheme_functional_status: text("scheme_functional_status"), // Scheme Functional Status
  fully_completed_esr: integer("fully_completed_esr"), // No. Fully Completed ESR
  balance_esr: integer("balance_esr"), // Balance to Complete ESR
  flow_meters_connected: integer("flow_meters_connected"), // Flow Meters Connected
  pressure_transmitters_connected: integer("pressure_transmitters_connected"), // Pressure Transmitter Connected
  residual_chlorine_connected: integer("residual_chlorine_connected"), // Residual Chlorine Connected
  scheme_status: text("scheme_status"), // Scheme Status
});

export const insertSchemeStatusSchema = createInsertSchema(schemeStatuses);

export type InsertSchemeStatus = z.infer<typeof insertSchemeStatusSchema>;
export type SchemeStatus = typeof schemeStatuses.$inferSelect;
