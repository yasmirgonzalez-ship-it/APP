# Security Specification & Payload-First TDD

## Data Invariants
1. **Product Integrity**: Only admins can create products or modify prices, unit costs, or minimum stock thresholds. Non-admin verified users may only decrement `stock` atomically alongside a valid `Sale` creation (`lastSaleId` must exist after batch/transaction).
2. **Atomic Sale Ledger**: Every `Sale` creation must reference an existing `Product`, match the product's active `unitPrice`, satisfy `totalAmount == quantity * unitPrice`, bound `quantity` between 1 and 24, and atomically decrement the product's `stock` in the same batch/transaction.
3. **Identity & Anti-Spoofing**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`. Non-admin users can only create sales where `recordedByUid == request.auth.uid` and `buyerUid == request.auth.uid`.
4. **Immutable Audit & Terminal State Locking**: `Restock` records are append-only by admins (`update` and `delete` denied). Once a `Sale` has `paid == true`, it cannot be mutated back to `paid == false` by non-admins; non-admins cannot alter `quantity`, `totalAmount`, `productId`, or `createdAt` after creation.
5. **Temporal Integrity & Path Hardening**: Every `createdAt` and `updatedAt` must equal `request.time`. All document IDs must satisfy `^[a-zA-Z0-9_\-]+$` and length <= 128. All strings enforce strict `.size()` bounds.

## The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Sale**: Anonymous request (`auth: null`) creating `/sales/sale_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Admin Spoof**: Token with `email: "supervision.ambiental2@hemco.com.ni"` and `email_verified: false` creating `/restocks/restock_1` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Product**: Payload with `{ ..., isDiscounted: true }` on `/products/coca-normal` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly`).
4. **Negative Stock Manipulation**: User attempting to set `stock: -5` on `/products/coca-normal` -> `PERMISSION_DENIED`.
5. **Orphan Sale Without Atomic Stock Decrement**: User creating `/sales/sale_orphan` without updating `/products/coca-normal` in the same batch -> `PERMISSION_DENIED` (blocked by `getAfter`).
6. **Price Tampering on Sale**: User creating `/sales/sale_cheap` with `unitPrice: 0` or `totalAmount: 1` when product `unitPrice` is `25` -> `PERMISSION_DENIED`.
7. **Buyer UID Impersonation**: Non-admin user (`uid: user_A`) creating `/sales/sale_fake` with `buyerUid: "user_B"` -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: Payload with `createdAt: Timestamp(2020-01-01)` instead of `request.time` -> `PERMISSION_DENIED`.
9. **Resource Exhaustion (1.5KB ID / Note)**: Document ID or `note` string exceeding `160` characters -> `PERMISSION_DENIED`.
10. **Self-Service Price/Cost Escalation**: Non-admin user attempting to update `unitPrice` on `/products/coca-zero` -> `PERMISSION_DENIED`.
11. **Terminal State Reversal**: Non-admin user updating a `Sale` where `existing().paid == true` back to `paid: false` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Non-admin user listing `/sales` without filtering `buyerUid == request.auth.uid`, or listing `/restocks` -> `PERMISSION_DENIED`.
