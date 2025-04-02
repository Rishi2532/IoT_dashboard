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
  scheme_id: integer("scheme_id").primaryKey(), // Changed from serial to integer to support importing scheme IDs
  scheme_name: text("scheme_name").notNull(),
  region_name: text("region_name"),
  agency: text("agency"), // Added back the agency field
  total_villages_in_scheme: integer("total_villages_in_scheme"),
  total_esr_in_scheme: integer("total_esr_in_scheme"),
  villages_integrated_on_iot: integer("villages_integrated_on_iot"),
  fully_completed_villages: integer("fully_completed_villages"), // This field now stores "Functional Villages" data
  esr_request_received: integer("esr_request_received"),
  esr_integrated_on_iot: integer("esr_integrated_on_iot"),
  fully_completed_esr: integer("fully_completed_esr"),
  balance_for_fully_completion: integer("balance_for_fully_completion"),
  fm_integrated: integer("fm_integrated"),
  rca_integrated: integer("rca_integrated"), // Residual Chlorine Analyzer
  pt_integrated: integer("pt_integrated"),
  scheme_completion_status: text("scheme_completion_status"),
});

export const insertSchemeStatusSchema = createInsertSchema(schemeStatuses);

export type InsertSchemeStatus = z.infer<typeof insertSchemeStatusSchema>;
export type SchemeStatus = typeof schemeStatuses.$inferSelect;
