import { IAlertRepository, AlertSummary } from './IAlertRepository.js';
import { Result, ok, err } from '../../lib/result.js';
import { logger } from '../../lib/logger.js';

export class AlertService {
  constructor(private readonly alertRepo: IAlertRepository) {}

  async getRecentAlerts(limit = 50): Promise<Result<AlertSummary[]>> {
    try {
      const alerts = await this.alertRepo.findRecent(limit);
      logger.info('Fetched recent alerts', { count: alerts.length });
      return ok(alerts);
    } catch (e: any) {
      logger.error('Failed to fetch alerts', { error: e.message });
      return err(e);
    }
  }

  async resolveAlert(alertId: string): Promise<Result<void>> {
    if (!alertId || typeof alertId !== 'string') {
      return err(new Error('ERR_INVALID_ALERT_ID: alertId must be a non-empty string'));
    }
    try {
      await this.alertRepo.markResolved(alertId);
      logger.info('Alert resolved', { alertId });
      return ok(undefined);
    } catch (e: any) {
      logger.error('Failed to resolve alert', { alertId, error: e.message });
      return err(e);
    }
  }

  classifySeverity(pingDeltaMs: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (pingDeltaMs > 300_000) return 'CRITICAL'; // >5 min offline
    if (pingDeltaMs > 120_000) return 'HIGH';     // >2 min
    if (pingDeltaMs > 60_000)  return 'MEDIUM';   // >1 min
    return 'LOW';
  }
}
