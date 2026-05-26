# CRM integration

The insurance CRM is the source of truth (per spec §9). The provider is TBD — leading candidates include Migdal-managed CRMs, Harel's portal, or a Salesforce-based system.

## Today

`src/integrations/crm/mock.ts` implements `CrmClient` in memory with three seeded Hebrew customers (`cust_001` through `cust_003`). The mock supports:

- Read by `customer_id`, by `phone`, by `email`
- `createProcess` (idempotent by phone)
- `updateStatus` (updates customer + process)
- `createLead`, `createTask`

The mock is sufficient to exercise the full agent flow without external dependencies.

## Switching to a real provider

1. Add `src/integrations/crm/real.ts` that implements `CrmClient` from `client.ts`.
2. Wrap CRM API calls with retries per spec §13 — 3 attempts with backoff, then log and notify operations agent.
3. Map provider-specific shapes to our `Customer` / `Lead` / `Task` / `ProcessRecord` types in `types.ts`. No CRM-specific fields should leak past the integration boundary.
4. Update `src/integrations/crm/mock.ts`'s `getCrmClient()` factory to choose mock vs. real based on `CRM_PROVIDER` env var. Prefer extracting the factory to a separate file (`factory.ts`) so the mock module stays self-contained.
5. Add env vars: `CRM_BASE_URL`, `CRM_API_KEY` (already in `.env.example`).
6. Write integration tests against the real provider in a staging environment — do **not** run them in CI unless we have a sandbox CRM.

## Error handling

All custom errors live in `src/shared/errors.ts`. The CRM-specific ones:

- `CrmNotFoundError` — record absent
- `CrmDuplicateError` — conflicting record on a unique field

## Data shapes

See `src/integrations/crm/types.ts`.
