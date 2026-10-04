/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Entity-Relationship & Domain Model Diagram Generator.
 * Generates:
 * 1. docs/diagrams/entity_relationship_diagram.puml (PlantUML ERD)
 * 2. docs/diagrams/entity_relationship_diagram.mmd (Mermaid ERD)
 * 3. docs/diagrams/entity_relationship_diagram.svg (Vector SVG)
 * 4. docs/diagrams/entity_relationship_diagram.png (High-Res 3200px PNG via Resvg)
 * 5. docs/diagrams/entity_relationship_diagram.pdf (Archival PDF via PDFKit)
 * And mirrors them into src/main/frontend/public/ for live web access.
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
// 1. PLANTUML ERD SPECIFICATION
// =============================================================================
export function generateEntityPuml(): string {
  return `@startuml Personal_Library_Entity_Relationship_Diagram
!theme plain
skinparam roundCorner 8
skinparam defaultFontName Inter
skinparam linetype ortho
skinparam shadowing false

title Personal Library & AI Research Engine - Entity Relationship Diagram (ERD)

entity "DocumentEntity" as Document {
  * guid : UUID <<PK, Indexed>>
  --
  previousVersionGuid : UUID <<FK, Self-Ref>>
  versionNumber : Integer
  fileName : String
  fileSize : Long
  fileSizeFormatted : String
  format : String <<pdf|docx|txt|md|pptx>>
  uploadDate : Instant
  editDate : Instant
  contentExcerpt : String
  fullContent : Text
  chunkCount : Integer
  tags : List<String>
  sha256Hash : String
  uploadedBy : String <<FK>>
}

entity "BibTeXMetadata" as BibTeX {
  * bibKey : String <<PK, Synthetic>>
  --
  entryType : Enum <<article|book|inproceedings|techreport|misc>>
  title : String
  author : String
  year : String
  month : String
  journal : String
  booktitle : String
  volume : String
  number : String
  pages : String
  publisher : String
  edition : String
  institution : String
  school : String
  doi : String <<Indexed>>
  isbn : String
  issn : String
  url : String
  abstract : Text
  keywords : String
  rawBibTeX : Text
}

entity "SummaryRecord" as Summary {
  * modelKey : String <<PK: llama | mistral>>
  * documentGuid : UUID <<PK, FK>>
  --
  modelName : String
  summaryText : Text (Markdown)
  generatedAt : Instant
  durationSeconds : Double
  durationFormatted : String
  promptTokens : Integer
  completionTokens : Integer
  temperature : Double
}

entity "DocumentChunk" as Chunk {
  * id : String <<PK: guid-c{index}>>
  --
  documentGuid : UUID <<FK, Payload Filter>>
  chunkIndex : Integer
  text : Text (~500 tokens)
  pageNumber : Integer
  tokenCount : Integer
  startOffset : Integer
  endOffset : Integer
  denseVector : float32[768] <<HNSW Cosine>>
}

entity "DocumentVersionSnapshot" as Snapshot {
  * snapshotGuid : UUID <<PK>>
  --
  documentGuid : UUID <<FK>>
  versionNumber : Integer
  fileName : String
  fileSize : Long
  fileSizeFormatted : String
  format : String
  savedAt : Instant
  sha256Hash : String
  bibtexRaw : Text
  contentExcerpt : String
  fullContent : Text
  chunksCount : Integer
  changeLogNote : String
  modifiedBy : String <<FK>>
}

entity "UserProfile" as User {
  * id : UUID <<PK, Keycloak Sub>>
  --
  username : String <<Unique>>
  email : String
  firstName : String
  lastName : String
  realm : String
  roles : Set<String> <<ADMIN|RESEARCHER|VIEWER>>
}

entity "RAGConversation" as Conversation {
  * conversationId : UUID <<PK>>
  --
  documentGuid : UUID <<FK>>
  userQuery : String
  answerText : Text
  timestamp : Instant
}

entity "CitationReference" as Citation {
  * id : UUID <<PK>>
  --
  conversationId : UUID <<FK>>
  chunkId : String <<FK>>
  citationIndex : Integer <<[1], [2]>>
  similarityScore : Float (0.0-1.0)
  sourceSnippet : Text
  pageNumber : Integer
  charOffset : Integer
}

' Relationships & Cardinalities
Document ||--|| BibTeX : "embedded composition (1:1)"
Document ||--|{ Summary : "dual model summaries (1:2)"
Document ||--o{ Chunk : "partitions into (1:N)"
Document ||--o{ Snapshot : "archives history (1:N)"
Document }o--|| Document : "previous version lineage (0..1:1)"

User ||--o{ Document : "uploads (1:N)"
User ||--o{ Snapshot : "commits mutation (1:N)"

Document ||--o{ Conversation : "scoped Q&A context (1:N)"
Conversation ||--o{ Citation : "contains grounded (1:N)"
Chunk ||--o{ Citation : "verifiable evidence (1:N)"

@enduml
`;
}

// =============================================================================
// 2. MERMAID ERD SPECIFICATION
// =============================================================================
export function generateEntityMermaid(): string {
  return `erDiagram
    DocumentEntity ||--|| BibTeXMetadata : "has 1:1"
    DocumentEntity ||--|{ SummaryRecord : "contains 1:2"
    DocumentEntity ||--o{ DocumentChunk : "splits into 1:N"
    DocumentEntity ||--o{ DocumentVersionSnapshot : "archives 1:N"
    DocumentEntity }o--|| DocumentEntity : "lineage previousVersion"
    UserProfile ||--o{ DocumentEntity : "owns 1:N"
    UserProfile ||--o{ DocumentVersionSnapshot : "authors 1:N"
    DocumentEntity ||--o{ RAGConversation : "grounds 1:N"
    RAGConversation ||--o{ CitationReference : "cites 1:N"
    DocumentChunk ||--o{ CitationReference : "sourced from 1:N"

    DocumentEntity {
        UUID guid PK "Unique document identity"
        UUID previousVersionGuid FK "Predecessor version pointer"
        int versionNumber "Active revision counter"
        string fileName "Physical file asset name"
        long fileSize "Payload size in bytes"
        string format "pdf, docx, txt, md, pptx"
        instant uploadDate "Initial ingestion timestamp"
        instant editDate "Latest modification timestamp"
        string contentExcerpt "Search preview excerpt"
        text fullContent "Full extracted text stream"
        int chunkCount "Total partitioned chunks"
        string sha256Hash "Cryptographic integrity digest"
        string uploadedBy FK "User identity"
    }

    BibTeXMetadata {
        string bibKey PK "Synthesized AuthorYearKey"
        string entryType "article, book, inproceedings"
        string title "Primary publication title"
        string author "Standard author list"
        string year "Publication year"
        string journal "Academic journal"
        string booktitle "Conference title"
        string volume "Volume number"
        string number "Issue number"
        string pages "Page range"
        string publisher "Publishing house"
        string doi "Digital Object Identifier"
        string isbn "International Standard Book No"
        text rawBibTeX "Complete formatted LaTeX entry"
    }

    SummaryRecord {
        string modelKey PK "llama or mistral"
        UUID documentGuid PK,FK "Owning document GUID"
        string modelName "Full model descriptor"
        text summaryText "Executive / Technical Markdown"
        instant generatedAt "Inference timestamp"
        double durationSeconds "Latency metric"
        int promptTokens "Token telemetry"
        int completionTokens "Completion telemetry"
    }

    DocumentChunk {
        string id PK "guid-c{index}"
        UUID documentGuid FK "Qdrant payload filter"
        int chunkIndex "Sequential sequence index"
        text text "Paragraph text (400-500 chars)"
        int pageNumber "Source document page"
        int tokenCount "Token length"
        vector denseVector "768-dim float32 Cosine embedding"
    }

    DocumentVersionSnapshot {
        UUID snapshotGuid PK "Historical archive ID"
        UUID documentGuid FK "Document parent reference"
        int versionNumber "Archived version sequence"
        string fileName "Historical asset name"
        long fileSize "Historical byte size"
        instant savedAt "Snapshot timestamp"
        string sha256Hash "Snapshot digest"
        text bibtexRaw "Preserved BibTeX entry"
        text fullContent "Archived text stream"
        string changeLogNote "User mutation description"
        string modifiedBy FK "Committer user"
    }

    UserProfile {
        UUID id PK "Keycloak sub ID"
        string username "Unique login username"
        string email "Primary contact email"
        string realm "personal-library-realm"
        string roles "LIBRARY_ADMIN, RESEARCHER, VIEWER"
    }

    RAGConversation {
        UUID conversationId PK "Chat session ID"
        UUID documentGuid FK "Context document GUID"
        string userQuery "User natural language prompt"
        text answerText "Synthesized assistant answer"
        instant timestamp "Message timestamp"
    }

    CitationReference {
        UUID id PK "Citation entry ID"
        UUID conversationId FK "Parent conversation ID"
        string chunkId FK "Referenced Qdrant chunk"
        int citationIndex "Citation badge [1], [2]"
        float similarityScore "Cosine similarity 0-100%"
        text sourceSnippet "Verbatim grounding passage"
        int pageNumber "Source page number"
    }
`;
}

// =============================================================================
// 3. HANDCRAFTED ULTRA-CRISP SVG ERD
// =============================================================================
export function generateEntitySvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1150" width="1800" height="1150" style="background:#0b1120; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="erd-title-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>

    <!-- Entity Card Shadows -->
    <filter id="erd-card-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5" />
    </filter>

    <!-- Relationship Connector Arrowheads -->
    <marker id="erd-arrow-blue" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="erd-arrow-emerald" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" />
    </marker>
    <marker id="erd-arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
    </marker>
    <marker id="erd-arrow-amber" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" />
    </marker>
    <marker id="erd-arrow-rose" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fb7185" />
    </marker>
  </defs>

  <!-- Title Banner -->
  <rect x="40" y="25" width="1720" height="75" rx="8" fill="url(#erd-title-grad)" stroke="#1e293b" stroke-width="1.5" />
  <text x="70" y="60" font-size="22" font-weight="800" fill="#f8fafc">Personal Library &amp; AI Research Engine — Domain Entity Model &amp; Database ERD</text>
  <text x="70" y="83" font-size="12" font-weight="500" fill="#94a3b8">Comprehensive Database Schemas: MongoDB BSON Documents • Qdrant Vector Points • Keycloak Security Sub • Version Snapshot Lineage</text>
  <rect x="1570" y="45" width="160" height="32" rx="6" fill="#0070f2" />
  <text x="1650" y="66" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Entity Schema v1.1.0</text>

  <!-- ========================================================================= -->
  <!-- 1. CORE AGGREGATE ROOT: DocumentEntity (MongoDB Primary Document)         -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="40" y="130" width="460" height="490" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
    <rect x="40" y="130" width="460" height="38" rx="8" fill="#0369a1" />
    <text x="270" y="155" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">DocumentEntity (Aggregate Root)</text>
    <text x="480" y="155" font-size="11" font-weight="600" fill="#bae6fd" text-anchor="end">MongoDB [documents]</text>

    <!-- Attributes -->
    <text x="55" y="190" font-size="12" font-family="monospace" font-weight="700" fill="#38bdf8">* guid : UUID &lt;&lt;PK, Indexed&gt;&gt;</text>
    <text x="55" y="212" font-size="11" font-family="monospace" fill="#94a3b8">  previousVersionGuid : UUID? &lt;&lt;Self-Ref FK&gt;&gt;</text>
    <text x="55" y="232" font-size="11" font-family="monospace" fill="#e2e8f0">  versionNumber : Integer (starts at 1)</text>
    <text x="55" y="252" font-size="11" font-family="monospace" fill="#e2e8f0">  fileName : String (e.g. attention.pdf)</text>
    <text x="55" y="272" font-size="11" font-family="monospace" fill="#e2e8f0">  fileSize : Long (bytes)</text>
    <text x="55" y="292" font-size="11" font-family="monospace" fill="#e2e8f0">  fileSizeFormatted : String (e.g. 2.4 MB)</text>
    <text x="55" y="312" font-size="11" font-family="monospace" fill="#e2e8f0">  format : String (pdf, docx, txt, md, pptx)</text>
    <text x="55" y="332" font-size="11" font-family="monospace" fill="#e2e8f0">  uploadDate : Instant (ISO-8601)</text>
    <text x="55" y="352" font-size="11" font-family="monospace" fill="#e2e8f0">  editDate : Instant (latest update)</text>
    <text x="55" y="372" font-size="11" font-family="monospace" fill="#e2e8f0">  contentExcerpt : String (first 300 chars)</text>
    <text x="55" y="392" font-size="11" font-family="monospace" fill="#e2e8f0">  fullContent : Text (extracted plain text)</text>
    <text x="55" y="412" font-size="11" font-family="monospace" fill="#e2e8f0">  chunkCount : Integer (partitioned count)</text>
    <text x="55" y="432" font-size="11" font-family="monospace" fill="#e2e8f0">  tags : List&lt;String&gt; (user defined)</text>
    <text x="55" y="452" font-size="11" font-family="monospace" fill="#e2e8f0">  sha256Hash : String (integrity digest)</text>
    <text x="55" y="472" font-size="11" font-family="monospace" fill="#94a3b8">  uploadedBy : String &lt;&lt;FK -&gt; UserProfile.id&gt;&gt;</text>

    <line x1="40" y1="490" x2="500" y2="490" stroke="#334155" stroke-width="1" />
    <text x="55" y="515" font-size="11" font-weight="600" fill="#38bdf8">1:1 Composition: bibtex (BibTeXMetadata)</text>
    <text x="55" y="535" font-size="11" font-weight="600" fill="#a78bfa">1:2 Composition: summaries (Llama, Mistral)</text>
    <text x="55" y="555" font-size="11" font-weight="600" fill="#34d399">1:N Partitions: chunks (DocumentChunk[])</text>
    <text x="55" y="575" font-size="11" font-weight="600" fill="#fbbf24">1:N Versioning: versionHistory (Snapshots[])</text>
    <text x="55" y="595" font-size="11" font-weight="600" fill="#94a3b8">0..1:1 Self-Ref: previousVersionGuid (Lineage)</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 2. VALUE OBJECT: BibTeXMetadata                                           -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="570" y="130" width="370" height="490" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
    <rect x="570" y="130" width="370" height="38" rx="8" fill="#0284c7" />
    <text x="755" y="155" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">BibTeXMetadata (Embedded)</text>
    <text x="925" y="155" font-size="11" font-weight="600" fill="#e0f2fe" text-anchor="end">Value Object</text>

    <!-- Attributes -->
    <text x="585" y="190" font-size="12" font-family="monospace" font-weight="700" fill="#38bdf8">* bibKey : String &lt;&lt;Synthesized PK&gt;&gt;</text>
    <text x="585" y="212" font-size="11" font-family="monospace" fill="#e2e8f0">  entryType : BibTeXType (article, book...)</text>
    <text x="585" y="232" font-size="11" font-family="monospace" fill="#e2e8f0">  title : String (publication title)</text>
    <text x="585" y="252" font-size="11" font-family="monospace" fill="#e2e8f0">  author : String (canonical author list)</text>
    <text x="585" y="272" font-size="11" font-family="monospace" fill="#e2e8f0">  year : String (e.g. '2017')</text>
    <text x="585" y="292" font-size="11" font-family="monospace" fill="#e2e8f0">  month : String? (e.g. 'December')</text>
    <text x="585" y="312" font-size="11" font-family="monospace" fill="#e2e8f0">  journal : String? (academic journal)</text>
    <text x="585" y="332" font-size="11" font-family="monospace" fill="#e2e8f0">  booktitle : String? (proceedings)</text>
    <text x="585" y="352" font-size="11" font-family="monospace" fill="#e2e8f0">  volume : String? / number : String?</text>
    <text x="585" y="372" font-size="11" font-family="monospace" fill="#e2e8f0">  pages : String? (e.g. '5998-6008')</text>
    <text x="585" y="392" font-size="11" font-family="monospace" fill="#e2e8f0">  publisher : String? (publishing house)</text>
    <text x="585" y="412" font-size="11" font-family="monospace" fill="#e2e8f0">  edition : String? (e.g. '1st Edition')</text>
    <text x="585" y="432" font-size="11" font-family="monospace" fill="#e2e8f0">  institution : String? / school : String?</text>
    <text x="585" y="452" font-size="11" font-family="monospace" fill="#38bdf8">  doi : String? &lt;&lt;DOI Lookup Index&gt;&gt;</text>
    <text x="585" y="472" font-size="11" font-family="monospace" fill="#e2e8f0">  isbn : String? / issn : String?</text>
    <text x="585" y="492" font-size="11" font-family="monospace" fill="#e2e8f0">  url : String? (canonical link)</text>
    <text x="585" y="512" font-size="11" font-family="monospace" fill="#e2e8f0">  abstract : Text (academic summary)</text>
    <text x="585" y="532" font-size="11" font-family="monospace" fill="#e2e8f0">  keywords : String (comma tags)</text>
    <text x="585" y="552" font-size="11" font-family="monospace" fill="#e2e8f0">  rawBibTeX : Text (LaTeX syntax)</text>
    <line x1="570" y1="570" x2="940" y2="570" stroke="#334155" stroke-width="1" />
    <text x="585" y="595" font-size="11" font-style="italic" fill="#94a3b8">AST Lexer generated from document text</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 3. VALUE OBJECT: SummaryRecord (Dual Model LLM Summaries)                 -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="1000" y="130" width="370" height="260" rx="8" fill="#1e293b" stroke="#c084fc" stroke-width="1.5" />
    <rect x="1000" y="130" width="370" height="38" rx="8" fill="#7e22ce" />
    <text x="1185" y="155" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">SummaryRecord (Dual-Model)</text>
    <text x="1355" y="155" font-size="11" font-weight="600" fill="#f3e8ff" text-anchor="end">Ollama AI</text>

    <!-- Attributes -->
    <text x="1015" y="190" font-size="12" font-family="monospace" font-weight="700" fill="#c084fc">* modelKey : 'llama' | 'mistral' &lt;&lt;PK&gt;&gt;</text>
    <text x="1015" y="212" font-size="11" font-family="monospace" fill="#e2e8f0">  modelName : String (Llama 3.3 / Mistral)</text>
    <text x="1015" y="232" font-size="11" font-family="monospace" fill="#e2e8f0">  summaryText : Text (Markdown format)</text>
    <text x="1015" y="252" font-size="11" font-family="monospace" fill="#e2e8f0">  generatedAt : Instant (timestamp)</text>
    <text x="1015" y="272" font-size="11" font-family="monospace" fill="#e2e8f0">  durationSeconds : Double (inference time)</text>
    <text x="1015" y="292" font-size="11" font-family="monospace" fill="#e2e8f0">  durationFormatted : String ('14.2s')</text>
    <text x="1015" y="312" font-size="11" font-family="monospace" fill="#e2e8f0">  promptTokens : Integer (input length)</text>
    <text x="1015" y="332" font-size="11" font-family="monospace" fill="#e2e8f0">  completionTokens : Integer (output)</text>
    <text x="1015" y="352" font-size="11" font-family="monospace" fill="#e2e8f0">  temperature : Double (0.2 Llama, 0.3 Mistral)</text>
    <line x1="1000" y1="365" x2="1370" y2="365" stroke="#334155" stroke-width="1" />
    <text x="1015" y="382" font-size="10.5" font-style="italic" fill="#c084fc">Eliminates single-model cognitive bias</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 4. QDRANT VECTOR POINT: DocumentChunk                                      -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="1410" y="130" width="350" height="260" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="1.5" />
    <rect x="1410" y="130" width="350" height="38" rx="8" fill="#047857" />
    <text x="1585" y="155" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">DocumentChunk (Vector)</text>
    <text x="1745" y="155" font-size="11" font-weight="600" fill="#d1fae5" text-anchor="end">Qdrant DB</text>

    <!-- Attributes -->
    <text x="1425" y="190" font-size="12" font-family="monospace" font-weight="700" fill="#34d399">* id : String &lt;&lt;PK: guid-c{idx}&gt;&gt;</text>
    <text x="1425" y="212" font-size="11" font-family="monospace" fill="#38bdf8">* documentGuid : UUID &lt;&lt;FK, Payload Filter&gt;&gt;</text>
    <text x="1425" y="232" font-size="11" font-family="monospace" fill="#e2e8f0">  chunkIndex : Integer (0, 1, 2...)</text>
    <text x="1425" y="252" font-size="11" font-family="monospace" fill="#e2e8f0">  text : Text (~400-500 tokens)</text>
    <text x="1425" y="272" font-size="11" font-family="monospace" fill="#e2e8f0">  pageNumber : Integer (source page)</text>
    <text x="1425" y="292" font-size="11" font-family="monospace" fill="#e2e8f0">  tokenCount : Integer (sub-words)</text>
    <text x="1425" y="312" font-size="11" font-family="monospace" fill="#34d399">  denseVector : float32[768] &lt;&lt;Vector&gt;&gt;</text>
    <text x="1425" y="332" font-size="11" font-family="monospace" fill="#94a3b8">  hnswIndex : HNSW (Cosine, M=16, ef=100)</text>
    <line x1="1410" y1="350" x2="1760" y2="350" stroke="#334155" stroke-width="1" />
    <text x="1425" y="375" font-size="10.5" font-style="italic" fill="#34d399">Collection: personal_library_embeddings</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 5. AUDIT ARCHIVE: DocumentVersionSnapshot                                 -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="40" y="680" width="460" height="430" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5" />
    <rect x="40" y="680" width="460" height="38" rx="8" fill="#b45309" />
    <text x="270" y="705" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">DocumentVersionSnapshot (Audit)</text>
    <text x="480" y="705" font-size="11" font-weight="600" fill="#fef3c7" text-anchor="end">Immutable Chain</text>

    <!-- Attributes -->
    <text x="55" y="740" font-size="12" font-family="monospace" font-weight="700" fill="#fbbf24">* snapshotGuid : UUID &lt;&lt;PK, Historical ID&gt;&gt;</text>
    <text x="55" y="762" font-size="11" font-family="monospace" fill="#38bdf8">* documentGuid : UUID &lt;&lt;FK -&gt; DocumentEntity&gt;&gt;</text>
    <text x="55" y="782" font-size="11" font-family="monospace" fill="#e2e8f0">  versionNumber : Integer (archived revision)</text>
    <text x="55" y="802" font-size="11" font-family="monospace" fill="#e2e8f0">  fileName : String (e.g. attention_v1.pdf)</text>
    <text x="55" y="822" font-size="11" font-family="monospace" fill="#e2e8f0">  fileSize : Long / fileSizeFormatted : String</text>
    <text x="55" y="842" font-size="11" font-family="monospace" fill="#e2e8f0">  format : String (pdf, docx, etc.)</text>
    <text x="55" y="862" font-size="11" font-family="monospace" fill="#e2e8f0">  savedAt : Instant (snapshot timestamp)</text>
    <text x="55" y="882" font-size="11" font-family="monospace" fill="#e2e8f0">  sha256Hash : String (immutable digest)</text>
    <text x="55" y="902" font-size="11" font-family="monospace" fill="#e2e8f0">  bibtexRaw : Text (historical BibTeX entry)</text>
    <text x="55" y="922" font-size="11" font-family="monospace" fill="#e2e8f0">  llamaSummary : Text? / mistralSummary : Text?</text>
    <text x="55" y="942" font-size="11" font-family="monospace" fill="#e2e8f0">  contentExcerpt : String / fullContent : Text?</text>
    <text x="55" y="962" font-size="11" font-family="monospace" fill="#e2e8f0">  chunksCount : Integer (chunks at snapshot)</text>
    <text x="55" y="982" font-size="11" font-family="monospace" fill="#fbbf24">  changeLogNote : String (audit description)</text>
    <text x="55" y="1002" font-size="11" font-family="monospace" fill="#94a3b8">  modifiedBy : String &lt;&lt;FK -&gt; UserProfile.id&gt;&gt;</text>
    <line x1="40" y1="1025" x2="500" y2="1025" stroke="#334155" stroke-width="1" />
    <text x="55" y="1050" font-size="11" font-weight="600" fill="#fbbf24">Non-Destructive Rollback Target</text>
    <text x="55" y="1070" font-size="10.5" font-style="italic" fill="#94a3b8">Restoring version N creates version M = max(v) + 1 without purge</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 6. SECURITY & IDENTITY: UserProfile (Keycloak OIDC Realm)                 -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="570" y="680" width="370" height="240" rx="8" fill="#1e293b" stroke="#f43f5e" stroke-width="1.5" />
    <rect x="570" y="680" width="370" height="38" rx="8" fill="#be123c" />
    <text x="755" y="705" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">UserProfile (Keycloak IAM)</text>
    <text x="925" y="705" font-size="11" font-weight="600" fill="#ffe4e6" text-anchor="end">OIDC JWT</text>

    <!-- Attributes -->
    <text x="585" y="740" font-size="12" font-family="monospace" font-weight="700" fill="#fb7185">* id : UUID &lt;&lt;PK, Keycloak Sub Claim&gt;&gt;</text>
    <text x="585" y="762" font-size="11" font-family="monospace" fill="#e2e8f0">  username : String &lt;&lt;Unique Login&gt;&gt;</text>
    <text x="585" y="782" font-size="11" font-family="monospace" fill="#e2e8f0">  email : String (verified corporate email)</text>
    <text x="585" y="802" font-size="11" font-family="monospace" fill="#e2e8f0">  firstName : String / lastName : String</text>
    <text x="585" y="822" font-size="11" font-family="monospace" fill="#e2e8f0">  realm : String ('personal-library-realm')</text>
    <text x="585" y="842" font-size="11" font-family="monospace" fill="#fb7185">  roles : Set&lt;String&gt; &lt;&lt;RBAC Claims&gt;&gt;</text>
    <line x1="570" y1="860" x2="940" y2="860" stroke="#334155" stroke-width="1" />
    <text x="585" y="885" font-size="11" font-weight="600" fill="#fb7185">RBAC Roles: LIBRARY_ADMIN, CHIEF_RESEARCHER</text>
    <text x="585" y="905" font-size="10.5" font-style="italic" fill="#94a3b8">Token: RS256 signed JSON Web Token (RFC 7519)</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 7. RAG INTERACTION: RAGConversation & CitationReference                   -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="1000" y="470" width="370" height="230" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
    <rect x="1000" y="470" width="370" height="38" rx="8" fill="#0369a1" />
    <text x="1185" y="495" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">RAGConversation</text>
    <text x="1355" y="495" font-size="11" font-weight="600" fill="#bae6fd" text-anchor="end">Session Q&amp;A</text>

    <!-- Attributes -->
    <text x="1015" y="530" font-size="12" font-family="monospace" font-weight="700" fill="#38bdf8">* conversationId : UUID &lt;&lt;PK&gt;&gt;</text>
    <text x="1015" y="552" font-size="11" font-family="monospace" fill="#38bdf8">* documentGuid : UUID &lt;&lt;FK -&gt; DocumentEntity&gt;&gt;</text>
    <text x="1015" y="572" font-size="11" font-family="monospace" fill="#e2e8f0">  userQuery : String (natural language query)</text>
    <text x="1015" y="592" font-size="11" font-family="monospace" fill="#e2e8f0">  answerText : Text (synthesized RAG answer)</text>
    <text x="1015" y="612" font-size="11" font-family="monospace" fill="#e2e8f0">  timestamp : Instant (query timestamp)</text>
    <line x1="1000" y1="630" x2="1370" y2="630" stroke="#334155" stroke-width="1" />
    <text x="1015" y="655" font-size="11" font-weight="600" fill="#38bdf8">1:N Citations: references (CitationReference[])</text>
    <text x="1015" y="675" font-size="10.5" font-style="italic" fill="#94a3b8">Grounds generation in retrieved vector context</text>
  </g>

  <!-- CitationReference -->
  <g filter="url(#erd-card-shadow)">
    <rect x="1410" y="470" width="350" height="230" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="1.5" />
    <rect x="1410" y="470" width="350" height="38" rx="8" fill="#047857" />
    <text x="1585" y="495" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">CitationReference (Grounding)</text>
    <text x="1745" y="495" font-size="11" font-weight="600" fill="#d1fae5" text-anchor="end">Evidence</text>

    <!-- Attributes -->
    <text x="1425" y="530" font-size="12" font-family="monospace" font-weight="700" fill="#34d399">* id : UUID &lt;&lt;PK&gt;&gt;</text>
    <text x="1425" y="552" font-size="11" font-family="monospace" fill="#38bdf8">* conversationId : UUID &lt;&lt;FK -&gt; Conversation&gt;&gt;</text>
    <text x="1425" y="572" font-size="11" font-family="monospace" fill="#34d399">* chunkId : String &lt;&lt;FK -&gt; DocumentChunk.id&gt;&gt;</text>
    <text x="1425" y="592" font-size="11" font-family="monospace" fill="#e2e8f0">  citationIndex : Integer ([1], [2] badge)</text>
    <text x="1425" y="612" font-size="11" font-family="monospace" fill="#34d399">  similarityScore : Float (e.g. 0.918 = 91.8%)</text>
    <text x="1425" y="632" font-size="11" font-family="monospace" fill="#e2e8f0">  sourceSnippet : Text (verbatim quote)</text>
    <text x="1425" y="652" font-size="11" font-family="monospace" fill="#e2e8f0">  pageNumber : Integer / charOffset : Integer</text>
    <line x1="1410" y1="665" x2="1760" y2="665" stroke="#334155" stroke-width="1" />
    <text x="1425" y="685" font-size="10.5" font-style="italic" fill="#34d399">Powers interactive source inspection drawer</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 8. PROJECTION STATE: CatalogFilterState & Query Model                     -->
  <!-- ========================================================================= -->
  <g filter="url(#erd-card-shadow)">
    <rect x="1000" y="740" width="760" height="230" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
    <rect x="1000" y="740" width="760" height="38" rx="8" fill="#075985" />
    <text x="1380" y="765" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">CatalogFilterState &amp; Query Projection Model</text>
    <text x="1745" y="765" font-size="11" font-weight="600" fill="#e0f2fe" text-anchor="end">Analytical List Report</text>

    <text x="1015" y="805" font-size="11" font-family="monospace" fill="#e2e8f0">fileName : String? (regex match)</text>
    <text x="1015" y="825" font-size="11" font-family="monospace" fill="#e2e8f0">title : String? (case-insensitive fuzzy)</text>
    <text x="1015" y="845" font-size="11" font-family="monospace" fill="#e2e8f0">author : String? (author filter)</text>
    <text x="1015" y="865" font-size="11" font-family="monospace" fill="#e2e8f0">edition : String? / format : String? (enum)</text>

    <text x="1380" y="805" font-size="11" font-family="monospace" fill="#34d399">content : String? (Qdrant semantic search)</text>
    <text x="1380" y="825" font-size="11" font-family="monospace" fill="#e2e8f0">page : Integer (1-based) / pageSize : Integer (10, 20)</text>
    <text x="1380" y="845" font-size="11" font-family="monospace" fill="#e2e8f0">sortBy : fileName | title | author | edition | uploadDate</text>
    <text x="1380" y="865" font-size="11" font-family="monospace" fill="#e2e8f0">sortOrder : asc | desc</text>

    <line x1="1000" y1="885" x2="1760" y2="885" stroke="#334155" stroke-width="1" />
    <text x="1015" y="910" font-size="11" font-weight="600" fill="#38bdf8">Reactive Store: FilterStore (TypeScript) &lt;--&gt; Spring Data MongoDB Criteria Builder</text>
    <text x="1015" y="930" font-size="10.5" font-style="italic" fill="#94a3b8">Binds UI5 FilterBar inputs to backend paginated REST queries (/api/v1/documents)</text>
  </g>

  <!-- ========================================================================= -->
  <!-- RELATIONSHIP CONNECTORS (Orthogonal Strict 90-Degree Paths)                -->
  <!-- ========================================================================= -->
  <!-- 1. DocumentEntity to BibTeXMetadata (1:1 Horizontal) -->
  <path d="M 500 280 L 570 280" fill="none" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#erd-arrow-blue)" />
  <rect x="510" y="260" width="48" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="534" y="273" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">1 : 1</text>

  <!-- 2. DocumentEntity to SummaryRecord (1:2 via channel above BibTeX) -->
  <path d="M 400 130 L 400 115 L 1185 115 L 1185 130" fill="none" stroke="#c084fc" stroke-width="2.5" marker-end="url(#erd-arrow-purple)" />
  <rect x="760" y="105" width="60" height="18" rx="4" fill="#0f172a" stroke="#c084fc" stroke-width="1" />
  <text x="790" y="118" font-size="10" font-weight="700" fill="#c084fc" text-anchor="middle">1 : 2 (Dual)</text>

  <!-- 3. DocumentEntity to DocumentChunk (1:N via top channel to Qdrant) -->
  <path d="M 450 130 L 450 100 L 1585 100 L 1585 130" fill="none" stroke="#34d399" stroke-width="2.5" marker-end="url(#erd-arrow-emerald)" />
  <rect x="990" y="90" width="55" height="18" rx="4" fill="#0f172a" stroke="#34d399" stroke-width="1" />
  <text x="1017" y="103" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">1 : N</text>

  <!-- 4. DocumentEntity to DocumentVersionSnapshot (1:N Vertical Down) -->
  <path d="M 270 620 L 270 680" fill="none" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#erd-arrow-amber)" />
  <rect x="245" y="640" width="50" height="18" rx="4" fill="#0f172a" stroke="#fbbf24" stroke-width="1" />
  <text x="270" y="653" font-size="10" font-weight="700" fill="#fbbf24" text-anchor="middle">1 : N</text>

  <!-- 5. UserProfile to DocumentEntity (1:N Horizontal Left) -->
  <path d="M 570 750 L 500 750" fill="none" stroke="#fb7185" stroke-width="2" marker-end="url(#erd-arrow-rose)" />
  <rect x="515" y="738" width="40" height="18" rx="4" fill="#0f172a" stroke="#fb7185" stroke-width="1" />
  <text x="535" y="751" font-size="10" font-weight="700" fill="#fb7185" text-anchor="middle">1 : N</text>

  <!-- 6. DocumentEntity to RAGConversation (1:N via middle channel) -->
  <path d="M 500 480 L 1000 480" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#erd-arrow-blue)" />
  <rect x="720" y="470" width="55" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="747" y="483" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">1 : N</text>

  <!-- 7. RAGConversation to CitationReference (1:N Horizontal Right) -->
  <path d="M 1370 560 L 1410 560" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#erd-arrow-blue)" />
  <rect x="1375" y="550" width="30" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="1390" y="563" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">1:N</text>

  <!-- 8. DocumentChunk to CitationReference (1:N Vertical Down) -->
  <path d="M 1585 390 L 1585 470" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#erd-arrow-emerald)" />
  <rect x="1560" y="420" width="50" height="18" rx="4" fill="#0f172a" stroke="#34d399" stroke-width="1" />
  <text x="1585" y="433" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">1 : N</text>

  <!-- 9. Self-Referential Lineage Loop on DocumentEntity -->
  <path d="M 40 250 L 15 250 L 15 350 L 40 350" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#erd-arrow-blue)" />
  <rect x="5" y="290" width="22" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="16" y="303" font-size="9" font-weight="700" fill="#38bdf8" text-anchor="middle">0..1</text>

</svg>`;
}

// =============================================================================
// 4. MAIN EXPORT AND EXECUTION FUNCTION
// =============================================================================
export async function generateAllEntityDiagrams(): Promise<void> {
  console.log('📐 Generating Domain Entity Diagrams (PlantUML, Mermaid, SVG, PNG, PDF)...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. PlantUML
  const pumlContent = generateEntityPuml();
  fs.writeFileSync(path.join(docsDir, 'entity_relationship_diagram.puml'), pumlContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'entity_relationship_diagram.puml'), pumlContent, 'utf-8');
  console.log('✅ Generated PlantUML ERD (.puml)');

  // 2. Mermaid
  const mmdContent = generateEntityMermaid();
  fs.writeFileSync(path.join(docsDir, 'entity_relationship_diagram.mmd'), mmdContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'entity_relationship_diagram.mmd'), mmdContent, 'utf-8');
  console.log('✅ Generated Mermaid ERD (.mmd)');

  // 3. SVG
  const svgContent = generateEntitySvg();
  fs.writeFileSync(path.join(docsDir, 'entity_relationship_diagram.svg'), svgContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'entity_relationship_diagram.svg'), svgContent, 'utf-8');
  console.log('✅ Generated Vector SVG ERD (.svg)');

  // 4. PNG via Resvg
  const resvg = new Resvg(svgContent, { fitTo: { mode: 'width', value: 3600 } });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'entity_relationship_diagram.png'), pngBuffer);
  fs.writeFileSync(path.join(publicDir, 'entity_relationship_diagram.png'), pngBuffer);
  console.log('✅ Generated Ultra-HD 3600px PNG ERD (.png)');

  // 5. PDF via PDFKit
  const pdfPathDocs = path.join(docsDir, 'entity_relationship_diagram.pdf');
  const pdfPathPublic = path.join(publicDir, 'entity_relationship_diagram.pdf');

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [1920, 1200],
      margin: 0
    });

    const writeStream = fs.createWriteStream(pdfPathDocs);
    doc.pipe(writeStream);
    doc.image(pngBuffer, 0, 0, { width: 1920, height: 1200 });
    doc.end();

    writeStream.on('finish', () => {
      fs.copyFileSync(pdfPathDocs, pdfPathPublic);
      console.log('✅ Generated Architectural PDF ERD (.pdf)');
      resolve();
    });

    writeStream.on('error', reject);
  });

  console.log('🎉 Entity Relationship Diagrams generated across all 5 standard formats!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllEntityDiagrams().catch(err => {
    console.error('Failed generating entity diagrams:', err);
    process.exit(1);
  });
}
