# PixMatch AI — Phase 9: SaaS Subscriptions, Billing & Metering Architecture

## 1. Overview & Monorepo Integration
PixMatch AI provides a multi-tenant, production-grade SaaS monetization engine designed specifically for modern photography studios. The system supports multi-tier subscriptions, dynamic INR and USD pricing, strict server-side entitlement enforcement, atomic usage metering, and an idempotent webhook processing pipeline.

---

## 2. Subscription Plans & Hierarchy

| Plan Tier | Slug | Monthly Price | Yearly Price (2 Mo Free) | Active Galleries | Photo Limit | Storage Quota | Monthly AI Searches | Team Seats | Key Entitlements |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **Free Trial** | `free` | ₹0 / $0 | ₹0 / $0 | 3 | 500 | 2 GB | 50 | 1 | Client Gallery, Face Search, ZIP Downloads |
| **Starter** | `starter` | ₹999 / $15 | ₹9,990 / $150 | 15 | 5,000 | 25 GB | 500 | 2 | Branding, Client CRM, Original Downloads, S3/R2 Storage |
| **Professional** | `pro` | ₹2,499 / $35 | ₹24,990 / $350 | 50 | 25,000 | 100 GB | 2,500 | 5 | Advanced Analytics, Custom Domains, Multi-Storage, API Access |
| **Studio Enterprise** | `studio` | ₹5,999 / $89 | ₹59,990 / $890 | Unlimited | 100,000 | 500 GB | 10,000 | 15 | Unlimited Clients, 1 TB Bandwidth, Webhooks, Priority AI Queue |
| **Custom Enterprise** | `enterprise` | Custom | Custom | Unlimited | Unlimited | Custom | Unlimited | Custom | Custom AI models, dedicated SLA, enterprise billing |

---

## 3. Limit Conventions & Entitlement Model

```
                    +------------------------------------+
                    |        Incoming Action Request     |
                    | (Upload / Gallery / Client / AI)   |
                    +-----------------+------------------+
                                      |
                                      v
                    +------------------------------------+
                    |       EntitlementService           |
                    |  * Checks Plan Feature Flags       |
                    |  * Checks Past-Due State           |
                    |  * Compares Usage vs Quota         |
                    +-----------------+------------------+
                                      |
                       +--------------+--------------+
                       |                             |
                 [Quota OK]                    [Quota Exceeded]
                       |                             |
                       v                             v
           +-----------------------+     +-----------------------+
           | Atomic Usage Reserve  |     | Return 403 Forbidden  |
           | Execute Operation     |     | Show Upgrade CTA      |
           | Release on Fail/Done  |     +-----------------------+
           +-----------------------+
```

### Limit Semantics
- `null` = **Unlimited** (no cap applied).
- `0` = **Disabled** (feature or resource completely turned off).
- `positive integer` = **Finite Maximum Cap** (strictly checked server-side).

---

## 4. Authoritative Usage Metering (Source of Truth)

Billing counters derive solely from primary database records—never from approximate client charts:

1. **Storage Usage:** Calculated by `SUM(file_size)` on the `Photo` table scoped by `studio_id`.
2. **Photo Count:** Calculated by `COUNT(*)` on the `Photo` table scoped by `studio_id`.
3. **Active Galleries:** Calculated by `COUNT(*)` on the `Gallery` table where `status IN ('ACTIVE', 'DRAFT')`.
4. **Client CRM Count:** Calculated by `COUNT(*)` on the `Client` table where `deleted_at IS NULL`.
5. **Monthly AI Searches:** Calculated by `COUNT(*)` on `AiSearchLog` within `[current_period_start, current_period_end]`.
6. **Team Seats:** Calculated by `COUNT(*)` on `StudioMembership` scoped by `studio_id`.

---

## 5. Non-Destructive Downgrade & Cancellation Guarantee

> [!IMPORTANT]
> **Strict Non-Destructive Data Policy:**  
> A plan downgrade, subscription cancellation, or payment failure will **NEVER** delete existing photos, client galleries, client profiles, favorites, selections, or storage connection records. Over-quota accounts transition to a read-only creation state where existing client galleries remain fully accessible, but new resource creation is paused until upgraded.

---

## 6. Provider Abstraction & Webhook Pipeline

### Supported Providers
- **`StripeBillingProvider`:** Production-grade integration supporting Stripe Checkout, Customer Portal, and signature-verified webhooks.
- **`MockBillingProvider`:** Deterministic in-memory provider for zero-cost testing, CI/CD, and local offline development.

### Webhook Idempotency & Convergence
- Webhook endpoints verify HMAC SHA-256 signatures before reading payloads.
- Incoming event IDs (`evt_xxx`) are stored in `BillingWebhookEvent`. Duplicate event deliveries are recognized and skipped immediately.
- Out-of-order events (e.g. `invoice.paid` arriving before `subscription.created`) converge to the authoritative provider state without data corruption.

---

## 7. Security & Compliance Checklist

- [x] **Zero Biometric & Payment Card Storage:** No card numbers, CVV, or biometric embeddings touch billing databases.
- [x] **Anti-IDOR Protection:** Cross-tenant subscription, customer, invoice, and portal access strictly blocked by tenant scoping.
- [x] **Price Tampering Prevention:** Client requests specify only validated `SubscriptionPlan` enums; prices are resolved exclusively on the server.
- [x] **HMAC Signature Enforcement:** Webhook endpoints reject unverified or expired signatures outside the 300s window.
- [x] **Race-Condition Safety:** Concurrent uploads reserve quota slots atomically to prevent quota overshoots.
