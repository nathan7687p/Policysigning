import {
  users,
  policies,
  customers,
  machines,
  jobs,
  signatures,
  type User,
  type UpsertUser,
  type Policy,
  type InsertPolicy,
  type Customer,
  type InsertCustomer,
  type Machine,
  type InsertMachine,
  type Job,
  type InsertJob,
  type JobWithRelations,
  type Signature,
  type InsertSignature,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, desc, asc, sql, gte, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Policy operations (network-aware)
  getAllPolicies(networkId: string): Promise<Policy[]>;
  getPolicyById(id: string, networkId: string): Promise<Policy | undefined>;
  getPolicyByPolicyId(policyId: string, networkId: string): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy, networkId: string): Promise<Policy>;
  updatePolicy(id: string, policy: Partial<InsertPolicy>, networkId: string): Promise<Policy>;
  
  // Customer operations (network-aware)
  getAllCustomers(networkId: string): Promise<Customer[]>;
  getCustomerById(id: string, networkId: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string, networkId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer, networkId: string): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>, networkId: string): Promise<Customer>;
  
  // Machine operations (network-aware)
  createMachine(machine: InsertMachine, networkId: string): Promise<Machine>;
  getMachineById(id: string, networkId: string): Promise<Machine | undefined>;
  
  // Job operations (network-aware)
  getAllJobs(networkId: string): Promise<JobWithRelations[]>;
  getJobById(id: string, networkId: string): Promise<JobWithRelations | undefined>;
  getJobByJobNumber(jobNumber: string, networkId: string): Promise<JobWithRelations | undefined>;
  createJob(job: InsertJob, networkId: string): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>, networkId: string): Promise<Job>;
  searchJobs(filters: {
    jobNumber?: string;
    customerName?: string;
    machine?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }, networkId: string): Promise<JobWithRelations[]>;
  
  // Signature operations (network-aware)
  createSignature(signature: InsertSignature, networkId: string): Promise<Signature>;
  getSignaturesByJobId(jobId: string, networkId: string): Promise<Signature[]>;
  
  // Statistics (network-aware)
  getJobStats(networkId: string): Promise<{
    activeJobs: number;
    completedToday: number;
    pendingSignatures: number;
    totalCustomers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Policy operations (network-aware)
  async getAllPolicies(networkId: string): Promise<Policy[]> {
    return await db.select().from(policies)
      .where(and(eq(policies.networkId, networkId), eq(policies.isActive, true)))
      .orderBy(asc(policies.policyId));
  }

  async getPolicyById(id: string, networkId: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies)
      .where(and(eq(policies.id, id), eq(policies.networkId, networkId)));
    return policy;
  }

  async getPolicyByPolicyId(policyId: string, networkId: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies)
      .where(and(eq(policies.policyId, policyId), eq(policies.networkId, networkId)));
    return policy;
  }

  async createPolicy(policy: InsertPolicy, networkId: string): Promise<Policy> {
    const [newPolicy] = await db.insert(policies).values({ ...policy, networkId }).returning();
    return newPolicy;
  }

  async updatePolicy(id: string, policy: Partial<InsertPolicy>, networkId: string): Promise<Policy> {
    const [updatedPolicy] = await db
      .update(policies)
      .set({ ...policy, updatedAt: new Date() })
      .where(and(eq(policies.id, id), eq(policies.networkId, networkId)))
      .returning();
    return updatedPolicy;
  }

  // Customer operations (network-aware)
  async getAllCustomers(networkId: string): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(eq(customers.networkId, networkId))
      .orderBy(asc(customers.name));
  }

  async getCustomerById(id: string, networkId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.networkId, networkId)));
    return customer;
  }

  async getCustomerByPhone(phone: string, networkId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.phone, phone), eq(customers.networkId, networkId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer, networkId: string): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values({ ...customer, networkId }).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>, networkId: string): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.networkId, networkId)))
      .returning();
    return updatedCustomer;
  }

  // Machine operations (network-aware)
  async createMachine(machine: InsertMachine, networkId: string): Promise<Machine> {
    const [newMachine] = await db.insert(machines).values({ ...machine, networkId }).returning();
    return newMachine;
  }

  async getMachineById(id: string, networkId: string): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines)
      .where(and(eq(machines.id, id), eq(machines.networkId, networkId)));
    return machine;
  }

  // Job operations (network-aware)
  async getAllJobs(networkId: string): Promise<JobWithRelations[]> {
    const result = await db
      .select({
        job: jobs,
        customer: customers,
        machine: machines,
        policy: policies,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(machines, eq(jobs.machineId, machines.id))
      .leftJoin(policies, eq(jobs.policyId, policies.id))
      .where(eq(jobs.networkId, networkId))
      .orderBy(desc(jobs.createdAt));

    // Load signatures for each job
    const jobsWithSignatures = await Promise.all(
      result.map(async (row) => {
        const jobSignatures = await this.getSignaturesByJobId(row.job.id, networkId);
        return {
          ...row.job,
          customer: row.customer!,
          machine: row.machine!,
          policy: row.policy!,
          signatures: jobSignatures,
        };
      })
    );

    return jobsWithSignatures;
  }

  async getJobById(id: string, networkId: string): Promise<JobWithRelations | undefined> {
    const result = await db
      .select({
        job: jobs,
        customer: customers,
        machine: machines,
        policy: policies,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(machines, eq(jobs.machineId, machines.id))
      .leftJoin(policies, eq(jobs.policyId, policies.id))
      .where(and(eq(jobs.id, id), eq(jobs.networkId, networkId)));

    if (result.length === 0) return undefined;

    const row = result[0];
    const jobSignatures = await this.getSignaturesByJobId(id, networkId);

    return {
      ...row.job,
      customer: row.customer!,
      machine: row.machine!,
      policy: row.policy!,
      signatures: jobSignatures,
    };
  }

  async getJobByJobNumber(jobNumber: string, networkId: string): Promise<JobWithRelations | undefined> {
    const result = await db
      .select({
        job: jobs,
        customer: customers,
        machine: machines,
        policy: policies,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(machines, eq(jobs.machineId, machines.id))
      .leftJoin(policies, eq(jobs.policyId, policies.id))
      .where(and(eq(jobs.jobNumber, jobNumber), eq(jobs.networkId, networkId)));

    if (result.length === 0) return undefined;

    const row = result[0];
    const jobSignatures = await this.getSignaturesByJobId(row.job.id);

    return {
      ...row.job,
      customer: row.customer!,
      machine: row.machine!,
      policy: row.policy!,
      signatures: jobSignatures,
    };
  }

  async createJob(job: InsertJob, networkId: string): Promise<Job> {
    const [newJob] = await db.insert(jobs).values({ ...job, networkId }).returning();
    return newJob;
  }

  async updateJob(id: string, job: Partial<InsertJob>, networkId: string): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({ ...job, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), eq(jobs.networkId, networkId)))
      .returning();
    return updatedJob;
  }

  async searchJobs(filters: {
    jobNumber?: string;
    customerName?: string;
    machine?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }, networkId: string): Promise<JobWithRelations[]> {
    let query = db
      .select({
        job: jobs,
        customer: customers,
        machine: machines,
        policy: policies,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(machines, eq(jobs.machineId, machines.id))
      .leftJoin(policies, eq(jobs.policyId, policies.id));

    const conditions = [eq(jobs.networkId, networkId)]; // Always filter by network

    if (filters.jobNumber) {
      conditions.push(ilike(jobs.jobNumber, `%${filters.jobNumber}%`));
    }
    if (filters.customerName) {
      conditions.push(ilike(customers.name, `%${filters.customerName}%`));
    }
    if (filters.machine) {
      conditions.push(ilike(machines.brand, `%${filters.machine}%`));
    }
    if (filters.status) {
      conditions.push(eq(jobs.status, filters.status));
    }
    if (filters.dateFrom) {
      conditions.push(eq(jobs.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(eq(jobs.createdAt, filters.dateTo));
    }

    query = query.where(and(...conditions));

    const result = await query.orderBy(desc(jobs.createdAt));

    // Load signatures for each job
    const jobsWithSignatures = await Promise.all(
      result.map(async (row) => {
        const jobSignatures = await this.getSignaturesByJobId(row.job.id, networkId);
        return {
          ...row.job,
          customer: row.customer!,
          machine: row.machine!,
          policy: row.policy!,
          signatures: jobSignatures,
        };
      })
    );

    return jobsWithSignatures;
  }

  // Signature operations (network-aware)
  async createSignature(signature: InsertSignature, networkId: string): Promise<Signature> {
    const [newSignature] = await db.insert(signatures).values({ ...signature, networkId }).returning();
    return newSignature;
  }

  async getSignaturesByJobId(jobId: string, networkId: string): Promise<Signature[]> {
    return await db.select().from(signatures)
      .where(and(eq(signatures.jobId, jobId), eq(signatures.networkId, networkId)));
  }

  // Statistics (network-aware)
  async getJobStats(networkId: string): Promise<{
    activeJobs: number;
    completedToday: number;
    pendingSignatures: number;
    totalCustomers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeJobsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.status, 'signed'), eq(jobs.networkId, networkId)));

    const [completedTodayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(
        eq(jobs.status, 'completed'),
        eq(jobs.networkId, networkId),
        gte(jobs.updatedAt, today),
        lt(jobs.updatedAt, tomorrow)
      ));

    const [pendingSignaturesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.status, 'pending'), eq(jobs.networkId, networkId)));

    const [totalCustomersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.networkId, networkId));

    return {
      activeJobs: activeJobsResult?.count || 0,
      completedToday: completedTodayResult?.count || 0,
      pendingSignatures: pendingSignaturesResult?.count || 0,
      totalCustomers: totalCustomersResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
