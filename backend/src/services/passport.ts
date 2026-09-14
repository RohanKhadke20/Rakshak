import PDFDocument from 'pdfkit';

export interface CertificateData {
  hash: string;
  issuedTo: string;
  incidentId: string;
  timestamp: Date;
  details: string;
  reporterPhone: string;
}

/**
 * Generates the Digital Good Samaritan Passport PDF and pipes it to a writable stream.
 * 
 * @param data The passport certificate details
 * @param stream The writable stream (e.g., Express Response)
 */
export function generateGoodSamaritanPDF(data: CertificateData, stream: NodeJS.WritableStream): void {
  // Initialize A4 PDF document
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Pipe the document directly to the target stream
  doc.pipe(stream);

  // Draw decorative outer border (Slate color)
  doc.rect(20, 20, 555, 802)
     .lineWidth(2)
     .stroke('#1e293b');

  // Draw decorative inner border (Cyan accent color)
  doc.rect(25, 25, 545, 792)
     .lineWidth(1)
     .stroke('#06b6d4');

  // 1. Header (Agency labels)
  doc.y = 50;
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#64748b')
     .text('PROJECT RAKSHAK // NATIONAL EMERGENCY SECURITY LEDGER', { align: 'center' });
     
  doc.moveDown(0.4);
  doc.fontSize(8)
     .font('Helvetica')
     .text('IN ACCORDANCE WITH THE GOVERNMENT OF INDIA GUIDELINES (MoRTH 2016)', { align: 'center' });

  doc.moveDown(1.8);

  // 2. Shield Emblem representation
  doc.fillColor('#06b6d4')
     .fontSize(24)
     .font('Helvetica-Bold')
     .text('🛡️', { align: 'center' });

  doc.moveDown(0.8);

  // 3. Document Title
  doc.fillColor('#0f172a')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('DIGITAL GOOD SAMARITAN PASSPORT', { align: 'center' });

  doc.moveDown(0.4);
  doc.fontSize(9)
     .font('Helvetica-Oblique')
     .fillColor('#475569')
     .text('Official Emergency Assistance Verification Receipt', { align: 'center' });

  doc.moveDown(2);

  // 4. Citation Content
  doc.fontSize(11)
     .font('Helvetica')
     .fillColor('#1e293b')
     .text('This digital passport certifies and validates that', { align: 'center' });

  doc.moveDown(0.8);
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#06b6d4')
     .text(data.issuedTo, { align: 'center' });

  doc.moveDown(0.8);
  doc.fontSize(11)
     .font('Helvetica')
     .fillColor('#1e293b')
     .text(`has acted in the capacity of a Good Samaritan by reporting and assisting with`, { align: 'center' });
  doc.text(`Emergency Incident #${data.incidentId.substring(0, 8).toUpperCase()}`, { align: 'center' });

  doc.moveDown(2.2);

  // 5. Credentials Data Box
  const startX = 60;
  const startY = 360;
  const boxWidth = 475;
  const boxHeight = 110;

  // Draw Background Box
  doc.rect(startX, startY, boxWidth, boxHeight)
     .fillAndStroke('#f8fafc', '#cbd5e1');

  // Draw Box Labels
  doc.fillColor('#0f172a')
     .font('Helvetica-Bold')
     .fontSize(9);
  
  doc.text('INCIDENT ID:', startX + 15, startY + 15);
  doc.text('REPORTER PHONE:', startX + 15, startY + 35);
  doc.text('DATE RECORDED:', startX + 15, startY + 55);
  doc.text('VERIFICATION HASH:', startX + 15, startY + 75);

  // Draw Box Values
  doc.font('Helvetica')
     .fillColor('#334155');
  
  doc.text(data.incidentId, startX + 150, startY + 15);
  doc.text(data.reporterPhone, startX + 150, startY + 35);
  doc.text(data.timestamp.toUTCString(), startX + 150, startY + 55);
  
  // Highlight the Hash
  doc.fillColor('#0369a1')
     .font('Helvetica-Bold')
     .text(data.hash, startX + 150, startY + 75, { width: 310, lineBreak: true });

  // 6. MoRTH Legal Protections
  doc.fillColor('#0f172a')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('⚖️ LEGAL PROTECTION STATEMENT (MoRTH Guidelines, 2016)', 60, 500);

  doc.moveDown(0.5);
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#334155')
     .text(
       '1. Under Section 134A of the Motor Vehicles Act, a Good Samaritan shall not be liable for any civil or criminal action for any injury or death of a victim of an accident.\n' +
       '2. No police officer or medical doctor shall force a Good Samaritan to reveal their identity, phone number, address, or details.\n' +
       '3. Hospital authorities shall not demand payment or refuse emergency treatment to a victim because a Good Samaritan brought them in.\n' +
       '4. A Good Samaritan is allowed to leave the hospital or police station immediately after admission of the victim. Any police questioning can only be done at the Samaritan\'s consent, at their home, and must be conducted in a respectful manner.',
       { align: 'justify', width: 475, paragraphGap: 4 }
     );

  doc.moveDown(2);

  // 7. Signature stamp lines
  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor('#64748b')
     .text('SECURE LOG VERIFIER', 60, 680)
     .text('RAKSHAK AUTOMATED CA', 400, 680);

  // Lines
  doc.moveTo(60, 695).lineTo(160, 695).lineWidth(1).stroke('#cbd5e1');
  doc.moveTo(400, 695).lineTo(500, 695).lineWidth(1).stroke('#cbd5e1');

  doc.fontSize(7)
     .font('Helvetica')
     .text('Digital Ledger Seal Valid', 60, 700)
     .text('Section 134A Certified', 400, 700);

  // End Document
  doc.end();
}
