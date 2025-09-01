import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertPolicySchema, insertCustomerSchema, insertMachineSchema, insertJobSchema, insertSignatureSchema } from "@shared/schema";
import { generateJobNumber } from "./utils";
import { addNetworkInfo } from "./networkUtils";
import { seedDefaultPolicy } from "./seedData";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Network isolation middleware - add network info to all requests
  app.use(addNetworkInfo);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const stats = await storage.getJobStats(networkId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  // Policy routes
  app.get('/api/policies', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      
      // Auto-seed default policy if none exist
      await seedDefaultPolicy(networkId);
      
      const policies = await storage.getAllPolicies(networkId);
      res.json(policies);
    } catch (error) {
      console.error('Error fetching policies:', error);
      res.status(500).json({ message: 'Failed to fetch policies' });
    }
  });

  app.get('/api/policies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const policy = await storage.getPolicyById(req.params.id, networkId);
      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }
      res.json(policy);
    } catch (error) {
      console.error('Error fetching policy:', error);
      res.status(500).json({ message: 'Failed to fetch policy' });
    }
  });

  app.post('/api/policies', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const validatedData = insertPolicySchema.parse(req.body);
      const policy = await storage.createPolicy(validatedData, networkId);
      res.status(201).json(policy);
    } catch (error) {
      console.error('Error creating policy:', error);
      res.status(500).json({ message: 'Failed to create policy' });
    }
  });

  app.put('/api/policies/:id', isAuthenticated, async (req, res) => {
    try {
      const policy = await storage.updatePolicy(req.params.id, req.body);
      res.json(policy);
    } catch (error) {
      console.error('Error updating policy:', error);
      res.status(500).json({ message: 'Failed to update policy' });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Check if customer exists by phone
      const existingCustomer = await storage.getCustomerByPhone(validatedData.phone);
      if (existingCustomer) {
        return res.json(existingCustomer);
      }

      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  // Job routes
  app.get('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const jobs = await storage.getAllJobs(networkId);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const job = await storage.getJobById(req.params.id, networkId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ message: 'Failed to fetch job' });
    }
  });

  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const { customer, machine, policyId } = req.body;
      
      const networkId = req.networkId;
      
      // Create or find customer
      let customerId = customer.id;
      if (!customerId) {
        const newCustomer = await storage.createCustomer(customer, networkId);
        customerId = newCustomer.id;
      }

      // Create machine
      const newMachine = await storage.createMachine(machine, networkId);

      // Generate job number
      const jobNumber = generateJobNumber();

      // Create job
      const jobData = {
        jobNumber,
        customerId,
        machineId: newMachine.id,
        policyId,
        status: 'pending' as const,
      };

      const job = await storage.createJob(jobData, networkId);
      const jobWithRelations = await storage.getJobById(job.id, networkId);
      
      res.status(201).json(jobWithRelations);
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({ message: 'Failed to create job' });
    }
  });

  app.post('/api/jobs/search', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const filters = req.body;
      const jobs = await storage.searchJobs(filters, networkId);
      res.json(jobs);
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({ message: 'Failed to search jobs' });
    }
  });

  // Signature routes
  app.post('/api/signatures', isAuthenticated, async (req: any, res) => {
    try {
      const networkId = req.networkId;
      const signatureData = {
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };
      
      const validatedData = insertSignatureSchema.parse(signatureData);
      const signature = await storage.createSignature(validatedData, networkId);
      
      // Update job status to signed
      await storage.updateJob(signatureData.jobId, { status: 'signed' }, networkId);
      
      res.status(201).json(signature);
    } catch (error) {
      console.error('Error creating signature:', error);
      res.status(500).json({ message: 'Failed to create signature' });
    }
  });

  // Object storage routes for machine photos
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/machine-photos", isAuthenticated, async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    const userId = (req.user as any)?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting machine photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
