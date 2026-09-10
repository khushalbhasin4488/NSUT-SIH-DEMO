# Legal Metrology Field App

Phase 2 mobile foundation for offline field verification.

The sync contract mirrors the API endpoints:

- `GET /api/field/tasks/:officerId`
- `POST /api/field/sync`

The Drift database should implement `FieldSyncRepository` with a durable queue. Each operation has an idempotency key, device timestamp, and payload. The server applies last-write-wins with an explicit conflict record when its version is newer.
