import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  policyAcceptedAt: timestamp("policy_accepted_at"),
  policyVersion: varchar("policy_version"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Policies table
export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkId: varchar("network_id").notNull(), // WiFi network identifier for data isolation
  policyId: varchar("policy_id").notNull(), // e.g., "POLICY001"
  title: varchar("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  version: varchar("version").notNull().default("1.0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkId: varchar("network_id").notNull(), // WiFi network identifier for data isolation
  name: varchar("name").notNull(),
  phone: varchar("phone").notNull(),
  email: varchar("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Machines table
export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkId: varchar("network_id").notNull(), // WiFi network identifier for data isolation
  brand: varchar("brand").notNull(),
  model: varchar("model").notNull(),
  serialNumber: varchar("serial_number"),
  condition: varchar("condition"),
  description: text("description"),
  photoUrls: text("photo_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkId: varchar("network_id").notNull(), // WiFi network identifier for data isolation
  jobNumber: varchar("job_number").notNull(), // Will be unique per network
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  machineId: varchar("machine_id").references(() => machines.id).notNull(),
  policyId: varchar("policy_id").references(() => policies.id).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, signed, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Digital signatures table
export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkId: varchar("network_id").notNull(), // WiFi network identifier for data isolation
  jobId: varchar("job_id").references(() => jobs.id).notNull(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  policyId: varchar("policy_id").references(() => policies.id).notNull(),
  signatureType: varchar("signature_type").notNull(), // "typed" or "drawn"
  signatureData: text("signature_data").notNull(), // name or base64 signature
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  signatures: many(signatures),
}));

export const policiesRelations = relations(policies, ({ many }) => ({
  jobs: many(jobs),
  signatures: many(signatures),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  jobs: many(jobs),
  signatures: many(signatures),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
  machine: one(machines, {
    fields: [jobs.machineId],
    references: [machines.id],
  }),
  policy: one(policies, {
    fields: [jobs.policyId],
    references: [policies.id],
  }),
  signatures: many(signatures),
}));

export const signaturesRelations = relations(signatures, ({ one }) => ({
  job: one(jobs, {
    fields: [signatures.jobId],
    references: [jobs.id],
  }),
  customer: one(customers, {
    fields: [signatures.customerId],
    references: [customers.id],
  }),
  policy: one(policies, {
    fields: [signatures.policyId],
    references: [policies.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSignatureSchema = createInsertSchema(signatures).omit({
  id: true,
  signedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = z.infer<typeof insertMachineSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Signature = typeof signatures.$inferSelect;
export type InsertSignature = z.infer<typeof insertSignatureSchema>;

// Extended types with relations
export type JobWithRelations = Job & {
  customer: Customer;
  machine: Machine;
  policy: Policy;
  signatures: Signature[];
};
