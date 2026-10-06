/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Enterprise Architecture Diagram Generator for Personal Library.
 * Generates:
 * 1. System Architecture (C4 Container / Layered Enterprise Map)
 * 2. Vector RAG & Dual-Model Pipeline Data Flow
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export function generateSystemArchitectureSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 960" width="1600" height="960" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="card-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#172554" />
    </linearGradient>
    <linearGradient id="card-teal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#134e4a" />
      <stop offset="100%" stop-color="#042f2e" />
    </linearGradient>
    <linearGradient id="card-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#581c87" />
      <stop offset="100%" stop-color="#3b0764" />
    </linearGradient>
    <linearGradient id="card-amber" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" />
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
    </marker>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <rect width="1600" height="960" fill="url(#bg-grad)" />

  <!-- Title Banner -->
  <rect x="40" y="24" width="1520" height="70" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <text x="70" y="60" font-size="22" font-weight="800" fill="#f8fafc" letter-spacing="-0.5">Personal Library — End-to-End System Architecture</text>
  <text x="70" y="80" font-size="12" font-weight="500" fill="#94a3b8">C4 Container Architecture: SAP Fiori Horizon UI5 Client • nginx -&gt; Express/Spring Boot • Dual AI (Ollama Llama/Mistral) • Qdrant Vector RAG • MongoDB</text>
  <rect x="1420" y="44" width="115" height="28" rx="6" fill="#0070f2" />
  <text x="1477" y="62" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Full Stack Tier</text>

  <!-- ============================================================ -->
  <!-- LAYER 1: CLIENT PRESENTATION TIER (SAP FIORI UI5)            -->
  <!-- ============================================================ -->
  <rect x="40" y="115" width="1520" height="175" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="65" y="142" font-size="13" font-weight="700" fill="#60a5fa" letter-spacing="0.5">1. PRESENTATION &amp; CLIENT TIER · SAP FIORI HORIZON (UI5 WEB COMPONENTS + TYPESCRIPT)</text>

  <!-- ShellBar & Router -->
  <rect x="65" y="155" width="260" height="115" rx="8" fill="url(#card-blue)" stroke="#3b82f6" stroke-width="1.5" filter="url(#glow)" />
  <text x="80" y="180" font-size="13" font-weight="700" fill="#ffffff">ShellBar &amp; Navigation</text>
  <text x="80" y="200" font-size="11" fill="#bfdbfe">View Switching &amp; Session Profile</text>
  <text x="80" y="222" font-size="10" font-family="monospace" fill="#93c5fd">• ShellBarView.ts</text>
  <text x="80" y="240" font-size="10" font-family="monospace" fill="#93c5fd">• LanguageSelectorView.ts (i18n)</text>
  <text x="80" y="258" font-size="10" font-family="monospace" fill="#93c5fd">• ThemeStore (Morning / Evening)</text>

  <!-- Floorplans: List Report & Object Page -->
  <rect x="350" y="155" width="370" height="115" rx="8" fill="url(#card-blue)" stroke="#3b82f6" stroke-width="1.5" filter="url(#glow)" />
  <text x="365" y="180" font-size="13" font-weight="700" fill="#ffffff">SAP Fiori Floorplans</text>
  <text x="365" y="200" font-size="11" fill="#bfdbfe">List Report Table &amp; Object Page View</text>
  <text x="365" y="222" font-size="10" font-family="monospace" fill="#93c5fd">• ListReportView.ts (Filtering, Sort, Pagination)</text>
  <text x="365" y="240" font-size="10" font-family="monospace" fill="#93c5fd">• ObjectPageView.ts (BibTeX, Dual AI, RAG Chat)</text>
  <text x="365" y="258" font-size="10" font-family="monospace" fill="#93c5fd">• UploadDialogView.ts &amp; VersionOverwrite</text>

  <!-- Reactive Store & EventBus -->
  <rect x="745" y="155" width="370" height="115" rx="8" fill="url(#card-blue)" stroke="#3b82f6" stroke-width="1.5" filter="url(#glow)" />
  <text x="760" y="180" font-size="13" font-weight="700" fill="#ffffff">Reactive State &amp; EventBus</text>
  <text x="760" y="200" font-size="11" fill="#bfdbfe">Zero-dependency Pub/Sub &amp; Observable Store</text>
  <text x="760" y="222" font-size="10" font-family="monospace" fill="#93c5fd">• appStore.ts (Catalog, Active Doc, Dialogs)</text>
  <text x="760" y="240" font-size="10" font-family="monospace" fill="#93c5fd">• core/eventBus.ts (Event Lifecycle)</text>
  <text x="760" y="258" font-size="10" font-family="monospace" fill="#93c5fd">• backendStore.ts (Mock vs REST mode)</text>

  <!-- Backend Gateway -->
  <rect x="1140" y="155" width="395" height="115" rx="8" fill="url(#card-blue)" stroke="#3b82f6" stroke-width="1.5" filter="url(#glow)" />
  <text x="1155" y="180" font-size="13" font-weight="700" fill="#ffffff">BackendGateway &amp; Adapters</text>
  <text x="1155" y="200" font-size="11" fill="#bfdbfe">Unified Contract Driver for UI5 Floorplans</text>
  <text x="1155" y="222" font-size="10" font-family="monospace" fill="#93c5fd">• BackendGateway.ts (Typed Dispatch)</text>
  <text x="1155" y="240" font-size="10" font-family="monospace" fill="#93c5fd">• RestBackendAdapter.ts (/api/v1/* fetch)</text>
  <text x="1155" y="258" font-size="10" font-family="monospace" fill="#93c5fd">• MockBackendAdapter.ts (In-memory fallback)</text>

  <!-- Orthogonal Connection: Client Gateway -> REST Controllers (Perpendicular downward into top border) -->
  <path d="M 1337 270 L 1337 305 L 635 305 L 635 365" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arrow)" />
  <rect x="910" y="294" width="220" height="22" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="1020" y="309" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">REST / JSON / Multipart (nginx :80)</text>

  <!-- ============================================================ -->
  <!-- LAYER 2: GATEWAY & BACKEND ORCHESTRATION TIER                 -->
  <!-- ============================================================ -->
  <rect x="40" y="325" width="1520" height="205" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="65" y="352" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="0.5">2. INGRESS &amp; SERVICE ORCHESTRATION TIER (NGINX :80 &amp; EXPRESS.JS :3000 &amp; SPRING BOOT :8080)</text>

  <!-- Express Server Gateway -->
  <rect x="65" y="365" width="370" height="145" rx="8" fill="url(#card-teal)" stroke="#14b8a6" stroke-width="1.5" filter="url(#glow)" />
  <text x="80" y="390" font-size="13" font-weight="700" fill="#ffffff">nginx + Express Gateway Server</text>
  <text x="80" y="410" font-size="11" fill="#99f6e4">Single Ingress (nginx :80) &amp; Static Host</text>
  <text x="80" y="432" font-size="10" font-family="monospace" fill="#ccfbf1">• nginx routes /api/v1/*, /actuator/* -&gt; :8080</text>
  <text x="80" y="450" font-size="10" font-family="monospace" fill="#ccfbf1">• server.ts (Express, Port 3000 on 0.0.0.0)</text>
  <text x="80" y="468" font-size="10" font-family="monospace" fill="#ccfbf1">• /docs Static Hub (Javadoc &amp; TypeDoc)</text>
  <text x="80" y="486" font-size="10" font-family="monospace" fill="#ccfbf1">• Stream Endpoints (ZIP, BPMN, PNG, PDF)</text>

  <!-- REST Controllers & Routes -->
  <rect x="460" y="365" width="350" height="145" rx="8" fill="url(#card-teal)" stroke="#14b8a6" stroke-width="1.5" filter="url(#glow)" />
  <text x="475" y="390" font-size="13" font-weight="700" fill="#ffffff">REST API Controllers (Spring Boot :8080)</text>
  <text x="475" y="410" font-size="11" fill="#99f6e4">Endpoints conforming to OpenAPI 3.0</text>
  <text x="475" y="432" font-size="10" font-family="monospace" fill="#ccfbf1">• GET/POST /api/v1/documents</text>
  <text x="475" y="450" font-size="10" font-family="monospace" fill="#ccfbf1">• POST /api/v1/documents/:id/summarize</text>
  <text x="475" y="468" font-size="10" font-family="monospace" fill="#ccfbf1">• POST /api/v1/chat (Conversational RAG)</text>
  <text x="475" y="486" font-size="10" font-family="monospace" fill="#ccfbf1">• GET /api/v1/auth/me (Keycloak OIDC Profile)</text>

  <!-- Core Services & Extraction -->
  <rect x="835" y="365" width="345" height="145" rx="8" fill="url(#card-teal)" stroke="#14b8a6" stroke-width="1.5" filter="url(#glow)" />
  <text x="850" y="390" font-size="13" font-weight="700" fill="#ffffff">Services &amp; Extraction Engine</text>
  <text x="850" y="410" font-size="11" fill="#99f6e4">Parsing, Normalization &amp; Formatting</text>
  <text x="850" y="432" font-size="10" font-family="monospace" fill="#ccfbf1">• pdf-parse Verbatim Stream Extractor</text>
  <text x="850" y="450" font-size="10" font-family="monospace" fill="#ccfbf1">• BibTeX Heuristic + LLM Extractor</text>
  <text x="850" y="468" font-size="10" font-family="monospace" fill="#ccfbf1">• LaTeX BNF Key &amp; Entry Formatter</text>
  <text x="850" y="486" font-size="10" font-family="monospace" fill="#ccfbf1">• GUID &amp; In-Place Version Management</text>

  <!-- Static BPMN 2.0 Export (no embedded engine) -->
  <rect x="1205" y="365" width="330" height="145" rx="8" fill="url(#card-teal)" stroke="#14b8a6" stroke-width="1.5" filter="url(#glow)" />
  <text x="1220" y="390" font-size="13" font-weight="700" fill="#ffffff">Static BPMN 2.0 Export</text>
  <text x="1220" y="410" font-size="11" fill="#99f6e4">Served/Downloaded, No Embedded Engine</text>
  <text x="1220" y="432" font-size="10" font-family="monospace" fill="#ccfbf1">• Process_DocumentIngestionRAG.bpmn</text>
  <text x="1220" y="450" font-size="10" font-family="monospace" fill="#ccfbf1">• External Camunda Modeler Compatibility</text>
  <text x="1220" y="468" font-size="10" font-family="monospace" fill="#ccfbf1">• BpmnModalView.ts (View / Download XML)</text>
  <text x="1220" y="486" font-size="10" font-family="monospace" fill="#ccfbf1">• No JavaDelegate / Zeebe Runtime Present</text>

  <!-- Orthogonal Connectors: Gateway -> AI Tier (90-degree perpendicular into top of Llama and Mistral) -->
  <!-- Controllers -> Llama 3.3 -->
  <path d="M 520 510 L 520 550 L 295 550 L 295 610" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#arrow-green)" />
  <!-- Controllers -> Mistral Large -->
  <path d="M 635 510 L 635 550 L 780 550 L 780 610" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#arrow-green)" />
  <rect x="550" y="538" width="180" height="22" rx="4" fill="#0f172a" stroke="#34d399" stroke-width="1" />
  <text x="640" y="553" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">Inference Prompts &amp; Embeddings</text>

  <!-- Orthogonal Connectors: Gateway -> Data Tier (Routed through clear channels, 90-degree perpendicular entry into top of boxes) -->
  <!-- Extraction -> Qdrant (via Gutter between Models) -->
  <path d="M 880 510 L 880 540 L 535 540 L 535 745 L 295 745 L 295 780" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#arrow-purple)" />
  <!-- Extraction -> MongoDB Document Repository -->
  <path d="M 1010 510 L 1010 745 L 780 745 L 780 780" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#arrow-purple)" />
  <!-- BPMN Export -> Keycloak OIDC -->
  <path d="M 1370 510 L 1370 745 L 1285 745 L 1285 780" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#arrow-purple)" />
  <rect x="710" y="734" width="160" height="22" rx="4" fill="#0f172a" stroke="#c084fc" stroke-width="1" />
  <text x="790" y="749" font-size="10" font-weight="700" fill="#c084fc" text-anchor="middle">Persistence &amp; Audit Logs</text>

  <!-- ============================================================ -->
  <!-- LAYER 3: DUAL-MODEL AI & VECTOR RETRIEVAL TIER                -->
  <!-- ============================================================ -->
  <rect x="40" y="570" width="1520" height="145" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="65" y="597" font-size="13" font-weight="700" fill="#34d399" letter-spacing="0.5">3. GENERATIVE AI &amp; VECTOR RETRIEVAL TIER (LOCAL OLLAMA SPRING AI)</text>

  <!-- Model 1: Llama 3.3 -->
  <rect x="65" y="610" width="705" height="90" rx="8" fill="url(#card-purple)" stroke="#a855f7" stroke-width="1.5" filter="url(#glow)" />
  <text x="80" y="635" font-size="13" font-weight="700" fill="#ffffff">Ollama Llama 3.3 (70B Instruct)</text>
  <text x="80" y="653" font-size="11" fill="#e9d5ff">Analytical Decomposition &amp; Research Synthesis</text>
  <text x="80" y="675" font-size="10" font-family="monospace" fill="#f3e8ff">• Methodological Critique, Findings &amp; Quantitative Benchmarks</text>
  <text x="80" y="690" font-size="10" font-family="monospace" fill="#f3e8ff">• Duration Tracking, Telemetry &amp; Latency Recording</text>

  <!-- Model 2: Mistral Large -->
  <rect x="800" y="610" width="705" height="90" rx="8" fill="url(#card-purple)" stroke="#a855f7" stroke-width="1.5" filter="url(#glow)" />
  <text x="815" y="635" font-size="13" font-weight="700" fill="#ffffff">Ollama Mistral Large (2411)</text>
  <text x="815" y="653" font-size="11" fill="#e9d5ff">Executive Summary &amp; Operational Takeaways</text>
  <text x="815" y="675" font-size="10" font-family="monospace" fill="#f3e8ff">• High-level Abstraction &amp; Target Audience Recommendations</text>
  <text x="815" y="690" font-size="10" font-family="monospace" fill="#f3e8ff">• Parallel Asynchronous Branch in Ingestion Pipeline</text>

  <!-- ============================================================ -->
  <!-- LAYER 4: PERSISTENCE, VECTOR STORE & IDENTITY TIER           -->
  <!-- ============================================================ -->
  <rect x="40" y="740" width="1520" height="185" rx="12" fill="#1e293b" fill-opacity="0.6" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="65" y="767" font-size="13" font-weight="700" fill="#fbbf24" letter-spacing="0.5">4. PERSISTENCE, VECTOR EMBEDDINGS &amp; SECURITY IDENTITY TIER</text>

  <!-- Qdrant Vector DB -->
  <rect x="65" y="780" width="460" height="125" rx="8" fill="url(#card-amber)" stroke="#f59e0b" stroke-width="1.5" filter="url(#glow)" />
  <text x="80" y="805" font-size="13" font-weight="700" fill="#ffffff">Qdrant Vector Database</text>
  <text x="80" y="825" font-size="11" fill="#fde68a">Dense Semantic Search &amp; Cosine Retrieval</text>
  <text x="80" y="847" font-size="10" font-family="monospace" fill="#fef3c7">• Collection: library_embeddings (HTTP 6333 / gRPC 6334)</text>
  <text x="80" y="865" font-size="10" font-family="monospace" fill="#fef3c7">• Paragraph Chunking (~350 characters/chunk)</text>
  <text x="80" y="883" font-size="10" font-family="monospace" fill="#fef3c7">• Top-K Retrieval with Excerpt Citations</text>

  <!-- MongoDB Entity Store -->
  <rect x="550" y="780" width="460" height="125" rx="8" fill="url(#card-amber)" stroke="#f59e0b" stroke-width="1.5" filter="url(#glow)" />
  <text x="565" y="805" font-size="13" font-weight="700" fill="#ffffff">MongoDB Document Repository</text>
  <text x="565" y="825" font-size="11" fill="#fde68a">Document Entities, BibTeX &amp; Dual Summaries</text>
  <text x="565" y="847" font-size="10" font-family="monospace" fill="#fef3c7">• Collection: documents (GUID primary key)</text>
  <text x="565" y="865" font-size="10" font-family="monospace" fill="#fef3c7">• Version lineage: previousVersionGuid &amp; versionNumber</text>
  <text x="565" y="883" font-size="10" font-family="monospace" fill="#fef3c7">• MongoTemplate Dynamic Queries &amp; Multi-Field Search</text>

  <!-- Keycloak Identity & Storage -->
  <rect x="1035" y="780" width="500" height="125" rx="8" fill="url(#card-amber)" stroke="#f59e0b" stroke-width="1.5" filter="url(#glow)" />
  <text x="1050" y="805" font-size="13" font-weight="700" fill="#ffffff">Keycloak OIDC &amp; File Storage</text>
  <text x="1050" y="825" font-size="11" fill="#fde68a">OAuth2 Resource Server &amp; Asset Management</text>
  <text x="1050" y="847" font-size="10" font-family="monospace" fill="#fef3c7">• Realm: personal-library-realm (JWT Decoding)</text>
  <text x="1050" y="865" font-size="10" font-family="monospace" fill="#fef3c7">• Roles: LIBRARY_ADMIN, CHIEF_RESEARCHER</text>
  <text x="1050" y="883" font-size="10" font-family="monospace" fill="#fef3c7">• Raw PDF/MD/DOCX Local / S3 Blob Storage</text>

</svg>`;
}

export function generateRagFlowSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 780" width="1600" height="780" style="background:#0b1120; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="rag-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <marker id="flow-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <filter id="rag-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <rect width="1600" height="780" fill="url(#rag-bg)" />

  <!-- Header -->
  <rect x="40" y="20" width="1520" height="65" rx="10" fill="#1f2937" stroke="#374151" stroke-width="1.5" />
  <text x="70" y="55" font-size="20" font-weight="800" fill="#f9fafb">Dual-Model Summarization &amp; Conversational RAG Data Flow</text>
  <text x="70" y="74" font-size="11" font-weight="500" fill="#9ca3af">Ingestion • Text Extraction • Semantic Chunking • Parallel Inference • Qdrant Vector Retrieval</text>

  <!-- Step 1: Upload & Format Detection -->
  <rect x="50" y="120" width="260" height="240" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="1.8" filter="url(#rag-shadow)" />
  <rect x="50" y="120" width="260" height="34" rx="10" fill="#2563eb" />
  <text x="180" y="142" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">1. UPLOAD &amp; DETECT</text>
  <text x="70" y="180" font-size="12" font-weight="600" fill="#e2e8f0">Input Document</text>
  <text x="70" y="200" font-size="11" fill="#94a3b8">• Multi-format: PDF, DOCX, MD, TXT</text>
  <text x="70" y="220" font-size="11" fill="#94a3b8">• Base64 Payload or File Upload</text>
  <text x="70" y="240" font-size="11" fill="#94a3b8">• Header magic byte detection</text>
  <text x="70" y="270" font-size="12" font-weight="600" fill="#e2e8f0">Binary Text Extractor</text>
  <text x="70" y="290" font-size="11" fill="#94a3b8">• pdf-parse streams text buffers</text>
  <text x="70" y="310" font-size="11" fill="#94a3b8">• Preserves paragraph breaks</text>
  <text x="70" y="330" font-size="10" font-family="monospace" fill="#60a5fa">Output: Full Clean Plaintext</text>

  <!-- Arrow 1 -> 2 -->
  <path d="M 310 240 L 360 240" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#flow-arrow)" />

  <!-- Step 2: BibTeX Extraction & Chunking -->
  <rect x="360" y="120" width="280" height="240" rx="10" fill="#1e293b" stroke="#6366f1" stroke-width="1.8" filter="url(#rag-shadow)" />
  <rect x="360" y="120" width="280" height="34" rx="10" fill="#4f46e5" />
  <text x="500" y="142" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">2. BIBTEX &amp; CHUNKING</text>
  <text x="380" y="180" font-size="12" font-weight="600" fill="#e2e8f0">BibTeX Inferencing</text>
  <text x="380" y="200" font-size="11" fill="#94a3b8">• Title, Authors, Year, DOI, Keywords</text>
  <text x="380" y="220" font-size="11" fill="#94a3b8">• Academic Citation Key Generation</text>
  <text x="380" y="240" font-size="11" fill="#94a3b8">• Formats LaTeX compliant entry</text>
  <text x="380" y="270" font-size="12" font-weight="600" fill="#e2e8f0">Semantic Paragraph Chunking</text>
  <text x="380" y="290" font-size="11" fill="#94a3b8">• Target chunk size: ~350 characters</text>
  <text x="380" y="310" font-size="11" fill="#94a3b8">• Natural line &amp; sentence boundaries</text>
  <text x="380" y="330" font-size="10" font-family="monospace" fill="#a5b4fc">Output: DocumentChunk[] List</text>

  <!-- Arrow 2 -> Parallel Branching -->
  <path d="M 640 240 L 710 240" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#flow-arrow)" />

  <!-- Step 3: Parallel Inference & Vectorization -->
  <rect x="710" y="100" width="440" height="280" rx="10" fill="#1e293b" stroke="#10b981" stroke-width="1.8" filter="url(#rag-shadow)" />
  <rect x="710" y="100" width="440" height="34" rx="10" fill="#059669" />
  <text x="930" y="122" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">3. CONCURRENT INFERENCE &amp; INDEXING</text>
  
  <!-- Branch A -->
  <rect x="730" y="145" width="400" height="65" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1" />
  <text x="745" y="165" font-size="11" font-weight="700" fill="#a7f3d0">Branch A: Ollama Llama 3.3 (70B Instruct)</text>
  <text x="745" y="183" font-size="10" fill="#d1fae5">• Analytical breakdown, methodology, quantitative benchmarks</text>
  <text x="745" y="198" font-size="9" font-family="monospace" fill="#6ee7b7">Latency tracking: ~4.2s recorded in SummaryRecord</text>

  <!-- Branch B -->
  <rect x="730" y="220" width="400" height="65" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1" />
  <text x="745" y="240" font-size="11" font-weight="700" fill="#a7f3d0">Branch B: Ollama Mistral Large (2411)</text>
  <text x="745" y="258" font-size="10" fill="#d1fae5">• Executive summary, key takeaways, recommended audience</text>
  <text x="745" y="273" font-size="9" font-family="monospace" fill="#6ee7b7">Latency tracking: ~3.5s recorded in SummaryRecord</text>

  <!-- Branch C -->
  <rect x="730" y="295" width="400" height="65" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1" />
  <text x="745" y="315" font-size="11" font-weight="700" fill="#a7f3d0">Branch C: Qdrant Vector Upsert</text>
  <text x="745" y="333" font-size="10" fill="#d1fae5">• Vector embedding calculation &amp; payload indexing</text>
  <text x="745" y="348" font-size="9" font-family="monospace" fill="#6ee7b7">Collection: library_embeddings (GUID document scoped)</text>

  <!-- Arrow 3 -> Storage -->
  <path d="M 1150 240 L 1210 240" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#flow-arrow)" />

  <!-- Step 4: Atomic Persistence -->
  <rect x="1210" y="120" width="340" height="240" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="1.8" filter="url(#rag-shadow)" />
  <rect x="1210" y="120" width="340" height="34" rx="10" fill="#d97706" />
  <text x="1380" y="142" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">4. ATOMIC PERSISTENCE &amp; NOTIFY</text>
  <text x="1230" y="180" font-size="12" font-weight="600" fill="#e2e8f0">MongoDB Storage</text>
  <text x="1230" y="200" font-size="11" fill="#94a3b8">• DocumentEntity with Dual Summaries</text>
  <text x="1230" y="220" font-size="11" fill="#94a3b8">• Version history (guid, previousVersionGuid)</text>
  <text x="1230" y="240" font-size="11" fill="#94a3b8">• Raw &amp; formatted BibTeX entry strings</text>
  <text x="1230" y="270" font-size="12" font-weight="600" fill="#e2e8f0">Reactive Broadcast</text>
  <text x="1230" y="290" font-size="11" fill="#94a3b8">• Dispatches ingestion event to UI5 EventBus</text>
  <text x="1230" y="310" font-size="11" fill="#94a3b8">• Auto-updates List Report table &amp; Object Page</text>
  <text x="1230" y="330" font-size="10" font-family="monospace" fill="#fcd34d">Status: DOCUMENT_INDEXED</text>

  <!-- Lower Panel: Interactive RAG Query Cycle -->
  <rect x="50" y="420" width="1500" height="320" rx="12" fill="#111827" stroke="#374151" stroke-width="1.5" />
  <rect x="50" y="420" width="1500" height="36" rx="12" fill="#1f2937" />
  <text x="75" y="444" font-size="13" font-weight="700" fill="#38bdf8">INTERACTIVE CONVERSATIONAL RAG QUERY LIFECYCLE (Object Page Chat)</text>

  <!-- Query Box 1: User Prompt -->
  <rect x="80" y="480" width="300" height="220" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2" />
  <text x="95" y="510" font-size="12" font-weight="700" fill="#ffffff">A. Researcher Question</text>
  <text x="95" y="535" font-size="11" fill="#94a3b8">Patron types query into Object Page:</text>
  <text x="95" y="560" font-size="11" font-style="italic" fill="#bae6fd">"Who are the characters and what is the Scarecrow seeking?"</text>
  <text x="95" y="600" font-size="11" fill="#94a3b8">Payload transmitted to:</text>
  <text x="95" y="620" font-size="10" font-family="monospace" fill="#38bdf8">POST /api/v1/chat</text>
  <text x="95" y="640" font-size="10" font-family="monospace" fill="#94a3b8">{ guid, question, topK: 3 }</text>

  <!-- Arrow A -> B -->
  <path d="M 380 590 L 450 590" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- Query Box 2: Qdrant Search -->
  <rect x="450" y="480" width="340" height="220" rx="8" fill="#1e293b" stroke="#a855f7" stroke-width="1.2" />
  <text x="465" y="510" font-size="12" font-weight="700" fill="#ffffff">B. Qdrant Similarity Search</text>
  <text x="465" y="535" font-size="11" fill="#94a3b8">Dense Vector Cosine Distance Matching:</text>
  <text x="465" y="560" font-size="10" font-family="monospace" fill="#d8b4fe">• Scopes search to doc.guid</text>
  <text x="465" y="580" font-size="10" font-family="monospace" fill="#d8b4fe">• Computes similarity against all chunks</text>
  <text x="465" y="600" font-size="10" font-family="monospace" fill="#d8b4fe">• Retrieves Top 3 most relevant passages</text>
  <text x="465" y="635" font-size="11" font-weight="600" fill="#e2e8f0">Ranked Excerpts Retrieved:</text>
  <text x="465" y="655" font-size="10" fill="#94a3b8">"Dorothy met the Scarecrow on a pole..."</text>

  <!-- Arrow B -> C -->
  <path d="M 790 590 L 860 590" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- Query Box 3: Context Assembly -->
  <rect x="860" y="480" width="320" height="220" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.2" />
  <text x="875" y="510" font-size="12" font-weight="700" fill="#ffffff">C. Grounded Context Prompt</text>
  <text x="875" y="535" font-size="11" fill="#94a3b8">Prompt Injection with Grounding Excerpts:</text>
  <text x="875" y="565" font-size="10" font-family="monospace" fill="#6ee7b7">System: You are an expert RAG analyst.</text>
  <text x="875" y="585" font-size="10" font-family="monospace" fill="#6ee7b7">Context Excerpts: [Excerpt 1], [Excerpt 2]</text>
  <text x="875" y="605" font-size="10" font-family="monospace" fill="#6ee7b7">Question: "Who are the characters..."</text>
  <text x="875" y="640" font-size="11" fill="#94a3b8">Guarantees zero hallucinations and grounds every claim in source excerpts.</text>

  <!-- Arrow C -> D -->
  <path d="M 1180 590 L 1240 590" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#flow-arrow)" />

  <!-- Query Box 4: Response Synthesis -->
  <rect x="1240" y="480" width="280" height="220" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" />
  <text x="1255" y="510" font-size="12" font-weight="700" fill="#ffffff">D. Synthesized Answer</text>
  <text x="1255" y="535" font-size="11" fill="#94a3b8">Formatted Markdown Output with Inline Excerpt Citations:</text>
  <text x="1255" y="570" font-size="10" font-family="monospace" fill="#fde68a">• Structured Travelers List</text>
  <text x="1255" y="590" font-size="10" font-family="monospace" fill="#fde68a">• Detailed character motivations</text>
  <text x="1255" y="610" font-size="10" font-family="monospace" fill="#fde68a">• Clickable [Excerpt 1] Citations</text>
  <text x="1255" y="645" font-size="10" font-family="monospace" fill="#38bdf8">Model: Ollama Llama 3.3 (70B)</text>
</svg>`;
}

export function generateFrontendArchitectureSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 700" width="1600" height="700" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <marker id="ui-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="ui-arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" />
    </marker>
    <marker id="ui-arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
    </marker>
  </defs>

  <!-- Title -->
  <rect x="40" y="20" width="1520" height="60" rx="8" fill="#1e293b" stroke="#334155" />
  <text x="70" y="55" font-size="20" font-weight="800" fill="#ffffff">SAP Fiori UI5 Frontend Component &amp; State Architecture</text>
  <text x="720" y="55" font-size="12" font-weight="500" fill="#94a3b8">Decoupled Web Component Hierarchy • Observable Reactive Stores • EventBus Driver</text>

  <!-- Top Layer: Views -->
  <rect x="50" y="105" width="1500" height="150" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
  <text x="75" y="130" font-size="13" font-weight="700" fill="#60a5fa">VIEW &amp; FLOORPLAN LAYER (core/component.ts subclasses)</text>

  <rect x="75" y="145" width="260" height="90" rx="6" fill="#172554" stroke="#3b82f6" />
  <text x="90" y="170" font-size="12" font-weight="700" fill="#ffffff">ShellBarView &amp; Footer</text>
  <text x="90" y="190" font-size="10" fill="#93c5fd">• Branding &amp; Mode Switcher</text>
  <text x="90" y="205" font-size="10" fill="#93c5fd">• Keycloak User Profile Session</text>
  <text x="90" y="220" font-size="10" fill="#93c5fd">• Global Toast notifications</text>

  <rect x="360" y="145" width="340" height="90" rx="6" fill="#172554" stroke="#3b82f6" />
  <text x="375" y="170" font-size="12" font-weight="700" fill="#ffffff">ListReportView (Floorplan)</text>
  <text x="375" y="190" font-size="10" fill="#93c5fd">• Multi-field FilterBar (Search, Year, Format)</text>
  <text x="375" y="205" font-size="10" fill="#93c5fd">• Paginated Document Table &amp; Sorting</text>
  <text x="375" y="220" font-size="10" fill="#93c5fd">• Selection &amp; Line-Item Action Handlers</text>

  <rect x="725" y="145" width="370" height="90" rx="6" fill="#172554" stroke="#3b82f6" />
  <text x="740" y="170" font-size="12" font-weight="700" fill="#ffffff">ObjectPageView (Floorplan)</text>
  <text x="740" y="190" font-size="10" fill="#93c5fd">• Sticky Header with KPIs, Edit &amp; Overwrite</text>
  <text x="740" y="205" font-size="10" fill="#93c5fd">• Dual AI Benchmark Cards (Llama &amp; Mistral)</text>
  <text x="740" y="220" font-size="10" fill="#93c5fd">• Interactive RAG Chat with Citation Drawer</text>

  <rect x="1120" y="145" width="410" height="90" rx="6" fill="#172554" stroke="#3b82f6" />
  <text x="1135" y="170" font-size="12" font-weight="700" fill="#ffffff">Modal Dialogs Hierarchy</text>
  <text x="1135" y="190" font-size="10" fill="#93c5fd">• UploadDialogView (Multi-file pipeline)</text>
  <text x="1135" y="205" font-size="10" fill="#93c5fd">• BpmnModalView (Static BPMN XML View/Download)</text>
  <text x="1135" y="220" font-size="10" fill="#93c5fd">• OpenApiModalView &amp; BackendSettings</text>

  <!-- Mid Layer: Observable Stores -->
  <rect x="50" y="285" width="1500" height="150" rx="10" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
  <text x="75" y="310" font-size="13" font-weight="700" fill="#34d399">OBSERVABLE REACTIVE STORES (core/store.ts)</text>

  <rect x="75" y="325" width="330" height="90" rx="6" fill="#064e3b" stroke="#10b981" />
  <text x="90" y="350" font-size="12" font-weight="700" fill="#ffffff">appStore</text>
  <text x="90" y="370" font-size="10" fill="#a7f3d0">• documents[], activeDocument, activeView</text>
  <text x="90" y="385" font-size="10" fill="#a7f3d0">• filters (search, format, year, sortField)</text>
  <text x="90" y="400" font-size="10" fill="#a7f3d0">• pagination (page, pageSize, totalPages)</text>

  <rect x="430" y="325" width="330" height="90" rx="6" fill="#064e3b" stroke="#10b981" />
  <text x="445" y="350" font-size="12" font-weight="700" fill="#ffffff">backendStore</text>
  <text x="445" y="370" font-size="10" fill="#a7f3d0">• mode: 'rest' | 'mock' (Dynamic Switch)</text>
  <text x="445" y="385" font-size="10" fill="#a7f3d0">• serverUrl: '/api/v1'</text>
  <text x="445" y="400" font-size="10" fill="#a7f3d0">• healthStatus &amp; latency measurements</text>

  <rect x="785" y="325" width="330" height="90" rx="6" fill="#064e3b" stroke="#10b981" />
  <text x="800" y="350" font-size="12" font-weight="700" fill="#ffffff">i18nStore</text>
  <text x="800" y="370" font-size="10" fill="#a7f3d0">• currentLocale: en, de, fr, es, ro</text>
  <text x="800" y="385" font-size="10" fill="#a7f3d0">• Instant reactive UI string updates</text>
  <text x="800" y="400" font-size="10" fill="#a7f3d0">• Date &amp; currency localization formatters</text>

  <rect x="1140" y="325" width="390" height="90" rx="6" fill="#064e3b" stroke="#10b981" />
  <text x="1155" y="350" font-size="12" font-weight="700" fill="#ffffff">themeStore</text>
  <text x="1155" y="370" font-size="10" fill="#a7f3d0">• currentTheme: 'sap_horizon' | 'sap_horizon_dark'</text>
  <text x="1155" y="385" font-size="10" fill="#a7f3d0">• Sets data-sap-theme on html element</text>
  <text x="1155" y="400" font-size="10" fill="#a7f3d0">• Injects UI5 shadow DOM stylesheets</text>

  <!-- Bottom Layer: Gateway & Drivers -->
  <rect x="50" y="465" width="1500" height="200" rx="10" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
  <text x="75" y="490" font-size="13" font-weight="700" fill="#c084fc">COMMUNICATION &amp; BACKEND GATEWAY LAYER (services/backend/)</text>

  <rect x="75" y="505" width="450" height="140" rx="6" fill="#3b0764" stroke="#a855f7" />
  <text x="90" y="530" font-size="12" font-weight="700" fill="#ffffff">BackendGateway Facade</text>
  <text x="90" y="550" font-size="10" fill="#e9d5ff">• BackendGateway.dispatchBackend(op, payload)</text>
  <text x="90" y="565" font-size="10" fill="#e9d5ff">• BackendGateway.requestBackend(op, payload)</text>
  <text x="90" y="585" font-size="10" fill="#e9d5ff">• Emits lifecycle events: REQUEST, SUCCESS, FAILURE</text>
  <text x="90" y="605" font-size="10" fill="#e9d5ff">• Routes dynamically to active adapter driver</text>

  <rect x="550" y="505" width="450" height="140" rx="6" fill="#3b0764" stroke="#a855f7" />
  <text x="565" y="530" font-size="12" font-weight="700" fill="#ffffff">RestBackendAdapter Driver</text>
  <text x="565" y="550" font-size="10" fill="#e9d5ff">• fetch() HTTP client talking to /api/v1/*</text>
  <text x="565" y="565" font-size="10" fill="#e9d5ff">• Multipart file upload &amp; FormData encoding</text>
  <text x="565" y="585" font-size="10" fill="#e9d5ff">• Handles error envelopes &amp; status codes</text>
  <text x="565" y="605" font-size="10" fill="#e9d5ff">• Keycloak Bearer token attachment</text>

  <rect x="1025" y="505" width="505" height="140" rx="6" fill="#3b0764" stroke="#a855f7" />
  <text x="1040" y="530" font-size="12" font-weight="700" fill="#ffffff">MockBackendAdapter Driver</text>
  <text x="1040" y="550" font-size="10" fill="#e9d5ff">• Client-side in-memory mock document collection</text>
  <text x="1040" y="565" font-size="10" fill="#e9d5ff">• Instant zero-latency responses for offline demos</text>
  <text x="1040" y="585" font-size="10" fill="#e9d5ff">• Full BibTeX formatting &amp; client-side search simulation</text>
  <text x="1040" y="605" font-size="10" fill="#e9d5ff">• Used when backend server is disconnected</text>

  <!-- Orthogonal Connectors: Views -> Stores (Perpendicular straight down into top border of stores) -->
  <path d="M 535 235 L 535 325" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#ui-arrow-green)" />
  <path d="M 910 235 L 910 325" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#ui-arrow-green)" />

  <!-- Orthogonal Connectors: Stores -> Gateway Facade (Perpendicular straight down into top border of Gateway) -->
  <path d="M 240 415 L 240 505" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#ui-arrow-purple)" />
  <path d="M 595 415 L 595 505" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#ui-arrow-purple)" />

  <!-- Intra-Layer Connectors: Gateway Facade -> Driver Adapters (Strict horizontal perpendicular entry into left border) -->
  <path d="M 525 575 L 550 575" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#ui-arrow)" />
  <path d="M 1000 575 L 1025 575" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#ui-arrow)" />

</svg>`;
}

export async function generateAllArchitectureDiagrams(): Promise<void> {
  console.log('🏗️ Generating Complete Suite of Architecture Diagrams...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. System Architecture
  const sysSvg = generateSystemArchitectureSvg();
  const sysSvgDocs = path.join(docsDir, 'system_architecture.svg');
  const sysSvgPublic = path.join(publicDir, 'system_architecture.svg');
  fs.writeFileSync(sysSvgDocs, sysSvg, 'utf-8');
  fs.writeFileSync(sysSvgPublic, sysSvg, 'utf-8');

  const resvgSys = new Resvg(sysSvg, { fitTo: { mode: 'width', value: 3200 } });
  const sysPng = resvgSys.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'system_architecture.png'), sysPng);
  fs.writeFileSync(path.join(publicDir, 'system_architecture.png'), sysPng);
  console.log('✅ Generated system_architecture.svg and system_architecture.png');

  // 2. RAG & Pipeline Data Flow
  const ragSvg = generateRagFlowSvg();
  const ragSvgDocs = path.join(docsDir, 'rag_data_flow.svg');
  const ragSvgPublic = path.join(publicDir, 'rag_data_flow.svg');
  fs.writeFileSync(ragSvgDocs, ragSvg, 'utf-8');
  fs.writeFileSync(ragSvgPublic, ragSvg, 'utf-8');

  const resvgRag = new Resvg(ragSvg, { fitTo: { mode: 'width', value: 3200 } });
  const ragPng = resvgRag.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'rag_data_flow.png'), ragPng);
  fs.writeFileSync(path.join(publicDir, 'rag_data_flow.png'), ragPng);
  console.log('✅ Generated rag_data_flow.svg and rag_data_flow.png');

  // 3. Frontend Architecture
  const feSvg = generateFrontendArchitectureSvg();
  const feSvgDocs = path.join(docsDir, 'frontend_architecture.svg');
  const feSvgPublic = path.join(publicDir, 'frontend_architecture.svg');
  fs.writeFileSync(feSvgDocs, feSvg, 'utf-8');
  fs.writeFileSync(feSvgPublic, feSvg, 'utf-8');

  const resvgFe = new Resvg(feSvg, { fitTo: { mode: 'width', value: 3200 } });
  const fePng = resvgFe.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'frontend_architecture.png'), fePng);
  fs.writeFileSync(path.join(publicDir, 'frontend_architecture.png'), fePng);
  console.log('✅ Generated frontend_architecture.svg and frontend_architecture.png');

  console.log('🎉 All architecture diagrams generated successfully!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllArchitectureDiagrams().catch(err => {
    console.error('Failed generating architecture diagrams:', err);
    process.exit(1);
  });
}
