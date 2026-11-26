/**
 * Firestore Security Rules Verification Specification
 * Covers the "Dirty Dozen" adversarial payloads defined in security_spec.md.
 * Intended for execution with @firebase/rules-unit-testing against Firestore Emulator.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expected: 'PERMISSION_DENIED' | 'ALLOW';
  description: string;
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated Sale Creation',
    collection: 'sales',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Blocks unauthenticated writes to /sales.',
  },
  {
    id: 'DD-02',
    name: 'Unverified Email Admin Spoof',
    collection: 'restocks',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Rejects admin email when email_verified is false.',
  },
  {
    id: 'DD-03',
    name: 'Shadow Field Injection on Product',
    collection: 'products',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Blocks extra fields not in keys().hasOnly() allowlist.',
  },
  {
    id: 'DD-04',
    name: 'Negative Stock Manipulation',
    collection: 'products',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    description: 'Blocks stock < 0 via isValidProduct().',
  },
  {
    id: 'DD-05',
    name: 'Orphan Sale Without Atomic Stock Decrement',
    collection: 'sales',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Blocks sale creation unless products/{id}.stock decrements atomically via getAfter().',
  },
  {
    id: 'DD-06',
    name: 'Price Tampering on Sale',
    collection: 'sales',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Enforces unitPrice == product.unitPrice and totalAmount == quantity * unitPrice.',
  },
  {
    id: 'DD-07',
    name: 'Buyer UID Impersonation',
    collection: 'sales',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Blocks non-admin users from setting buyerUid != request.auth.uid.',
  },
  {
    id: 'DD-08',
    name: 'Client Timestamp Forgery',
    collection: 'sales',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Requires createdAt == request.time.',
  },
  {
    id: 'DD-09',
    name: 'Oversized String Resource Poisoning',
    collection: 'sales',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    description: 'Rejects note > 160 chars or IDs > 128 chars.',
  },
  {
    id: 'DD-10',
    name: 'Non-Admin Price Escalation',
    collection: 'products',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    description: 'Tier 2 update only allows stock, lastSaleId, and updatedAt.',
  },
  {
    id: 'DD-11',
    name: 'Terminal State Reversal on Paid Sale',
    collection: 'sales',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    description: 'Prevents non-admin reversal of paid: true back to paid: false.',
  },
  {
    id: 'DD-12',
    name: 'Unauthorized List Scraping',
    collection: 'restocks',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    description: 'Blocks non-admin list queries on /restocks and unowned /sales.',
  },
];
