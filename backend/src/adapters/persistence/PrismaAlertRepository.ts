import prisma from '../../db.js';
import { IAlertRepository, AlertSummary } from '../../domain/alert/IAlertRepository.js';

export class PrismaAlertRepository implements IAlertRepository {
  async findRecent(limit: number): Promise<AlertSummary[]> {
    const rows = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, nodeId: true, severity: true, resolved: true, createdAt: true },
    });
    return rows.map(r => ({ ...r }));
  }

  async findByNode(nodeId: string): Promise<AlertSummary[]> {
    const rows = await prisma.alert.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, nodeId: true, severity: true, resolved: true, createdAt: true },
    });
    return rows.map(r => ({ ...r }));
  }

  async markResolved(alertId: string): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: { resolved: true },
    });
  }
}
