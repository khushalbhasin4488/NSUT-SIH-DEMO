# System Architecture

## High-level flow

```yaml
User
  |
  v
Next.js Frontend
  |
  v
NestJS Backend API
  |
  +------------------> PostgreSQL Database
  |
  +------------------> Redis Cache / Queue
  |
  +------------------> MinIO Document Storage
  |
  +------------------> Kafka Event Stream
  |
  v
Business Workflows
  |
  +----> Application submission and payments
  +----> Verification scheduling and field inspection
  +----> Certificate issuance and public verification
  +----> Compliance assistant
  +----> Mock OCR and instrument-recognition intelligence
  |
  v
Prediction / Decision / Result
  |
  v
Frontend
```

## Components

### Frontend

The Next.js frontend provides the dashboards and workflows for business owners, Legal Metrology Officers, approved test centers, state administrators, and central administrators. It handles user interaction, form input, role-specific navigation, filtering, exports, field verification forms, payment views, certificates, and the compliance assistant.

### Backend API

The NestJS API receives requests, validates input, applies role-based access control, and coordinates application logic. It manages applications, instruments, payments, schedules, verification visits, certificates, audit logs, alerts, compliance queries, and AI review records.

### Authentication and authorization

Keycloak provides authentication and issues role-bearing access tokens. The API validates these tokens and enforces access by role and data scope. Business owners can access only their own applications and instruments. State and central administrators manage visits, while LMOs and approved test centers submit inspection results.

### Mock intelligence services

The project includes deterministic mock OCR and instrument-recognition providers. Seeded records contain fixed fields so evaluators can demonstrate field extraction, category recognition, confidence scores, alternatives, and human review without uploading real documents or using an external machine-learning service.

### Compliance assistant

The compliance assistant searches seeded compliance documents and returns an answer with source citations and a confidence score. Low-confidence answers are flagged for human review. The first chat response is hardcoded for a predictable demo experience.

### Database

PostgreSQL stores stakeholders, instruments, applications, payments, verification records, field tasks, certificates, alerts, audit logs, compliance documents, compliance queries, fraud scores, and AI outputs.

### Redis

Redis supports caching and queue-oriented runtime services used by the backend for fast, asynchronous application processing.

### MinIO

MinIO provides S3-compatible local object storage for demo documents, instrument photos, signatures, and other uploaded evidence.

### Kafka

Kafka provides the event-streaming layer for integration and asynchronous workflow events. It is included in the Docker Compose environment for local demonstrations and future external-system integrations.

### External integrations

Mock DigiLocker, UMANG, payment gateway, OCR, Aadhaar, GST/Udyam, SMS, email, and notification providers are included for safe local demonstrations. These providers can be replaced with production integrations without changing the core workflow contracts.

## Role-based workflow

```text
Business Owner
  └── Submit applications, view own instruments, make payments, track status

Legal Metrology Officer / Approved Test Center
  └── View assigned verification work and record PASS / FAIL results

State Administrator
  └── View state records, assign officers, manage schedules, monitor operations

Central Administrator
  └── View cross-state records, manage administration, and review intelligence
```

## Local deployment

The complete local environment is defined in `docker-compose.yml`. It runs PostgreSQL, Redis, MinIO, Kafka, Keycloak, the NestJS API, and the Next.js frontend as separate services.

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000/api`
- Keycloak: `http://localhost:8080`
- MinIO console: `http://localhost:9001`

Demo data is generated with:

```bash
npm run prisma:seed -w apps/api
```
