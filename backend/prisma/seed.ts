import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default RAKSHAK roles, nodes, and response centers...');

  // Clean existing database records
  await prisma.goodSamaritanCertificate.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.responseNode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.node.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const hashedOperatorPassword = await bcrypt.hash('operator123', 10);
  const hashedPolicePassword = await bcrypt.hash('police123', 10);
  const hashedHospitalPassword = await bcrypt.hash('hospital123', 10);

  // Create Users
  const operator = await prisma.user.create({
    data: {
      email: 'operator@rakshak.local',
      password: hashedOperatorPassword,
      name: 'Rohan (Node Operator)',
      role: 'NODE_OPERATOR',
    },
  });

  const police = await prisma.user.create({
    data: {
      email: 'police@rakshak.local',
      password: hashedPolicePassword,
      name: 'Inspector Vijay (Police)',
      role: 'POLICE',
    },
  });

  const hospital = await prisma.user.create({
    data: {
      email: 'hospital@rakshak.local',
      password: hashedHospitalPassword,
      name: 'Dr. Alok (Hospital Admin)',
      role: 'HOSPITAL_ADMIN',
    },
  });

  console.log(`Created accounts:`);
  console.log(`- Operator: ${operator.email} (NODE_OPERATOR)`);
  console.log(`- Police: ${police.email} (POLICE)`);
  console.log(`- Hospital: ${hospital.email} (HOSPITAL_ADMIN)`);

  // Create telemetry nodes
  const node1 = await prisma.node.create({
    data: {
      name: 'DB-Primary-01',
      ipAddress: '10.0.1.12',
      status: 'ONLINE',
      cpuUsage: 42.5,
      ramUsage: 78.2,
      storageUsage: 64.1,
    },
  });

  const node2 = await prisma.node.create({
    data: {
      name: 'API-Gateway-EU',
      ipAddress: '10.0.1.45',
      status: 'ONLINE',
      cpuUsage: 18.2,
      ramUsage: 45.8,
      storageUsage: 31.2,
    },
  });

  const node3 = await prisma.node.create({
    data: {
      name: 'Auth-Service-Node',
      ipAddress: '10.0.2.14',
      status: 'WARNING',
      cpuUsage: 89.1,
      ramUsage: 92.4,
      storageUsage: 45.0,
    },
  });

  console.log('Telemetry nodes seeded successfully.');

  // Create initial alerts
  await prisma.alert.create({
    data: {
      nodeId: node3.id,
      severity: 'CRITICAL',
      message: 'CPU consumption exceeded 85% limit on Auth-Service-Node',
      resolved: false,
    },
  });

  // --- EMERGENCY RESPONSE NODES SEEDING (Mumbai Area Reference) ---
  console.log('Seeding emergency Response Nodes...');
  
  // 1. Police Station - Active, 0.9km from Mumbai reference (19.0760, 72.8777)
  await prisma.responseNode.create({
    data: {
      name: 'Mumbai Police Station - Kurla East',
      latitude: 19.0712,
      longitude: 72.8710,
      status: 'ACTIVE',
      contact: '022-26500100',
      nodeType: 'POLICE_STATION'
    }
  });

  // 2. Hospital - Active, 1.0km from Mumbai reference
  await prisma.responseNode.create({
    data: {
      name: 'Lilavati Emergency Care Annex',
      latitude: 19.0831,
      longitude: 72.8835,
      status: 'ACTIVE',
      contact: '022-26754000',
      nodeType: 'HOSPITAL'
    }
  });

  // 3. Fire Station - Active, 1.5km from Mumbai reference
  await prisma.responseNode.create({
    data: {
      name: 'Fire Station - Chembur Central',
      latitude: 19.0685,
      longitude: 72.8902,
      status: 'ACTIVE',
      contact: '022-25221100',
      nodeType: 'FIRE_STATION'
    }
  });

  // 4. Hospital - Active, 4.6km from Mumbai reference (outside 2km filter limit)
  await prisma.responseNode.create({
    data: {
      name: 'Bandra General Hospital',
      latitude: 19.0544,
      longitude: 72.8402,
      status: 'ACTIVE',
      contact: '022-26401010',
      nodeType: 'HOSPITAL'
    }
  });

  // 5. Police Station - INACTIVE, 0.3km from Mumbai reference (should be ignored by active filter)
  await prisma.responseNode.create({
    data: {
      name: 'Civil Defence Outpost - Kurla (Offline)',
      latitude: 19.0740,
      longitude: 72.8750,
      status: 'INACTIVE',
      contact: '022-26500199',
      nodeType: 'POLICE_STATION'
    }
  });

  console.log('Emergency response nodes seeded successfully.');
  console.log('Seeding completed! 🛡️');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
