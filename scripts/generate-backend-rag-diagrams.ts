/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Backend RAG Interaction Diagram Generator.
 *
 * Documents how the Spring Boot backend actually drives Ollama and Qdrant across
 * both halves of the RAG lifecycle: the ingestion path that turns an uploaded
 * file into embedded, searchable chunks, and the query path that turns a
 * question into a grounded, cited answer.
 *
 * Generates two complementary diagrams, each in the five standard formats
 * (.mmd, .puml, .svg, .png, .pdf):
 *
 * 1. backend_rag_sequence — a UML sequence diagram tracing both paths in order,
 *    including every fallback branch and the real timeout budget.
 * 2. backend_rag_component — a structural view of the same machinery, showing
 *    how Spring AI's abstractions sit between the services and the two engines.
 *
 * SOURCE OF TRUTH — every figure below was read out of the code, not assumed:
 *   - DocumentService.uploadDocument()      — pipeline order, strictly sequential
 *   - VectorRagService                      — chunk size 400, topK 4, threshold 0.5
 *   - AiSummarizationService                — 6000-char excerpt, dual models
 *   - BibTeXExtractionService               — uses llamaChatClient (an Ollama call)
 *   - OllamaConfig                          — 10-minute read timeout, temperatures
 *   - application.yml                       — nomic-embed-text, Qdrant gRPC :6334
 *
 * WHY this matters: the pre-existing rag_data_flow diagram described this
 * pipeline as "concurrent" with second-scale latencies. It is sequential, and a
 * single summarization call has been observed at ~2.5 minutes. These diagrams
 * are deliberately built from the source so that the published picture and the
 * running system agree.
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

// =============================================================================
// 1. SEQUENCE DIAGRAM — MERMAID
// =============================================================================
export function generateRagSequenceMermaid(): string {
  return `%% Personal Library — Backend RAG Sequence (Ollama + Qdrant)
%% ---
%% Both halves of the lifecycle in order:
%%   INGESTION  file -> Tika -> BibTeX(LLM) -> chunk -> embed -> Qdrant -> summaries -> Mongo
%%   QUERY      question -> embed -> Qdrant search -> grounded prompt -> Llama -> cited answer
%% ---
%% Source of truth:
%%   service/DocumentService.java, service/VectorRagService.java,
%%   service/AiSummarizationService.java, service/BibTeXExtractionService.java,
%%   config/OllamaConfig.java, resources/application.yml
%% ---
%% NOTE: participant aliases must not contain HTML entities. Mermaid's sequence
%% parser rejects &lt;/&gt; in an alias ("expecting SOLID_ARROW, got NEWLINE"), even
%% though the flowchart parser accepts them. Keep these aliases plain text.
%% NOTE: ';' is a statement separator in Mermaid, so it must never appear in
%% message text - the tail is then parsed as a bare actor and raises the same
%% "got NEWLINE" error. Use a comma instead. A bare '%%' line is likewise
%% rejected by the flowchart parser, so comment separators carry a '---'.
sequenceDiagram
    autonumber
    participant Client as nginx :8088<br/>browser
    participant Ctrl as Document / Chat<br/>Controller
    participant DocSvc as DocumentService
    participant Storage as StorageService<br/>Apache Tika
    participant BibTeX as BibTeXExtraction<br/>Service
    participant RagSvc as VectorRagService
    participant Ollama as Ollama :11434
    participant Qdrant as Qdrant :6334<br/>gRPC
    participant Mongo as MongoDB

    rect rgb(22, 42, 62)
    note over Client, Mongo: INGESTION — uploadDocument() runs these strictly in sequence, in one HTTP request
    Client->>Ctrl: POST /api/v1/documents (multipart/form-data)
    Ctrl->>DocSvc: uploadDocument(file, userBibtex)
    DocSvc->>Storage: storeFile(file, guid, v1)
    Storage-->>DocSvc: extractTextContent() via Apache Tika

    alt user supplied no BibTeX title
        DocSvc->>BibTeX: extractMetadata(fileName, text)
        BibTeX->>Ollama: llamaChatClient.prompt() [Ollama 1 of 4]
        Ollama-->>BibTeX: JSON metadata (title, author, year, DOI)
    else user supplied BibTeX
        DocSvc->>DocSvc: skip extraction, trust the submitted metadata
    end

    DocSvc->>RagSvc: indexDocumentChunks(guid, text)
    RagSvc->>RagSvc: paragraph split at ~400 chars, toPointId = UUIDv3(chunkId)
    RagSvc->>Ollama: vectorStore.add() embeds chunks [Ollama 2 of 4]
    Ollama-->>RagSvc: 768-dim vectors (nomic-embed-text)
    RagSvc->>Qdrant: upsert into personal_library_embeddings
    note right of RagSvc: Indexing failure is caught and logged as a warning.<br/>The upload still returns 200 with an empty index.

    DocSvc->>Ollama: Llama summary, temperature 0.2 [Ollama 3 of 4]
    DocSvc->>Ollama: Mistral summary, temperature 0.3 [Ollama 4 of 4]
    DocSvc->>Mongo: save(DocumentEntity + chunks + dual summaries)
    Ctrl-->>Client: 200 DocumentResponse
    end

    rect rgb(40, 28, 56)
    note over Client, Mongo: QUERY — chatWithDocument(), grounded retrieval then generation
    Client->>Ctrl: POST /api/v1/chat { documentGuid, question }
    Ctrl->>Mongo: load DocumentEntity by GUID
    Ctrl->>RagSvc: chatWithDocument(docEntity, request)
    RagSvc->>Ollama: embed(question) via nomic-embed-text
    RagSvc->>Qdrant: similaritySearch topK=4, threshold=0.5, filter documentGuid
    Qdrant-->>RagSvc: ranked chunks (chunkIndex arrives as Long)

    alt passages found
        RagSvc->>RagSvc: join passages into grounded system prompt
    else search failed or returned nothing
        RagSvc->>RagSvc: fall back to docEntity.contentExcerpt
    end

    RagSvc->>Ollama: llamaChatClient.system(prompt).user(question).call()

    alt model responded
        Ollama-->>RagSvc: answer text
    else model unavailable
        Ollama-->>RagSvc: exception, replaced by an apology string
    end

    RagSvc-->>Ctrl: ChatResponse { answer, modelUsed, citations }
    Ctrl-->>Client: 200 ChatResponse
    end
`;
}

// =============================================================================
// 2. SEQUENCE DIAGRAM — PLANTUML
// =============================================================================
export function generateRagSequencePuml(): string {
  return `@startuml Backend_RAG_Sequence
!theme plain
skinparam defaultFontName Inter
skinparam roundCorner 8
skinparam sequenceMessageAlign center

title Personal Library — Backend RAG Sequence (Ollama + Qdrant)\\nIngestion and query, both strictly sequential inside a single HTTP request

box "Spring Boot :18080" #EEF6FF
  participant "Document /\\nChat Controller" as Ctrl
  participant "DocumentService" as DocSvc
  participant "StorageService\\n(Apache Tika)" as Storage
  participant "BibTeXExtractionService" as BibTeX
  participant "VectorRagService" as Rag
end box

box "Inference & Vectors" #FFF7ED
  participant "Ollama\\n:11434" as Ollama
  participant "Qdrant\\n:6334 gRPC" as Qdrant
end box

box "Persistence" #F0FDF4
  participant "MongoDB" as Mongo
end box

actor "Browser\\nvia nginx :8088" as Client

== INGESTION — DocumentService.uploadDocument() ==

Client -> Ctrl : POST /api/v1/documents (multipart)
Ctrl -> DocSvc : uploadDocument(file, userBibtex)
DocSvc -> Storage : storeFile(file, guid, v1)
Storage --> DocSvc : extractTextContent() via Tika

alt no user-supplied BibTeX title
  DocSvc -> BibTeX : extractMetadata(fileName, text)
  BibTeX -> Ollama : llamaChatClient.prompt()  [Ollama 1 of 4]
  Ollama --> BibTeX : JSON metadata
else user supplied BibTeX
  DocSvc -> DocSvc : trust submitted metadata
end

DocSvc -> Rag : indexDocumentChunks(guid, text)
Rag -> Rag : split ~400 chars; toPointId = UUIDv3(chunkId)
Rag -> Ollama : vectorStore.add() embeds chunks  [Ollama 2 of 4]
Ollama --> Rag : 768-dim vectors (nomic-embed-text)
Rag -> Qdrant : upsert personal_library_embeddings
note right of Rag
  Indexing failure is caught and logged as a warning.
  The upload still returns 200 with an empty index.
end note

DocSvc -> Ollama : Llama summary, temperature 0.2  [Ollama 3 of 4]
DocSvc -> Ollama : Mistral summary, temperature 0.3  [Ollama 4 of 4]
DocSvc -> Mongo : save(DocumentEntity + chunks + summaries)
Ctrl --> Client : 200 DocumentResponse

== QUERY — VectorRagService.chatWithDocument() ==

Client -> Ctrl : POST /api/v1/chat { documentGuid, question }
Ctrl -> Mongo : load DocumentEntity by GUID
Ctrl -> Rag : chatWithDocument(docEntity, request)
Rag -> Ollama : embed(question) via nomic-embed-text
Rag -> Qdrant : similaritySearch topK=4, threshold=0.5,\\nfilter documentGuid
Qdrant --> Rag : ranked chunks (chunkIndex as Long)

alt passages found
  Rag -> Rag : join passages into grounded system prompt
else search failed or empty
  Rag -> Rag : fall back to docEntity.contentExcerpt
end

Rag -> Ollama : system(prompt).user(question).call()

alt model responded
  Ollama --> Rag : answer text
else model unavailable
  Ollama --> Rag : exception replaced by apology string
end

Rag --> Ctrl : ChatResponse { answer, modelUsed, citations }
Ctrl --> Client : 200 ChatResponse

legend right
  Every Ollama call is bounded by OLLAMA_READ_TIMEOUT = 10 minutes.
  Upload chains up to four of them, so the proxy and client budgets
  (nginx 2160s, LLM_TIMEOUT_MS 35 min) must cover the SUM, not one call.
endlegend

@enduml
`;
}

// =============================================================================
// 3. SEQUENCE DIAGRAM — VECTOR SVG
// =============================================================================
export function generateRagSequenceSvg(): string {
  const W = 2060;
  const H = 1660;

  const lanes = [
    { x: 110, label: 'Browser', sub: 'via nginx :8088', fill: '#334155', stroke: '#64748b' },
    { x: 340, label: 'Controller', sub: 'Document / Chat', fill: '#1e3a5f', stroke: '#38bdf8' },
    { x: 575, label: 'DocumentService', sub: 'orchestrator', fill: '#1e3a5f', stroke: '#38bdf8' },
    { x: 810, label: 'StorageService', sub: 'Apache Tika', fill: '#14402c', stroke: '#34d399' },
    { x: 1045, label: 'BibTeXExtraction', sub: 'LLM-backed', fill: '#14402c', stroke: '#34d399' },
    { x: 1290, label: 'VectorRagService', sub: 'chunk + retrieve', fill: '#3b1f52', stroke: '#c084fc' },
    { x: 1540, label: 'Ollama', sub: ':11434', fill: '#4a2f10', stroke: '#fbbf24' },
    { x: 1775, label: 'Qdrant', sub: ':6334 gRPC', fill: '#4a2f10', stroke: '#fbbf24' },
    { x: 1960, label: 'MongoDB', sub: 'documents', fill: '#450a0a', stroke: '#f87171' }
  ];

  const TOP = 104;
  const HEAD_H = 52;
  const LIFE_TOP = TOP + HEAD_H;
  const LIFE_BOTTOM = 1420;

  const headers = lanes
    .map((l) => {
      const w = l.label.length > 14 ? 192 : 168;
      const x = l.x - w / 2;
      return `  <g>
    <rect x="${x}" y="${TOP}" width="${w}" height="${HEAD_H}" rx="7" fill="${l.fill}" stroke="${l.stroke}" stroke-width="1.6" filter="url(#rag-shadow2)" />
    <text x="${l.x}" y="${TOP + 22}" font-size="13" font-weight="700" fill="#f8fafc" text-anchor="middle">${l.label}</text>
    <text x="${l.x}" y="${TOP + 39}" font-size="10.5" font-weight="500" fill="${l.stroke}" text-anchor="middle">${l.sub}</text>
  </g>`;
    })
    .join('\n');

  const lifelines = lanes
    .map(
      (l) =>
        `  <line x1="${l.x}" y1="${LIFE_TOP}" x2="${l.x}" y2="${LIFE_BOTTOM}" stroke="#475569" stroke-width="1.2" stroke-dasharray="5 5" />`
    )
    .join('\n');

  type Msg = {
    from: number;
    to: number;
    y: number;
    text: string;
    dashed?: boolean;
    colour?: string;
    self?: boolean;
  };

  const C_SYNC = '#38bdf8';
  const C_STATE = '#34d399';
  const C_BUS = '#c084fc';
  const C_NET = '#fbbf24';
  const C_ERR = '#f87171';

  const msgs: Msg[] = [
    // --- INGESTION ---
    { from: 0, to: 1, y: 250, text: '1. POST /api/v1/documents (multipart/form-data)', colour: C_SYNC },
    { from: 1, to: 2, y: 290, text: '2. uploadDocument(file, userBibtex)', colour: C_SYNC },
    { from: 2, to: 3, y: 330, text: '3. storeFile(file, guid, v1)', colour: C_STATE },
    { from: 3, to: 2, y: 370, text: '4. extractTextContent() — Apache Tika', colour: C_STATE, dashed: true },
    { from: 2, to: 4, y: 410, text: '5. extractMetadata(fileName, text) — skipped if user sent BibTeX', colour: C_STATE },
    { from: 4, to: 6, y: 450, text: '6. llamaChatClient.prompt()  ·  OLLAMA 1 of 4', colour: C_NET },
    { from: 6, to: 4, y: 490, text: '7. JSON metadata (title, author, year, DOI)', colour: C_NET, dashed: true },
    { from: 2, to: 5, y: 530, text: '8. indexDocumentChunks(guid, text)', colour: C_BUS },
    { from: 5, to: 5, y: 570, text: '9. split ~400 chars · toPointId = UUIDv3(chunkId)', colour: C_BUS, self: true },
    { from: 5, to: 6, y: 616, text: '10. vectorStore.add() embeds every chunk  ·  OLLAMA 2 of 4', colour: C_NET },
    { from: 6, to: 5, y: 656, text: '11. 768-dim vectors (nomic-embed-text)', colour: C_NET, dashed: true },
    { from: 5, to: 7, y: 696, text: '12. upsert → personal_library_embeddings', colour: C_NET },
    { from: 2, to: 6, y: 754, text: '13. Llama summary · temperature 0.2  ·  OLLAMA 3 of 4', colour: C_NET },
    { from: 2, to: 6, y: 794, text: '14. Mistral summary · temperature 0.3  ·  OLLAMA 4 of 4', colour: C_NET },
    { from: 2, to: 8, y: 834, text: '15. save(DocumentEntity + chunks + dual summaries)', colour: C_ERR },
    { from: 1, to: 0, y: 874, text: '16. 200 DocumentResponse', colour: C_SYNC, dashed: true },
    // --- QUERY ---
    { from: 0, to: 1, y: 990, text: '17. POST /api/v1/chat { documentGuid, question }', colour: C_SYNC },
    { from: 1, to: 8, y: 1030, text: '18. load DocumentEntity by GUID', colour: C_ERR },
    { from: 1, to: 5, y: 1070, text: '19. chatWithDocument(docEntity, request)', colour: C_BUS },
    { from: 5, to: 6, y: 1110, text: '20. embed(question) — nomic-embed-text', colour: C_NET },
    { from: 5, to: 7, y: 1150, text: '21. similaritySearch topK=4 · threshold 0.5 · filter documentGuid', colour: C_NET },
    { from: 7, to: 5, y: 1190, text: '22. ranked chunks — chunkIndex arrives as Long', colour: C_NET, dashed: true },
    { from: 5, to: 5, y: 1230, text: '23. join passages into grounded system prompt', colour: C_BUS, self: true },
    { from: 5, to: 6, y: 1276, text: '24. system(prompt).user(question).call()', colour: C_NET },
    { from: 6, to: 5, y: 1316, text: '25. answer text', colour: C_NET, dashed: true },
    { from: 5, to: 1, y: 1356, text: '26. ChatResponse { answer, modelUsed, citations }', colour: C_BUS, dashed: true },
    { from: 1, to: 0, y: 1396, text: '27. 200 ChatResponse', colour: C_SYNC, dashed: true }
  ];

  /**
   * Renders label text on an opaque plate.
   *
   * WHY: Message labels are wider than the gap between lifelines, so without a backing
   * plate the dashed lifelines and phase bands show straight through the glyphs.
   * Resvg has no Inter font and falls back to a wider mono face, so the empirical
   * glyph width at font-size 11.5 is ~7.4px, not the ~6.15 a proportional font suggests.
   */
  const labelPlate = (cx: number, y: number, text: string, anchor: 'middle' | 'start'): string => {
    const visible = text.replace(/&[a-z#0-9]+;/g, 'x').length;
    const w = visible * 7.4 + 16;
    const x = anchor === 'middle' ? cx - w / 2 : cx - 7;
    return `    <rect x="${x.toFixed(1)}" y="${y - 19}" width="${w.toFixed(1)}" height="17" rx="3" fill="#0f172a" fill-opacity="0.93" />
    <text x="${cx}" y="${y - 7}" font-size="11.5" font-weight="600" fill="#e2e8f0" text-anchor="${anchor}">${text}</text>`;
  };

  const arrows = msgs
    .map((m) => {
      const colour = m.colour ?? C_SYNC;
      const dash = m.dashed ? ' stroke-dasharray="6 4"' : '';
      const marker = `url(#rag-arrow-${colour.replace('#', '')})`;

      if (m.self) {
        const x = lanes[m.from].x;
        const loopW = 26;
        return `  <g>
    <path d="M ${x} ${m.y - 12} L ${x + loopW} ${m.y - 12} L ${x + loopW} ${m.y + 10} L ${x + 5} ${m.y + 10}" fill="none" stroke="${colour}" stroke-width="1.8"${dash} marker-end="${marker}" />
${labelPlate(x + loopW + 14, m.y + 5, m.text, 'start')}
  </g>`;
      }

      const x1 = lanes[m.from].x;
      const x2 = lanes[m.to].x;
      const dir = x2 > x1 ? 1 : -1;
      const sx = x1 + dir * 4;
      const ex = x2 - dir * 5;
      const mid = (sx + ex) / 2;
      return `  <g>
    <line x1="${sx}" y1="${m.y}" x2="${ex}" y2="${m.y}" stroke="${colour}" stroke-width="1.8"${dash} marker-end="${marker}" />
${labelPlate(mid, m.y - 4, m.text, 'middle')}
  </g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="rag-hdr2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <marker id="rag-arrow-38bdf8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" /></marker>
    <marker id="rag-arrow-34d399" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" /></marker>
    <marker id="rag-arrow-c084fc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" /></marker>
    <marker id="rag-arrow-fbbf24" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" /></marker>
    <marker id="rag-arrow-f87171" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f87171" /></marker>
    <filter id="rag-shadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Title banner -->
  <rect x="26" y="20" width="${W - 52}" height="66" rx="8" fill="url(#rag-hdr2)" stroke="#334155" stroke-width="1.5" />
  <text x="52" y="52" font-size="23" font-weight="800" fill="#f8fafc">Personal Library — Backend RAG Sequence (Ollama + Qdrant)</text>
  <text x="52" y="74" font-size="12" font-weight="500" fill="#94a3b8">Ingestion and query, both strictly sequential inside a single HTTP request — no concurrency anywhere in this path</text>
  <rect x="${W - 216}" y="38" width="190" height="28" rx="6" fill="#0070f2" />
  <text x="${W - 121}" y="57" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">UML Sequence</text>

  <!-- Phase bands -->
  <rect x="40" y="196" width="${W - 80}" height="706" rx="8" fill="#38bdf8" fill-opacity="0.05" stroke="#38bdf8" stroke-width="1.1" stroke-dasharray="6 4" />
  <text x="58" y="216" font-size="12.5" font-weight="800" fill="#38bdf8">INGESTION — DocumentService.uploadDocument() · four Ollama round trips, one after another</text>

  <rect x="40" y="928" width="${W - 80}" height="486" rx="8" fill="#c084fc" fill-opacity="0.05" stroke="#c084fc" stroke-width="1.1" stroke-dasharray="6 4" />
  <text x="58" y="948" font-size="12.5" font-weight="800" fill="#c084fc">QUERY — VectorRagService.chatWithDocument() · retrieve first, then generate</text>

${headers}
${lifelines}
${arrows}

  <!-- Fallback panel -->
  <rect x="40" y="1444" width="620" height="170" rx="8" fill="#450a0a" fill-opacity="0.5" stroke="#f87171" stroke-width="1.3" />
  <text x="62" y="1470" font-size="12.5" font-weight="800" fill="#fca5a5">FALLBACK PATHS — all three fail soft</text>
  <text x="62" y="1494" font-size="11" fill="#fecaca">1. Qdrant indexing throws → logged as a warning only.</text>
  <text x="62" y="1512" font-size="11" fill="#fecaca">   The upload still returns 200 with nothing indexed.</text>
  <text x="62" y="1534" font-size="11" fill="#fecaca">2. Similarity search fails or returns nothing →</text>
  <text x="62" y="1552" font-size="11" fill="#fecaca">   falls back to docEntity.contentExcerpt as context.</text>
  <text x="62" y="1574" font-size="11" fill="#fecaca">3. Chat model unavailable → a fixed apology string,</text>
  <text x="62" y="1592" font-size="11" fill="#fecaca">   so the request never surfaces a 5xx to the browser.</text>

  <!-- Timeout panel -->
  <rect x="690" y="1444" width="640" height="170" rx="8" fill="#4a2f10" fill-opacity="0.5" stroke="#fbbf24" stroke-width="1.3" />
  <text x="712" y="1470" font-size="12.5" font-weight="800" fill="#fcd34d">TIMEOUT BUDGET — the sum, not one call</text>
  <text x="712" y="1494" font-size="11" fill="#fde68a">OLLAMA_READ_TIMEOUT · 10 min — applied PER CALL</text>
  <text x="712" y="1512" font-size="11" fill="#fde68a">nginx proxy_read_timeout · 2160s (36 min)</text>
  <text x="712" y="1530" font-size="11" fill="#fde68a">LLM_TIMEOUT_MS (browser fetch) · 35 min</text>
  <text x="712" y="1556" font-size="11" fill="#fde68a">Upload chains up to FOUR Ollama calls, so the</text>
  <text x="712" y="1574" font-size="11" fill="#fde68a">worst case approaches — and can exceed — the</text>
  <text x="712" y="1592" font-size="11" fill="#fde68a">35/36 min client and proxy budgets downstream.</text>

  <!-- Facts panel -->
  <rect x="1360" y="1444" width="660" height="170" rx="8" fill="#14402c" fill-opacity="0.5" stroke="#34d399" stroke-width="1.3" />
  <text x="1382" y="1470" font-size="12.5" font-weight="800" fill="#6ee7b7">CONFIGURED VALUES (read from source)</text>
  <text x="1382" y="1494" font-size="11" fill="#a7f3d0">Chunking · paragraph split, ~400 chars, 50-char floor</text>
  <text x="1382" y="1512" font-size="11" fill="#a7f3d0">Embeddings · nomic-embed-text, 768 dims, 8k context</text>
  <text x="1382" y="1530" font-size="11" fill="#a7f3d0">Retrieval · topK 4, similarityThreshold 0.5</text>
  <text x="1382" y="1548" font-size="11" fill="#a7f3d0">Models · app.models.llama=llama3.2 · mistral=mistral</text>
  <text x="1382" y="1566" font-size="11" fill="#a7f3d0">Summaries · first 6,000 chars of the extracted text</text>
  <text x="1382" y="1590" font-size="10.5" fill="#6ee7b7">Point IDs are UUIDv3 — Qdrant rejects suffixed GUIDs.</text>
</svg>`;
}

// =============================================================================
// 4. COMPONENT DIAGRAM — MERMAID
// =============================================================================
export function generateRagComponentMermaid(): string {
  return `%% Personal Library — Backend RAG Component Interaction
%% ---
%% How the Spring Boot services reach Ollama and Qdrant through Spring AI's
%% abstractions, and which concrete bean serves which purpose.
%% ---
%% Source of truth: config/OllamaConfig.java, service/*.java, application.yml
flowchart TB
    subgraph API["API LAYER — controllers"]
        DC["DocumentController<br/>upload, overwrite, versions"]
        CC["ChatController<br/>POST /api/v1/chat"]
        HC["HealthController<br/>probes Ollama and Qdrant"]
    end

    subgraph SVC["SERVICE LAYER — orchestration"]
        DS["DocumentService<br/>drives the whole pipeline"]
        SS["StorageService<br/>Apache Tika extraction"]
        BX["BibTeXExtractionService<br/>LLM-backed metadata"]
        AS["AiSummarizationService<br/>dual-model summaries"]
        VR["VectorRagService<br/>chunk, index, retrieve"]
    end

    subgraph AI["SPRING AI ABSTRACTION — swappable beans"]
        LC["llamaChatClient<br/>temperature 0.2"]
        MC["mistralChatClient<br/>temperature 0.3"]
        EM["EmbeddingModel<br/>nomic-embed-text, 768d"]
        VS["VectorStore<br/>QdrantVectorStore"]
    end

    subgraph INFRA["INFRASTRUCTURE — containers"]
        OL["Ollama :11434<br/>llama3.2 + mistral"]
        QD["Qdrant :6334 gRPC<br/>personal_library_embeddings"]
        MG["MongoDB :27017<br/>DocumentEntity"]
        FS["Filesystem<br/>storage/documents"]
    end

    DC --> DS
    CC --> VR
    HC -.probe.-> OL
    HC -.probe.-> QD

    DS --> SS
    DS --> BX
    DS --> AS
    DS --> VR
    DS --> MG

    SS --> FS
    BX --> LC
    AS --> LC
    AS --> MC
    VR --> VS
    VR --> LC

    LC --> OL
    MC --> OL
    VS --> EM
    EM --> OL
    VS --> QD

    classDef api fill:#1e3a5f,stroke:#38bdf8,color:#e2e8f0
    classDef svc fill:#14402c,stroke:#34d399,color:#e2e8f0
    classDef ai fill:#3b1f52,stroke:#c084fc,color:#e2e8f0
    classDef infra fill:#4a2f10,stroke:#fbbf24,color:#e2e8f0
    class DC,CC,HC api
    class DS,SS,BX,AS,VR svc
    class LC,MC,EM,VS ai
    class OL,QD,MG,FS infra
`;
}

// =============================================================================
// 5. COMPONENT DIAGRAM — PLANTUML
// =============================================================================
export function generateRagComponentPuml(): string {
  return `@startuml Backend_RAG_Component
!theme plain
skinparam roundCorner 8
skinparam defaultFontName Inter
skinparam componentStyle rectangle
skinparam packageStyle frame

title Personal Library — Backend RAG Component Interaction\\nSpring AI sits between the services and the two engines, so models and stores swap by configuration

package "API LAYER" #EEF6FF {
  [DocumentController] as DC
  [ChatController] as CC
  [HealthController] as HC
}

package "SERVICE LAYER" #F0FDF4 {
  [DocumentService] as DS
  [StorageService\\n(Apache Tika)] as SS
  [BibTeXExtractionService] as BX
  [AiSummarizationService] as AS
  [VectorRagService] as VR
}

package "SPRING AI ABSTRACTION" #FAF5FF {
  [llamaChatClient\\ntemperature 0.2] as LC
  [mistralChatClient\\ntemperature 0.3] as MC
  [EmbeddingModel\\nnomic-embed-text 768d] as EM
  [VectorStore\\nQdrantVectorStore] as VS
}

package "INFRASTRUCTURE" #FFF7ED {
  [Ollama :11434] as OL
  [Qdrant :6334 gRPC] as QD
  [MongoDB :27017] as MG
  [Filesystem storage] as FS
}

DC --> DS
CC --> VR
HC ..> OL : health probe
HC ..> QD : health probe

DS --> SS
DS --> BX
DS --> AS
DS --> VR
DS --> MG

SS --> FS
BX --> LC
AS --> LC
AS --> MC
VR --> VS
VR --> LC

LC --> OL
MC --> OL
VS --> EM
EM --> OL
VS --> QD

note bottom of VS
  initialize-schema: true — nothing else provisions the
  collection. With it disabled every index call failed and
  was swallowed as a warning, so uploads returned 200
  while Qdrant stayed empty.
end note

note bottom of DS
  The pipeline is strictly sequential: Tika, then BibTeX
  via Llama, then embed + upsert, then two summaries,
  then the Mongo save. No CompletableFuture anywhere.
end note

@enduml
`;
}

// =============================================================================
// 6. COMPONENT DIAGRAM — VECTOR SVG
// =============================================================================
export function generateRagComponentSvg(): string {
  const W = 1820;
  const H = 1210;

  /**
   * Draws a layer band.
   *
   * `labelX` moves a band caption out from under the diagonal connectors that
   * cross it, and away from the right edge where a long caption would clip.
   */
  const band = (y: number, h: number, label: string, stroke: string, labelX = 50): string =>
    `  <rect x="34" y="${y}" width="${W - 68}" height="${h}" rx="9" fill="#1e293b" fill-opacity="0.38" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="7 4" />
  <text x="${labelX}" y="${y + 21}" font-size="12" font-weight="800" fill="${stroke}">${label}</text>`;

  type Node = { x: number; y: number; w: number; h: number; title: string; sub: string };

  const node = (n: Node, fill: string, stroke: string): string =>
    `  <g>
    <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.5" filter="url(#cmp-shadow2)" />
    <text x="${n.x + n.w / 2}" y="${n.y + 27}" font-size="13" font-weight="700" fill="#f8fafc" text-anchor="middle">${n.title}</text>
    <text x="${n.x + n.w / 2}" y="${n.y + 46}" font-size="10.5" fill="${stroke}" text-anchor="middle">${n.sub}</text>
  </g>`;

  const BAND_API = 118;
  const BAND_SVC = 300;
  const BAND_AI = 530;
  const BAND_INFRA = 760;

  const apiNodes: Node[] = [
    { x: 80, y: BAND_API + 36, w: 250, h: 62, title: 'DocumentController', sub: 'upload · overwrite · versions' },
    { x: 360, y: BAND_API + 36, w: 230, h: 62, title: 'ChatController', sub: 'POST /api/v1/chat' },
    { x: 620, y: BAND_API + 36, w: 250, h: 62, title: 'HealthController', sub: 'probes Ollama and Qdrant' }
  ];

  const svcNodes: Node[] = [
    { x: 80, y: BAND_SVC + 40, w: 230, h: 62, title: 'DocumentService', sub: 'drives the pipeline' },
    { x: 340, y: BAND_SVC + 40, w: 210, h: 62, title: 'StorageService', sub: 'Apache Tika' },
    { x: 580, y: BAND_SVC + 40, w: 250, h: 62, title: 'BibTeXExtraction', sub: 'LLM-backed metadata' },
    { x: 860, y: BAND_SVC + 40, w: 240, h: 62, title: 'VectorRagService', sub: 'chunk · index · retrieve' },
    { x: 1130, y: BAND_SVC + 40, w: 250, h: 62, title: 'AiSummarization', sub: 'dual-model summaries' }
  ];

  const aiNodes: Node[] = [
    { x: 80, y: BAND_AI + 40, w: 250, h: 62, title: 'llamaChatClient', sub: 'temperature 0.2' },
    { x: 360, y: BAND_AI + 40, w: 250, h: 62, title: 'mistralChatClient', sub: 'temperature 0.3' },
    { x: 640, y: BAND_AI + 40, w: 280, h: 62, title: 'EmbeddingModel', sub: 'nomic-embed-text · 768d' },
    { x: 950, y: BAND_AI + 40, w: 260, h: 62, title: 'VectorStore', sub: 'QdrantVectorStore' }
  ];

  const infraNodes: Node[] = [
    { x: 80, y: BAND_INFRA + 40, w: 260, h: 62, title: 'Ollama :11434', sub: 'llama3.2 + mistral' },
    { x: 370, y: BAND_INFRA + 40, w: 300, h: 62, title: 'Qdrant :6334 gRPC', sub: 'personal_library_embeddings' },
    { x: 700, y: BAND_INFRA + 40, w: 240, h: 62, title: 'MongoDB :27017', sub: 'DocumentEntity' },
    { x: 970, y: BAND_INFRA + 40, w: 240, h: 62, title: 'Filesystem', sub: 'storage/documents' }
  ];
  const C_API = '#38bdf8';
  const C_SVC = '#34d399';
  const C_AI = '#c084fc';
  const C_INFRA = '#fbbf24';

  const nodesSvg = [
    ...apiNodes.map((n) => node(n, '#1e3a5f', C_API)),
    ...svcNodes.map((n) => node(n, '#14402c', C_SVC)),
    ...aiNodes.map((n) => node(n, '#3b1f52', C_AI)),
    ...infraNodes.map((n) => node(n, '#4a2f10', C_INFRA))
  ].join('\n');

  /** Annotation plate. Sized on the same 7.4px/char metric the sequence diagram uses. */
  const tag = (cx: number, cy: number, lines: string[], stroke: string): string => {
    const widest = Math.max(...lines.map((t) => t.replace(/&[a-z#0-9]+;/g, 'x').length));
    const w = widest * 6.9 + 26;
    const h = lines.length * 17 + 18;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const text = lines
      .map(
        (t, i) =>
          `    <text x="${cx}" y="${(y + 24 + i * 17).toFixed(1)}" font-size="11" font-weight="${i === 0 ? '700' : '500'}" fill="${i === 0 ? stroke : '#cbd5e1'}" text-anchor="middle">${t}</text>`
      )
      .join('\n');
    return `  <g>
    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="6" fill="#0f172a" fill-opacity="0.94" stroke="${stroke}" stroke-width="1.2" />
${text}
  </g>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="cmp-hdr2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <marker id="cmp2-arrow-sky" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" /></marker>
    <marker id="cmp2-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" /></marker>
    <marker id="cmp2-arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" /></marker>
    <marker id="cmp2-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" /></marker>
    <filter id="cmp-shadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Title banner -->
  <rect x="26" y="20" width="${W - 52}" height="66" rx="8" fill="url(#cmp-hdr2)" stroke="#334155" stroke-width="1.5" />
  <text x="52" y="52" font-size="23" font-weight="800" fill="#f8fafc">Personal Library — Backend RAG Component Interaction</text>
  <text x="52" y="74" font-size="12" font-weight="500" fill="#94a3b8">Spring AI sits between the services and the engines, so models and vector stores swap by configuration alone</text>
  <rect x="${W - 226}" y="38" width="200" height="28" rx="6" fill="#0070f2" />
  <text x="${W - 126}" y="57" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">Component / Data Flow</text>

${band(BAND_API, 120, 'API LAYER — controllers', C_API)}
${band(BAND_SVC, 150, 'SERVICE LAYER — orchestration (no concurrency in the upload path)', C_SVC, 1180)}
${band(BAND_AI, 150, 'SPRING AI ABSTRACTION — swappable beans from OllamaConfig', C_AI, 1240)}
${band(BAND_INFRA, 178, 'INFRASTRUCTURE — docker compose services', C_INFRA, 1380)}

${nodesSvg}

  <!-- API -> service -->
  <line x1="205" y1="216" x2="195" y2="338" stroke="#38bdf8" stroke-width="2.2" marker-end="url(#cmp2-arrow-sky)" />
  <line x1="475" y1="216" x2="965" y2="338" stroke="#38bdf8" stroke-width="2" marker-end="url(#cmp2-arrow-sky)" />

  <!-- Pipeline chain across the service band. Drawn only in the gaps between
       boxes so nothing is struck through, and left-to-right because that is
       literally the execution order inside uploadDocument(). -->
  <line x1="313" y1="371" x2="335" y2="371" stroke="#34d399" stroke-width="2.4" marker-end="url(#cmp2-arrow-green)" />
  <line x1="553" y1="371" x2="575" y2="371" stroke="#34d399" stroke-width="2.4" marker-end="url(#cmp2-arrow-green)" />
  <line x1="833" y1="371" x2="855" y2="371" stroke="#34d399" stroke-width="2.4" marker-end="url(#cmp2-arrow-green)" />
  <line x1="1103" y1="371" x2="1125" y2="371" stroke="#34d399" stroke-width="2.4" marker-end="url(#cmp2-arrow-green)" />
  <text x="324" y="340" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">1</text>
  <text x="564" y="340" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">2</text>
  <text x="844" y="340" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">3</text>
  <text x="1114" y="340" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">4</text>

  <!-- service -> spring ai (diagonals run through the empty inter-band gutter) -->
  <line x1="705" y1="404" x2="215" y2="566" stroke="#c084fc" stroke-width="2" marker-end="url(#cmp2-arrow-purple)" />
  <line x1="1255" y1="404" x2="225" y2="566" stroke="#c084fc" stroke-width="1.6" marker-end="url(#cmp2-arrow-purple)" />
  <line x1="1255" y1="404" x2="495" y2="566" stroke="#c084fc" stroke-width="2" marker-end="url(#cmp2-arrow-purple)" />
  <line x1="980" y1="404" x2="1075" y2="566" stroke="#c084fc" stroke-width="2.2" marker-end="url(#cmp2-arrow-purple)" />
  <line x1="960" y1="404" x2="235" y2="566" stroke="#c084fc" stroke-width="1.6" marker-end="url(#cmp2-arrow-purple)" />

  <!-- VectorStore delegates embedding to the EmbeddingModel -->
  <line x1="946" y1="601" x2="926" y2="601" stroke="#c084fc" stroke-width="2.2" marker-end="url(#cmp2-arrow-purple)" />

  <!-- spring ai -> infrastructure -->
  <line x1="205" y1="632" x2="205" y2="796" stroke="#fbbf24" stroke-width="2.2" marker-end="url(#cmp2-arrow-amber)" />
  <line x1="485" y1="632" x2="250" y2="796" stroke="#fbbf24" stroke-width="1.8" marker-end="url(#cmp2-arrow-amber)" />
  <line x1="780" y1="632" x2="295" y2="796" stroke="#fbbf24" stroke-width="1.8" marker-end="url(#cmp2-arrow-amber)" />
  <line x1="1080" y1="632" x2="520" y2="796" stroke="#fbbf24" stroke-width="2.2" marker-end="url(#cmp2-arrow-amber)" />

  <!-- Persistence, routed down the left margin so it never crosses a box -->
  <path d="M 120 404 L 58 404 L 58 890 L 820 890 L 820 868" fill="none" stroke="#f87171" stroke-width="1.7" stroke-dasharray="6 4" marker-end="url(#cmp2-arrow-amber)" />
  <path d="M 360 404 L 72 404 L 72 908 L 1090 908 L 1090 868" fill="none" stroke="#f87171" stroke-width="1.7" stroke-dasharray="6 4" marker-end="url(#cmp2-arrow-amber)" />
  <rect x="508" y="879" width="185" height="16" rx="3" fill="#0f172a" fill-opacity="0.94" />
  <text x="600" y="891" font-size="10.5" font-weight="600" fill="#fca5a5" text-anchor="middle">DocumentService → MongoDB</text>
  <rect x="902" y="897" width="197" height="16" rx="3" fill="#0f172a" fill-opacity="0.94" />
  <text x="1000" y="909" font-size="10.5" font-weight="600" fill="#fca5a5" text-anchor="middle">StorageService → Filesystem</text>

  <!-- Health probes, routed down the right margin -->
  <path d="M 958 180 L 1750 180 L 1750 872 L 210 872" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-dasharray="6 4" />
  <line x1="520" y1="872" x2="520" y2="868" stroke="#38bdf8" stroke-width="1.6" marker-end="url(#cmp2-arrow-sky)" />
  <line x1="210" y1="872" x2="210" y2="868" stroke="#38bdf8" stroke-width="1.6" marker-end="url(#cmp2-arrow-sky)" />
  <text x="1742" y="520" font-size="10.5" font-weight="600" fill="#7dd3fc" text-anchor="end">health probes</text>

${tag(1530, 404, ['INGESTION ORDER (sequential)', 'Tika → BibTeX(Llama) → embed+upsert', '→ Llama summary → Mistral summary', '→ Mongo save. No CompletableFuture.'], C_SVC)}
${tag(1480, 620, ['RETRIEVAL SETTINGS', 'topK 4 · similarityThreshold 0.5', 'filterExpression scopes to documentGuid'], C_AI)}
${tag(1480, 836, ['initialize-schema: true', 'Nothing else provisions the collection.', 'Disabled, every index call failed and was', 'swallowed — 200 OK, but Qdrant stayed empty.'], C_INFRA)}

  <!-- Bottom explainer panels -->
  <rect x="40" y="950" width="570" height="212" rx="8" fill="#1e293b" fill-opacity="0.7" stroke="#38bdf8" stroke-width="1.3" />
  <text x="62" y="978" font-size="12.5" font-weight="800" fill="#7dd3fc">WHY SPRING AI IS IN THE MIDDLE</text>
  <text x="62" y="1004" font-size="11" fill="#cbd5e1">The services never speak HTTP to Ollama or gRPC to Qdrant.</text>
  <text x="62" y="1023" font-size="11" fill="#cbd5e1">They depend on ChatClient, EmbeddingModel and VectorStore,</text>
  <text x="62" y="1042" font-size="11" fill="#cbd5e1">all built as beans in OllamaConfig. Swapping llama3.2 for a</text>
  <text x="62" y="1061" font-size="11" fill="#cbd5e1">different model, or Qdrant for another store, is a config</text>
  <text x="62" y="1080" font-size="11" fill="#cbd5e1">change rather than a code change.</text>
  <text x="62" y="1106" font-size="10.5" fill="#7dd3fc">config/OllamaConfig.java · resources/application.yml</text>

  <rect x="630" y="950" width="570" height="212" rx="8" fill="#1e293b" fill-opacity="0.7" stroke="#fbbf24" stroke-width="1.3" />
  <text x="652" y="978" font-size="12.5" font-weight="800" fill="#fcd34d">WHY UPLOADS ARE SLOW</text>
  <text x="652" y="1004" font-size="11" fill="#cbd5e1">One upload makes up to four Ollama round trips in series:</text>
  <text x="652" y="1023" font-size="11" fill="#cbd5e1">BibTeX extraction, chunk embedding, then two summaries.</text>
  <text x="652" y="1042" font-size="11" fill="#cbd5e1">Each is bounded by a 10-minute read timeout, and local</text>
  <text x="652" y="1061" font-size="11" fill="#cbd5e1">CPU inference has been observed at ~2.5 minutes for a</text>
  <text x="652" y="1080" font-size="11" fill="#cbd5e1">single call. The budget that matters is the SUM.</text>
  <text x="652" y="1106" font-size="10.5" fill="#fcd34d">OllamaConfig.OLLAMA_READ_TIMEOUT · nginx 2160s · 35 min fetch</text>

  <rect x="1220" y="950" width="560" height="212" rx="8" fill="#1e293b" fill-opacity="0.7" stroke="#34d399" stroke-width="1.3" />
  <text x="1242" y="978" font-size="12.5" font-weight="800" fill="#6ee7b7">FAILING SOFT, AND ITS COST</text>
  <text x="1242" y="1004" font-size="11" fill="#cbd5e1">Every external call is wrapped in try/catch, so a dead</text>
  <text x="1242" y="1023" font-size="11" fill="#cbd5e1">Ollama or Qdrant never produces a 5xx. That keeps the UI</text>
  <text x="1242" y="1042" font-size="11" fill="#cbd5e1">usable, but it also means a broken index looks exactly</text>
  <text x="1242" y="1061" font-size="11" fill="#cbd5e1">like a healthy one from the browser — which is precisely</text>
  <text x="1242" y="1080" font-size="11" fill="#cbd5e1">how the empty-collection bug stayed hidden.</text>
  <text x="1242" y="1106" font-size="10.5" fill="#6ee7b7">VectorRagService · HealthController exposes the real state</text>
</svg>`;
}

// =============================================================================
// 7. EMIT
// =============================================================================
type DiagramSpec = {
  name: string;
  svg: string;
  mmd: string;
  puml: string;
  pdfSize: [number, number];
};

async function emitDiagram(spec: DiagramSpec, docsDir: string, publicDir: string): Promise<void> {
  const write = (ext: string, content: string | Buffer): void => {
    fs.writeFileSync(path.join(docsDir, `${spec.name}.${ext}`), content as never);
    fs.writeFileSync(path.join(publicDir, `${spec.name}.${ext}`), content as never);
  };

  write('puml', spec.puml);
  write('mmd', spec.mmd);
  write('svg', spec.svg);
  console.log(`✅ ${spec.name}: PlantUML, Mermaid and Vector SVG`);

  const pngBuffer = new Resvg(spec.svg, { fitTo: { mode: 'width', value: 3600 } }).render().asPng();
  write('png', pngBuffer);
  console.log(`✅ ${spec.name}: Ultra-HD 3600px PNG`);

  const pdfDocs = path.join(docsDir, `${spec.name}.pdf`);
  const pdfPublic = path.join(publicDir, `${spec.name}.pdf`);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: spec.pdfSize, margin: 0 });
    const stream = fs.createWriteStream(pdfDocs);
    doc.pipe(stream);
    doc.image(pngBuffer, 0, 0, { width: spec.pdfSize[0], height: spec.pdfSize[1] });
    doc.end();
    stream.on('finish', () => {
      fs.copyFileSync(pdfDocs, pdfPublic);
      console.log(`✅ ${spec.name}: Architectural PDF`);
      resolve();
    });
    stream.on('error', reject);
  });
}

/**
 * Generates both backend RAG diagrams across all five formats.
 *
 * WHAT: Renders the sequence diagram and the component/data-flow diagram into
 * `docs/diagrams/` and `src/main/frontend/public/`.
 * WHY: The Ollama and Qdrant interaction is the part of the system most often
 * described loosely, and the part where a wrong assumption is most expensive —
 * the latency profile and the fail-soft behaviour both surprise people.
 */
export async function generateAllBackendRagDiagrams(): Promise<void> {
  console.log('📐 Generating Backend RAG Diagrams (PlantUML, Mermaid, SVG, PNG, PDF)...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  await emitDiagram(
    {
      name: 'backend_rag_sequence',
      svg: generateRagSequenceSvg(),
      mmd: generateRagSequenceMermaid(),
      puml: generateRagSequencePuml(),
      pdfSize: [2060, 1660]
    },
    docsDir,
    publicDir
  );

  await emitDiagram(
    {
      name: 'backend_rag_component',
      svg: generateRagComponentSvg(),
      mmd: generateRagComponentMermaid(),
      puml: generateRagComponentPuml(),
      pdfSize: [1820, 1210]
    },
    docsDir,
    publicDir
  );

  console.log('🎉 Backend RAG Diagrams generated across all 5 standard formats!');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  generateAllBackendRagDiagrams().catch((err) => {
    console.error('❌ Backend RAG diagram generation failed:', err);
    process.exit(1);
  });
}
