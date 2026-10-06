# Personal Library & AI Research Engine — Full Capability Mindmap

This document presents the complete functional decomposition and capability matrix for the **Personal Library & AI Research Engine**.

---

## 🧠 Strategic Architecture Pillars

```
Personal Library & AI Research Engine
├── 1. Ingestion & Document Pipeline
│   ├── Multi-Format Ingestion (PDF, DOCX, Markdown, LaTeX, Plain Text)
│   ├── Drag-and-Drop Upload Modal with Real-time Progress & Preview
│   ├── Static BPMN 2.0 Export (document-ingestion-rag.bpmn, for external Camunda Modeler compatibility — no embedded engine)
│   ├── Human Review & Correction Gateway Loop
│   ├── Version-Isolated Physical Storage per Upload (no in-place overwrite)
│   └── Physical Asset Storage with Versioned Archiving
├── 2. BibTeX & LaTeX Metadata Engine
│   ├── AST Lexer & Regex Tokenizer for BibTeX Entries
│   ├── Standard Types (@article, @book, @inproceedings, @techreport, @misc)
│   ├── 14 Supported Metadata Attributes (DOI, Abstract, Keywords, etc.)
│   ├── In-Browser Live BibTeX Editor & Validator
│   ├── LaTeX Special Character & Accent Sanitizer (\"{a}, \'{e} -> UTF-8)
│   ├── One-Click Formatted Citation Clipboard & .bib Exporter
│   └── Multi-Criteria Faceted Filtering & Fulltext Search
├── 3. Dual AI Models & Benchmarking
│   ├── Spring AI Multi-Model Orchestration Engine
│   ├── Ollama Llama 3.3 (70B Instruct) — model tag `llama3.2`: Deep Academic & Research Critique
│   ├── Ollama Mistral Large (2411) — model tag `mistral`: Executive Summary & Operational Takeaways
│   ├── Real-time Model Execution Telemetry (Duration, Speed, Tokens)
│   ├── Side-by-Side Synchronized Benchmark Comparator UI
│   └── Cached Immutable Summary History per Document Version
├── 4. Vector RAG & Conversational Chat
│   ├── Semantic Text Chunking (paragraph-aligned, ~400 characters per chunk, no fixed overlap window)
│   ├── Dense Vector Embeddings Generation
│   ├── Qdrant Vector DB Integration (personal_library_embeddings collection)
│   ├── Sub-10ms Cosine Distance HNSW Indexing
│   ├── Natural Language Conversational Q&A Assistant
│   ├── Interactive Grounded Citation Drawer with Confidence Scores
│   └── Strict Source Verification & Anti-Hallucination Controls
├── 5. Version Control & Lineage Tracking
│   ├── Non-Destructive In-Place Version Overwriting
│   ├── Version Lineage Chain (incrementing versionNumber, embedded versionHistory snapshots)
│   ├── Complete Mutation Audit Trail (Timestamp, User, Changes)
│   ├── Non-Destructive Rollback (restores content as a new latest version)
│   └── Historical Document Asset Download & Rollback
├── 6. Enterprise UI5 Frontend Experience
│   ├── SAP UI5 Web Components & Horizon Dark Dual Theming
│   ├── Standard UI5 Web Components (@ui5/webcomponents v2)
│   ├── ListReport Floorplan with Multi-Field FilterBar
│   ├── ObjectPage Floorplan with Sticky Header & KPI Facets
│   ├── 5 Localized Languages (EN, DE, FR, ES, RO)
│   ├── Observable Reactive State Stores (core Store<T>)
│   ├── Resilient Backend Gateway Facade (REST vs. Mock Driver)
│   └── nginx Single Ingress (Port 8088) Routing to Spring Boot (18080) & Express (13000)
├── 7. Security, Identity & Governance
│   ├── Keycloak 24+ OIDC & OAuth2 JWT Bearer Tokens
│   ├── Role-Based Access Control (LIBRARY_ADMIN, CHIEF_RESEARCHER, VIEWER)
│   ├── Security Event Audit Logging for Enterprise Compliance
│   ├── Strict Path Traversal & Sanitization Protections
│   └── GNU AGPL-3.0-or-later Strongest Network Copyleft
└── 8. Architecture, API & Tooling Ecosystem
    ├── Interactive OpenAPI 3.0.3 Swagger REST Specifications
    ├── Complete C4 Architecture & Component Diagrams
    ├── Technology-Specific UML Class Diagrams (Java & TypeScript)
    ├── Multi-Format Visual Exports (SVG, 4K PNG, Archival PDF, Draw.io)
    ├── Complete Self-Contained Project ZIP Repository Export
    └── TypeDoc & Javadoc Interactive Code Documentation
```

---

## 📦 Generated Artifacts & Formats

| Format | File Path | Resolution / Description |
| :--- | :--- | :--- |
| **Vector SVG** | `docs/diagrams/mindmap.svg` | Scalable vector graphics with high-contrast palette |
| **Ultra-HD PNG** | `docs/diagrams/mindmap.png` | 3840 × 2400 px, 4K supersampled raster via Resvg |
| **Archival PDF** | `docs/diagrams/mindmap.pdf` | 2-page A3 landscape specification & capability catalog |
| **Mermaid Mindmap** | `docs/diagrams/mindmap.mmd` | Mermaid mindmap syntax ready for Markdown/GitHub |
| **PlantUML Mindmap** | `docs/diagrams/mindmap.puml` | PlantUML `@startmindmap` syntax for IDE rendering |

---

## 🌐 Live API Endpoints

- `GET /api/v1/diagrams/mindmap.svg` — SVG Vector
- `GET /api/v1/diagrams/mindmap.png` — Ultra-HD 4K PNG
- `GET /api/v1/diagrams/mindmap.pdf` — Archival 2-page PDF
- `GET /api/v1/diagrams/mindmap.mmd` — Mermaid Mindmap source
- `GET /api/v1/diagrams/mindmap.puml` — PlantUML Mindmap source
