/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Automated Diagram Generation Engine for Personal Library.
 *
 * WHAT: Generates high-fidelity vector SVG, rasterized 2x PNG (via @resvg/resvg-js),
 * and multi-page enterprise architectural PDF specification (via pdfkit) for the
 * Camunda BPMN 2.0 Document Ingestion & RAG Pipeline.
 *
 * WHY: Provides architects, compliance auditors, and engineers with instant,
 * downloadable visual assets for Camunda Modeler, documentation portals, and enterprise review.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import { Resvg } from '@resvg/resvg-js';
// @ts-ignore
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Generates the vector SVG string representation of the Camunda BPMN 2.0 process.
 *
 * WHAT: Emits an SVG document containing a collaboration pool, 4 swimlanes, start/end events,
 * service/user/send tasks, exclusive and parallel gateways, and orthogonal sequence flow arrows.
 * WHY: Provides an infinitely scalable, standards-compliant vector graphic for embedding in web views
 * and converting into high-density raster images.
 *
 * @returns Fully formatted SVG markup string.
 */
export function generateBpmnSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1740 820" width="1740" height="820" style="background:#f8fafc; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <!-- Arrow Marker -->
    <marker id="bpmn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#334155" />
    </marker>
    <!-- Highlight Arrow Marker -->
    <marker id="bpmn-arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0070f2" />
    </marker>
    <!-- Subtle Box Shadow -->
    <filter id="task-shadow" x="-5%" y="-5%" width="115%" height="120%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.06" />
    </filter>
  </defs>

  <!-- Title & Metadata Banner -->
  <rect x="15" y="10" width="1710" height="45" rx="6" fill="#0f172a" />
  <text x="35" y="38" font-size="16" font-weight="700" fill="#ffffff" letter-spacing="-0.3">Personal Library · Camunda BPMN 2.0 Process Definition</text>
  <text x="630" y="38" font-size="12" font-weight="500" fill="#94a3b8">Process ID: Process_DocumentIngestionRAG · Specification Version: 1.0.0 · Dual AI &amp; Qdrant RAG</text>
  <rect x="1570" y="21" width="140" height="23" rx="4" fill="#0070f2" />
  <text x="1640" y="37" font-size="11" font-weight="600" fill="#ffffff" text-anchor="middle">Camunda 7 &amp; 8 Ready</text>

  <!-- Master Collaboration Pool -->
  <rect x="15" y="65" width="1710" height="740" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  
  <!-- Pool Header (Left Vertical Strip) -->
  <rect x="15" y="65" width="45" height="740" rx="8" fill="#1e293b" />
  <text x="-435" y="42" font-size="14" font-weight="700" fill="#ffffff" transform="rotate(-90)" text-anchor="middle" letter-spacing="1">
    PERSONAL LIBRARY - ENTERPRISE DOCUMENT INGESTION &amp; RAG ENGINE
  </text>

  <!-- ======================================================== -->
  <!-- SWIMLANES                                                -->
  <!-- ======================================================== -->

  <!-- Lane 1: SAP UI5 Client & REST Ingestion -->
  <rect x="60" y="65" width="1665" height="175" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <rect x="60" y="65" width="35" height="175" fill="#3b82f6" fill-opacity="0.12" stroke="#e2e8f0" stroke-width="1" />
  <text x="-152" y="82" font-size="11" font-weight="700" fill="#1e40af" transform="rotate(-90)" text-anchor="middle">
    SAP UI5 Client &amp; Ingestion
  </text>

  <!-- Lane 2: Spring AI Orchestration Tier -->
  <rect x="60" y="240" width="1665" height="200" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
  <rect x="60" y="240" width="35" height="200" fill="#6366f1" fill-opacity="0.12" stroke="#e2e8f0" stroke-width="1" />
  <text x="-340" y="82" font-size="11" font-weight="700" fill="#4338ca" transform="rotate(-90)" text-anchor="middle">
    Spring AI Orchestrator Tier
  </text>

  <!-- Lane 3: Ollama AI Models -->
  <rect x="60" y="440" width="1665" height="200" fill="#fafafa" stroke="#e2e8f0" stroke-width="1.5" />
  <rect x="60" y="440" width="35" height="200" fill="#059669" fill-opacity="0.12" stroke="#e2e8f0" stroke-width="1" />
  <text x="-540" y="82" font-size="11" font-weight="700" fill="#047857" transform="rotate(-90)" text-anchor="middle">
    Ollama AI Models (Spring AI)
  </text>

  <!-- Lane 4: Qdrant Vector Database -->
  <rect x="60" y="640" width="1665" height="165" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <rect x="60" y="640" width="35" height="165" fill="#8b5cf6" fill-opacity="0.12" stroke="#e2e8f0" stroke-width="1" />
  <text x="-722" y="82" font-size="11" font-weight="700" fill="#6d28d9" transform="rotate(-90)" text-anchor="middle">
    Qdrant Vector Database
  </text>

  <!-- ======================================================== -->
  <!-- NODES & TASKS                                            -->
  <!-- ======================================================== -->

  <!-- Start Event: Document Upload Received (Lane 1) -->
  <circle cx="130" cy="150" r="20" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5" />
  <polygon points="124,142 139,150 124,158" fill="#10b981" />
  <text x="130" y="190" font-size="10.5" font-weight="600" fill="#1e293b" text-anchor="middle">Document Upload</text>
  <text x="130" y="204" font-size="9.5" font-weight="400" fill="#64748b" text-anchor="middle">Received (UI/REST)</text>

  <!-- Service Task: Extract Text & Infer BibTeX (Lane 2) -->
  <rect x="200" y="300" width="140" height="80" rx="8" fill="#ffffff" stroke="#0070f2" stroke-width="2" filter="url(#task-shadow)" />
  <!-- Service Task Icon (Gears) -->
  <circle cx="218" cy="318" r="8" fill="#eff6ff" stroke="#0070f2" stroke-width="1.2" />
  <path d="M 216 314 L 220 314 M 216 322 L 220 322 M 214 316 L 214 320 M 222 316 L 222 320" stroke="#0070f2" stroke-width="1.5" />
  <text x="232" y="322" font-size="9" font-weight="700" fill="#0070f2" letter-spacing="0.5">SERVICE TASK</text>
  <text x="270" y="342" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Extract Text &amp;</text>
  <text x="270" y="356" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Infer BibTeX</text>
  <rect x="210" y="365" width="120" height="12" rx="3" fill="#f1f5f9" />
  <text x="270" y="374" font-size="8" font-family="monospace" font-weight="500" fill="#475569" text-anchor="middle">\${bibTeXExtractionDelegate}</text>

  <!-- Service Task: Validate BibTeX Quality & Key (Lane 2) -->
  <rect x="380" y="300" width="140" height="80" rx="8" fill="#ffffff" stroke="#6366f1" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="398" cy="318" r="8" fill="#eef2ff" stroke="#6366f1" stroke-width="1.2" />
  <path d="M 396 314 L 400 314 M 396 322 L 400 322 M 394 316 L 394 320 M 402 316 L 402 320" stroke="#6366f1" stroke-width="1.5" />
  <text x="412" y="322" font-size="9" font-weight="700" fill="#6366f1" letter-spacing="0.5">SERVICE TASK</text>
  <text x="450" y="342" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Validate BibTeX</text>
  <text x="450" y="356" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Quality &amp; Key</text>
  <rect x="390" y="365" width="120" height="12" rx="3" fill="#f1f5f9" />
  <text x="450" y="374" font-size="8" font-family="monospace" font-weight="500" fill="#475569" text-anchor="middle">\${bibTeXValidationDelegate}</text>

  <!-- Exclusive Gateway: Metadata Valid? (Lane 2) -->
  <polygon points="565,340 590,315 615,340 590,365" fill="#fef3c7" stroke="#d97706" stroke-width="2.5" />
  <text x="590" y="345" font-size="15" font-weight="800" fill="#b45309" text-anchor="middle">✕</text>
  <text x="590" y="382" font-size="10" font-weight="600" fill="#1e293b" text-anchor="middle">Metadata</text>
  <text x="590" y="394" font-size="10" font-weight="600" fill="#1e293b" text-anchor="middle">Complete?</text>

  <!-- User Task: Librarian Review (Lane 1) -->
  <rect x="520" y="110" width="140" height="80" rx="8" fill="#ffffff" stroke="#8b5cf6" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="538" cy="128" r="8" fill="#f5f3ff" stroke="#8b5cf6" stroke-width="1.2" />
  <circle cx="538" cy="126" r="3" fill="#8b5cf6" />
  <path d="M 533 133 C 533 130, 543 130, 543 133" fill="none" stroke="#8b5cf6" stroke-width="1.2" />
  <text x="552" y="132" font-size="9" font-weight="700" fill="#8b5cf6" letter-spacing="0.5">USER TASK</text>
  <text x="590" y="152" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Review &amp; Correct</text>
  <text x="590" y="166" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Metadata</text>
  <rect x="530" y="174" width="120" height="12" rx="3" fill="#f1f5f9" />
  <text x="590" y="183" font-size="8" font-family="monospace" font-weight="500" fill="#6d28d9" text-anchor="middle">LIBRARY_ADMIN Group</text>

  <!-- Parallel Fork Gateway (Lane 2) -->
  <polygon points="665,340 690,315 715,340 690,365" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5" />
  <text x="690" y="347" font-size="18" font-weight="800" fill="#15803d" text-anchor="middle">+</text>
  <text x="690" y="385" font-size="10" font-weight="700" fill="#15803d" text-anchor="middle">Fork Dual AI &amp;</text>
  <text x="690" y="397" font-size="10" font-weight="700" fill="#15803d" text-anchor="middle">Vectorization</text>

  <!-- Branch A: Ollama Llama 3.3 (Lane 3) -->
  <rect x="760" y="465" width="170" height="75" rx="8" fill="#ffffff" stroke="#2563eb" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="778" cy="483" r="8" fill="#eff6ff" stroke="#2563eb" stroke-width="1.2" />
  <text x="792" y="487" font-size="9" font-weight="700" fill="#2563eb">ASYNC SERVICE TASK</text>
  <text x="845" y="506" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">Llama 3.3 (70B Instruct)</text>
  <text x="845" y="520" font-size="10" font-weight="500" fill="#475569" text-anchor="middle">Analytical Deep Dive</text>
  <rect x="770" y="525" width="150" height="12" rx="3" fill="#eff6ff" />
  <text x="845" y="534" font-size="8" font-family="monospace" font-weight="600" fill="#1d4ed8" text-anchor="middle">Retries: R3/PT10S · Spring AI</text>

  <!-- Branch B: Ollama Mistral Large (Lane 3) -->
  <rect x="760" y="555" width="170" height="75" rx="8" fill="#ffffff" stroke="#059669" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="778" cy="573" r="8" fill="#ecfdf5" stroke="#059669" stroke-width="1.2" />
  <text x="792" y="577" font-size="9" font-weight="700" fill="#059669">ASYNC SERVICE TASK</text>
  <text x="845" y="596" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">Mistral Large (2411)</text>
  <text x="845" y="610" font-size="10" font-weight="500" fill="#475569" text-anchor="middle">Executive Synthesis</text>
  <rect x="770" y="615" width="150" height="12" rx="3" fill="#ecfdf5" />
  <text x="845" y="624" font-size="8" font-family="monospace" font-weight="600" fill="#047857" text-anchor="middle">Retries: R3/PT10S · Spring AI</text>

  <!-- Branch C: Qdrant Vector Chunk & Embed (Lane 4) -->
  <rect x="760" y="685" width="170" height="75" rx="8" fill="#ffffff" stroke="#7c3aed" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="778" cy="703" r="8" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.2" />
  <text x="792" y="707" font-size="9" font-weight="700" fill="#7c3aed">ASYNC SERVICE TASK</text>
  <text x="845" y="726" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">Paragraph Chunking</text>
  <text x="845" y="740" font-size="10" font-weight="500" fill="#475569" text-anchor="middle">&amp; Qdrant Vector Upsert</text>
  <rect x="770" y="745" width="150" height="12" rx="3" fill="#f5f3ff" />
  <text x="845" y="754" font-size="8" font-family="monospace" font-weight="600" fill="#6d28d9" text-anchor="middle">collection: library_embeddings</text>

  <!-- Parallel Join Gateway (Lane 2) -->
  <polygon points="985,340 1010,315 1035,340 1010,365" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5" />
  <text x="1010" y="347" font-size="18" font-weight="800" fill="#15803d" text-anchor="middle">+</text>
  <text x="1010" y="385" font-size="10" font-weight="700" fill="#15803d" text-anchor="middle">Join AI Telemetry</text>
  <text x="1010" y="397" font-size="10" font-weight="700" fill="#15803d" text-anchor="middle">&amp; Vector Chunks</text>

  <!-- Service Task: Persist Document Record in MongoDB (Lane 2) -->
  <rect x="1080" y="300" width="145" height="80" rx="8" fill="#ffffff" stroke="#0d9488" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="1098" cy="318" r="8" fill="#f0fdfa" stroke="#0d9488" stroke-width="1.2" />
  <text x="1112" y="322" font-size="9" font-weight="700" fill="#0d9488" letter-spacing="0.5">SERVICE TASK</text>
  <text x="1152" y="342" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Persist Entity</text>
  <text x="1152" y="356" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">in MongoDB</text>
  <rect x="1090" y="365" width="125" height="12" rx="3" fill="#f1f5f9" />
  <text x="1152" y="374" font-size="8" font-family="monospace" font-weight="500" fill="#0f766e" text-anchor="middle">\${documentPersistenceDelegate}</text>

  <!-- Service Task: Keycloak Security Audit (Lane 2) -->
  <rect x="1270" y="300" width="145" height="80" rx="8" fill="#ffffff" stroke="#0284c7" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="1288" cy="318" r="8" fill="#f0f9ff" stroke="#0284c7" stroke-width="1.2" />
  <text x="1302" y="322" font-size="9" font-weight="700" fill="#0284c7" letter-spacing="0.5">SERVICE TASK</text>
  <text x="1342" y="342" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Keycloak Security</text>
  <text x="1342" y="356" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Audit Logging</text>
  <rect x="1280" y="365" width="125" height="12" rx="3" fill="#f1f5f9" />
  <text x="1342" y="374" font-size="8" font-family="monospace" font-weight="500" fill="#0369a1" text-anchor="middle">\${securityAuditDelegate}</text>

  <!-- Send Task: Broadcast WebSocket / EventBus Notification (Lane 1) -->
  <rect x="1460" y="110" width="145" height="80" rx="8" fill="#ffffff" stroke="#16a34a" stroke-width="2" filter="url(#task-shadow)" />
  <circle cx="1478" cy="128" r="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.2" />
  <path d="M 1474 125 L 1482 131 L 1474 131 z" fill="#16a34a" />
  <text x="1492" y="132" font-size="9" font-weight="700" fill="#16a34a" letter-spacing="0.5">SEND TASK</text>
  <text x="1532" y="152" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Broadcast Ingestion</text>
  <text x="1532" y="166" font-size="11" font-weight="600" fill="#0f172a" text-anchor="middle">Complete Notification</text>
  <rect x="1470" y="174" width="125" height="12" rx="3" fill="#f1f5f9" />
  <text x="1532" y="183" font-size="8" font-family="monospace" font-weight="500" fill="#15803d" text-anchor="middle">EventBus / WebSocket</text>

  <!-- End Event: Document Ready (Lane 1) -->
  <circle cx="1660" cy="150" r="20" fill="#f8fafc" stroke="#dc2626" stroke-width="4.5" />
  <circle cx="1660" cy="150" r="11" fill="#dc2626" />
  <text x="1660" y="190" font-size="10.5" font-weight="700" fill="#1e293b" text-anchor="middle">Document Ready</text>
  <text x="1660" y="204" font-size="9.5" font-weight="500" fill="#16a34a" text-anchor="middle">&amp; RAG Searchable</text>

  <!-- ======================================================== -->
  <!-- TRANSITIONS / SEQUENCE FLOWS                             -->
  <!-- ======================================================== -->

  <!-- Start -> Extract -->
  <path d="M 150 150 L 175 150 L 175 340 L 200 340" fill="none" stroke="#334155" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Extract -> Validate -->
  <path d="M 340 340 L 380 340" fill="none" stroke="#334155" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Validate -> Gateway -->
  <path d="M 520 340 L 565 340" fill="none" stroke="#334155" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Gateway -> Fork (Valid) -->
  <path d="M 615 340 L 665 340" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#bpmn-arrow)" />
  <text x="640" y="333" font-size="10" font-weight="700" fill="#16a34a" text-anchor="middle">[Valid]</text>

  <!-- Gateway -> Review User Task (Invalid) -->
  <path d="M 590 315 L 590 190" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />
  <text x="605" y="255" font-size="9.5" font-weight="600" fill="#dc2626">[isValid == false]</text>

  <!-- Review User Task -> Validate (Loop back) -->
  <path d="M 520 150 L 450 150 L 450 300" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-dasharray="4 3" marker-end="url(#bpmn-arrow)" />

  <!-- Fork -> Llama (Branch A) -->
  <path d="M 690 365 L 690 502 L 760 502" fill="none" stroke="#2563eb" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Fork -> Mistral (Branch B) -->
  <path d="M 690 365 L 690 592 L 760 592" fill="none" stroke="#059669" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Fork -> Qdrant (Branch C) -->
  <path d="M 690 365 L 690 722 L 760 722" fill="none" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Llama -> Join -->
  <path d="M 930 502 L 1010 502 L 1010 365" fill="none" stroke="#2563eb" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Mistral -> Join -->
  <path d="M 930 592 L 1010 592 L 1010 365" fill="none" stroke="#059669" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Qdrant -> Join -->
  <path d="M 930 722 L 1010 722 L 1010 365" fill="none" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Join -> Persist -->
  <path d="M 1035 340 L 1080 340" fill="none" stroke="#334155" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Persist -> KeycloakAudit -->
  <path d="M 1225 340 L 1270 340" fill="none" stroke="#334155" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- KeycloakAudit -> Broadcast Send Task -->
  <path d="M 1415 340 L 1435 340 L 1435 150 L 1460 150" fill="none" stroke="#334155" stroke-width="1.8" marker-end="url(#bpmn-arrow)" />

  <!-- Broadcast Send Task -> End Event -->
  <path d="M 1605 150 L 1640 150" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#bpmn-arrow)" />

</svg>`;
}

/**
 * Converts the generated SVG into a high-density PNG raster image using Resvg.
 *
 * WHAT: Instantiates `Resvg` with width 3480px (2x supersampling), renders binary buffer, and writes to target path.
 * WHY: Delivers sharp, pixel-perfect PNG imagery for documentation, slides, and wiki pages without SVG font distortion.
 *
 * @param svgMarkup The source SVG string.
 * @param outputPath Destination filesystem path.
 */
export function generatePngFromSvg(svgMarkup: string, outputPath: string): void {
  const resvg = new Resvg(svgMarkup, {
    fitTo: {
      mode: 'width',
      value: 3480
    }
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
}

/**
 * Generates an enterprise-grade multi-page PDF specification document.
 *
 * WHAT: Assembles a landscape PDF document featuring:
 * 1. Title, architecture synopsis, and metrics summary.
 * 2. Vector-rendered BPMN 2.0 Process Diagram with full swimlanes.
 * 3. Camunda Task Catalog & Execution Matrix table.
 * 4. Technical Integration guide with JavaDelegate and Zeebe Worker code.
 *
 * WHY: Provides enterprise architects with a formal, archivable PDF deliverable.
 *
 * @param pngBuffer Rasterized diagram image buffer for page embedding.
 * @param outputPath Destination filesystem path for the PDF.
 */
export function generateBpmnPdf(pngBuffer: Buffer, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Landscape A4 / Letter format (841.89 x 595.28 points)
    const doc = new PDFDocument({
      size: [842, 595], // A4 Landscape
      margin: 36,
      autoFirstPage: true
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // ==========================================
    // PAGE 1: Executive Cover & Architecture
    // ==========================================
    doc.rect(0, 0, 842, 595).fill('#0f172a');

    // Header Tag
    doc.rect(36, 40, 180, 24).fill('#0070f2');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('ENTERPRISE ARCHITECTURE', 46, 47);

    // Title
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('Personal Library — Camunda BPMN 2.0 Specification', 36, 85);
    doc.fillColor('#94a3b8').fontSize(14).font('Helvetica').text('Automated Document Ingestion, Parallel Dual AI Summarization & Qdrant Vector RAG', 36, 120);

    // Metadata Grid
    doc.rect(36, 155, 770, 75).fill('#1e293b');
    doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text('PROCESS IDENTIFIER', 50, 170);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text('Process_DocumentIngestionRAG', 50, 185);

    doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text('ENGINE COMPATIBILITY', 280, 170);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text('Camunda 7 (Spring Boot) & Camunda 8 (Zeebe)', 280, 185);

    doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text('LICENSE & STANDARD', 570, 170);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text('GNU AGPLv3 · BPMN 2.0 with BPMNDI', 570, 185);

    // Architecture Overview Narrative
    doc.rect(36, 250, 770, 290).fill('#ffffff');
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Executive Summary & Pipeline Architecture', 55, 270);
    
    doc.fillColor('#334155').fontSize(10.5).font('Helvetica').text(
      'The Personal Library Ingestion Engine orchestrates the lifecycle of research documents from initial upload to vector retrieval. ' +
      'Implemented as an executable BPMN 2.0 process, it bridges the SAP Fiori UI, Spring AI orchestration, Ollama local inference models, ' +
      'and the Qdrant vector database into a fault-tolerant workflow with built-in human fallback.\n\n' +
      'Key Architectural Tenets:\n' +
      '• 4 Horizontal Swimlanes: Client Ingestion (UI5/REST), Spring AI Orchestrator, Ollama Dual Models, and Qdrant Vector Store.\n' +
      '• Parallel Asynchronous Execution: Forks dual-model summarization across Ollama Llama 3.3 (70B Instruct) for analytical breakdown ' +
      'and Mistral Large (2411) for executive synthesis concurrently with paragraph semantic chunking.\n' +
      '• Human-in-the-Loop Quality Gate: An Exclusive XOR Gateway routes incomplete or malformed bibliographic extractions to a ' +
      'Librarian Review User Task, preventing corrupted metadata from reaching downstream indexing.\n' +
      '• Enterprise Governance: Atomic persistence in MongoDB coupled with tenant-scoped security audit logging in Keycloak and ' +
      'real-time push notifications over the SAP UI5 EventBus.\n\n' +
      'Engine Support:\n' +
      '• Camunda 7: JavaDelegate expression binding via Spring Boot Starter with asynchronous continuation.\n' +
      '• Camunda 8: Non-blocking Zeebe JobWorkers with automated backoff retry policies (R3/PT10S).',
      55, 295, { width: 730, lineGap: 4 }
    );

    // ==========================================
    // PAGE 2: Full-Width BPMN Diagram
    // ==========================================
    doc.addPage();
    doc.rect(0, 0, 842, 595).fill('#f8fafc');

    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Camunda BPMN 2.0 Process Diagram', 36, 30);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Complete Visual Workflow with Horizontal Swimlanes & Orthogonal Waypoints', 36, 50);

    // Embed rendered PNG diagram (scaled to fit landscape viewport)
    doc.image(pngBuffer, 36, 75, { width: 770 });

    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('BPMN 2.0 Diagram Interchange (BPMNDI) · Generated from src/main/resources/bpmn/document_ingestion_rag.bpmn', 36, 560);

    // ==========================================
    // PAGE 3: Task Catalog & Execution Matrix
    // ==========================================
    doc.addPage();
    doc.rect(0, 0, 842, 595).fill('#ffffff');

    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Process Task Catalog & Execution Matrix', 36, 30);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Technical specification of process activities, delegates, and execution modes', 36, 50);

    // Table Header
    const colX = [36, 180, 360, 520, 640, 720];
    let tableY = 75;

    doc.rect(36, tableY, 770, 24).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('ACTIVITY / TASK NAME', colX[0] + 6, tableY + 7);
    doc.text('CAMUNDA 7 DELEGATE', colX[1] + 6, tableY + 7);
    doc.text('ZEEBE TASK TYPE (C8)', colX[2] + 6, tableY + 7);
    doc.text('SWIMLANE', colX[3] + 6, tableY + 7);
    doc.text('EXECUTION', colX[4] + 6, tableY + 7);
    doc.text('RETRIES', colX[5] + 6, tableY + 7);

    tableY += 24;

    const taskRows = [
      { name: 'Extract Text & BibTeX', c7: '${bibTeXExtractionDelegate}', c8: 'extract-bibtex-task', lane: 'Spring AI Orchestrator', mode: 'Synchronous', retries: '3' },
      { name: 'Validate BibTeX Quality', c7: '${bibTeXValidationDelegate}', c8: 'validate-bibtex-task', lane: 'Spring AI Orchestrator', mode: 'Synchronous', retries: 'None' },
      { name: 'Review & Correct Metadata', c7: 'User Task (Librarian)', c8: 'User Task (Human)', lane: 'SAP UI5 Client', mode: 'Manual Review', retries: 'N/A' },
      { name: 'Fork Dual AI & Vectorization', c7: 'Parallel AND Gateway', c8: 'Parallel AND Gateway', lane: 'Spring AI Orchestrator', mode: 'Fork Split', retries: 'N/A' },
      { name: 'Llama 3.3 (70B) Summary', c7: '${llamaSummarizationDelegate}', c8: 'llama-summary-task', lane: 'Ollama AI Models', mode: 'asyncBefore=true', retries: 'R3/PT10S' },
      { name: 'Mistral Large (2411) Summary', c7: '${mistralSummarizationDelegate}', c8: 'mistral-summary-task', lane: 'Ollama AI Models', mode: 'asyncBefore=true', retries: 'R3/PT10S' },
      { name: 'Chunk Text & Upsert Vectors', c7: '${vectorRagDelegate}', c8: 'qdrant-vectorization-task', lane: 'Qdrant Vector DB', mode: 'asyncBefore=true', retries: 'R3/PT10S' },
      { name: 'Join AI & Vector Telemetry', c7: 'Parallel AND Join', c8: 'Parallel AND Join', lane: 'Spring AI Orchestrator', mode: 'Join Barrier', retries: 'N/A' },
      { name: 'Persist Entity in MongoDB', c7: '${documentPersistenceDelegate}', c8: 'persist-document-task', lane: 'Spring AI Orchestrator', mode: 'Synchronous', retries: '3' },
      { name: 'Keycloak Security Audit Log', c7: '${securityAuditDelegate}', c8: 'keycloak-audit-task', lane: 'Spring AI Orchestrator', mode: 'Synchronous', retries: '3' },
      { name: 'Broadcast Ingestion Event', c7: '${eventBusNotificationDelegate}', c8: 'notify-client-task', lane: 'SAP UI5 Client', mode: 'Send Task', retries: 'None' }
    ];

    taskRows.forEach((row, idx) => {
      const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(36, tableY, 770, 26).fill(rowBg);
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(row.name, colX[0] + 6, tableY + 8);
      doc.fillColor('#0070f2').fontSize(8).font('Courier').text(row.c7, colX[1] + 6, tableY + 8);
      doc.fillColor('#475569').fontSize(8).font('Courier').text(row.c8, colX[2] + 6, tableY + 8);
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(row.lane, colX[3] + 6, tableY + 8);
      doc.fillColor(row.mode.includes('async') ? '#059669' : '#334155').fontSize(8).font('Helvetica-Bold').text(row.mode, colX[4] + 6, tableY + 8);
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(row.retries, colX[5] + 6, tableY + 8);
      tableY += 26;
    });

    // Technical note
    tableY += 20;
    doc.rect(36, tableY, 770, 110).fill('#eff6ff');
    doc.fillColor('#1e40af').fontSize(11).font('Helvetica-Bold').text('Asynchronous Continuation & Failure Boundary Semantics', 50, tableY + 14);
    doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text(
      'Both AI inference service tasks (Llama 3.3 and Mistral Large) and the Qdrant vectorization task are configured with ' +
      'camunda:asyncBefore="true". This isolates intensive LLM calculations onto separate background worker threads managed by ' +
      'the Camunda Job Executor. If transient hardware latency or token limits cause a model failure, Camunda\'s automated retry ' +
      'cycle (R3/PT10S) performs exponential backoff retries without aborting the parent process instance.',
      50, tableY + 35, { width: 740, lineGap: 3 }
    );

    // ==========================================
    // PAGE 4: Spring Boot & Camunda Code Guide
    // ==========================================
    doc.addPage();
    doc.rect(0, 0, 842, 595).fill('#ffffff');

    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Developer Integration: Camunda 7 & 8 Handlers', 36, 30);
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Spring Boot JavaDelegate and Camunda 8 Zeebe Worker source code examples', 36, 50);

    // Box 1: Camunda 7
    doc.rect(36, 75, 375, 460).fill('#1e293b');
    doc.fillColor('#38bdf8').fontSize(12).font('Helvetica-Bold').text('Camunda 7: Spring Boot JavaDelegate', 50, 95);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('Package: com.personallibrary.workflow.delegate', 50, 112);
    
    doc.fillColor('#f8fafc').fontSize(8).font('Courier').text(
      '@Component("llamaSummarizationDelegate")\n' +
      'public class LlamaSummarizationDelegate implements JavaDelegate {\n' +
      '    @Autowired\n' +
      '    private AiSummarizationService summarizationService;\n' +
      '\n' +
      '    @Override\n' +
      '    public void execute(DelegateExecution execution) throws Exception {\n' +
      '        String title = (String) execution.getVariable("documentTitle");\n' +
      '        String content = (String) execution.getVariable("fullContent");\n' +
      '        BibTeXMetadata bibtex = (BibTeXMetadata) execution.getVariable("bibtex");\n' +
      '\n' +
      '        SummaryRecord summary = summarizationService\n' +
      '            .generateAnalyticalSummary(title, content, bibtex);\n' +
      '\n' +
      '        execution.setVariable("llamaSummary", summary);\n' +
      '    }\n' +
      '}\n' +
      '\n' +
      '@Component("vectorRagDelegate")\n' +
      'public class VectorRagDelegate implements JavaDelegate {\n' +
      '    @Autowired\n' +
      '    private VectorRagService vectorRagService;\n' +
      '\n' +
      '    @Override\n' +
      '    public void execute(DelegateExecution execution) throws Exception {\n' +
      '        String docId = (String) execution.getVariable("documentGuid");\n' +
      '        String text = (String) execution.getVariable("fullContent");\n' +
      '\n' +
      '        List<DocumentChunk> chunks = vectorRagService.index(docId, text);\n' +
      '        execution.setVariable("vectorChunks", chunks);\n' +
      '    }\n' +
      '}',
      50, 135, { width: 345, lineGap: 2.5 }
    );

    // Box 2: Camunda 8
    doc.rect(431, 75, 375, 460).fill('#1e293b');
    doc.fillColor('#34d399').fontSize(12).font('Helvetica-Bold').text('Camunda 8: Zeebe JobWorker', 50 + 395, 95);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('Package: com.personallibrary.workflow.worker', 50 + 395, 112);

    doc.fillColor('#f8fafc').fontSize(8).font('Courier').text(
      '@Component\n' +
      'public class DocumentIngestionZeebeWorkers {\n' +
      '    @Autowired\n' +
      '    private AiSummarizationService summarizationService;\n' +
      '    @Autowired\n' +
      '    private VectorRagService vectorRagService;\n' +
      '\n' +
      '    @JobWorker(type = "llama-summary-task", autoComplete = true)\n' +
      '    public Map<String, Object> handleLlama(final ActivatedJob job) {\n' +
      '        Map<String, Object> vars = job.getVariablesAsMap();\n' +
      '        String title = (String) vars.get("documentTitle");\n' +
      '        String content = (String) vars.get("fullContent");\n' +
      '\n' +
      '        SummaryRecord summary = summarizationService\n' +
      '            .generateAnalyticalSummary(title, content, null);\n' +
      '        return Map.of("llamaSummary", summary);\n' +
      '    }\n' +
      '\n' +
      '    @JobWorker(type = "qdrant-vectorization-task", autoComplete = true)\n' +
      '    public Map<String, Object> handleQdrant(final ActivatedJob job) {\n' +
      '        Map<String, Object> vars = job.getVariablesAsMap();\n' +
      '        String docId = (String) vars.get("documentGuid");\n' +
      '        String text = (String) vars.get("fullContent");\n' +
      '\n' +
      '        int chunks = vectorRagService.index(docId, text).size();\n' +
      '        return Map.of("chunksCount", chunks, "status", "INDEXED");\n' +
      '    }\n' +
      '}',
      50 + 395, 135, { width: 345, lineGap: 2.5 }
    );

    // Finalize PDF stream
    doc.end();

    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err: any) => reject(err));
  });
}

/**
 * Main execution orchestrator for diagram asset generation.
 *
 * WHAT: Generates SVG markup, invokes Resvg to emit PNG, compiles PDF via PDFKit,
 * and distributes files to `docs/diagrams/` and `src/main/frontend/public/`.
 * WHY: Automates creation and synchronization of all visual and documentary assets during build time.
 */
export async function generateAllDiagrams(): Promise<void> {
  console.log('🎨 Starting Camunda BPMN Diagram Generation...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. Generate SVG
  const svgMarkup = generateBpmnSvg();
  const svgPathDocs = path.join(docsDir, 'document_ingestion_rag.svg');
  const svgPathPublic = path.join(publicDir, 'document_ingestion_rag.svg');
  fs.writeFileSync(svgPathDocs, svgMarkup, 'utf-8');
  fs.writeFileSync(svgPathPublic, svgMarkup, 'utf-8');
  console.log(`✅ SVG diagram written to: ${svgPathDocs}`);

  // 2. Generate PNG via Resvg
  const pngPathDocs = path.join(docsDir, 'document_ingestion_rag.png');
  const pngPathPublic = path.join(publicDir, 'document_ingestion_rag.png');
  generatePngFromSvg(svgMarkup, pngPathDocs);
  fs.copyFileSync(pngPathDocs, pngPathPublic);
  console.log(`✅ High-Res PNG image rendered to: ${pngPathDocs} (${fs.statSync(pngPathDocs).size} bytes)`);

  // 3. Generate Multi-Page PDF
  const pngBuffer = fs.readFileSync(pngPathDocs);
  const pdfPathDocs = path.join(docsDir, 'document_ingestion_rag.pdf');
  const pdfPathPublic = path.join(publicDir, 'document_ingestion_rag.pdf');
  await generateBpmnPdf(pngBuffer, pdfPathDocs);
  fs.copyFileSync(pdfPathDocs, pdfPathPublic);
  console.log(`✅ Specification PDF generated at: ${pdfPathDocs} (${fs.statSync(pdfPathDocs).size} bytes)`);

  console.log('🎉 Diagram generation completed successfully!');
}

// Execute directly if run as CLI script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllDiagrams().catch(err => {
    console.error('Failed to generate diagrams:', err);
    process.exit(1);
  });
}
