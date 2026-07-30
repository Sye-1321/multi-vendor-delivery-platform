# Architecture Decisions

This document records the decisions that materially shape the delivery
platform. It describes implemented behavior rather than planned features.

## Modular Monolith

The backend is one NestJS deployment with modules organized around business
capabilities.

This is deliberate:

- order, catalog, identity, fulfilment, and notification operations currently
  share one operational boundary;
- MongoDB transactions protect workflows that span several collections;
- independent deployment and scaling are not yet required;
- module boundaries preserve a future extraction path without introducing
  distributed-system failure modes today.

A capability should become a separate service only when it has an independent
deployment, scaling, ownership, or availability requirement.

## Tenant Isolation

The business tenant boundary is the restaurant, with company ownership above
it.

Isolation is enforced through:

- role guards at the presentation boundary;
- restaurant or customer ownership in private repository queries;
- restaurant-scoped catalog lookups;
- compound indexes whose uniqueness begins at the relevant tenant key;
- generic not-found responses for inaccessible order resources;
- authenticated WebSocket rooms authorized against the same ownership model.

Role checks alone are insufficient. A restaurant administrator must also own
the restaurant associated with the resource.

## Order Transaction Boundary

Checkout is one MongoDB transaction covering:

- cart items;
- cart;
- order;
- initial order timeline entry;
- notification outbox intent.

Menu prices are loaded from the database and totals are calculated by the
server in minor units. A client-provided subtotal is never persisted.

Later status changes persist the order transition, timeline entry, and
notification intent together. Courier assignment and release also update the
courier and order within one transaction.

The local Docker Compose environment runs MongoDB as a replica set because a
standalone MongoDB instance cannot provide these transaction guarantees.

## Concurrency Control

Order transitions use compare-and-set updates containing both the order ID and
expected status. Courier claims contain the courier ID, ownership scope, active
status, and expected availability.

This means competing requests do not overwrite one another:

- only one request can move an order from a specific previous state;
- only one request can claim an available courier;
- courier release and terminal order transition commit together.

A conflict is returned when another request wins the race.

## Persisted Timeline and Real-Time Delivery

The database timeline is the source of truth for order history. Each entry
records:

- previous and next state;
- actor identifier and role;
- occurrence time;
- correlation ID;
- cancellation reason when applicable.

Socket.IO is a delivery mechanism, not the source of truth. An authorized
subscription first receives the persisted snapshot, allowing a reconnecting
client to recover changes missed while disconnected. Live events are published
only after the business transaction commits.

## Transactional Outbox

Sending a notification directly inside an order transaction would be unsafe:
the external effect could succeed while the database rolls back, or the
database could commit after the external effect fails.

Instead, the transaction writes a notification intent. A processor claims
committed intents and creates in-app notifications with:

- atomic worker claiming;
- stale-lock recovery;
- exponential retry backoff;
- a stable deduplication key;
- idempotent notification persistence;
- dead-letter state after repeated failure.

This gives at-least-once processing with effectively-once in-app notification
creation.

## Refresh Sessions

Only a bcrypt hash of the current refresh token is stored. Refreshing rotates
both the access and refresh token and replaces the stored hash.

If an older signed refresh token is replayed, its hash no longer matches and
the current stored session is revoked. Logout, password changes, password
resets, and account deactivation also revoke the refresh session.

## Verification Strategy

The repository uses a small set of behavior-focused tests and runtime smoke
checks. Tests are added for boundaries where a regression would create a
security, transaction, concurrency, or availability failure.

The shared verification command enforces formatting, linting, compilation, and
the focused test suite:

```bash
npm run verify
```
