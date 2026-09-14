import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { calculateHaversineDistance } from '../utils/geo.js';

const router = Router();

// Unified Webhook for WhatsApp Business API and IVR provider payloads
router.post('/', async (req, res) => {
  const { provider, phone, latitude, longitude, details } = req.body;

  // 1. Basic validation
  if (!provider || !phone || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ 
      error: 'Missing required parameters: provider (whatsapp | ivr), phone, latitude, and longitude are required.' 
    });
  }

  const latNum = Number(latitude);
  const lonNum = Number(longitude);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return res.status(400).json({ error: 'latitude and longitude must be numbers.' });
  }

  const normalizedProvider = provider.toLowerCase();
  if (normalizedProvider !== 'whatsapp' && normalizedProvider !== 'ivr') {
    return res.status(400).json({ error: "provider must be either 'whatsapp' or 'ivr'." });
  }

  try {
    console.log(`[WEBHOOK] Incoming payload from ${provider.toUpperCase()} (Phone: ${phone}) at coordinates [${latNum}, ${lonNum}]`);

    // 2. Log the incident in the database
    const incidentDetails = details || `Simulated emergency reported via ${provider.toUpperCase()}`;
    const incident = await prisma.incident.create({
      data: {
        latitude: latNum,
        longitude: lonNum,
        reporterPhone: phone,
        details: incidentDetails,
        status: 'REPORTED',
      },
    });

    // 3. Issue a Good Samaritan Certificate in the database
    const certificateTimestamp = new Date();
    const hashSource = `${incident.id}-${phone}-${certificateTimestamp.getTime()}`;
    const hash = crypto.createHash('sha256').update(hashSource).digest('hex');

    const certificate = await prisma.goodSamaritanCertificate.create({
      data: {
        hash,
        issuedTo: `Samaritan (${phone.slice(-4)})`,
        incidentId: incident.id,
        timestamp: certificateTimestamp,
      },
    });

    // 4. Trigger Geofencing Lookup: find active ResponseNodes within 2.0 km
    const activeNodes = await prisma.responseNode.findMany({
      where: { status: 'ACTIVE' },
    });

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
          contact: node.contact,
          nodeType: node.nodeType,
          distance: parseFloat(distance.toFixed(3)),
        };
      })
      .filter((node) => node.distance <= 2.0)
      .sort((a, b) => a.distance - b.distance);

    // Select the nearest ResponseNode (if any within 2km, otherwise override to absolute closest active node)
    let dispatchedNode = null;
    let dispatchStatus = 'NO_RESPONDERS_IN_RANGE';

    if (nodesWithDistance.length > 0) {
      dispatchedNode = nodesWithDistance[0];
      dispatchStatus = 'DISPATCHED';
    } else if (activeNodes.length > 0) {
      // Fallback: If no node is within 2km geofence, dispatch the absolute closest active one
      const sortedAllActive = activeNodes
        .map((node) => ({
          id: node.id,
          name: node.name,
          latitude: node.latitude,
          longitude: node.longitude,
          contact: node.contact,
          nodeType: node.nodeType,
          distance: calculateHaversineDistance(
            { latitude: latNum, longitude: lonNum },
            { latitude: node.latitude, longitude: node.longitude }
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
      
      dispatchedNode = sortedAllActive[0];
      dispatchStatus = 'DISPATCHED_OVERRIDE_OUT_OF_GEOFENCE';
      console.log(`[GEOFENCE] No responder within 2km. Emergency override: Dispatched absolute closest node (${dispatchedNode.name}) at ${dispatchedNode.distance.toFixed(2)}km`);
    }

    // 5. Build Simulated Dispatch Payload sent to the nearest ResponseNode
    const simulatedDispatchPayload = {
      timestamp: new Date().toISOString(),
      incidentId: incident.id,
      location: { latitude: latNum, longitude: lonNum },
      alertDetails: incidentDetails,
      reporterContact: phone,
      distanceKm: dispatchedNode ? parseFloat(dispatchedNode.distance.toFixed(3)) : null,
      instruction: `URGENT: Dispatch emergency unit immediately to [${latNum}, ${lonNum}].`
    };

    if (dispatchedNode) {
      console.log(`[DISPATCH] Simulated alert sent to ${dispatchedNode.name} (${dispatchedNode.contact}) for Incident ID: ${incident.id}`);
    }

    // 6. Build the WhatsApp Reply (First-aid instructions & Legal Protections)
    const firstAidInstructions = [
      '1. Ensure the scene is safe for you and the victim before helping.',
      '2. Check for responsiveness: tap the shoulders and shout "Are you okay?".',
      '3. If bleeding heavily, apply firm, direct pressure to the wound with a clean cloth or bandage.',
      '4. Keep the patient warm and lying flat. Do not move them unless they are in immediate danger (fire, traffic, etc.).',
      '5. Monitor breathing and stay calm. Help is on the way.'
    ].join('\n');

    const legalProtections = [
      '⚖️ LEGAL PROTECTION SECURED (Good Samaritan Law):',
      'Under Section 134A of the Motor Vehicles Act, you are fully protected from any civil or criminal liability.',
      '- You are NOT obligated to stay at the hospital or pay admission fees.',
      '- You are NOT required to disclose your identity to police or medical staff.',
      'Your digital certificate of honor has been registered on the RAKSHAK secure ledger.',
      `Verification Hash: ${hash}`
    ].join('\n');

    const whatsappReplyText = [
      `🛡️ RAKSHAK EMERGENCY ACTIVE RESPONSE`,
      `==================================`,
      dispatchedNode 
        ? `🚨 Nearest responder (${dispatchedNode.name}) has been dispatched to your location (~${dispatchedNode.distance.toFixed(2)} km away).`
        : `⚠️ Your emergency report is logged. Finding nearest available responder outside standard geofence.`,
      `\n📋 STEP-BY-STEP FIRST AID INSTRUCTIONS:`,
      firstAidInstructions,
      `\n${legalProtections}`,
      `==================================`,
      `Thank you for taking action to save a life.`
    ].join('\n');

    res.status(200).json({
      success: true,
      provider: normalizedProvider,
      incidentId: incident.id,
      dispatch: {
        status: dispatchStatus,
        nodeId: dispatchedNode ? dispatchedNode.id : null,
        nodeName: dispatchedNode ? dispatchedNode.name : null,
        nodeContact: dispatchedNode ? dispatchedNode.contact : null,
        payload: simulatedDispatchPayload
      },
      whatsappResponse: {
        to: phone,
        message: whatsappReplyText,
        certificate: {
          issuedTo: certificate.issuedTo,
          hash: certificate.hash,
          timestamp: certificate.timestamp
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'An error occurred during webhook processing.' 
    });
  }
});

export default router;
