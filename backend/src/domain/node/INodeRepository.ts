export interface NodeHealth {
  id: string;
  name: string;
  status: string;
  lastPing: Date | null;
}

export interface INodeRepository {
  findAll(): Promise<NodeHealth[]>;
  findById(id: string): Promise<NodeHealth | null>;
  updateStatus(id: string, status: string, lastPing: Date): Promise<void>;
}
