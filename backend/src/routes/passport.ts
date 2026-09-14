import { Router } from 'express';
import prisma from '../db.js';
import { generateGoodSamaritanPDF, CertificateData } from '../services/passport.js';

const router = Router();

// Endpoint: GET /api/passport/verify/:hash
// Publicly allows police officers, medical staff, or citizens to verify a Good Samaritan certificate
router.get('/verify/:hash', async (req, res) => {
  const { hash } = req.params;

  if (!hash) {
    return res.status(400).json({ isValid: false, error: 'Certificate hash is required.' });
  }

  try {
    // Look up certificate in the database, including the associated incident details
    const certificate = await prisma.goodSamaritanCertificate.findUnique({
      where: { hash },
      include: {
        incident: true
      }
    });

    if (!certificate) {
      return res.status(200).json({ 
        isValid: false, 
        error: 'No registered Good Samaritan certificate matches this hash. Document is invalid or forged.' 
      });
    }

    res.json({
      isValid: true,
      message: 'Certificate successfully verified against the RAKSHAK ledger.',
      certificate: {
        id: certificate.id,
        hash: certificate.hash,
        issuedTo: certificate.issuedTo,
        timestamp: certificate.timestamp
      },
      incident: {
        id: certificate.incident.id,
        status: certificate.incident.status,
        latitude: certificate.incident.latitude,
        longitude: certificate.incident.longitude,
        reporterPhone: certificate.incident.reporterPhone.replace(/.(?=.{4})/g, '*'), // Mask phone for privacy
        details: certificate.incident.details,
        createdAt: certificate.incident.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      isValid: false, 
      error: error.message || 'An error occurred during verification.' 
    });
  }
});

// Endpoint: GET /api/passport/download/:hash
// Allows downloading the generated PDF certificate directly from the server
router.get('/download/:hash', async (req, res) => {
  const { hash } = req.params;

  if (!hash) {
    return res.status(400).json({ error: 'Certificate hash is required.' });
  }

  try {
    // Look up certificate in the database
    const certificate = await prisma.goodSamaritanCertificate.findUnique({
      where: { hash },
      include: {
        incident: true
      }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Good Samaritan certificate not found.' });
    }

    // Prepare metadata for pdf template
    const pdfData: CertificateData = {
      hash: certificate.hash,
      issuedTo: certificate.issuedTo,
      incidentId: certificate.incidentId,
      timestamp: certificate.timestamp,
      details: certificate.incident.details,
      reporterPhone: certificate.incident.reporterPhone.replace(/.(?=.{4})/g, '*') // Mask phone for privacy
    };

    // Configure Express headers to download a PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename="good-samaritan-passport-${hash.substring(0, 8)}.pdf"`
    );

    // Generate PDF and stream it directly back to the HTTP Response
    generateGoodSamaritanPDF(pdfData, res);

  } catch (error: any) {
    console.error('PDF Generation failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while generating the PDF certificate.' });
    }
  }
});

export default router;
