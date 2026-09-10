export interface UmangPushResult {
  externalReference: string;
  status: 'ACCEPTED' | 'REJECTED';
}

/**
 * Modeled on UMANG's Department Integration API: a department pushes a
 * service-status update (e.g. application status, certificate issuance) to
 * UMANG so it appears in the citizen's UMANG app. Swap
 * MockUmangProvider for a real implementation once UMANG department
 * credentials are available, by rebinding UMANG_PROVIDER in app.module.ts.
 */
export interface UmangProvider {
  pushServiceUpdate(entityType: string, entityId: string, payload: Record<string, unknown>): Promise<UmangPushResult>;
}
