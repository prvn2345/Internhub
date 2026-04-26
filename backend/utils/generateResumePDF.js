/**
 * generateResumePDF
 * Builds a professional PDF resume from student data using PDFKit.
 * Returns a Buffer that can be uploaded to Cloudinary or streamed.
 */

const PDFDocument = require('pdfkit');

const BRAND_COLOR  = '#4f46e5'; // indigo-600
const DARK_TEXT    = '#111827';
const MUTED_TEXT   = '#6b7280';
const LIGHT_BG     = '#f3f4f6';
const LINE_COLOR   = '#e5e7eb';

/**
 * @param {Object} data - Resume form data
 * @returns {Promise<Buffer>} - PDF as a Buffer
 */
const generateResumePDF = (data) =>
  new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const usableW = pageW - 100; // left + right margin = 100

    /* ── Helper: section heading ── */
    const sectionHeading = (title) => {
      doc.moveDown(0.5);
      doc
        .fillColor(BRAND_COLOR)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(title.toUpperCase(), { characterSpacing: 1 });
      doc
        .moveTo(50, doc.y + 2)
        .lineTo(50 + usableW, doc.y + 2)
        .strokeColor(BRAND_COLOR)
        .lineWidth(1.5)
        .stroke();
      doc.moveDown(0.4);
    };

    /* ── Helper: key-value row ── */
    const kvRow = (label, value) => {
      if (!value) return;
      doc
        .fillColor(MUTED_TEXT).fontSize(9).font('Helvetica-Bold')
        .text(label + ':', { continued: true, width: 120 })
        .fillColor(DARK_TEXT).font('Helvetica')
        .text(' ' + value);
    };

    /* ══════════════════════════════════════════════
       HEADER — Name + contact
    ══════════════════════════════════════════════ */
    doc
      .fillColor(BRAND_COLOR)
      .fontSize(26)
      .font('Helvetica-Bold')
      .text(data.fullName || 'Full Name', { align: 'center' });

    doc.moveDown(0.2);

    const contactParts = [
      data.email,
      data.phone,
      data.location,
    ].filter(Boolean);

    doc
      .fillColor(MUTED_TEXT)
      .fontSize(9)
      .font('Helvetica')
      .text(contactParts.join('  •  '), { align: 'center' });

    if (data.linkedin || data.portfolio) {
      const links = [data.linkedin, data.portfolio].filter(Boolean).join('  •  ');
      doc.moveDown(0.1)
        .fillColor(BRAND_COLOR)
        .fontSize(9)
        .text(links, { align: 'center' });
    }

    /* Divider */
    doc.moveDown(0.5)
      .moveTo(50, doc.y)
      .lineTo(50 + usableW, doc.y)
      .strokeColor(BRAND_COLOR)
      .lineWidth(2)
      .stroke();
    doc.moveDown(0.5);

    /* ══════════════════════════════════════════════
       OBJECTIVE / SUMMARY
    ══════════════════════════════════════════════ */
    if (data.objective) {
      sectionHeading('Career Objective');
      doc
        .fillColor(DARK_TEXT)
        .fontSize(10)
        .font('Helvetica')
        .text(data.objective, { align: 'justify', lineGap: 3 });
    }

    /* ══════════════════════════════════════════════
       EDUCATION
    ══════════════════════════════════════════════ */
    if (data.education?.length) {
      sectionHeading('Education');
      data.education.forEach((edu) => {
        doc
          .fillColor(DARK_TEXT).fontSize(10).font('Helvetica-Bold')
          .text(edu.degree || '', { continued: !!edu.year })
          .fillColor(MUTED_TEXT).font('Helvetica')
          .text(edu.year ? `  (${edu.year})` : '');
        doc
          .fillColor(MUTED_TEXT).fontSize(9)
          .text(edu.institution || '');
        if (edu.grade) {
          doc.fillColor(MUTED_TEXT).fontSize(9).text(`Grade / CGPA: ${edu.grade}`);
        }
        doc.moveDown(0.3);
      });
    }

    /* ══════════════════════════════════════════════
       EXPERIENCE
    ══════════════════════════════════════════════ */
    if (data.experience?.length) {
      sectionHeading('Work Experience');
      data.experience.forEach((exp) => {
        doc
          .fillColor(DARK_TEXT).fontSize(10).font('Helvetica-Bold')
          .text(exp.title || '', { continued: true })
          .fillColor(MUTED_TEXT).font('Helvetica')
          .text(exp.company ? `  —  ${exp.company}` : '');
        if (exp.duration) {
          doc.fillColor(MUTED_TEXT).fontSize(9).text(exp.duration);
        }
        if (exp.description) {
          doc
            .fillColor(DARK_TEXT).fontSize(9).font('Helvetica')
            .text(exp.description, { lineGap: 2, indent: 10 });
        }
        doc.moveDown(0.3);
      });
    }

    /* ══════════════════════════════════════════════
       SKILLS
    ══════════════════════════════════════════════ */
    if (data.skills?.length) {
      sectionHeading('Skills');
      const skillLine = data.skills.join('   •   ');
      doc
        .fillColor(DARK_TEXT).fontSize(10).font('Helvetica')
        .text(skillLine, { lineGap: 3 });
    }

    /* ══════════════════════════════════════════════
       PROJECTS
    ══════════════════════════════════════════════ */
    if (data.projects?.length) {
      sectionHeading('Projects');
      data.projects.forEach((proj) => {
        doc
          .fillColor(DARK_TEXT).fontSize(10).font('Helvetica-Bold')
          .text(proj.name || '');
        if (proj.description) {
          doc
            .fillColor(DARK_TEXT).fontSize(9).font('Helvetica')
            .text(proj.description, { lineGap: 2, indent: 10 });
        }
        if (proj.link) {
          doc.fillColor(BRAND_COLOR).fontSize(9).text(proj.link, { indent: 10 });
        }
        doc.moveDown(0.3);
      });
    }

    /* ══════════════════════════════════════════════
       CERTIFICATIONS
    ══════════════════════════════════════════════ */
    if (data.certifications?.length) {
      sectionHeading('Certifications');
      data.certifications.forEach((cert) => {
        doc
          .fillColor(DARK_TEXT).fontSize(10).font('Helvetica')
          .text(`• ${cert}`, { lineGap: 2 });
      });
    }

    /* ══════════════════════════════════════════════
       LANGUAGES
    ══════════════════════════════════════════════ */
    if (data.languages?.length) {
      sectionHeading('Languages');
      doc
        .fillColor(DARK_TEXT).fontSize(10).font('Helvetica')
        .text(data.languages.join('   •   '));
    }

    /* ══════════════════════════════════════════════
       FOOTER
    ══════════════════════════════════════════════ */
    doc
      .moveDown(1)
      .fillColor(MUTED_TEXT)
      .fontSize(8)
      .text('Generated by CareerBridge Premium', { align: 'center' });

    doc.end();
  });

module.exports = generateResumePDF;
