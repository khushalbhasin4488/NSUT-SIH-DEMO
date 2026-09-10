import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { StakeholdersController } from './stakeholders.controller';
import { ApplicationsController } from './applications.controller';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { DashboardController } from './dashboard.controller';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { FieldController } from './field.controller';
import { AlertsController } from './alerts.controller';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { LegacyImportService } from './legacy-import.service';
import { MockDigiLockerProvider } from './mock-digilocker.provider';
import { MockUmangProvider } from './mock-umang.provider';
import { DIGILOCKER_PROVIDER, UMANG_PROVIDER } from './integrations.tokens';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { HttpExceptionFilter } from './http-exception.filter';
import { AuthController } from './auth.controller';
import { LookupsController } from './lookups.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './mock-payment.provider';
import { MockPaymentGatewayProvider } from './mock-payment-gateway.provider';
import { PAYMENT_GATEWAY_PROVIDER, PAYMENT_PROVIDER } from './payments.tokens';
import { NotificationsService } from './notifications.service';
import { EmailProvider, PushProvider, SmsProvider, WhatsAppProvider } from './notification-providers';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MockOcrProvider } from './mock-ocr.provider';
import { MockInstrumentRecognitionProvider } from './mock-instrument-recognition.provider';
import { INSTRUMENT_RECOGNITION_PROVIDER, OCR_PROVIDER } from './ai.tokens';
import { MockGstUdyamProvider } from './mock-gst-udyam.provider';
import { GST_UDYAM_PROVIDER } from './gst-udyam.tokens';
import { MockAadhaarProvider } from './mock-aadhaar.provider';
import { AADHAAR_PROVIDER } from './aadhaar.tokens';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [HealthController, StakeholdersController, ApplicationsController, CertificatesController, DashboardController, FraudController, ScheduleController, FieldController, AlertsController, ComplianceController, LedgerController, IntegrationsController, AuthController, LookupsController, PaymentsController, AiController],
  providers: [PrismaService, FraudService, ScheduleService, ComplianceService, LedgerService, CertificatesService, PaymentsService, NotificationsService, EmailProvider, SmsProvider, WhatsAppProvider, PushProvider, AiService, IntegrationsService, LegacyImportService, { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider }, { provide: PAYMENT_GATEWAY_PROVIDER, useClass: MockPaymentGatewayProvider }, { provide: OCR_PROVIDER, useClass: MockOcrProvider }, { provide: INSTRUMENT_RECOGNITION_PROVIDER, useClass: MockInstrumentRecognitionProvider }, { provide: DIGILOCKER_PROVIDER, useClass: MockDigiLockerProvider }, { provide: UMANG_PROVIDER, useClass: MockUmangProvider }, { provide: GST_UDYAM_PROVIDER, useClass: MockGstUdyamProvider }, { provide: AADHAAR_PROVIDER, useClass: MockAadhaarProvider }, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }, { provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
