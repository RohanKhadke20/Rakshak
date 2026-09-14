export interface AlertSummary {
  id: string;
  nodeId: string;
  severity: string;
  resolved: boolean;
  createdAt: Date;
}

export interface IAlertRepository {
  findRecent(limit: number): Promise<AlertSummary[]>;
  findByNode(nodeId: string): Promise<AlertSummary[]>;
  markResolved(alertId: string): Promise<void>;
}
