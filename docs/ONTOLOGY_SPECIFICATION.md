# Personal Library & AI Research Engine — System Ontology & Knowledge Graph Specification

This document defines the formal domain ontology, knowledge representation schema, and semantic graph taxonomy modeled across the **Personal Library & Enterprise Multi-Model RAG Research Assistant**.

The ontology aligns with international semantic web and digital library standards:
- **W3C OWL 2 (Web Ontology Language)**: Conceptual class definitions, class hierarchies, and object property constraints.
- **W3C PROV-O (Provenance Ontology)**: Detailed tracking of entities (`prov:Entity`), generative AI agents (`prov:Agent`), and processing activities (`prov:Activity`).
- **BIBO (Bibliographic Ontology)**: Representation of academic articles, books, proceedings, and technical reports.
- **Dublin Core (DCMI)**: Standard digital library core metadata attributes (`dc:title`, `dc:creator`, `dc:date`, `dc:format`, `dc:identifier`).
- **FOAF (Friend of a Friend)**: Agent modeling for authors and publishing institutions (`foaf:Person`, `foaf:Organization`).

---

## 1. Visual Ontology Artifacts Suite

The complete system ontology is published across 6 synchronized formats:

| Format | File Link | Description |
| :--- | :--- | :--- |
| **Vector SVG** | [`docs/diagrams/system_ontology_diagram.svg`](diagrams/system_ontology_diagram.svg) | High-definition scalable vector diagram featuring 5 semantic domains and orthogonal object property links |
| **Ultra-HD PNG** | [`docs/diagrams/system_ontology_diagram.png`](diagrams/system_ontology_diagram.png) | 3600px rasterized diagram rendered via the Resvg vector engine |
| **Architectural PDF** | [`docs/diagrams/system_ontology_diagram.pdf`](diagrams/system_ontology_diagram.pdf) | Landscape high-resolution PDF document generated via PDFKit |
| **W3C RDF Turtle (.ttl)** | [`docs/diagrams/system_ontology.ttl`](diagrams/system_ontology.ttl) | Formal, machine-readable W3C Turtle RDF ontology triples |
| **PlantUML (.puml)** | [`docs/diagrams/system_ontology_diagram.puml`](diagrams/system_ontology_diagram.puml) | Raw PlantUML ontology class model |
| **Mermaid (.mmd)** | [`docs/diagrams/system_ontology_diagram.mmd`](diagrams/system_ontology_diagram.mmd) | Raw Mermaid.js class graph specification |
| **Interactive Web Viewer** | [`docs/ontology-diagram.html`](ontology-diagram.html) | Interactive web viewer with full taxonomy breakdown and export options |

---

## 2. Ontological Domains & Class Hierarchies

### 2.1 Domain 1: Scholarly Assets & Bibliographic Knowledge
Represents ingested digital documents and their publication metadata.

```
prov:Entity
  └── :DocumentAsset
        └── :ScholarlyPublication (also bibo:Document)
              ├── :AcademicArticle (bibo:AcademicArticle)
              ├── :BookPublication (bibo:Book)
              ├── :ConferenceProceedings (bibo:Proceedings)
              └── :TechnicalReport (bibo:Report)

prov:Entity
  └── :BibliographicMetadata
        └── :BibTeXRecord

prov:Agent
  ├── foaf:Person ──> :AuthorAgent
  └── foaf:Organization ──> :PublisherAgent
```

* **Core Axioms:**
  * `:describesDocument` (`:BibliographicMetadata` $\to$ `:DocumentAsset`): Binds structured metadata to an asset.
  * `:authoredBy` (`:DocumentAsset` $\to$ `:AuthorAgent`): Attribution link.
  * `:publishedBy` (`:DocumentAsset` $\to$ `:PublisherAgent`): Institutional origin.

---

### 2.2 Domain 2: Dense Vector Representation & Semantic Partitioning
Models the mathematical vectorization of document passages into multi-dimensional metric spaces.

```
prov:Entity
  └── :TextPassageChunk
        └── (hasPart :tokenCount, :pageNumber, :chunkIndex)

owl:Class
  └── :DenseVectorEmbedding
        ├── :vectorDimensions = 768 (xsd:integer)
        ├── :metric = "Cosine" (xsd:string)
        └── :precision = "float32"

prov:Agent
  └── :EmbeddingModel
        ├── :NomicEmbedText ("nomic-embed-text", 8192 context)
        └── :GoogleTextEmbedding ("text-embedding-004", Matryoshka)

owl:Class
  └── :VectorSpaceCollection
        └── :QdrantCollection ("personal_library_embeddings", HNSW M=16, efConstruct=100)
```

* **Core Axioms:**
  * `:partitionedInto` (`:DocumentAsset` $\to$ `:TextPassageChunk`): 1:N paragraph-boundary text decomposition.
  * `:representedBy` (`:TextPassageChunk` $\to$ `:DenseVectorEmbedding`): Semantic vector representation.
  * `:encodedByModel` (`:DenseVectorEmbedding` $\to$ `:EmbeddingModel`): Algorithmic origin.
  * `:indexedIn` (`:DenseVectorEmbedding` $\to$ `:VectorSpaceCollection`): HNSW graph persistence.

---

### 2.3 Domain 3: Multi-Model AI Inference & Triangulation
Models foundational LLM engines and their analytical syntheses to eliminate single-model cognitive bias.

```
prov:Agent
  └── :ComputationalModel
        └── :GenerativeLLM
              ├── :Llama3Model (Meta Llama 3.3 70B Instruct, temp=0.2)
              └── :MistralLargeModel (Mistral Large 2411, temp=0.3)

prov:Entity
  └── :AnalyticalSummary
        ├── :ExecutiveTakeawaySummary (Synthesized by :Llama3Model)
        └── :MethodologicalCritiqueSummary (Synthesized by :MistralLargeModel)
```

* **Core Axioms:**
  * `:summarizedAs` (`:DocumentAsset` $\to$ `:AnalyticalSummary`): Dual 1:2 parallel summary association.
  * `:synthesizedBy` (`:AnalyticalSummary` $\to$ `:GenerativeLLM`): W3C PROV-O `wasGeneratedBy` tracking.
  * **Cognitive Triangulation**: Side-by-side juxtaposition of strict factual takeaways (Llama) against deep methodological appraisals (Mistral).

---

### 2.4 Domain 4: Conversational RAG & Grounded Evidence
Formalizes interactive conversational research grounded in verifiable mathematical evidence.

```
prov:Activity
  └── :ConversationalSession
        └── (hasPart :UserQuery, :AssistantResponse)

prov:Entity
  └── :AssistantResponse
        └── :citesEvidence ──> :GroundedCitation

owl:Class
  └── :GroundedCitation
        ├── :similarityScore (xsd:float, Cosine >= 0.65)
        ├── :verbatimQuote (xsd:string)
        └── :pageOffset (xsd:integer)
```

* **Core Axioms:**
  * `:scopedTo` (`:ConversationalSession` $\to$ `:DocumentAsset`): Restricts retrieval context strictly to a single document GUID.
  * `:grounds` (`:TextPassageChunk` $\to$ `:GroundedCitation`): Links citation evidence directly to immutable text passages.
  * `:citesEvidence` (`:AssistantResponse` $\to$ `:GroundedCitation`): Enforces verifiable attribution for every factual statement.
  * `prov:wasDerivedFrom` (`:AssistantResponse` $\to$ `:TextPassageChunk`): Complete audit chain.

---

### 2.5 Domain 5: Governance, BPMN 2.0 Workflow & Audit Lineage
Models enterprise compliance, asynchronous process orchestration, and non-destructive versioning.

```
prov:Entity
  └── :AuditSnapshot
        ├── :snapshotGuid (xsd:string, PK)
        ├── :versionNumber (xsd:integer)
        ├── :sha256Digest (xsd:string, 64-hex chars)
        └── :changeLogNote (xsd:string)

prov:Activity
  └── :BPMNWorkflowProcess
        ├── :processId ("camunda-ingestion-flow")
        ├── :retryPolicy ("R3/PT10S")
        └── :swimlanes (4: Librarian, Ingestion Engine, AI Workers, Storage)

prov:Agent
  └── :SecurityPrincipal
        └── :UserAccount (Keycloak OIDC JWT sub)
              └── :hasRole ("LIBRARY_ADMIN", "CHIEF_RESEARCHER", "VIEWER")
```

* **Core Axioms:**
  * `:hasHistoricalSnapshot` (`:DocumentAsset` $\to$ `:AuditSnapshot`): 1:N version history chain.
  * `:previousVersionLineage` (`:DocumentAsset` $\to$ `:DocumentAsset`): Directed acyclic version evolution graph.
  * `:orchestratedBy` (`:DocumentAsset` $\to$ `:BPMNWorkflowProcess`): Lifecycle management via Camunda 2.0.
  * `:governedBy` (`:DocumentAsset` $\to$ `:SecurityPrincipal`): Access control enforcement.
  * **Non-Destructive Rollback Axiom:** Rollback to version $N$ clones snapshot $N$ into newly advanced version $M = \max(V) + 1$, maintaining an unbroken audit trail.

---

## 3. Formal Object Properties Matrix

| Property Name | Domain (`rdfs:domain`) | Range (`rdfs:range`) | Description |
| :--- | :--- | :--- | :--- |
| `:describesDocument` | `:BibliographicMetadata` | `:DocumentAsset` | Attaches 14-field BibTeX metadata to a document. |
| `:authoredBy` | `:DocumentAsset` | `:AuthorAgent` | Denotes authorship by a person. |
| `:publishedBy` | `:DocumentAsset` | `:PublisherAgent` | Denotes publishing organization. |
| `:partitionedInto` | `:DocumentAsset` | `:TextPassageChunk` | Partitions document into semantic chunks (~500 chars). |
| `:representedBy` | `:TextPassageChunk` | `:DenseVectorEmbedding` | Maps text passage to 768-dimensional float32 vector. |
| `:encodedByModel` | `:DenseVectorEmbedding`| `:EmbeddingModel` | Identifies model used for dense vector transformation. |
| `:indexedIn` | `:DenseVectorEmbedding`| `:VectorSpaceCollection` | Indexes vector in Qdrant HNSW collection. |
| `:summarizedAs` | `:DocumentAsset` | `:AnalyticalSummary` | Associates dual AI summaries with the document. |
| `:synthesizedBy` | `:AnalyticalSummary` | `:GenerativeLLM` | Records LLM engine responsible for summary generation. |
| `:scopedTo` | `:ConversationalSession` | `:DocumentAsset` | Scopes conversational chat to a single document. |
| `:grounds` | `:TextPassageChunk` | `:GroundedCitation` | Binds citation evidence to a specific source passage. |
| `:citesEvidence` | `:AssistantResponse` | `:GroundedCitation` | Attaches evidence citations to synthesized responses. |
| `:hasHistoricalSnapshot`| `:DocumentAsset` | `:AuditSnapshot` | Links document to immutable prior version states. |
| `:previousVersionLineage`| `:DocumentAsset` | `:DocumentAsset` | Self-referential pointer tracking version history. |
| `:orchestratedBy` | `:DocumentAsset` | `:BPMNWorkflowProcess` | Assigns document ingestion to Camunda workflow. |
| `:governedBy` | `:DocumentAsset` | `:SecurityPrincipal` | Subject to Keycloak RBAC security policies. |

---

## 4. W3C RDF Turtle (.ttl) Triples Sample

```turtle
@prefix : <https://personallibrary.io/ontology#> .
@prefix bibo: <http://purl.org/ontology/bibo/> .
@prefix prov: <http://www.w3.org/ns/prov#> .

# Document Entity Instance
:doc_550e8400 a :AcademicArticle , prov:Entity ;
    :guid "550e8400-e29b-41d4-a716-446655440000" ;
    :fileName "attention_is_all_you_need.pdf" ;
    :format "pdf" ;
    :partitionedInto :chunk_0 , :chunk_1 ;
    :summarizedAs :summary_llama , :summary_mistral ;
    :hasHistoricalSnapshot :snapshot_v1 .

# Dense Vector Representation
:chunk_0 a :TextPassageChunk , prov:Entity ;
    :chunkIndex 0 ;
    :representedBy :vec_chunk_0 .

:vec_chunk_0 a :DenseVectorEmbedding ;
    :dimensions 768 ;
    :metric "Cosine" ;
    :encodedByModel :model_nomic ;
    :indexedIn :qdrant_collection .

# Dual Inference Models
:summary_llama a :ExecutiveTakeawaySummary ;
    :synthesizedBy :model_llama_3_3 ;
    :durationSeconds 14.2 .

:summary_mistral a :MethodologicalCritiqueSummary ;
    :synthesizedBy :model_mistral_large ;
    :durationSeconds 11.5 .
```
