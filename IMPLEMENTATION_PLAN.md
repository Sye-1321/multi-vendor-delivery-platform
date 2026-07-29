# Multi-Vendor Delivery Platform — Implementation Plan

## Direction

The public product name will become **Multi-Vendor Delivery Platform**. The
backend will be described as a tenant-aware modular monolith serving restaurant
companies, independent restaurants, customers, and a shared delivery operator.

The rename is intentional:

- **Multi-vendor** describes the business model accurately.
- **Tenant-aware** describes the technical isolation we will implement.
- The system will not claim complete multi-tenancy until tenant boundaries are
  enforced in persistence queries, authorization policies, and critical tests.

The existing NestJS application will be improved in place. It will not be split
into microservices. The current workload benefits more from strong module
boundaries, transactional correctness, and operational reliability than from
network boundaries.

## Working Principles

- Correct the existing business flows before adding new features.
- Keep business rules in domain and application code, not controllers or
  persistence mappers.
- Treat authorization and tenant isolation as business rules.
- Prefer explicit code over generic frameworks and excessive abstractions.
- Add tests where failure would cause financial, security, or workflow damage.
- Do not pursue a coverage percentage or create a test for every class.
- Keep each commit focused, reviewable, and buildable.
- Do not make scale, security, or reliability claims that the repository cannot
  demonstrate.

## Current Problems to Resolve

### Structure and consistency

- `restuarant` is misspelled throughout the source tree and public API.
- Domain modules mix controllers, application orchestration, domain entities,
  mappers, and infrastructure concerns at the same level.
- Several entities expose unrestricted setters, allowing invalid state changes.
- Generic update helpers write arbitrary keys through `any`.
- Application errors are coupled directly to HTTP exceptions.
- Infrastructure classes import concrete services where ports would be clearer.
- Debug logging and placeholder responses remain in production paths.
- The API prefix, port, CORS policy, and runtime configuration are hard-coded.
- The README describes lifecycle states that do not match the implemented enum.

### Identity and access

- Authentication, profile management, administrative user creation, and
  authorization are mixed in a large user module.
- Refresh-token rotation and session revocation need a coherent security model.
- Role checks do not consistently prove ownership of the requested company,
  restaurant, order, review, or delivery worker.
- Tenant context is inferred repeatedly instead of being resolved once and
  carried through the request.
- Administrative account creation should use invitations rather than shared or
  immediately usable credentials.

### Company, restaurant, and menu flows

- Company and restaurant ownership rules are scattered across services.
- Independent restaurants and company-owned branches need one explicit model.
- Repository queries do not consistently require an organization or restaurant
  scope.
- Menu and menu-item ownership must be checked on every mutation.
- Menu-item availability, archival, and price history are not represented
  clearly.
- Destructive deletes can break historical orders.

### Cart and order flow

- The client currently supplies prices and subtotals that must be calculated by
  the server.
- A cart does not have a strong invariant that all items belong to one
  restaurant.
- Menu-item price and name snapshots are not protected for historical orders.
- The order transaction starts a MongoDB session but does not consistently pass
  that session to every write, so the apparent transaction is not atomic.
- Order creation needs an idempotency strategy.
- The domain allows order status to be assigned directly.
- The implemented statuses and the documented lifecycle disagree.
- Cancellation rules, reason, actor, and timestamp are incomplete.
- Payment state is changed as a side effect of delivery without a payment
  policy.

### Fulfilment flow

- Delivery-worker availability and order assignment are updated separately.
- Two requests can race and assign the same available worker.
- Assignment does not have an explicit history, reassignment reason, or release
  policy.
- Restaurant-owned and platform-owned workers need the same fulfilment contract
  with different eligibility policies.
- Delivery completion must prove that the caller controls the assignment.

### Reliability and operations

- Important collections lack deliberate compound indexes for scoped queries.
- There is no liveness/readiness separation or graceful shutdown.
- Logs need consistent request, actor, tenant, restaurant, and order context.
- Sensitive-field redaction must be centralized.
- There is no durable mechanism for notifications triggered by committed
  business events.
- Local setup does not provide the MongoDB replica set required for transactions.
- CI does not currently prove formatting, linting, build, or critical behavior.

## Target Architecture

The codebase will remain one deployable NestJS application with vertical
business modules:

```text
src/
  bootstrap/
  shared/
    application/
    domain/
    infrastructure/
  modules/
    identity/
    organizations/
    restaurants/
    catalog/
    ordering/
    fulfillment/
    notifications/
    reviews/
    audit/
```

Each business module may contain:

```text
domain/          entities, value objects, policies, domain events
application/     use cases, ports, commands, queries, DTO boundaries
infrastructure/  MongoDB repositories and external adapters
presentation/    controllers, request DTOs, guards, serializers
```

This is a guide, not a reason to create empty folders or one-interface-per-file
ceremony. A layer is introduced only when it owns real behavior.

Shared code will be small and stable:

- identifiers, money, timestamps, pagination, and result/error primitives;
- request context and authenticated principal;
- transaction boundary;
- logging, configuration, clock, and event/outbox ports;
- reusable HTTP filters, validation, and response conventions.

Business-specific DTOs, policies, repository contracts, and errors will remain
inside their modules.

## Phase 1 — Establish a Reliable Baseline

1. Capture the current build and lint results before refactoring.
2. Replace the write-on-lint command with separate `lint` and `lint:fix`
   commands.
3. Add validated configuration for application, database, authentication,
   email, logging, and CORS settings.
4. Add `.env.example` containing safe local defaults and explanations.
5. Change the API base path to `/api/v1` and use URI versioning consistently.
6. Add request DTO transformation and ObjectId validation.
7. Remove the unused starter controller/service and production debug output.
8. Correct README encoding problems.
9. Rename `restuarant` to `restaurant` with `git mv`, including modules, files,
   types, persistence models, and routes.
10. Add a local Docker Compose environment with a MongoDB replica set.
11. Add liveness and readiness endpoints.
12. Add a minimal CI workflow for install, format check, lint, build, and the
    selected critical tests.

Exit criteria:

- A clean clone can be configured from `.env.example`.
- The application builds and starts against the documented local environment.
- CI executes the same verification commands used locally.
- No source path or public route contains the misspelled domain name.

## Phase 2 — Create Clear Module Boundaries

1. Introduce a typed configuration module and bootstrap composition root.
2. Replace `cls-hooked` with `AsyncLocalStorage` request context.
3. Define an authenticated principal containing actor, role, organization, and
   restaurant scope where applicable.
4. Separate identity/authentication from user profiles and organization
   membership.
5. Move authorization from ad hoc service comparisons into explicit policies.
6. Introduce domain-specific errors independent of HTTP.
7. Map domain/application errors to HTTP in one presentation-layer filter.
8. Replace unrestricted entity setters with named domain operations.
9. Remove generic arbitrary-key update helpers.
10. Replace unnecessary concrete service dependencies with narrow application
    ports.
11. Keep MongoDB documents and Mongoose types outside domain entities.
12. Add transaction and clock abstractions only where business code uses them.

Exit criteria:

- Controllers delegate to use cases and do not contain business decisions.
- Domain entities cannot be moved into invalid states through public setters.
- HTTP, Mongoose, and NestJS concerns do not leak into core business rules.
- Authorization policies can explain both role and resource ownership.

## Phase 3 — Repair Identity and Tenant Isolation

1. Implement access-token and rotating refresh-token sessions.
2. Store only refresh-token hashes and revoke a session on logout or reuse.
3. Add password reset and email verification as one-time, expiring token flows.
4. Replace direct administrator creation with invitation and activation flows.
5. Model organization membership separately from the global user identity.
6. Represent company-owned branches and independent restaurants explicitly.
7. Resolve request scope once, then pass it through the application context.
8. Require scope in all private repository queries.
9. Add compound unique indexes that include the relevant tenant boundary.
10. Deny cross-company and cross-restaurant access without revealing whether the
    resource exists.
11. Record security-relevant actions in an append-only audit trail.

High-value verification:

- Refresh-token rotation and reuse rejection.
- One cross-tenant read/write isolation scenario.
- One organization invitation and activation flow.

## Phase 4 — Repair Catalog, Cart, and Ordering

### Catalog

1. Give menu items explicit availability and archival states.
2. Prevent hard deletion of products referenced by historical orders.
3. Validate that menu and item mutations belong to the caller's restaurant.
4. Store money in a consistent minor-unit representation or a validated money
   value object.
5. Add restaurant/menu browsing with cursor pagination and stable sorting.

### Cart

1. Make a cart belong to one customer and one restaurant.
2. Reject items from a second restaurant.
3. Treat quantity and customization choices as client input, never prices.
4. Load authoritative menu data and calculate totals on the server.
5. Return changed-price or unavailable-item conflicts before checkout.

### Order

1. Create immutable order-item snapshots containing name, unit price,
   customization, quantity, and subtotal.
2. Define the lifecycle in one domain policy:

   ```text
   placed -> accepted -> preparing -> ready_for_delivery
          -> assigned -> picked_up -> delivered
   ```

3. Allow cancellation only through explicit rules based on actor and state.
4. Store transition actor, timestamp, reason, and previous/new state.
5. Use named domain methods such as `accept`, `startPreparation`,
   `markReady`, `assignCourier`, `markPickedUp`, and `deliver`.
6. Make checkout atomic by passing one MongoDB session through every write.
7. Support an `Idempotency-Key` for checkout and return the original result for
   a safe retry.
8. Separate payment status from fulfilment status.
9. Introduce a payment port with cash-on-delivery as the first implementation;
   an online provider can be added later without changing the order aggregate.

High-value verification:

- Server-side price calculation and one-restaurant cart invariant.
- Allowed and rejected order transitions.
- Atomic checkout rollback.
- Duplicate checkout using the same idempotency key.

## Phase 5 — Make Fulfilment Concurrency-Safe

1. Model fulfilment assignment separately from the delivery worker profile.
2. Define eligibility policies for restaurant-owned and platform-owned workers.
3. Atomically claim a worker only when the worker is active and available.
4. Atomically assign an order only when it is ready and unassigned.
5. Use conditional updates and optimistic versioning to detect competing writes.
6. Compensate or retry safely when one half of an assignment cannot complete.
7. Record assignment, rejection, release, and reassignment history.
8. Require a reason for administrative reassignment or cancellation.
9. Release a worker through the same transaction that completes or cancels an
   active delivery.
10. Add operator queries for unassigned orders and eligible workers.

High-value verification:

- Two concurrent claims cannot assign one worker twice.
- Unauthorized restaurants cannot use another vendor's workers.
- Completing or cancelling an assignment releases the worker exactly once.

## Phase 6 — Add Features That Strengthen the Core

These features are selected because they deepen the delivery domain rather than
only increasing endpoint count.

### Order timeline and real-time updates

- Persist business events for every important order transition.
- Expose a customer-safe order timeline.
- Publish committed status changes through an authenticated WebSocket gateway.
- Authorize socket rooms by user, restaurant, or operator scope.
- Support reconnect/resynchronization from the persisted timeline.

### Durable notifications

- Write notification intents to a MongoDB outbox in the same transaction as the
  business change.
- Process the outbox with retry, backoff, deduplication, and dead-letter state.
- Provide in-app notifications first; email remains an adapter.
- Never send email or socket messages before the business transaction commits.

### Delivery zones and fees

- Allow restaurants or the platform operator to define supported delivery
  zones.
- Validate a delivery address against the selected restaurant's service area.
- Calculate and snapshot the delivery fee during checkout.
- Keep the initial zone model deterministic; external mapping is optional.

### Catalog operations

- Add restaurant opening hours and temporary closure.
- Add menu-item availability windows and sold-out controls.
- Prevent checkout when the restaurant or selected item is unavailable.

### Reviews with verified eligibility

- Permit a restaurant review only after a delivered order.
- Permit one review per order, with an explicit edit window.
- Preserve moderation status and audit history.

Deferred until the core is stable:

- promotion engine;
- online payment adapter;
- courier mobile tracking;
- route optimization;
- multi-currency support.

## Phase 7 — Security, Observability, and Performance

1. Add Helmet, an explicit CORS allowlist, request-size limits, and throttling.
2. Apply stricter throttling to login, verification, reset, and invitation
   endpoints.
3. Redact passwords, tokens, authorization headers, cookies, and personal
   details from logs.
4. Use structured JSON logs with request ID, actor ID, organization ID,
   restaurant ID, order ID, duration, and outcome when available.
5. Propagate a correlation ID to outbox and WebSocket events.
6. Add graceful shutdown and database readiness checks.
7. Add metrics for request latency, errors, order transitions, assignment
   conflicts, and outbox lag.
8. Add deliberate indexes after reviewing actual query shapes.
9. Add pagination and bounded filters to every collection endpoint.
10. Add Swagger/OpenAPI with bearer authentication, examples, and documented
    error responses.
11. Run dependency, secret, and container scans in CI without committing their
    generated reports.

## Phase 8 — Focused Verification Strategy

The suite will be intentionally small and behavior-oriented.

### Domain checks

- order transitions;
- cancellation policy;
- price calculation;
- delivery-worker eligibility.

These are fast tests around pure business rules.

### Integration checks

- tenant-scoped repository access;
- MongoDB transaction rollback;
- idempotent checkout;
- concurrent worker assignment;
- durable outbox creation.

These run against a real MongoDB replica-set container, not mocked Mongoose.

### End-to-end checks

- one complete customer order journey;
- one restaurant-owned delivery journey;
- one shared-delivery journey;
- one authentication/session journey;
- one cross-tenant denial journey.

No test-per-controller or coverage target will be introduced. A test is added
when it protects a meaningful invariant, regression, security boundary, or
integration contract.

## Phase 9 — Documentation and Delivery

1. Rewrite the README after behavior and naming are stable.
2. Include the business model, supported roles, lifecycle, architecture, local
   setup, API documentation, and known trade-offs.
3. Add short architecture decision records only for decisions that deserve an
   explanation:
   - modular monolith instead of microservices;
   - tenant isolation model;
   - MongoDB transaction boundary;
   - outbox delivery;
   - concurrency-safe worker assignment.
4. Provide seed data for a company, independent restaurant, menus, customer,
   and delivery workers without fixed credentials.
5. Provide an API collection or generated OpenAPI document.
6. Add a production-oriented Docker image with a non-root runtime user.
7. Document backup, migration, health-check, and rollback expectations.
8. Add a compact verification report containing commands and observable
   results, not marketing claims.

## Git Working Agreement

### Branch model

- `main` remains releasable.
- Create `architecture/modernization` as the integration branch for this body of
  work.
- Use short-lived branches from it, for example:
  - `chore/baseline-tooling`
  - `refactor/module-boundaries`
  - `fix/tenant-isolation`
  - `fix/order-integrity`
  - `feat/fulfillment-assignment`
  - `feat/outbox-notifications`
  - `feat/realtime-order-updates`
  - `ops/observability`
- Merge completed branches into the integration branch with reviewed merge
  commits so the feature topology remains visible.
- Merge the verified integration branch to `main` through a final pull request.

### Commit discipline

- Use small commits that represent one understandable decision.
- Use conventional subjects such as `fix: calculate order totals from catalog`.
- Do not combine renames, behavior changes, formatting, and documentation in one
  commit.
- Keep intermediate commits buildable where practical.
- Preserve meaningful implementation commits in the final history instead of
  squashing the entire modernization into one commit.
- Never manufacture empty commits, conflicts, reversions, or history solely to
  make Git activity appear complex.

### Advanced Git usage

Advanced operations will be used when they solve a real problem:

- `git mv` for the restaurant spelling and module moves.
- `git worktree` when documentation or operations work needs isolation from an
  active feature branch.
- interactive rebase before publishing a branch to fix local commit ordering,
  split accidental mixed commits, or improve commit messages.
- `git range-diff` when a reviewed branch must be rebased.
- `git cherry-pick` only when a focused fix must be applied to more than one
  active branch.
- `git bisect` if a regression appears across the modernization history.
- `git revert` for a published change that must be safely backed out.
- annotated milestone tags after verified stages, not after every commit.

Possible milestones:

- `v0.1.0` — reliable baseline and corrected structure;
- `v0.2.0` — tenant-safe identity, organization, and catalog flows;
- `v0.3.0` — transactional ordering and concurrency-safe fulfilment;
- `v1.0.0` — documented, observable, and deployable platform.

## Suggested Commit Sequence

The exact sequence may change as code is discovered, but the expected history is
roughly:

1. `chore: establish non-mutating quality checks`
2. `chore: validate runtime configuration`
3. `build: add local mongodb replica set`
4. `refactor: rename restaurant domain consistently`
5. `refactor: introduce request context with async local storage`
6. `refactor: separate identity and organization membership`
7. `feat: add rotating refresh token sessions`
8. `feat: add organization invitation workflow`
9. `fix: enforce organization and restaurant scope`
10. `refactor: model catalog ownership and availability`
11. `fix: calculate cart totals from authoritative prices`
12. `feat: snapshot order items at checkout`
13. `refactor: enforce order lifecycle in the aggregate`
14. `fix: make checkout transaction atomic`
15. `feat: make checkout idempotent`
16. `refactor: model fulfilment assignments`
17. `fix: claim delivery workers atomically`
18. `feat: persist order timeline events`
19. `feat: deliver notifications through an outbox`
20. `feat: publish authorized realtime order updates`
21. `feat: calculate delivery zones and fees`
22. `feat: restrict reviews to delivered orders`
23. `feat: add structured operational telemetry`
24. `docs: document the multi-vendor platform`
25. `ci: verify build security and critical behavior`

## Completion Standard

The modernization is complete when:

- tenant-scoped resources cannot be read or changed across boundaries;
- order prices are calculated by the server and captured historically;
- invalid order transitions cannot be represented through public domain APIs;
- checkout is atomic and idempotent;
- delivery workers cannot be double-assigned under concurrent requests;
- notifications are emitted only after committed business changes;
- critical customer, restaurant, and delivery-operator journeys work end to end;
- logs and metrics make failures diagnosable without exposing secrets;
- local setup, CI, API documentation, and container startup are reproducible;
- the README matches the implemented behavior;
- the Git history explains the evolution through focused, meaningful commits.

## Non-Goals

- Splitting the application into microservices.
- Adding infrastructure solely for architectural appearance.
- Creating hundreds of low-value tests.
- Claiming production scale without measurements.
- Building a frontend or courier mobile application in this repository.
- Implementing every possible marketplace feature before the order and
  fulfilment core is reliable.
