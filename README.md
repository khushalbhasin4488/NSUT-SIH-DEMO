# SIH 2026 – Online Verification System for Weights & Measures

This repository contains a demonstrable Legal Metrology platform for registering instruments, submitting verification applications, scheduling inspections, recording field verification, issuing digital certificates, and publicly verifying certificates.

## 1. Project Information

- **Project Title:** Maanak 
- **PS ID:** SIH26036 
- **PS Title:** Development of an Online Verification System for Weighing and Measuring Instruments
- **Category:** Software
- **Theme:** Miscellaneous

## 2. Problem Statement

Legal-metrology verification is often managed across disconnected paper-based or department-specific processes. This makes it difficult for instrument owners to submit applications and track status, for officers to manage field inspections, and for the public to verify whether a certificate is genuine and valid.

## 3. Proposed Solution

The platform provides a role-based, state-aware workflow for stakeholders, Legal Metrology Officers (LMOs), Government Approved Test Centres (GATCs), and administrators. It supports instrument registration, applications, payments, scheduling, field verification, fraud signals, notifications, digital certificates, QR-based public verification, and an audit ledger.

The repository includes mock adapters for external services such as Aadhaar, DigiLocker, Udyam/GST, OCR, instrument recognition, and payments so that evaluators can run the complete demonstration locally without production credentials.

## 4. Key Features

- Stakeholder registration and role-based access
- State and district scoped multi-tenant workflows
- Instrument registry and category-specific applications
- Application status tracking, fee calculation, and mock payments
- LMO/GATC scheduling and field verification workflows
- Digital certificate generation and QR/public verification
- Certificate expiry alerts and notification records
- Fraud/anomaly risk indicators and compliance assistance
- Offline-first mobile field-app foundation
- PostgreSQL audit/ledger records and seeded demonstration data

## 5. Technology Stack

- **Web frontend:** Next.js 14, React 18, TypeScript
- **Backend API:** Node.js 22, NestJS, TypeScript
- **Database:** PostgreSQL 16 with Prisma ORM and pgvector image
- **Authentication:** Keycloak 25, OAuth2/OIDC, JWT, role guards
- **Supporting services:** Redis 7, Apache Kafka 3.8, MinIO object storage
- **Mobile foundation:** Flutter/Dart field-app sync contract
- **Deployment:** Docker Compose

## 6. Architecture

```text
Browser / Mobile Field App
          |
          v
Next.js Web App  --->  NestJS REST API  --->  PostgreSQL / Prisma
          |                    |                  |
          |                    +--------------> Redis
          |                    +--------------> Kafka
          |                    +--------------> MinIO
          |                    +--------------> Mock external providers
          |
          +--------------> Keycloak (OIDC authentication)
          |
          +--------------> Public certificate verification
```

The API is served under `/api`. The health endpoint is `/api/health`. External integrations are represented by provider interfaces and local mock implementations, which keeps the evaluator setup self-contained.

## 7. Repository Structure

```text
sih/
├── README.md
├── package.json
├── docker-compose.yml
├── apps/
│   ├── api/
│   │   ├── src/                 # NestJS controllers, services, guards, providers
│   │   ├── prisma/              # Schema, migrations, and seed data
│   │   └── test/                # API and domain tests
│   ├── web/
│   │   └── app/                 # Next.js pages and UI components
│   └── mobile/                  # Flutter offline-sync foundation
├── infra/
│   └── keycloak/                # Imported Keycloak realm and demo users
└── plan.md                      # Unified technical plan, roadmap, and implementation status
```

### What goes where?

| Item | Location |
| --- | --- |
| Web source code | `apps/web/` |
| API source code | `apps/api/src/` |
| Database schema and migrations | `apps/api/prisma/` |
| API tests | `apps/api/test/` |
| Mobile field-app foundation | `apps/mobile/` |
| Infrastructure configuration | `docker-compose.yml`, `infra/` |
| Technical documentation, roadmap, and implementation status | `plan.md` |

## 8. Evaluator Prerequisites

Install the following before starting:

- Git
- Docker Desktop with Docker Compose v2
- Node.js 22 or a compatible current Node.js release
- npm

The default Docker Compose setup does not require a separate PostgreSQL, Redis, Kafka, MinIO, or Keycloak installation.

## 9. Installation and Setup

Clone the repository and install the workspace dependencies:

```bash
git clone <YOUR_REPOSITORY_URL>
cd sih
npm install
```

Start the complete local stack:

```bash
docker compose up -d --build
```

Apply the database migrations and load the demonstration records:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The API reads local development settings from `apps/api/.env`. If that file is not present, copy the provided example first:

```bash
cp apps/api/.env.example apps/api/.env
```

For a clean evaluator environment, run the database commands after the PostgreSQL container reports healthy:

```bash
docker compose ps
```

## 10. Run and Access the Project

When the stack is running, use these URLs:

| Service | URL |
| --- | --- |
| Web application | [http://localhost:3001](http://localhost:3001) |
| API health check | [http://localhost:3000/api/health](http://localhost:3000/api/health) |
| Keycloak admin/login service | [http://localhost:8080](http://localhost:8080) |
| MinIO console | [http://localhost:9001](http://localhost:9001) |

The API is exposed at `http://localhost:3000/api` and the web app is configured to use that URL.

### Demo logins

The imported Keycloak realm contains the following evaluator accounts. All demo users use the password `Demo@12345`.

| Email | Role |
| --- | --- |
| `business@example.com` | Business / instrument owner |
| `officer@example.gov.in` | Legal Metrology Officer (LMO) |
| `gatc@example.gov.in` | Government Approved Test Centre (GATC) |
| `stateadmin@example.gov.in` | State administrator |
| `admin@example.gov.in` | Central administrator |

The Docker Compose Keycloak admin account is `admin` / `admin`. These credentials are for local demonstration only.

The recommended recording account is `business@example.com`. Its seeded profile is already verified and includes a business name, phone number, GSTIN, KYC document, instruments, applications, payment history, and certificate records. You can use the **New application** flow to submit another application live during the demo.

## 11. Development Commands

```bash
# Build all workspaces
npm run build

# Run API tests
npm test

# Run the API locally outside Docker
npm run dev

# Run the web app locally outside Docker
npm run dev -w apps/web

# Stop containers while preserving database/object-storage volumes
docker compose down
```

If the API or web app is run locally instead of through Compose, keep the supporting services running with Docker Compose and use the host-based values in `apps/api/.env.example`.

## 12. Suggested Evaluation Flow

1. Open the web app and sign in as `business@example.com`.
2. Review the seeded instruments, applications, payment records, and certificate history.
3. Open the officer or GATC views to inspect scheduling and verification workflows.
4. Open the certificate/public verification flow and verify a seeded certificate.
5. Check the API health endpoint and the role-specific dashboards.

## 13. Future Scope

- Replace mock Aadhaar, DigiLocker, GST/Udyam, OCR, payment, and notification adapters with approved production integrations.
- Add production-grade document scanning, computer vision, and compliance RAG services.
- Complete the Flutter mobile application with durable offline storage, camera capture, and background sync.
- Add MFA enforcement for officers and administrator roles.
- Add production observability, automated security scanning, and Kubernetes deployment manifests.

## Important

Do not commit passwords, API keys, access tokens, private certificates, production database URLs, `.env` files, or other confidential credentials. The values in the local Docker Compose and Keycloak seed configuration are demo-only and must be replaced before any real deployment.
