/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Architecture Diagram Generator from Mermaid specification.
 * Generates:
 * 1. architecture_diagrams.svg (Vector SVG)
 * 2. architecture_diagrams.png (High-Res 3200px PNG via Resvg)
 * 3. architecture_diagrams.pdf (Enterprise Architectural Specification PDF via PDFKit)
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

export function generateArchitectureSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1020" width="1600" height="1020" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="hdr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <!-- Perpendicular Arrowhead markers: refX=10 places tip flush at the border; orient="auto" aligns with perpendicular segment -->
    <marker id="mmd-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="mmd-arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" />
    </marker>
    <marker id="mmd-arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
    </marker>
    <marker id="mmd-arrow-amber" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" />
    </marker>
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Title Banner -->
  <rect x="30" y="20" width="1540" height="65" rx="8" fill="url(#hdr-grad)" stroke="#334155" stroke-width="1.5" />
  <text x="55" y="52" font-size="20" font-weight="800" fill="#f8fafc">Personal Library — End-to-End System Architecture</text>
  <text x="55" y="72" font-size="12" font-weight="500" fill="#94a3b8">Source: architecture_diagrams.mmd • SAP UI5 Client • nginx -&gt; Express/Spring Boot • Dual AI (Ollama Llama/Mistral) • Qdrant Vector DB • MongoDB</text>
  <rect x="1410" y="38" width="140" height="28" rx="6" fill="#0070f2" />
  <text x="1480" y="56" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Mermaid Specification</text>

  <!-- ============================================================ -->
  <!-- SUBGRAPH 1: CLIENT TIER                                      -->
  <!-- ============================================================ -->
  <rect x="30" y="105" width="1540" height="175" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="50" y="130" font-size="12" font-weight="700" fill="#60a5fa">1. SAP FIORI HORIZON CLIENT TIER (UI5 WEB COMPONENTS + TYPESCRIPT)</text>

  <!-- ShellBarView -->
  <g filter="url(#card-shadow)">
    <rect x="50" y="145" width="220" height="115" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.2" />
    <text x="160" y="175" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">ShellBarView</text>
    <text x="160" y="195" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• i18n Store (5 Locales)</text>
    <text x="160" y="212" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Theme (Light / Dark)</text>
    <text x="160" y="229" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Keycloak User Profile</text>
  </g>

  <!-- ListReportView -->
  <g filter="url(#card-shadow)">
    <rect x="290" y="145" width="230" height="115" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.2" />
    <text x="405" y="175" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">ListReportView</text>
    <text x="405" y="195" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Multi-field FilterBar</text>
    <text x="405" y="212" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Paginated Document Table</text>
    <text x="405" y="229" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Dynamic Column Sorting</text>
  </g>

  <!-- ObjectPageView -->
  <g filter="url(#card-shadow)">
    <rect x="540" y="145" width="250" height="115" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.2" />
    <text x="665" y="175" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">ObjectPageView</text>
    <text x="665" y="195" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• LaTeX BibTeX Formatter</text>
    <text x="665" y="212" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Dual AI Summary Cards</text>
    <text x="665" y="229" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Version History &amp; Rollback</text>
  </g>

  <!-- Modal Dialogs -->
  <g filter="url(#card-shadow)">
    <rect x="810" y="145" width="230" height="115" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.2" />
    <text x="925" y="175" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Modal Dialogs</text>
    <text x="925" y="195" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Upload Pipeline Dialog</text>
    <text x="925" y="212" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Version Overwrite Modal</text>
    <text x="925" y="229" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Static BPMN Viewer/Download</text>
  </g>

  <!-- Reactive Stores -->
  <g filter="url(#card-shadow)">
    <rect x="1060" y="145" width="220" height="115" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.2" />
    <text x="1170" y="175" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Reactive Stores</text>
    <text x="1170" y="195" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• appStore (Documents state)</text>
    <text x="1170" y="212" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• backendStore (Mode switch)</text>
    <text x="1170" y="229" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• EventBus core Pub/Sub</text>
  </g>

  <!-- BackendGateway -->
  <g filter="url(#card-shadow)">
    <rect x="1300" y="145" width="250" height="115" rx="6" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.2" />
    <text x="1425" y="175" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">BackendGateway Facade</text>
    <text x="1425" y="195" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• RestBackendAdapter Driver</text>
    <text x="1425" y="212" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• MockBackendAdapter Driver</text>
    <text x="1425" y="229" font-size="10.5" fill="#bfdbfe" text-anchor="middle">• Event Lifecycle Emitter</text>
  </g>

  <!-- Orthogonal Connection: Client Tier -> Gateway Tier (Perpendicular into REST Controllers) -->
  <path d="M 1425 260 L 1425 305 L 595 305 L 595 360" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#mmd-arrow)" />
  <rect x="910" y="294" width="210" height="22" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="1015" y="309" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">HTTP REST / JSON / Multipart</text>

  <!-- ============================================================ -->
  <!-- SUBGRAPH 2: GATEWAY TIER                                     -->
  <!-- ============================================================ -->
  <rect x="30" y="325" width="1540" height="175" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#14b8a6" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="50" y="350" font-size="12" font-weight="700" fill="#2dd4bf">2. NGINX :8088 -&gt; EXPRESS :13000 / SPRING BOOT :18080</text>

  <!-- Express Server -->
  <g filter="url(#card-shadow)">
    <rect x="50" y="360" width="340" height="115" rx="6" fill="#134e4a" stroke="#14b8a6" stroke-width="1.2" />
    <text x="220" y="390" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Express Server (behind nginx)</text>
    <text x="220" y="410" font-size="10.5" fill="#99f6e4" text-anchor="middle">• server.ts listening on 0.0.0.0:13000</text>
    <text x="220" y="427" font-size="10.5" fill="#99f6e4" text-anchor="middle">• Static SPA Host / Mock Backend Adapter</text>
    <text x="220" y="444" font-size="10.5" fill="#99f6e4" text-anchor="middle">• Docs Portal &amp; Diagram Stream APIs</text>
  </g>

  <!-- REST Controllers -->
  <g filter="url(#card-shadow)">
    <rect x="415" y="360" width="360" height="115" rx="6" fill="#134e4a" stroke="#14b8a6" stroke-width="1.2" />
    <text x="595" y="390" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">REST API Controllers</text>
    <text x="595" y="410" font-size="10.5" fill="#99f6e4" text-anchor="middle">• /api/v1/documents (Multi-filter, CRUD)</text>
    <text x="595" y="427" font-size="10.5" fill="#99f6e4" text-anchor="middle">• /documents/:guid/versions &amp; rollback</text>
    <text x="595" y="444" font-size="10.5" fill="#99f6e4" text-anchor="middle">• /api/v1/chat (Conversational RAG)</text>
  </g>

  <!-- Extraction Engine -->
  <g filter="url(#card-shadow)">
    <rect x="800" y="360" width="370" height="115" rx="6" fill="#134e4a" stroke="#14b8a6" stroke-width="1.2" />
    <text x="985" y="390" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Extraction &amp; BibTeX Engine</text>
    <text x="985" y="410" font-size="10.5" fill="#99f6e4" text-anchor="middle">• pdf-parse Stream Binary Extractor</text>
    <text x="985" y="427" font-size="10.5" fill="#99f6e4" text-anchor="middle">• LaTeX BNF Formatter &amp; Validator</text>
    <text x="985" y="444" font-size="10.5" fill="#99f6e4" text-anchor="middle">• GUID Snapshot Archiving &amp; Rollback</text>
  </g>

  <!-- Static BPMN 2.0 Export (Spring Boot, no embedded engine) -->
  <g filter="url(#card-shadow)">
    <rect x="1195" y="360" width="355" height="115" rx="6" fill="#134e4a" stroke="#14b8a6" stroke-width="1.2" />
    <text x="1372" y="390" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Static BPMN 2.0 Export</text>
    <text x="1372" y="410" font-size="10.5" fill="#99f6e4" text-anchor="middle">• Process_DocumentIngestionRAG.bpmn</text>
    <text x="1372" y="427" font-size="10.5" fill="#99f6e4" text-anchor="middle">• Served/downloaded (Spring Boot :18080)</text>
    <text x="1372" y="444" font-size="10.5" fill="#99f6e4" text-anchor="middle">• External Camunda Modeler compatibility</text>
  </g>

  <!-- Intra-Tier Horizontal Perpendicular Connectors -->
  <path d="M 775 417.5 L 800 417.5" fill="none" stroke="#14b8a6" stroke-width="2" marker-end="url(#mmd-arrow)" />
  <path d="M 1170 417.5 L 1195 417.5" fill="none" stroke="#14b8a6" stroke-width="2" marker-end="url(#mmd-arrow)" />

  <!-- Orthogonal Connectors: Gateway Tier -> AI Tier (Strict 90-degree perpendicular entry into top of boxes) -->
  <!-- Controllers -> Llama 3.3 -->
  <path d="M 480 475 L 480 540 L 310 540 L 310 590" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#mmd-arrow-green)" />
  <!-- Controllers -> Mistral Large -->
  <path d="M 600 475 L 600 540 L 870 540 L 870 590" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#mmd-arrow-green)" />
  <!-- Extraction -> Qdrant Vector DB -->
  <path d="M 1120 475 L 1120 540 L 1372 540 L 1372 590" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#mmd-arrow-purple)" />

  <!-- Label for AI connections -->
  <rect x="520" y="528" width="160" height="22" rx="4" fill="#0f172a" stroke="#34d399" stroke-width="1" />
  <text x="600" y="543" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">Async Prompts &amp; Embeddings</text>

  <!-- Orthogonal Connectors: Gateway Tier -> Persistence Tier (Routed through inter-card gutters, perpendicular entry into top of boxes) -->
  <!-- Controllers -> MongoDB via Gutter 1 (x=412) -->
  <path d="M 430 475 L 430 515 L 412 515 L 412 760 L 285 760 L 285 810" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#mmd-arrow-amber)" />
  <!-- Controllers -> Keycloak via Gutter 2 (x=787) -->
  <path d="M 670 475 L 670 515 L 787 515 L 787 760 L 780 760 L 780 810" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#mmd-arrow-amber)" />
  <!-- Extraction -> File Asset Store via Gutter 3 (x=1182) -->
  <path d="M 1372 475 L 1372 515 L 1182 515 L 1182 760 L 1295 760 L 1295 810" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#mmd-arrow-amber)" />

  <rect x="710" y="748" width="150" height="22" rx="4" fill="#0f172a" stroke="#fbbf24" stroke-width="1" />
  <text x="785" y="763" font-size="10" font-weight="700" fill="#fbbf24" text-anchor="middle">Persistence &amp; Governance</text>

  <!-- ============================================================ -->
  <!-- SUBGRAPH 3: GENERATIVE AI & RETRIEVAL TIER                   -->
  <!-- ============================================================ -->
  <rect x="30" y="555" width="1540" height="175" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="50" y="580" font-size="12" font-weight="700" fill="#c084fc">3. GENERATIVE AI &amp; VECTOR RETRIEVAL TIER</text>

  <!-- Llama 3.3 -->
  <g filter="url(#card-shadow)">
    <rect x="50" y="590" width="520" height="115" rx="6" fill="#581c87" stroke="#a855f7" stroke-width="1.2" />
    <text x="310" y="620" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Ollama Llama 3.3 (70B Instruct)</text>
    <text x="310" y="642" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Analytical Structural Decomposition</text>
    <text x="310" y="660" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Research Methodologies &amp; Critique</text>
    <text x="310" y="678" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Execution Telemetry (Duration recorded)</text>
  </g>

  <!-- Mistral Large -->
  <g filter="url(#card-shadow)">
    <rect x="610" y="590" width="520" height="115" rx="6" fill="#581c87" stroke="#a855f7" stroke-width="1.2" />
    <text x="870" y="620" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Ollama Mistral Large (2411)</text>
    <text x="870" y="642" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Executive Summary &amp; Key Takeaways</text>
    <text x="870" y="660" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Recommended Target Audience Matrix</text>
    <text x="870" y="678" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Parallel Asynchronous Branch</text>
  </g>

  <!-- Qdrant Vector DB -->
  <g filter="url(#card-shadow)">
    <rect x="1195" y="590" width="355" height="115" rx="6" fill="#581c87" stroke="#a855f7" stroke-width="1.2" />
    <text x="1372" y="620" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Qdrant Vector Database</text>
    <text x="1372" y="642" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Collection: library_embeddings (HTTP 16333/gRPC 16334)</text>
    <text x="1372" y="660" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Dense Cosine Similarity Search</text>
    <text x="1372" y="678" font-size="10.5" fill="#e9d5ff" text-anchor="middle">• Top-K Grounded Citation Retrieval</text>
  </g>

  <!-- ============================================================ -->
  <!-- SUBGRAPH 4: PERSISTENCE & SECURITY TIER                     -->
  <!-- ============================================================ -->
  <rect x="30" y="775" width="1540" height="195" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="50" y="800" font-size="12" font-weight="700" fill="#fbbf24">4. PERSISTENCE &amp; SECURITY TIER</text>

  <!-- MongoDB -->
  <g filter="url(#card-shadow)">
    <rect x="50" y="810" width="470" height="135" rx="6" fill="#78350f" stroke="#f59e0b" stroke-width="1.2" />
    <text x="285" y="840" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">MongoDB Document Store</text>
    <text x="285" y="865" font-size="11" fill="#fde68a" text-anchor="middle">• Collection: documents (GUID primary key)</text>
    <text x="285" y="885" font-size="11" fill="#fde68a" text-anchor="middle">• Atomic DocumentEntity with Dual SummaryRecords</text>
    <text x="285" y="905" font-size="11" fill="#fde68a" text-anchor="middle">• Version Lineage: previousVersionGuid &amp; versionNumber</text>
    <text x="285" y="925" font-size="11" fill="#fde68a" text-anchor="middle">• MongoTemplate Dynamic Queries &amp; Multi-Field Search</text>
  </g>

  <!-- Keycloak -->
  <g filter="url(#card-shadow)">
    <rect x="550" y="810" width="460" height="135" rx="6" fill="#78350f" stroke="#f59e0b" stroke-width="1.2" />
    <text x="780" y="840" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">Keycloak OIDC Server</text>
    <text x="780" y="865" font-size="11" fill="#fde68a" text-anchor="middle">• Realm: personal-library-realm (OAuth2 / OIDC)</text>
    <text x="780" y="885" font-size="11" fill="#fde68a" text-anchor="middle">• Spring Security JWT Resource Server Validator</text>
    <text x="780" y="905" font-size="11" fill="#fde68a" text-anchor="middle">• RBAC Roles: LIBRARY_ADMIN, CHIEF_RESEARCHER</text>
    <text x="780" y="925" font-size="11" fill="#fde68a" text-anchor="middle">• Tenant Audit Trail &amp; Access Governance</text>
  </g>

  <!-- File Storage -->
  <g filter="url(#card-shadow)">
    <rect x="1040" y="810" width="510" height="135" rx="6" fill="#78350f" stroke="#f59e0b" stroke-width="1.2" />
    <text x="1295" y="840" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">Raw File Asset Store</text>
    <text x="1295" y="865" font-size="11" fill="#fde68a" text-anchor="middle">• Local Filesystem / GridFS Blob Storage</text>
    <text x="1295" y="885" font-size="11" fill="#fde68a" text-anchor="middle">• Multi-format Preservation: PDF, DOCX, Markdown, Plaintext</text>
    <text x="1295" y="905" font-size="11" fill="#fde68a" text-anchor="middle">• Streaming endpoint: /api/v1/documents/:guid/download</text>
    <text x="1295" y="925" font-size="11" fill="#fde68a" text-anchor="middle">• SHA-256 Integrity &amp; Version Snapshotting</text>
  </g>

</svg>`;
}

export function generateArchitecturePdf(pngBuffer: Buffer, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      info: {
        Title: 'Personal Library - System Architecture Specification',
        Author: 'Enterprise Architecture Team',
        Subject: 'Mermaid C4 Architecture Specification (SVG, PNG, PDF)',
        Keywords: 'Architecture, Mermaid, Spring AI, Qdrant, SAP UI5, Keycloak'
      }
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // ==========================================
    // PAGE 1: Architecture Blueprint Cover
    // ==========================================
    doc.rect(36, 36, 770, 48).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('Personal Library · End-to-End System Architecture Specification', 50, 48);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('Specification Model: architecture_diagrams.mmd · SAP Fiori UI5 • Express Gateway • Dual AI • Qdrant • MongoDB', 50, 66);

    // Embed the rendered high-res architecture PNG
    doc.image(pngBuffer, 36, 95, { fit: [770, 440], align: 'center', valign: 'center' });

    // ==========================================
    // PAGE 2: Tier Specifications & Components
    // ==========================================
    doc.addPage();
    doc.rect(36, 36, 770, 48).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('Architectural Tiers & Component Catalog', 50, 48);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('Detailed breakdown of layers mapped from the Mermaid graph TD definition', 50, 66);

    // 4 Column Grid for the 4 Tiers
    const colWidth = 185;
    const colGap = 10;
    const startY = 100;
    const cardHeight = 420;

    // Tier 1 Card
    doc.rect(36 + (colWidth + colGap) * 0, startY, colWidth, cardHeight).fill('#1e293b');
    doc.rect(36 + (colWidth + colGap) * 0, startY, colWidth, 28).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('1. Client Tier (UI5)', 46, startY + 8);
    doc.fillColor('#bfdbfe').fontSize(8).font('Helvetica').text(
      '• ShellBarView\n' +
      '  Navigation, branding, theme switch, i18n store.\n\n' +
      '• ListReportView\n' +
      '  Multi-field FilterBar, sorting, table pagination.\n\n' +
      '• ObjectPageView\n' +
      '  BibTeX editor, dual AI cards, citation RAG chat, version history & rollback matrix.\n\n' +
      '• Modal Dialogs\n' +
      '  Upload pipeline, version overwrite, rollback modal, BPMN inspector.\n\n' +
      '• Observable Stores\n' +
      '  appStore, backendStore, themeStore, i18nStore.\n\n' +
      '• BackendGateway\n' +
      '  Pluggable driver facade for REST & Mock modes.',
      46, startY + 40, { width: colWidth - 20, lineGap: 3 }
    );

    // Tier 2 Card
    doc.rect(36 + (colWidth + colGap) * 1, startY, colWidth, cardHeight).fill('#1e293b');
    doc.rect(36 + (colWidth + colGap) * 1, startY, colWidth, 28).fill('#134e4a');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('2. API Gateway (Port 13000)', 36 + (colWidth + colGap) * 1 + 10, startY + 8);
    doc.fillColor('#99f6e4').fontSize(8).font('Helvetica').text(
      '• Express Server\n' +
      '  Port 13000 on 0.0.0.0, dev Vite middleware, static host.\n\n' +
      '• REST Controllers\n' +
      '  /documents, /versions, /rollback, /chat, /auth.\n\n' +
      '• Extraction Engine\n' +
      '  pdf-parse binary stream extractor, LaTeX BNF formatter.\n\n' +
      '• Version Control & Rollback\n' +
      '  In-place version overwrite, snapshot archiving, non-destructive rollbacks.\n\n' +
      '• Static BPMN 2.0 Export\n' +
      '  Served for external Camunda Modeler compatibility; no embedded engine.',
      36 + (colWidth + colGap) * 1 + 10, startY + 40, { width: colWidth - 20, lineGap: 3 }
    );

    // Tier 3 Card
    doc.rect(36 + (colWidth + colGap) * 2, startY, colWidth, cardHeight).fill('#1e293b');
    doc.rect(36 + (colWidth + colGap) * 2, startY, colWidth, 28).fill('#581c87');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('3. AI & Vector Retrieval', 36 + (colWidth + colGap) * 2 + 10, startY + 8);
    doc.fillColor('#e9d5ff').fontSize(8).font('Helvetica').text(
      '• Ollama Llama 3.3 (70B)\n' +
      '  Analytical decomposition, methodology critique, data highlights.\n\n' +
      '• Ollama Mistral Large\n' +
      '  Executive summary, conclusions, audience recommendations.\n\n' +
      '• Fully Local Inference\n' +
      '  No cloud API keys; all generation runs via the local Ollama daemon.\n\n' +
      '• Qdrant Vector DB\n' +
      '  Dense cosine similarity retrieval (library_embeddings).\n\n' +
      '• Semantic Chunking\n' +
      '  ~350 char boundaries with paragraph context.',
      36 + (colWidth + colGap) * 2 + 10, startY + 40, { width: colWidth - 20, lineGap: 3 }
    );

    // Tier 4 Card
    doc.rect(36 + (colWidth + colGap) * 3, startY, colWidth, cardHeight).fill('#1e293b');
    doc.rect(36 + (colWidth + colGap) * 3, startY, colWidth, 28).fill('#78350f');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('4. Persistence & Security', 36 + (colWidth + colGap) * 3 + 10, startY + 8);
    doc.fillColor('#fde68a').fontSize(8).font('Helvetica').text(
      '• MongoDB Store\n' +
      '  Collection "documents", GUID primary key, version lineage.\n\n' +
      '• Keycloak OIDC Server\n' +
      '  Realm: personal-library-realm, OAuth2 JWT bearer.\n\n' +
      '• RBAC Governance\n' +
      '  LIBRARY_ADMIN and CHIEF_RESEARCHER roles.\n\n' +
      '• Raw Asset Store\n' +
      '  PDF, DOCX, Markdown, streaming downloads.\n\n' +
      '• Audit Logging\n' +
      '  Complete tenant event tracing & security trail.',
      36 + (colWidth + colGap) * 3 + 10, startY + 40, { width: colWidth - 20, lineGap: 3 }
    );

    doc.end();
    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err: any) => reject(err));
  });
}

export async function generateAllArchitectureFromMmd(): Promise<void> {
  console.log('🔄 Rendering architecture_diagrams.mmd into SVG, PNG, and PDF...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. Vector SVG
  const svgMarkup = generateArchitectureSvg();
  const svgDocs = path.join(docsDir, 'architecture_diagrams.svg');
  const svgPublic = path.join(publicDir, 'architecture_diagrams.svg');
  fs.writeFileSync(svgDocs, svgMarkup, 'utf-8');
  fs.writeFileSync(svgPublic, svgMarkup, 'utf-8');
  console.log('✅ Generated architecture_diagrams.svg');

  // 2. High-Res PNG (3200px)
  const resvg = new Resvg(svgMarkup, { fitTo: { mode: 'width', value: 3200 } });
  const pngBuffer = resvg.render().asPng();
  const pngDocs = path.join(docsDir, 'architecture_diagrams.png');
  const pngPublic = path.join(publicDir, 'architecture_diagrams.png');
  fs.writeFileSync(pngDocs, pngBuffer);
  fs.writeFileSync(pngPublic, pngBuffer);
  console.log(`✅ Generated architecture_diagrams.png (${pngBuffer.length} bytes)`);

  // 3. Specification PDF
  const pdfDocs = path.join(docsDir, 'architecture_diagrams.pdf');
  const pdfPublic = path.join(publicDir, 'architecture_diagrams.pdf');
  await generateArchitecturePdf(pngBuffer, pdfDocs);
  fs.copyFileSync(pdfDocs, pdfPublic);
  console.log(`✅ Generated architecture_diagrams.pdf (${fs.statSync(pdfDocs).size} bytes)`);

  console.log('🎉 Completed generation of architecture_diagrams (.svg, .png, .pdf)!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllArchitectureFromMmd().catch(err => {
    console.error('Failed generating architecture diagrams from mmd:', err);
    process.exit(1);
  });
}
