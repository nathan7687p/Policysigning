import { storage } from './storage';

/**
 * Seed default policy for each network
 * This ensures every company has at least one policy to work with
 */
export async function seedDefaultPolicy(networkId: string) {
  try {
    // Check if network already has policies
    const existingPolicies = await storage.getAllPolicies(networkId);
    if (existingPolicies.length > 0) {
      console.log(`Network ${networkId} already has policies, skipping seed`);
      return;
    }

    // Create default policy for this network
    const defaultPolicy = {
      policyId: 'POLICY001',
      title: 'Standard Service Agreement',
      description: 'Default service policy for equipment repair and maintenance',
      content: `By signing below, the customer acknowledges and agrees to the following terms:

1. Service Terms
   - All repair work will be performed with reasonable care and skill
   - Estimated completion times are approximate and may vary based on parts availability
   - Customer will be contacted before any work exceeding the initial estimate

2. Customer Responsibilities
   - Provide accurate information about equipment issues
   - Remove all personal data and valuable items before service
   - Pay for services upon completion unless other arrangements are made

3. Liability
   - Our liability is limited to the cost of repairs performed
   - We are not responsible for data loss or pre-existing conditions
   - Customer equipment is held at their own risk

4. Payment Terms
   - Payment is due upon completion of service
   - Additional charges may apply for expedited service
   - Parts and labor are guaranteed for 30 days

By signing digitally, the customer agrees to these terms and authorizes the repair work to proceed.`,
      version: '1.0',
      isActive: true,
    };

    const policy = await storage.createPolicy(defaultPolicy, networkId);
    console.log(`Created default policy for network ${networkId}:`, policy.policyId);
    
    return policy;
  } catch (error) {
    console.error('Error seeding default policy:', error);
  }
}