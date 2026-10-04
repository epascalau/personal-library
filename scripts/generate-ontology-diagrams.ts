/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * System Ontology & Semantic Knowledge Graph Generator.
 * Compiles formal ontology definitions aligned with W3C RDF/OWL, PROV-O, BIBO, and Dublin Core:
 * 1. docs/diagrams/system_ontology_diagram.puml (PlantUML Ontology)
 * 2. docs/diagrams/system_ontology_diagram.mmd (Mermaid Semantic Graph)
 * 3. docs/diagrams/system_ontology_diagram.svg (Vector SVG with taxonomy zones & object properties)
 * 4. docs/diagrams/system_ontology_diagram.png (High-Res 3600px PNG via Resvg)
 * 5. docs/diagrams/system_ontology_diagram.pdf (Archival PDF via PDFKit)
 * 6. docs/diagrams/system_ontology.ttl (W3C RDF Turtle serialization)
 * And mirrors them into src/main/frontend/public/ for direct browser serving.
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
// 1. W3C RDF TURTLE (TTL) FORMAL ONTOLOGY
// =============================================================================
export function generateOntologyTurtle(): string {
  return `@prefix : <https://personallibrary.io/ontology#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix bibo: <http://purl.org/ontology/bibo/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<https://personallibrary.io/ontology> a owl:Ontology ;
    dc:title "Personal Library & Enterprise Multi-Model RAG Research Engine Ontology"@en ;
    dc:description "Formal semantic domain ontology modeling scholarly documents, dense vector representations, dual LLM inference, grounded RAG citations, and immutable audit provenance."@en ;
    owl:versionInfo "1.0.0" .

### Classes - Core Document & Information Entities

:DocumentAsset a owl:Class ;
    rdfs:subClassOf prov:Entity ;
    rdfs:label "Document Asset"@en ;
    rdfs:comment "The primary digital asset ingested into the enterprise personal library."@en .

:ScholarlyPublication a owl:Class ;
    rdfs:subClassOf :DocumentAsset , bibo:Document ;
    rdfs:label "Scholarly Publication"@en .

:AcademicArticle a owl:Class ;
    rdfs:subClassOf :ScholarlyPublication , bibo:AcademicArticle ;
    rdfs:label "Academic Article"@en .

:BookPublication a owl:Class ;
    rdfs:subClassOf :ScholarlyPublication , bibo:Book ;
    rdfs:label "Book Publication"@en .

:ConferenceProceedings a owl:Class ;
    rdfs:subClassOf :ScholarlyPublication , bibo:Proceedings ;
    rdfs:label "Conference Proceedings"@en .

:TechnicalReport a owl:Class ;
    rdfs:subClassOf :ScholarlyPublication , bibo:Report ;
    rdfs:label "Technical Report"@en .

### Classes - Bibliographic & Metadata Entities

:BibliographicMetadata a owl:Class ;
    rdfs:subClassOf prov:Entity ;
    rdfs:label "Bibliographic Metadata"@en .

:BibTeXRecord a owl:Class ;
    rdfs:subClassOf :BibliographicMetadata ;
    rdfs:label "BibTeX Record"@en .

:AuthorAgent a owl:Class ;
    rdfs:subClassOf foaf:Person , prov:Agent ;
    rdfs:label "Author Agent"@en .

:PublisherAgent a owl:Class ;
    rdfs:subClassOf foaf:Organization , prov:Agent ;
    rdfs:label "Publisher Organization"@en .

### Classes - Vector & Semantic Search Entities

:TextPassageChunk a owl:Class ;
    rdfs:subClassOf prov:Entity ;
    rdfs:label "Text Passage Chunk"@en ;
    rdfs:comment "A paragraph-bounded sliding-window text segment extracted for embedding."@en .

:DenseVectorEmbedding a owl:Class ;
    rdfs:label "Dense Vector Embedding"@en ;
    rdfs:comment "A 768-dimensional mathematical vector representation of semantic passage meaning."@en .

:VectorSpaceCollection a owl:Class ;
    rdfs:label "Vector Space Collection"@en ;
    rdfs:comment "Qdrant HNSW vector index collection partitioned by document GUID."@en .

### Classes - AI, Models & Inference

:ComputationalModel a owl:Class ;
    rdfs:subClassOf prov:Agent ;
    rdfs:label "Computational Model"@en .

:EmbeddingModel a owl:Class ;
    rdfs:subClassOf :ComputationalModel ;
    rdfs:label "Dense Embedding Model"@en .

:GenerativeLLM a owl:Class ;
    rdfs:subClassOf :ComputationalModel ;
    rdfs:label "Generative Large Language Model"@en .

:Llama3Model a owl:Class ;
    rdfs:subClassOf :GenerativeLLM ;
    rdfs:label "Meta Llama 3.3 (70B Instruct)"@en .

:MistralLargeModel a owl:Class ;
    rdfs:subClassOf :GenerativeLLM ;
    rdfs:label "Mistral Large (2411)"@en .

:AnalyticalSummary a owl:Class ;
    rdfs:subClassOf prov:Entity ;
    rdfs:label "Analytical Summary"@en .

:ExecutiveTakeawaySummary a owl:Class ;
    rdfs:subClassOf :AnalyticalSummary ;
    rdfs:label "Executive Takeaway Summary (Llama)"@en .

:MethodologicalCritiqueSummary a owl:Class ;
    rdfs:subClassOf :AnalyticalSummary ;
    rdfs:label "Methodological Critique Summary (Mistral)"@en .

### Classes - Conversational RAG & Grounded Citations

:ConversationalSession a owl:Class ;
    rdfs:subClassOf prov:Activity ;
    rdfs:label "RAG Conversational Session"@en .

:UserQuery a owl:Class ;
    rdfs:label "User Query"@en .

:AssistantResponse a owl:Class ;
    rdfs:subClassOf prov:Entity ;
    rdfs:label "Grounded Assistant Response"@en .

:GroundedCitation a owl:Class ;
    rdfs:label "Grounded Citation Evidence"@en ;
    rdfs:comment "Verifiable evidence passage linking answer claims to exact chunk offsets."@en .

### Classes - Provenance, Versioning & Security

:AuditSnapshot a owl:Class ;
    rdfs:subClassOf prov:Entity ;
    rdfs:label "Audit Snapshot"@en ;
    rdfs:comment "Immutable state snapshot captured prior to overwrite or rollback."@en .

:SecurityPrincipal a owl:Class ;
    rdfs:subClassOf prov:Agent ;
    rdfs:label "Security Principal"@en .

:UserAccount a owl:Class ;
    rdfs:subClassOf :SecurityPrincipal , foaf:Person ;
    rdfs:label "Keycloak Authenticated User"@en .

:BPMNWorkflowProcess a owl:Class ;
    rdfs:subClassOf prov:Activity ;
    rdfs:label "Camunda BPMN Ingestion Workflow"@en .

### Object Properties

:describesDocument a owl:ObjectProperty ;
    rdfs:domain :BibliographicMetadata ;
    rdfs:range :DocumentAsset .

:authoredBy a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :AuthorAgent .

:publishedBy a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :PublisherAgent .

:partitionedInto a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :TextPassageChunk .

:representedBy a owl:ObjectProperty ;
    rdfs:domain :TextPassageChunk ;
    rdfs:range :DenseVectorEmbedding .

:encodedByModel a owl:ObjectProperty ;
    rdfs:domain :DenseVectorEmbedding ;
    rdfs:range :EmbeddingModel .

:indexedIn a owl:ObjectProperty ;
    rdfs:domain :DenseVectorEmbedding ;
    rdfs:range :VectorSpaceCollection .

:summarizedAs a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :AnalyticalSummary .

:synthesizedBy a owl:ObjectProperty ;
    rdfs:domain :AnalyticalSummary ;
    rdfs:range :GenerativeLLM .

:hasHistoricalSnapshot a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :AuditSnapshot .

:previousVersion a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :DocumentAsset .

:orchestratedByWorkflow a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :BPMNWorkflowProcess .

:grounds a owl:ObjectProperty ;
    rdfs:domain :TextPassageChunk ;
    rdfs:range :GroundedCitation .

:citesEvidence a owl:ObjectProperty ;
    rdfs:domain :AssistantResponse ;
    rdfs:range :GroundedCitation .

:managedBy a owl:ObjectProperty ;
    rdfs:domain :DocumentAsset ;
    rdfs:range :UserAccount .
`;
}

// =============================================================================
// 2. PLANTUML ONTOLOGY SPECIFICATION
// =============================================================================
export function generateOntologyPuml(): string {
  return `@startuml System_Ontology_Knowledge_Graph
!theme plain
skinparam roundCorner 8
skinparam defaultFontName Inter
skinparam linetype ortho
skinparam shadowing false
skinparam packageStyle rectangle

title Personal Library & AI Research Engine - Formal Domain Ontology

package "Document & Scholarly Domain" #0369a1 {
  class DocumentAsset <<owl:Class>> {
    + guid: xsd:string
    + fileName: xsd:string
    + format: xsd:string
    + uploadDate: xsd:dateTime
  }
  
  class ScholarlyPublication <<owl:Class>>
  class AcademicArticle <<owl:Class>>
  class BookPublication <<owl:Class>>
  class ConferenceProceedings <<owl:Class>>
  class TechnicalReport <<owl:Class>>
  
  ScholarlyPublication -up-|> DocumentAsset
  AcademicArticle -up-|> ScholarlyPublication
  BookPublication -up-|> ScholarlyPublication
  ConferenceProceedings -up-|> ScholarlyPublication
  TechnicalReport -up-|> ScholarlyPublication
}

package "Bibliographic Knowledge Domain" #0284c7 {
  class BibliographicMetadata <<owl:Class>> {
    + bibKey: xsd:string
    + entryType: xsd:string
    + title: xsd:string
    + year: xsd:string
    + doi: xsd:string
  }
  class AuthorAgent <<prov:Agent>>
  class PublisherAgent <<prov:Agent>>
}

package "Vector & Embedding Domain" #047857 {
  class TextPassageChunk <<owl:Class>> {
    + chunkIndex: xsd:integer
    + text: xsd:string
    + pageNumber: xsd:integer
  }
  
  class DenseVectorEmbedding <<owl:Class>> {
    + dimensions: xsd:integer = 768
    + metric: xsd:string = "Cosine"
  }
  
  class VectorSpaceCollection <<owl:Class>> {
    + collectionName: "personal_library_embeddings"
  }
  
  class EmbeddingModel <<prov:Agent>> {
    + modelName: "nomic-embed-text"
  }
}

package "Inference & Multi-Model AI Domain" #7e22ce {
  abstract class GenerativeLLM <<prov:Agent>>
  class Llama3Model <<prov:Agent>> {
    + modelName: "Llama 3.3 (70B Instruct)"
    + temperature: 0.2
  }
  class MistralLargeModel <<prov:Agent>> {
    + modelName: "Mistral Large (2411)"
    + temperature: 0.3
  }
  
  abstract class AnalyticalSummary <<prov:Entity>> {
    + latencySeconds: xsd:decimal
    + summaryText: xsd:string
  }
  class ExecutiveTakeawaySummary <<prov:Entity>>
  class MethodologicalCritiqueSummary <<prov:Entity>>
  
  Llama3Model -up-|> GenerativeLLM
  MistralLargeModel -up-|> GenerativeLLM
  ExecutiveTakeawaySummary -up-|> AnalyticalSummary
  MethodologicalCritiqueSummary -up-|> AnalyticalSummary
}

package "Conversational RAG Domain" #0891b2 {
  class ConversationalSession <<prov:Activity>>
  class AssistantResponse <<prov:Entity>>
  class GroundedCitation <<owl:Class>> {
    + similarityScore: xsd:float
    + verbatimQuote: xsd:string
  }
}

package "Governance & Audit Lineage" #b45309 {
  class AuditSnapshot <<prov:Entity>> {
    + snapshotGuid: xsd:string
    + versionNumber: xsd:integer
    + sha256Digest: xsd:string
  }
  class SecurityPrincipal <<prov:Agent>>
  class BPMNWorkflowProcess <<prov:Activity>>
}

' Ontological Properties & Semantic Relationships
BibliographicMetadata --> DocumentAsset : ":describesDocument"
DocumentAsset --> AuthorAgent : ":authoredBy"
DocumentAsset --> PublisherAgent : ":publishedBy"

DocumentAsset --> TextPassageChunk : ":partitionedInto (1:N)"
TextPassageChunk --> DenseVectorEmbedding : ":representedBy"
DenseVectorEmbedding --> EmbeddingModel : ":encodedByModel"
DenseVectorEmbedding --> VectorSpaceCollection : ":indexedIn"

DocumentAsset --> AnalyticalSummary : ":summarizedAs (1:2)"
ExecutiveTakeawaySummary --> Llama3Model : ":synthesizedBy"
MethodologicalCritiqueSummary --> MistralLargeModel : ":synthesizedBy"

ConversationalSession --> DocumentAsset : ":scopedTo"
ConversationalSession --> AssistantResponse : ":generates"
AssistantResponse --> GroundedCitation : ":citesEvidence"
TextPassageChunk --> GroundedCitation : ":grounds"

DocumentAsset --> AuditSnapshot : ":hasHistoricalSnapshot"
DocumentAsset --> DocumentAsset : ":previousVersionLineage"
DocumentAsset --> BPMNWorkflowProcess : ":orchestratedBy"
DocumentAsset --> SecurityPrincipal : ":governedBy"

@enduml
`;
}

// =============================================================================
// 3. MERMAID ONTOLOGY SPECIFICATION
// =============================================================================
export function generateOntologyMermaid(): string {
  return `classDiagram
    direction TB

    class DocumentAsset {
      <<prov:Entity>>
      +UUID guid
      +string fileName
      +string format
      +instant uploadDate
    }

    class ScholarlyPublication {
      <<bibo:Document>>
    }
    class AcademicArticle
    class BookPublication
    class ConferenceProceedings
    class TechnicalReport

    ScholarlyPublication --|> DocumentAsset : subClassOf
    AcademicArticle --|> ScholarlyPublication : subClassOf
    BookPublication --|> ScholarlyPublication : subClassOf
    ConferenceProceedings --|> ScholarlyPublication : subClassOf
    TechnicalReport --|> ScholarlyPublication : subClassOf

    class BibliographicMetadata {
      <<prov:Entity>>
      +string bibKey
      +string title
      +string year
      +string doi
    }
    class AuthorAgent {
      <<prov:Agent>>
      +string name
    }
    class PublisherAgent {
      <<prov:Agent>>
      +string publisherName
    }

    BibliographicMetadata --> DocumentAsset : describesDocument
    DocumentAsset --> AuthorAgent : authoredBy
    DocumentAsset --> PublisherAgent : publishedBy

    class TextPassageChunk {
      <<prov:Entity>>
      +int chunkIndex
      +string text
      +int pageNumber
    }

    class DenseVectorEmbedding {
      <<owl:Class>>
      +float32[768] vector
      +string metric = Cosine
    }

    class VectorSpaceCollection {
      <<Qdrant>>
      +string collectionName
      +int HNSW_M = 16
    }

    class EmbeddingModel {
      <<prov:Agent>>
      +string model = nomic-embed-text
    }

    DocumentAsset --> TextPassageChunk : partitionedInto
    TextPassageChunk --> DenseVectorEmbedding : representedBy
    DenseVectorEmbedding --> EmbeddingModel : encodedByModel
    DenseVectorEmbedding --> VectorSpaceCollection : indexedIn

    class AnalyticalSummary {
      <<prov:Entity>>
      +decimal latencySeconds
      +string markdownText
    }
    class ExecutiveTakeawaySummary
    class MethodologicalCritiqueSummary
    AnalyticalSummary <|-- ExecutiveTakeawaySummary
    AnalyticalSummary <|-- MethodologicalCritiqueSummary

    class GenerativeLLM {
      <<prov:Agent>>
    }
    class Llama3Model {
      <<Ollama>>
      +string model = Llama-3.3-70B
      +float temp = 0.2
    }
    class MistralLargeModel {
      <<Ollama>>
      +string model = Mistral-Large-2411
      +float temp = 0.3
    }
    GenerativeLLM <|-- Llama3Model
    GenerativeLLM <|-- MistralLargeModel

    DocumentAsset --> AnalyticalSummary : summarizedAs
    ExecutiveTakeawaySummary --> Llama3Model : synthesizedBy
    MethodologicalCritiqueSummary --> MistralLargeModel : synthesizedBy

    class ConversationalSession {
      <<prov:Activity>>
      +UUID sessionId
      +string userQuery
    }
    class AssistantResponse {
      <<prov:Entity>>
      +string answerText
    }
    class GroundedCitation {
      <<owl:Class>>
      +float similarityScore
      +string sourceSnippet
    }

    ConversationalSession --> DocumentAsset : scopedTo
    ConversationalSession --> AssistantResponse : generates
    AssistantResponse --> GroundedCitation : citesEvidence
    TextPassageChunk --> GroundedCitation : grounds

    class AuditSnapshot {
      <<prov:Entity>>
      +UUID snapshotGuid
      +int versionNumber
      +string sha256Digest
    }
    class SecurityPrincipal {
      <<Keycloak>>
      +UUID userId
      +set roles
    }
    class BPMNWorkflowProcess {
      <<Camunda>>
      +string processId
    }

    DocumentAsset --> AuditSnapshot : hasHistoricalSnapshot
    DocumentAsset --> DocumentAsset : previousVersionLineage
    DocumentAsset --> BPMNWorkflowProcess : orchestratedBy
    DocumentAsset --> SecurityPrincipal : governedBy
`;
}

// =============================================================================
// 4. PUBLICATION-GRADE SVG ONTOLOGY DIAGRAM
// =============================================================================
export function generateOntologySvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1900 1250" width="1900" height="1250" style="background:#0b1120; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="onto-title-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>

    <!-- Zone Background Gradients -->
    <linearGradient id="zone-doc" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.04" />
    </linearGradient>
    <linearGradient id="zone-vec" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.04" />
    </linearGradient>
    <linearGradient id="zone-ai" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7e22ce" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.04" />
    </linearGradient>
    <linearGradient id="zone-rag" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0891b2" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.04" />
    </linearGradient>
    <linearGradient id="zone-gov" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.04" />
    </linearGradient>

    <filter id="onto-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.45" />
    </filter>

    <!-- Semantic Connectors -->
    <marker id="onto-arrow-blue" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="onto-arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" />
    </marker>
    <marker id="onto-arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
    </marker>
    <marker id="onto-arrow-amber" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" />
    </marker>
    <marker id="onto-arrow-cyan" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#22d3ee" />
    </marker>
  </defs>

  <!-- Title Banner -->
  <rect x="40" y="25" width="1820" height="75" rx="8" fill="url(#onto-title-grad)" stroke="#1e293b" stroke-width="1.5" />
  <text x="70" y="60" font-size="22" font-weight="800" fill="#f8fafc">Personal Library &amp; AI Research Engine — System Ontology &amp; Semantic Knowledge Graph</text>
  <text x="70" y="83" font-size="12" font-weight="500" fill="#94a3b8">W3C OWL 2 / RDF Standards: Dublin Core (dc:) • Bibliographic Ontology (bibo:) • W3C Provenance (prov-o:) • FOAF (foaf:)</text>
  <rect x="1660" y="45" width="175" height="32" rx="6" fill="#0284c7" />
  <text x="1747" y="66" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Ontology v1.0.0 (TTL)</text>

  <!-- ========================================================================= -->
  <!-- ZONE 1: DOCUMENT & BIBLIOGRAPHIC KNOWLEDGE DOMAIN (BLUE)                  -->
  <!-- ========================================================================= -->
  <rect x="40" y="125" width="570" height="520" rx="12" fill="url(#zone-doc)" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="60" y="152" font-size="14" font-weight="800" fill="#38bdf8">DOMAIN 1: SCHOLARLY ASSET &amp; BIBLIOGRAPHIC ENTITIES (bibo:, dc:)</text>

  <!-- DocumentAsset (prov:Entity) -->
  <g filter="url(#onto-shadow)">
    <rect x="60" y="175" width="250" height="155" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
    <rect x="60" y="175" width="250" height="30" rx="8" fill="#0369a1" />
    <text x="185" y="195" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">DocumentAsset</text>
    <text x="75" y="225" font-size="11" font-family="monospace" fill="#38bdf8">&lt;&lt;prov:Entity, owl:Class&gt;&gt;</text>
    <text x="75" y="245" font-size="11" font-family="monospace" fill="#e2e8f0">+ guid: xsd:string [PK]</text>
    <text x="75" y="265" font-size="11" font-family="monospace" fill="#e2e8f0">+ fileName: xsd:string</text>
    <text x="75" y="285" font-size="11" font-family="monospace" fill="#e2e8f0">+ format: xsd:string</text>
    <text x="75" y="305" font-size="11" font-family="monospace" fill="#e2e8f0">+ uploadDate: xsd:dateTime</text>
  </g>

  <!-- BibliographicMetadata (bibo:Document) -->
  <g filter="url(#onto-shadow)">
    <rect x="340" y="175" width="250" height="155" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" />
    <rect x="340" y="175" width="250" height="30" rx="8" fill="#0284c7" />
    <text x="465" y="195" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">BibliographicMetadata</text>
    <text x="355" y="225" font-size="11" font-family="monospace" fill="#38bdf8">&lt;&lt;bibo:Document, ValueObject&gt;&gt;</text>
    <text x="355" y="245" font-size="11" font-family="monospace" fill="#e2e8f0">+ bibKey: xsd:string [Key]</text>
    <text x="355" y="265" font-size="11" font-family="monospace" fill="#e2e8f0">+ entryType: xsd:string</text>
    <text x="355" y="285" font-size="11" font-family="monospace" fill="#e2e8f0">+ title: xsd:string</text>
    <text x="355" y="305" font-size="11" font-family="monospace" fill="#e2e8f0">+ doi: xsd:string [Optional]</text>
  </g>

  <!-- Taxonomy Subclasses of ScholarlyPublication -->
  <g filter="url(#onto-shadow)">
    <rect x="60" y="360" width="530" height="260" rx="8" fill="#1e293b" stroke="#0369a1" stroke-width="1" />
    <text x="80" y="385" font-size="12" font-weight="700" fill="#bae6fd">TAXONOMY: ScholarlyPublication (subClassOf DocumentAsset)</text>
    
    <!-- Subclass badges -->
    <rect x="80" y="405" width="220" height="42" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="95" y="430" font-size="11" font-weight="600" fill="#e2e8f0">AcademicArticle (bibo:Article)</text>

    <rect x="330" y="405" width="240" height="42" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="345" y="430" font-size="11" font-weight="600" fill="#e2e8f0">BookPublication (bibo:Book)</text>

    <rect x="80" y="460" width="220" height="42" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="95" y="485" font-size="11" font-weight="600" fill="#e2e8f0">ConferenceProceedings (bibo:Proc)</text>

    <rect x="330" y="460" width="240" height="42" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="345" y="485" font-size="11" font-weight="600" fill="#e2e8f0">TechnicalReport (bibo:Report)</text>

    <!-- Agents -->
    <rect x="80" y="520" width="220" height="80" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="95" y="545" font-size="12" font-weight="700" fill="#38bdf8">AuthorAgent</text>
    <text x="95" y="565" font-size="10" font-family="monospace" fill="#94a3b8">&lt;&lt;foaf:Person, prov:Agent&gt;&gt;</text>
    <text x="95" y="585" font-size="10.5" fill="#e2e8f0">:authoredBy relationship</text>

    <rect x="330" y="520" width="240" height="80" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
    <text x="345" y="545" font-size="12" font-weight="700" fill="#38bdf8">PublisherAgent</text>
    <text x="345" y="565" font-size="10" font-family="monospace" fill="#94a3b8">&lt;&lt;foaf:Org, prov:Agent&gt;&gt;</text>
    <text x="345" y="585" font-size="10.5" fill="#e2e8f0">:publishedBy relationship</text>
  </g>

  <!-- ========================================================================= -->
  <!-- ZONE 2: VECTOR REPRESENTATION & EMBEDDING DOMAIN (EMERALD)                 -->
  <!-- ========================================================================= -->
  <rect x="640" y="125" width="580" height="520" rx="12" fill="url(#zone-vec)" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="660" y="152" font-size="14" font-weight="800" fill="#34d399">DOMAIN 2: DENSE VECTOR REPRESENTATION &amp; QDRANT INDEXING</text>

  <!-- TextPassageChunk -->
  <g filter="url(#onto-shadow)">
    <rect x="660" y="175" width="260" height="155" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="2" />
    <rect x="660" y="175" width="260" height="30" rx="8" fill="#047857" />
    <text x="790" y="195" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">TextPassageChunk</text>
    <text x="675" y="225" font-size="11" font-family="monospace" fill="#34d399">&lt;&lt;prov:Entity, owl:Class&gt;&gt;</text>
    <text x="675" y="245" font-size="11" font-family="monospace" fill="#e2e8f0">+ chunkIndex: xsd:integer</text>
    <text x="675" y="265" font-size="11" font-family="monospace" fill="#e2e8f0">+ text: xsd:string (~500 chars)</text>
    <text x="675" y="285" font-size="11" font-family="monospace" fill="#e2e8f0">+ pageNumber: xsd:integer</text>
    <text x="675" y="305" font-size="11" font-family="monospace" fill="#e2e8f0">+ tokenCount: xsd:integer</text>
  </g>

  <!-- DenseVectorEmbedding -->
  <g filter="url(#onto-shadow)">
    <rect x="950" y="175" width="250" height="155" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="1.5" />
    <rect x="950" y="175" width="250" height="30" rx="8" fill="#059669" />
    <text x="1075" y="195" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">DenseVectorEmbedding</text>
    <text x="965" y="225" font-size="11" font-family="monospace" fill="#34d399">&lt;&lt;owl:Class, Mathematical&gt;&gt;</text>
    <text x="965" y="245" font-size="11" font-family="monospace" fill="#e2e8f0">+ dimensions: 768 (dense)</text>
    <text x="965" y="265" font-size="11" font-family="monospace" fill="#e2e8f0">+ precision: float32</text>
    <text x="965" y="285" font-size="11" font-family="monospace" fill="#e2e8f0">+ metric: CosineSimilarity</text>
    <text x="965" y="305" font-size="11" font-family="monospace" fill="#e2e8f0">+ norm: L2-Normalized</text>
  </g>

  <!-- Vector Infrastructure & Models -->
  <g filter="url(#onto-shadow)">
    <rect x="660" y="360" width="540" height="260" rx="8" fill="#1e293b" stroke="#047857" stroke-width="1" />
    <text x="680" y="385" font-size="12" font-weight="700" fill="#a7f3d0">VECTOR REASONING &amp; EMBEDDING ENGINES</text>

    <rect x="680" y="405" width="240" height="95" rx="6" fill="#0f172a" stroke="#34d399" stroke-width="1" />
    <text x="695" y="430" font-size="12" font-weight="700" fill="#34d399">EmbeddingModel</text>
    <text x="695" y="450" font-size="10" font-family="monospace" fill="#94a3b8">&lt;&lt;prov:Agent, Transformer&gt;&gt;</text>
    <text x="695" y="470" font-size="11" fill="#e2e8f0">Nomic Embed Text (8k ctx)</text>
    <text x="695" y="488" font-size="10.5" fill="#94a3b8">Fallback: text-embedding-004</text>

    <rect x="940" y="405" width="240" height="95" rx="6" fill="#0f172a" stroke="#34d399" stroke-width="1" />
    <text x="955" y="430" font-size="12" font-weight="700" fill="#34d399">VectorSpaceCollection</text>
    <text x="955" y="450" font-size="10" font-family="monospace" fill="#94a3b8">&lt;&lt;Qdrant HNSW Graph&gt;&gt;</text>
    <text x="955" y="470" font-size="11" fill="#e2e8f0">personal_library_embeddings</text>
    <text x="955" y="488" font-size="10.5" fill="#94a3b8">M=16, efConstruct=100</text>

    <!-- Vector Similarity Concept -->
    <rect x="680" y="520" width="500" height="80" rx="6" fill="#0f172a" stroke="#34d399" stroke-width="1" />
    <text x="695" y="545" font-size="12" font-weight="700" fill="#34d399">SemanticRetrievalQuery (k-NN / ANN)</text>
    <text x="695" y="565" font-size="11" fill="#e2e8f0">Evaluates inner product: cos(&#952;) = (A &#8226; B) / (||A|| &#215; ||B||)</text>
    <text x="695" y="585" font-size="10.5" fill="#94a3b8">Strictly filtered by :hasDocumentScope to isolate contexts</text>
  </g>

  <!-- ========================================================================= -->
  <!-- ZONE 3: ARTIFICIAL INTELLIGENCE & INFERENCE DOMAIN (PURPLE)               -->
  <!-- ========================================================================= -->
  <rect x="1250" y="125" width="610" height="520" rx="12" fill="url(#zone-ai)" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="1270" y="152" font-size="14" font-weight="800" fill="#c084fc">DOMAIN 3: DUAL-MODEL AI INFERENCE &amp; MULTI-PERSPECTIVE SYNTHESIS</text>

  <!-- AnalyticalSummary Base -->
  <g filter="url(#onto-shadow)">
    <rect x="1270" y="175" width="270" height="155" rx="8" fill="#1e293b" stroke="#c084fc" stroke-width="2" />
    <rect x="1270" y="175" width="270" height="30" rx="8" fill="#7e22ce" />
    <text x="1405" y="195" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">AnalyticalSummary</text>
    <text x="1285" y="225" font-size="11" font-family="monospace" fill="#c084fc">&lt;&lt;prov:Entity, owl:Class&gt;&gt;</text>
    <text x="1285" y="245" font-size="11" font-family="monospace" fill="#e2e8f0">+ summaryText: xsd:string</text>
    <text x="1285" y="265" font-size="11" font-family="monospace" fill="#e2e8f0">+ durationSeconds: xsd:decimal</text>
    <text x="1285" y="285" font-size="11" font-family="monospace" fill="#e2e8f0">+ generatedAt: xsd:dateTime</text>
    <text x="1285" y="305" font-size="11" font-family="monospace" fill="#e2e8f0">+ tokenCount: xsd:integer</text>
  </g>

  <!-- GenerativeLLM Base -->
  <g filter="url(#onto-shadow)">
    <rect x="1570" y="175" width="270" height="155" rx="8" fill="#1e293b" stroke="#c084fc" stroke-width="1.5" />
    <rect x="1570" y="175" width="270" height="30" rx="8" fill="#6b21a8" />
    <text x="1705" y="195" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">GenerativeLLM</text>
    <text x="1585" y="225" font-size="11" font-family="monospace" fill="#c084fc">&lt;&lt;prov:Agent, FoundationModel&gt;&gt;</text>
    <text x="1585" y="245" font-size="11" font-family="monospace" fill="#e2e8f0">+ modelFamily: xsd:string</text>
    <text x="1585" y="265" font-size="11" font-family="monospace" fill="#e2e8f0">+ inferenceEngine: "Ollama"</text>
    <text x="1585" y="285" font-size="11" font-family="monospace" fill="#e2e8f0">+ contextWindow: xsd:integer</text>
    <text x="1585" y="305" font-size="11" font-family="monospace" fill="#e2e8f0">+ samplingTemp: xsd:float</text>
  </g>

  <!-- Concrete Dual Models & Summaries -->
  <g filter="url(#onto-shadow)">
    <rect x="1270" y="360" width="570" height="260" rx="8" fill="#1e293b" stroke="#7e22ce" stroke-width="1" />
    <text x="1290" y="385" font-size="12" font-weight="700" fill="#e9d5ff">DUAL-MODEL INFERENCE TAXONOMY</text>

    <!-- Llama Model & Summary -->
    <rect x="1290" y="405" width="260" height="95" rx="6" fill="#0f172a" stroke="#c084fc" stroke-width="1" />
    <text x="1305" y="430" font-size="12" font-weight="700" fill="#c084fc">Llama3Model (subClassOf LLM)</text>
    <text x="1305" y="450" font-size="10.5" fill="#e2e8f0">Meta Llama 3.3 (70B Instruct)</text>
    <text x="1305" y="468" font-size="10" font-family="monospace" fill="#94a3b8">temp = 0.2 (Strict Factuality)</text>
    <text x="1305" y="486" font-size="10" fill="#c084fc">&#8594; ExecutiveTakeawaySummary</text>

    <!-- Mistral Model & Summary -->
    <rect x="1570" y="405" width="250" height="95" rx="6" fill="#0f172a" stroke="#c084fc" stroke-width="1" />
    <text x="1585" y="430" font-size="12" font-weight="700" fill="#c084fc">MistralLargeModel (subClassOf)</text>
    <text x="1585" y="450" font-size="10.5" fill="#e2e8f0">Mistral Large (2411)</text>
    <text x="1585" y="468" font-size="10" font-family="monospace" fill="#94a3b8">temp = 0.3 (Fluency/Depth)</text>
    <text x="1585" y="486" font-size="10" fill="#c084fc">&#8594; MethodologicalCritiqueSummary</text>

    <!-- Cognitive Bias Elimination Note -->
    <rect x="1290" y="520" width="530" height="80" rx="6" fill="#0f172a" stroke="#c084fc" stroke-width="1" />
    <text x="1305" y="545" font-size="12" font-weight="700" fill="#c084fc">Dual-Model Epistemic Triangulation</text>
    <text x="1305" y="565" font-size="11" fill="#e2e8f0">Contrasts independent model weights side-by-side to expose hallucinations</text>
    <text x="1305" y="585" font-size="10.5" fill="#94a3b8">Records prompt tokens, completion tokens, and millisecond latencies</text>
  </g>

  <!-- ========================================================================= -->
  <!-- ZONE 4: CONVERSATIONAL RAG & CITATION EVIDENCE DOMAIN (CYAN)              -->
  <!-- ========================================================================= -->
  <rect x="40" y="675" width="880" height="530" rx="12" fill="url(#zone-rag)" stroke="#0891b2" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="60" y="702" font-size="14" font-weight="800" fill="#22d3ee">DOMAIN 4: CONVERSATIONAL RAG &amp; GROUNDED CITATION EVIDENCE</text>

  <!-- ConversationalSession -->
  <g filter="url(#onto-shadow)">
    <rect x="60" y="725" width="260" height="155" rx="8" fill="#1e293b" stroke="#22d3ee" stroke-width="2" />
    <rect x="60" y="725" width="260" height="30" rx="8" fill="#0891b2" />
    <text x="190" y="745" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">ConversationalSession</text>
    <text x="75" y="775" font-size="11" font-family="monospace" fill="#22d3ee">&lt;&lt;prov:Activity, Session&gt;&gt;</text>
    <text x="75" y="795" font-size="11" font-family="monospace" fill="#e2e8f0">+ sessionId: xsd:string [PK]</text>
    <text x="75" y="815" font-size="11" font-family="monospace" fill="#e2e8f0">+ startTime: xsd:dateTime</text>
    <text x="75" y="835" font-size="11" font-family="monospace" fill="#e2e8f0">+ userQuery: xsd:string</text>
    <text x="75" y="855" font-size="11" font-family="monospace" fill="#e2e8f0">+ turnCount: xsd:integer</text>
  </g>

  <!-- AssistantResponse -->
  <g filter="url(#onto-shadow)">
    <rect x="350" y="725" width="260" height="155" rx="8" fill="#1e293b" stroke="#22d3ee" stroke-width="1.5" />
    <rect x="350" y="725" width="260" height="30" rx="8" fill="#0e7490" />
    <text x="480" y="745" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">AssistantResponse</text>
    <text x="365" y="775" font-size="11" font-family="monospace" fill="#22d3ee">&lt;&lt;prov:Entity, Synthesized&gt;&gt;</text>
    <text x="365" y="795" font-size="11" font-family="monospace" fill="#e2e8f0">+ answerText: xsd:string</text>
    <text x="365" y="815" font-size="11" font-family="monospace" fill="#e2e8f0">+ responseTime: xsd:decimal</text>
    <text x="365" y="835" font-size="11" font-family="monospace" fill="#e2e8f0">+ isGrounded: xsd:boolean = true</text>
    <text x="365" y="855" font-size="11" font-family="monospace" fill="#e2e8f0">+ citationCount: xsd:integer</text>
  </g>

  <!-- GroundedCitation -->
  <g filter="url(#onto-shadow)">
    <rect x="640" y="725" width="260" height="155" rx="8" fill="#1e293b" stroke="#22d3ee" stroke-width="2" />
    <rect x="640" y="725" width="260" height="30" rx="8" fill="#155e75" />
    <text x="770" y="745" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">GroundedCitation</text>
    <text x="655" y="775" font-size="11" font-family="monospace" fill="#22d3ee">&lt;&lt;owl:Class, EvidenceLink&gt;&gt;</text>
    <text x="655" y="795" font-size="11" font-family="monospace" fill="#e2e8f0">+ citationIndex: [1], [2]...</text>
    <text x="655" y="815" font-size="11" font-family="monospace" fill="#e2e8f0">+ similarityScore: xsd:float</text>
    <text x="655" y="835" font-size="11" font-family="monospace" fill="#e2e8f0">+ verbatimQuote: xsd:string</text>
    <text x="655" y="855" font-size="11" font-family="monospace" fill="#e2e8f0">+ pageOffset: xsd:integer</text>
  </g>

  <!-- RAG Grounding Mechanism Explanation Card -->
  <g filter="url(#onto-shadow)">
    <rect x="60" y="910" width="840" height="270" rx="8" fill="#1e293b" stroke="#0891b2" stroke-width="1" />
    <text x="80" y="935" font-size="12" font-weight="700" fill="#a5f3fc">PROVENANCE &amp; EVIDENCE GROUNDING CHAIN (W3C PROV-O)</text>
    
    <text x="80" y="965" font-size="11" font-family="monospace" fill="#22d3ee">UserQuery &#8594; VectorRagService &#8594; ANN Top-K (Cosine &#8805; 0.65) &#8594; Grounded Context</text>
    <text x="80" y="990" font-size="11.5" fill="#e2e8f0">Every factual assertion in the AssistantResponse is bound to a GroundedCitation entity.</text>
    <text x="80" y="1010" font-size="11" fill="#94a3b8">1. :grounds (TextPassageChunk &#8594; GroundedCitation): Anchors citation to immutable chunk text.</text>
    <text x="80" y="1030" font-size="11" fill="#94a3b8">2. :citesEvidence (AssistantResponse &#8594; GroundedCitation): Attaches evidence tags to response text.</text>
    <text x="80" y="1050" font-size="11" fill="#94a3b8">3. :wasDerivedFrom (AssistantResponse &#8594; TextPassageChunk): W3C PROV-O data lineage tracking.</text>

    <!-- Metric badges -->
    <rect x="80" y="1075" width="220" height="42" rx="6" fill="#0f172a" stroke="#22d3ee" stroke-width="1" />
    <text x="95" y="1100" font-size="11" font-weight="600" fill="#22d3ee">Cosine Threshold: &#8805; 65%</text>

    <rect x="320" y="1075" width="240" height="42" rx="6" fill="#0f172a" stroke="#22d3ee" stroke-width="1" />
    <text x="335" y="1100" font-size="11" font-weight="600" fill="#22d3ee">Top-K Passages: K = 4 Chunks</text>

    <rect x="580" y="1075" width="300" height="42" rx="6" fill="#0f172a" stroke="#22d3ee" stroke-width="1" />
    <text x="595" y="1100" font-size="11" font-weight="600" fill="#22d3ee">Context Window: Zero Hallucination Guard</text>
  </g>

  <!-- ========================================================================= -->
  <!-- ZONE 5: GOVERNANCE, WORKFLOW & AUDIT LINEAGE (AMBER)                      -->
  <!-- ========================================================================= -->
  <rect x="950" y="675" width="910" height="530" rx="12" fill="url(#zone-gov)" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="970" y="702" font-size="14" font-weight="800" fill="#fbbf24">DOMAIN 5: GOVERNANCE, AUDIT LINEAGE &amp; BPMN 2.0 WORKFLOW (PROV-O)</text>

  <!-- AuditSnapshot -->
  <g filter="url(#onto-shadow)">
    <rect x="970" y="725" width="270" height="155" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
    <rect x="970" y="725" width="270" height="30" rx="8" fill="#b45309" />
    <text x="1105" y="745" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">AuditSnapshot</text>
    <text x="985" y="775" font-size="11" font-family="monospace" fill="#fbbf24">&lt;&lt;prov:Entity, Immutable&gt;&gt;</text>
    <text x="985" y="795" font-size="11" font-family="monospace" fill="#e2e8f0">+ snapshotGuid: xsd:string [PK]</text>
    <text x="985" y="815" font-size="11" font-family="monospace" fill="#e2e8f0">+ versionNumber: xsd:integer</text>
    <text x="985" y="835" font-size="11" font-family="monospace" fill="#e2e8f0">+ sha256Digest: xsd:string</text>
    <text x="985" y="855" font-size="11" font-family="monospace" fill="#e2e8f0">+ savedAt: xsd:dateTime</text>
  </g>

  <!-- BPMNWorkflowProcess -->
  <g filter="url(#onto-shadow)">
    <rect x="1270" y="725" width="270" height="155" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5" />
    <rect x="1270" y="725" width="270" height="30" rx="8" fill="#92400e" />
    <text x="1405" y="745" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">BPMNWorkflowProcess</text>
    <text x="1285" y="775" font-size="11" font-family="monospace" fill="#fbbf24">&lt;&lt;prov:Activity, Camunda 2.0&gt;&gt;</text>
    <text x="1285" y="795" font-size="11" font-family="monospace" fill="#e2e8f0">+ processId: xsd:string</text>
    <text x="1285" y="815" font-size="11" font-family="monospace" fill="#e2e8f0">+ retryPolicy: "R3/PT10S"</text>
    <text x="1285" y="835" font-size="11" font-family="monospace" fill="#e2e8f0">+ swimlanes: 4 (Librarian/AI)</text>
    <text x="1285" y="855" font-size="11" font-family="monospace" fill="#e2e8f0">+ status: Active | Completed</text>
  </g>

  <!-- SecurityPrincipal -->
  <g filter="url(#onto-shadow)">
    <rect x="1570" y="725" width="270" height="155" rx="8" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5" />
    <rect x="1570" y="725" width="270" height="30" rx="8" fill="#78350f" />
    <text x="1705" y="745" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">SecurityPrincipal</text>
    <text x="1585" y="775" font-size="11" font-family="monospace" fill="#fbbf24">&lt;&lt;prov:Agent, Keycloak&gt;&gt;</text>
    <text x="1585" y="795" font-size="11" font-family="monospace" fill="#e2e8f0">+ subjectId: xsd:string [sub]</text>
    <text x="1585" y="815" font-size="11" font-family="monospace" fill="#e2e8f0">+ username: xsd:string</text>
    <text x="1585" y="835" font-size="11" font-family="monospace" fill="#e2e8f0">+ realm: "personal-library"</text>
    <text x="1585" y="855" font-size="11" font-family="monospace" fill="#e2e8f0">+ roles: Set&lt;String&gt; [RBAC]</text>
  </g>

  <!-- Governance & Non-Destructive Rollback Card -->
  <g filter="url(#onto-shadow)">
    <rect x="970" y="910" width="870" height="270" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="1" />
    <text x="990" y="935" font-size="12" font-weight="700" fill="#fef3c7">IMMUTABLE REVISION EVOLUTION &amp; NON-DESTRUCTIVE ROLLBACK</text>
    
    <text x="990" y="965" font-size="11" font-family="monospace" fill="#fbbf24">:hasHistoricalSnapshot (DocumentAsset &#8594; AuditSnapshot): Preserves past state</text>
    <text x="990" y="985" font-size="11" font-family="monospace" fill="#fbbf24">:previousVersionLineage (DocumentAsset &#8594; DocumentAsset): Self-referential graph</text>
    <text x="990" y="1005" font-size="11" font-family="monospace" fill="#fbbf24">:governedBy (DocumentAsset &#8594; SecurityPrincipal): Role-Based Access Control</text>

    <text x="990" y="1035" font-size="11.5" fill="#e2e8f0">Non-Destructive Rollback Axiom:</text>
    <text x="990" y="1055" font-size="11" fill="#94a3b8">Restoring version N does not prune intermediate states (&gt; N). Snapshot N is cloned into</text>
    <text x="990" y="1075" font-size="11" fill="#94a3b8">a newly advanced version M = max(versions) + 1, creating an unbroken audit lineage.</text>

    <rect x="990" y="1100" width="260" height="42" rx="6" fill="#0f172a" stroke="#fbbf24" stroke-width="1" />
    <text x="1005" y="1125" font-size="11" font-weight="600" fill="#fbbf24">SHA-256 Cryptographic Digest</text>

    <rect x="1270" y="1100" width="270" height="42" rx="6" fill="#0f172a" stroke="#fbbf24" stroke-width="1" />
    <text x="1285" y="1125" font-size="11" font-weight="600" fill="#fbbf24">Camunda Sagas: Compensation Ready</text>

    <rect x="1560" y="1100" width="260" height="42" rx="6" fill="#0f172a" stroke="#fbbf24" stroke-width="1" />
    <text x="1575" y="1125" font-size="11" font-weight="600" fill="#fbbf24">RBAC: LIBRARY_ADMIN, CHIEF_RESEARCHER</text>
  </g>

  <!-- ========================================================================= -->
  <!-- CROSS-DOMAIN SEMANTIC CONNECTORS (Strict Orthogonal Lines)                -->
  <!-- ========================================================================= -->
  <!-- 1. DocumentAsset to TextPassageChunk (:partitionedInto) -->
  <path d="M 310 250 L 660 250" fill="none" stroke="#34d399" stroke-width="2.5" marker-end="url(#onto-arrow-green)" />
  <rect x="440" y="238" width="130" height="20" rx="4" fill="#0b1120" stroke="#34d399" stroke-width="1" />
  <text x="505" y="252" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">:partitionedInto (1:N)</text>

  <!-- 2. TextPassageChunk to DenseVectorEmbedding (:representedBy) -->
  <path d="M 920 250 L 950 250" fill="none" stroke="#34d399" stroke-width="2" marker-end="url(#onto-arrow-green)" />
  <rect x="910" y="225" width="55" height="16" rx="3" fill="#0b1120" stroke="#34d399" stroke-width="1" />
  <text x="937" y="236" font-size="9" font-weight="700" fill="#34d399" text-anchor="middle">:representedBy</text>

  <!-- 3. DocumentAsset to AnalyticalSummary (:summarizedAs) -->
  <path d="M 185 175 L 185 110 L 1405 110 L 1405 175" fill="none" stroke="#c084fc" stroke-width="2.5" marker-end="url(#onto-arrow-purple)" />
  <rect x="730" y="100" width="150" height="20" rx="4" fill="#0b1120" stroke="#c084fc" stroke-width="1" />
  <text x="805" y="114" font-size="10" font-weight="700" fill="#c084fc" text-anchor="middle">:summarizedAs (Dual 1:2)</text>

  <!-- 4. TextPassageChunk to GroundedCitation (:grounds) -->
  <path d="M 790 330 L 790 725" fill="none" stroke="#22d3ee" stroke-width="2.5" marker-end="url(#onto-arrow-cyan)" />
  <rect x="735" y="515" width="110" height="20" rx="4" fill="#0b1120" stroke="#22d3ee" stroke-width="1" />
  <text x="790" y="529" font-size="10" font-weight="700" fill="#22d3ee" text-anchor="middle">:grounds (Evidence)</text>

  <!-- 5. DocumentAsset to AuditSnapshot (:hasHistoricalSnapshot) -->
  <path d="M 185 330 L 185 655 L 1105 655 L 1105 725" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#onto-arrow-amber)" />
  <rect x="520" y="645" width="165" height="20" rx="4" fill="#0b1120" stroke="#fbbf24" stroke-width="1" />
  <text x="602" y="659" font-size="10" font-weight="700" fill="#fbbf24" text-anchor="middle">:hasHistoricalSnapshot</text>

  <!-- 6. ConversationalSession to DocumentAsset (:scopedTo) -->
  <path d="M 60 800 L 20 800 L 20 280 L 60 280" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#onto-arrow-blue)" />
  <rect x="5" y="530" width="90" height="20" rx="4" fill="#0b1120" stroke="#38bdf8" stroke-width="1" />
  <text x="50" y="544" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle">:scopedTo (Context)</text>
</svg>`;
}

// =============================================================================
// 5. MAIN COMPILATION SCRIPT
// =============================================================================
export async function generateAllOntologyArtifacts(): Promise<void> {
  console.log('📐 Generating Formal Ontology Diagrams & Knowledge Graph Specifications...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. W3C Turtle (.ttl)
  const ttlContent = generateOntologyTurtle();
  fs.writeFileSync(path.join(docsDir, 'system_ontology.ttl'), ttlContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'system_ontology.ttl'), ttlContent, 'utf-8');
  console.log('✅ Generated W3C RDF Turtle Ontology (.ttl)');

  // 2. PlantUML (.puml)
  const pumlContent = generateOntologyPuml();
  fs.writeFileSync(path.join(docsDir, 'system_ontology_diagram.puml'), pumlContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'system_ontology_diagram.puml'), pumlContent, 'utf-8');
  console.log('✅ Generated PlantUML Ontology Diagram (.puml)');

  // 3. Mermaid (.mmd)
  const mmdContent = generateOntologyMermaid();
  fs.writeFileSync(path.join(docsDir, 'system_ontology_diagram.mmd'), mmdContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'system_ontology_diagram.mmd'), mmdContent, 'utf-8');
  console.log('✅ Generated Mermaid Semantic Graph (.mmd)');

  // 4. Vector SVG (.svg)
  const svgContent = generateOntologySvg();
  fs.writeFileSync(path.join(docsDir, 'system_ontology_diagram.svg'), svgContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'system_ontology_diagram.svg'), svgContent, 'utf-8');
  console.log('✅ Generated Vector SVG Ontology Diagram (.svg)');

  // 5. Ultra-HD PNG via Resvg (3600px)
  const resvg = new Resvg(svgContent, { fitTo: { mode: 'width', value: 3600 } });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'system_ontology_diagram.png'), pngBuffer);
  fs.writeFileSync(path.join(publicDir, 'system_ontology_diagram.png'), pngBuffer);
  console.log('✅ Generated Ultra-HD 3600px PNG Ontology Diagram (.png)');

  // 6. Archival PDF via PDFKit
  const pdfPathDocs = path.join(docsDir, 'system_ontology_diagram.pdf');
  const pdfPathPublic = path.join(publicDir, 'system_ontology_diagram.pdf');

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: [1920, 1260],
      margin: 0
    });

    const writeStream = fs.createWriteStream(pdfPathDocs);
    doc.pipe(writeStream);
    doc.image(pngBuffer, 0, 0, { width: 1920, height: 1260 });
    doc.end();

    writeStream.on('finish', () => {
      fs.copyFileSync(pdfPathDocs, pdfPathPublic);
      console.log('✅ Generated Architectural PDF Ontology Diagram (.pdf)');
      resolve();
    });

    writeStream.on('error', reject);
  });

  console.log('🎉 System Ontology artifacts compiled successfully across all 6 formats!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllOntologyArtifacts().catch(err => {
    console.error('Failed generating ontology artifacts:', err);
    process.exit(1);
  });
}
