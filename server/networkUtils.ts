import { Request } from 'express';
import { createHash } from 'crypto';

/**
 * Network identifier utility for WiFi-based data isolation
 * Each WiFi network gets a unique identifier to isolate company data
 */

interface NetworkInfo {
  networkId: string;
  fingerprint: string;
}

/**
 * Generate a network identifier based on client information
 * This creates a unique identifier for each WiFi network/location
 */
export function getNetworkIdentifier(req: Request): NetworkInfo {
  // Get client IP address (local network IP)
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string || '127.0.0.1';
  
  // Get User-Agent for additional fingerprinting
  const userAgent = req.headers['user-agent'] || '';
  
  // Extract local network info from IP (first 3 octets for subnet)
  const ipParts = clientIp.split('.');
  const subnet = ipParts.length >= 3 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}` : clientIp;
  
  // Create a fingerprint based on network characteristics
  const networkFingerprint = createHash('sha256')
    .update(`${subnet}:${userAgent.substring(0, 100)}`) // Limit user agent length
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for readability
  
  // Generate a more readable network ID
  const networkId = `NET_${networkFingerprint.toUpperCase()}`;
  
  return {
    networkId,
    fingerprint: networkFingerprint
  };
}

/**
 * Middleware to add network information to requests
 */
export function addNetworkInfo(req: any, res: any, next: any) {
  const networkInfo = getNetworkIdentifier(req);
  req.networkId = networkInfo.networkId;
  req.networkFingerprint = networkInfo.fingerprint;
  
  // Log network detection for debugging
  console.log(`Network detected: ${networkInfo.networkId} from IP: ${req.ip}`);
  
  next();
}

/**
 * Validate if a network ID is properly formatted
 */
export function isValidNetworkId(networkId: string): boolean {
  return /^NET_[A-F0-9]{16}$/.test(networkId);
}