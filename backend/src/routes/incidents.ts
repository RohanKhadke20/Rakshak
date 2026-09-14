import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { calculateHaversineDistance } from '../utils/geo.js';

const router = Router();

// Endpoint to report an incident
router.post('/report', async (req, res) => {
  const { latitude, longitude, reporterPhone, details, reporterName } = req.body;

  if (latitude === undefined || longitude === undefined || !reporterPhone || !details) {
    return res.status(400).json({ error: 'latitude, longitude, reporterPhone, and details are required.' });
  }

  const latNum = Number(latitude);
  const lonNum = Number(longitude);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return res.status(400).json({ error: 'latitude and longitude must be numbers.' });
  }

  try {
    // 1. Create the Incident record in the database
    const incident = await prisma.incident.create({
      data: {
        latitude: latNum,
        longitude: lonNum,
        reporterPhone,
        details,
        status: 'REPORTED',
      },
    });

    console.log(`Incident logged successfully: ID=${incident.id} at [${latNum}, ${lonNum}]`);

    // 2. Generate a Good Samaritan Certificate automatically for the reporter
    const issuedTo = reporterName || `Good Samaritan (${reporterPhone.slice(-4)})`;
    const certificateTimestamp = new Date();
    
    // Hash created using SHA-256 of incident ID + reporter phone + timestamp
    const hashSource = `${incident.id}-${reporterPhone}-${certificateTimestamp.getTime()}`;
    const hash = crypto.createHash('sha256').update(hashSource).digest('hex');

    const certificate = await prisma.goodSamaritanCertificate.create({
      data: {
        hash,
        issuedTo,
        incidentId: incident.id,
        timestamp: certificateTimestamp,
      },
    });

    console.log(`Good Samaritan Certificate issued: Hash=${hash.substring(0, 10)}...`);

    // 3. Fetch all active ResponseNodes
    const activeNodes = await prisma.responseNode.findMany({
      where: { status: 'ACTIVE' },
    });

    // 4. Calculate distances, filter by 2km radius, sort, and get top 3
    const nodesWithDistance = activeNodes
      .map((node) => {
        const distance = calculateHaversineDistance(
          { latitude: latNum, longitude: lonNum },
          { latitude: node.latitude, longitude: node.longitude }
        );
        return {
          id: node.id,
          name: node.name,
          latitude: node.latitude,
          longitude: node.longitude,
          status: node.status,
          contact: node.contact,
          nodeType: node.nodeType,
          distance: parseFloat(distance.toFixed(3)), // Distance in km, rounded to 3 decimals
        };
      })
      .filter((node) => node.distance <= 2.0) // Filter within 2 kilometers
      .sort((a, b) => a.distance - b.distance) // Sort ascending by distance
      .slice(0, 3); // Take top 3 closest

    res.status(201).json({
      message: 'Incident logged successfully. Nearest response nodes located.',
      incident,
      certificate: {
        id: certificate.id,
        hash: certificate.hash,
        issuedTo: certificate.issuedTo,
        timestamp: certificate.timestamp,
      },
      closestResponseNodes: nodesWithDistance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'An error occurred while reporting the incident.' });
  }
});

export default router;
