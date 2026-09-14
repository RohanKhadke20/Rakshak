import express from 'express';
import cors from 'cors';
import prisma from './db.js';
import authRouter from './routes/auth.js';
import incidentsRouter from './routes/incidents.js';
import webhookRouter from './routes/webhook.js';
import passportRouter from './routes/passport.js';
import { verifyToken, requireRole } from './middleware/auth.js';

const app = reportApp();

function reportApp() {
  const expressApp = express();

  expressApp.use(cors());
  expressApp.use(express.json());

  // Public Auth, Incidents, Webhook & Passport Verification Routes
  expressApp.use('/api/auth', authRouter);
  expressApp.use('/api/incidents', incidentsRouter);
  expressApp.use('/api/webhook', webhookRouter);
  expressApp.use('/api/passport', passportRouter);

  // Health Check (Public)
  expressApp.get('/api/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'OK',
        timestamp: new Date(),
        database: 'CONNECTED',
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date(),
        database: 'DISCONNECTED',
        error: error.message || String(error),
      });
    }
  });

  // Monitored Nodes Routes (Secured - Node Operators & Police can manage, Hospital Admin can view)
  expressApp.get('/api/nodes', verifyToken, async (req, res) => {
    try {
      const nodes = await prisma.node.findMany({
        include: {
          alerts: {
            where: { resolved: false },
          },
        },
        orderBy: { name: 'asc' },
      });
      res.json(nodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Only Node Operators can register new nodes
  expressApp.post('/api/nodes', verifyToken, requireRole(['NODE_OPERATOR']), async (req, res) => {
    const { name, ipAddress, status, cpuUsage, ramUsage, storageUsage } = req.body;
    try {
      const node = await prisma.node.create({
        data: {
          name,
          ipAddress,
          status: status || 'ONLINE',
          cpuUsage: cpuUsage || 0.0,
          ramUsage: ramUsage || 0.0,
          storageUsage: storageUsage || 0.0,
        },
      });
      res.status(201).json(node);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  expressApp.get('/api/nodes/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
      const node = await prisma.node.findUnique({
        where: { id },
        include: { alerts: true },
      });
      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }
      res.json(node);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Only Node Operators or Police can update node status
  expressApp.patch('/api/nodes/:id', verifyToken, requireRole(['NODE_OPERATOR', 'POLICE']), async (req, res) => {
    const { id } = req.params;
    const { status, cpuUsage, ramUsage, storageUsage } = req.body;
    try {
      const node = await prisma.node.update({
        where: { id },
        data: {
          status,
          cpuUsage,
          ramUsage,
          storageUsage,
          lastPing: new Date(),
        },
      });
      res.json(node);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Alerts Routes (Secured - All authenticated roles can view alerts)
  expressApp.get('/api/alerts', verifyToken, async (req, res) => {
    try {
      const alerts = await prisma.alert.findMany({
        include: {
          node: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Police Personnel and Node Operators can create incident alerts
  expressApp.post('/api/alerts', verifyToken, requireRole(['NODE_OPERATOR', 'POLICE']), async (req, res) => {
    const { nodeId, severity, message } = req.body;
    try {
      const alert = await prisma.alert.create({
        data: {
          nodeId,
          severity: severity || 'INFO',
          message,
        },
      });
      res.status(201).json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Police Personnel and Node Operators can resolve alerts
  expressApp.patch('/api/alerts/:id/resolve', verifyToken, requireRole(['NODE_OPERATOR', 'POLICE']), async (req, res) => {
    const { id } = req.params;
    try {
      const alert = await prisma.alert.update({
        where: { id },
        data: { resolved: true },
      });
      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return expressApp;
}

export default app;
