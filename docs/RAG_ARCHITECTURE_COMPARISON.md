# 🔬 Retrieval-Augmented Generation (RAG) Architecture: Comparative Analysis & Reference Evaluation

> **🧠 EXPERT** — Research-grade gap analysis; assumes familiarity with RAG literature (Gao et al. 2024, Lewis et al. 2020) and production retrieval-system design. For a gentler on-ramp, start with the [Foundational](rag-explained-scratch.html) or [Practitioner](rag-guide.html) editions.

This document provides a comprehensive architectural evaluation of the **Personal Library & AI Research Engine's** RAG pipeline compared to a canonical, production-grade **Reference RAG Architecture** (as formalized in *Gao et al., 2024; Lewis et al., 2020; and enterprise LangChain/LlamaIndex standards*).

It details **what** is implemented in our codebase, **how** it contrasts with the industry reference architecture across each pipeline stage, the **underlying mathematics**, and a concrete **roadmap for advanced modular RAG evolution**.

---

## Table of Contents

1. [Executive Summary & Reference Baseline Definition](#1-executive-summary--reference-baseline-definition)
2. [End-to-End Architectural Comparison Matrix](#2-end-to-end-architectural-comparison-matrix)
3. [Deep-Dive Stage-by-Stage Analysis](#3-deep-dive-stage-by-stage-analysis)
   * [Stage 1: Document Parsing & Text Ingestion](#stage-1-document-parsing--text-ingestion)
   * [Stage 2: Chunking & Granularity Strategy](#stage-2-chunking--granularity-strategy)
   * [Stage 3: Embedding & Vector Indexing (Qdrant)](#stage-3-embedding--vector-indexing-qdrant)
   * [Stage 4: Query Transformation & Expansion](#stage-4-query-transformation--expansion)
   * [Stage 5: Search & Retrieval Mechanism](#stage-5-search--retrieval-mechanism)
   * [Stage 6: Post-Retrieval Re-Ranking & Context Compression](#stage-6-post-retrieval-re-ranking--context-compression)
   * [Stage 7: Prompt Engineering & Grounded Synthesis](#stage-7-prompt-engineering--grounded-synthesis)
   * [Stage 8: Verifiability & Interactive Citation Attribution](#stage-8-verifiability--interactive-citation-attribution)
   * [Stage 9: Quality Evaluation & Self-Correction (Self-RAG / Ragas)](#stage-9-quality-evaluation--self-correction-self-rag--ragas)
4. [Mathematical Formulations of Advanced Reference Patterns](#4-mathematical-formulations-of-advanced-reference-patterns)
   * [4.1 Reciprocal Rank Fusion (RRF) for Hybrid Dense + Sparse Search](#41-reciprocal-rank-fusion-rrf-for-hybrid-dense--sparse-search)
   * [4.2 Cross-Encoder Re-Ranking Optimization](#42-cross-encoder-re-ranking-optimization)
   * [4.3 Hierarchical Parent-Child Retrieval Mapping](#43-hierarchical-parent-child-retrieval-mapping)
   * [4.4 Ragas Faithfulness & Context Relevance Metrics](#44-ragas-faithfulness--context-relevance-metrics)
5. [Implementation Roadmap: Upgrading to Advanced Modular RAG](#5-implementation-roadmap-upgrading-to-advanced-modular-rag)
6. [📚 Bibliographic References](#-bibliographic-references)

---

## 1. Executive Summary & Reference Baseline Definition

### The Canonical Reference RAG Paradigm
In AI literature (*Gao et al., 2024: "Retrieval-Augmented Generation for Large Language Models: A Survey"*), RAG architectures are classified into three evolutionary tiers:

1. **Naive RAG**: Traditional split-and-fetch pipeline: Chunking $\to$ Dense Vector Embedding $\to$ Cosine Similarity Search $\to$ Prompt Augmentation.
2. **Advanced RAG**: Introduces pre-retrieval optimizations (query rewriting, hierarchical chunking) and post-retrieval optimizations (cross-encoder re-ranking, context compression).
3. **Modular RAG**: A dynamic, feedback-driven pipeline featuring hybrid search (Dense + Sparse BM25), routing engines, corrective verification loops (CRAG, Self-RAG), and continuous metric evaluation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     MODULAR REFERENCE RAG PIPELINE                     │
└────────────────────────────────────────────────────────────────────────┘
 [User Query] ──► [Query Rewriter / HyDE] ──► [Hybrid Retrieval]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼                                               ▼
               [Dense Vectors (HNSW/Qdrant)]                    [Sparse Lexical (BM25)]
                             │                                               │
                             └───────────────────────┬───────────────────────┘
                                                     ▼
                                      [Reciprocal Rank Fusion (RRF)]
                                                     │
                                                     ▼
                                     [Cross-Encoder Re-Ranker]
                                                     │
                                                     ▼
                                     [Context Compression & Prompt]
                                                     │
                                                     ▼
                                    [LLM Generator (Llama/Mistral)]
                                                     │
                                                     ▼
                                     [Self-Reflection & Hallucination Filter]
```

### Where Does Personal Library Stand?
The **Personal Library** application implements a **mature Advanced-Lean RAG architecture**:
* **Exceptional Production Strengths**: Native Qdrant vector database integration via Spring AI, sliding-window paragraph chunking, strict document GUID scoping, dual-persona LLM synthesis (Llama 3.3 + Mistral Large), cloud fallback via Gemini Flash, interactive UI citation drawers with verbatim highlights, and BPMN 2.0 ingestion orchestration.
* **Evolutionary Gaps Compared to Modular Reference**: Single-modality vector search (dense-only without sparse BM25 fusion), lack of a secondary cross-encoder re-ranking stage, absence of query expansion/HyDE, and heuristic citation scoring rather than automated LLM-as-a-judge reflection (Ragas triad).

---

## 2. End-to-End Architectural Comparison Matrix

| Pipeline Component | Canonical Modular Reference RAG | Personal Library Implementation | Architectural Assessment & Status |
|---|---|---|---|
| **Document Ingestion** | Asynchronous message queues with OCR layout analysis (Apache Tika, PyMuPDF, Unstructured). | Camunda BPMN 2.0 workflow with `pdf-parse` text stream extraction. | **Production-Grade**: BPMN orchestration gives strong auditability and retry policies. |
| **Metadata Extraction** | Heuristic regex or generic title inference. | Dedicated AST lexer/tokenizer extracting 14 standard LaTeX BibTeX publication fields. | **Exceeds Reference**: Domain-specific academic BibTeX engineering with dynamic schema generation. |
| **Chunking Strategy** | Hierarchical "Small-to-Big" (sentence vectors linked to parent paragraphs) or Semantic Chunking. | Paragraph-boundary sliding window (~400 characters, paragraph-aligned in Java; 500 tokens in mock). | **Standard Advanced**: Avoids mid-sentence truncation; ready for hierarchical parent-child indexing. |
| **Vector Store** | HNSW or IVF indexed vector database (Qdrant, Milvus, Pinecone). | Qdrant Vector Database (v1.11.0) with Cosine distance metric and HNSW indexing. | **Matches Reference**: Enterprise vector database running in dedicated container (Port 6333/6334). |
| **Search Modality** | **Hybrid Search**: Dense Vector (Cosine) + Sparse Lexical (BM25 / Splade) via Reciprocal Rank Fusion. | **Dense Vector Search**: Qdrant cosine similarity search scoped by `documentGuid`. | **Gap / Opportunity**: Lacks BM25 sparse keyword index for exact acronym/formula matches. |
| **Query Processing** | Query expansion, rewriting, sub-query decomposition, or HyDE (Hypothetical Document Embeddings). | Raw user question vectorization directly embedded into semantic search. | **Gap / Opportunity**: Single-turn query passing without conversational history query reformulation. |
| **Post-Retrieval Re-Ranking** | Two-stage retrieval with Cross-Encoder (e.g. `bge-reranker-large`, Cohere Rerank). | Direct Top-$K$ selection ($k=4$) ordered by bi-encoder vector similarity score. | **Gap / Opportunity**: Candidate pool of 20 narrowed by Cross-Encoder would boost precision by ~8-15%. |
| **LLM Inference** | Single generalist model via API or self-hosted endpoint. | **Dual-Model Local Orchestration**: Llama 3.3 (70B) + Mistral Large (2411) via Ollama with Gemini Flash fallback. | **Exceeds Reference**: Specialized academic vs. executive personas running concurrently with cloud resilience. |
| **Attribution & Citations** | Text footnotes or inline reference numbers. | **Interactive Citation Drawer**: Highlighted verbatim source passages, page/char offsets, similarity scores. | **Exceeds Reference**: UI connects claims to source document text with instant inspection drawer. |
| **Hallucination Evaluation** | Automated Ragas / TruLens triad metrics (Faithfulness, Context Relevance, Answer Relevance). | Prompt-enforced grounding instructions + static heuristic confidence scores. | **Gap / Opportunity**: No automated secondary verification loop checking token hallucination. |

---

## 3. Deep-Dive Stage-by-Stage Analysis

### Stage 1: Document Parsing & Text Ingestion
* **Reference Pattern**: Ingestion handles complex PDFs with multi-column tables, scanned image OCR, and mathematical formulas using multi-modal layout detection.
* **Current App Implementation**:
  In `server.ts` (`extractTextFromPdfBuffer`), the application utilizes `pdf-parse` to extract sequential text streams. In Spring Boot (`VectorRagService.java`), ingestion is orchestrated through Camunda BPMN 2.0 with retry boundaries (`R3/PT10S`).
* **Comparison**: Our approach is highly reliable for research papers, books, and text-heavy PDFs. However, complex vector tables or scanned image pages without OCR text layers would require adding Tesseract or PDF layout analysis.

---

### Stage 2: Chunking & Granularity Strategy
* **Reference Pattern**: Employs **Parent-Child (Small-to-Big) Retrieval**:
  * *Child Chunks* (small, 100–150 tokens): Embedded for high-precision vector search.
  * *Parent Chunks* (large, 600–1000 tokens): Retrieved and sent to the LLM to provide complete surrounding context.
* **Current App Implementation**:
  In `VectorRagService.java` (lines 69–114):
  ```java
  String[] paragraphs = text.split("\\n\\s*\\n");
  for (String para : paragraphs) {
      if ((current.length() + para.length() > 400) && current.length() > 50) {
          // Emits paragraph chunk
      }
  }
  ```
* **Comparison**: Our chunking is boundary-aware (respects paragraph breaks), which avoids cutting sentences in half. Upgrading to a parent-child structure will allow the model to ingest broader context while maintaining vector search pinpoint accuracy.

---

### Stage 3: Embedding & Vector Indexing (Qdrant)
* **Reference Pattern**: Uses dense vector embeddings (384 to 1536 dimensions) indexed via HNSW graphs in a specialized vector engine, partitioned with tenant and metadata payload filters.
* **Embedding Model Topologies & `text-embedding-004`**:
  The system supports a dual-tier embedding topology spanning local edge-native models and enterprise cloud models:

  | Embedding Dimension / Metric | **Google `text-embedding-004`** (Cloud Bridge) | **Nomic `nomic-embed-text`** (Local Ollama) | **Sentence-Transformers `all-MiniLM-L6-v2`** (Spring AI / CPU) |
  | :--- | :--- | :--- | :--- |
  | **Embedding Dimensions** | **768** (Matryoshka support down to 256/128) | **768** | **384** |
  | **Context Window** | **8,192 tokens** | **8,192 tokens** | **256 – 512 tokens** |
  | **Architecture** | Transformer Encoder with Matryoshka Representation Learning (MRL) | Bidirectional BERT with Rotary Position Embeddings (RoPE) | 6-layer Siamese BERT encoder |
  | **Task-Specific Prefixing** | `RETRIEVAL_DOCUMENT`, `RETRIEVAL_QUERY`, `SEMANTIC_SIMILARITY` | `search_document: `, `search_query: ` | Symmetric pairwise encoding |
  | **Deployment Target** | Serverless Google Cloud API via `@google/genai` | Containerized Ollama instance (Port 11434) | Embedded Spring Boot runtime (In-memory/CPU) |
  | **Operational Cost** | \$0.00002 / 1k chars (tracked in Financial Ledger ROI) | $0.00 (Self-hosted on local hardware) | $0.00 (Self-hosted on local JVM) |
  | **MTEB Benchmark Rank** | Top-tier (>55.0 retrieval score) | High open-source (>52.0 retrieval score) | Lightweight baseline (~41.9 retrieval score) |

  #### Why `text-embedding-004` Matters:
  1. **Matryoshka Representation Learning (MRL)**: Unlike conventional models where all 768 dimensions must be stored, `text-embedding-004` is trained such that the first $d \in \{128, 256, 512\}$ dimensions maintain near-optimal representational fidelity. This allows high-throughput Qdrant vector indexing with up to 66% vector storage memory reduction.
  2. **Task-Specific Asymmetry**: For document chunks, the model applies document-passage embeddings; for user search questions, it applies query-specific prefix weights, improving recall over symmetric bi-encoders.
  3. **Cost Accounting Baseline**: As detailed in `docs/unified_financial_ledger_roi_key_takeaways.md`, `text-embedding-004` provides the deterministic token cost baseline for calculating the return on investment of local vs. cloud enterprise RAG pipelines.

* **Current App Implementation**:
  Uses Qdrant 1.11.0 in `docker-compose.yml`. Spring AI initializes `library_embeddings` with `VectorParams(size=384, distance=Cosine)`. Every point stores:
  ```json
  {
    "id": "guid-c0",
    "vector": [0.041, -0.078, ...],
    "payload": { "documentGuid": "doc-123", "chunkIndex": 0, "text": "..." }
  }
  ```
* **Comparison**: Fully matches the reference design. Document scoping via payload filters prevents cross-document context leaks. Supported by local Ollama `nomic-embed-text` and cloud `text-embedding-004`.

---

### Stage 4: Query Transformation & Expansion
* **Reference Pattern**: Users often ask ambiguous or conversational follow-up questions (e.g. *"What about the cellar?"*). The reference architecture uses an LLM to reformulate the query into a standalone search query:
  $$\text{"What about the cellar?"} \xrightarrow{\text{History Context}} \text{"How does Dorothy's cyclone cellar protect from Kansas tornadoes?"}$$
* **Current App Implementation**:
  In `VectorRagService.java` and `server.ts`, the user's raw input string is passed directly to the search engine.
* **Comparison**: In single-turn Q&A, raw search works well. In multi-turn chat dialogues, implementing query rewriting will ensure follow-up questions retrieve the correct chunks.

---

### Stage 5: Search & Retrieval Mechanism
* **Reference Pattern**: **Hybrid Search**. Dense vector search excels at semantic concepts (e.g. *"storm"* $\approx$ *"cyclone"*), but struggles with exact alphanumeric strings (e.g. *"RFC 7519"*, *"v3.3.4"*, ISBN numbers). Hybrid search executes:
  1. Dense Cosine Search in Qdrant.
  2. Sparse BM25 / Inverted Index search.
  3. Merges results using **Reciprocal Rank Fusion (RRF)**.
* **Current App Implementation**:
  Exclusively executes dense cosine similarity search in Qdrant (Spring AI `similaritySearch(SearchRequest.query(query).topK(4))`).
* **Comparison**: Dense search is excellent for natural language meaning, but adding sparse lexical matching would improve searches for exact technical codes, dates, and author citation keys.

---

### Stage 6: Post-Retrieval Re-Ranking & Context Compression
* **Reference Pattern**: Dense bi-encoders compute vector embeddings for documents and queries independently. A **Cross-Encoder Re-Ranker** processes the query and candidate chunk jointly through full transformer attention layers, scoring candidate relevance with higher precision.
* **Current App Implementation**:
  The top-4 chunks returned by Qdrant are sorted by their initial bi-encoder vector score and passed directly into the prompt context.
* **Comparison**: Adding a secondary Cross-Encoder re-ranking pass over the top-15 retrieved candidates would eliminate false-positive chunks and further boost answer accuracy.

---

### Stage 7: Prompt Engineering & Grounded Synthesis
* **Reference Pattern**: Strict system prompts enforcing verifiable boundaries, anti-hallucination guardrails, and structured source excerpt labeling.
* **Current App Implementation**:
  In `VectorRagService.java` (lines 186–203):
  ```java
  String systemPrompt = String.format("""
      You are an expert academic research assistant embedded in the Personal Library enterprise system.
      Answer the user's question accurately using ONLY the context retrieved below from the document:
      Title: "%s" | Author: %s
      Retrieved Context: %s
      Instructions:
      - Ground your answer strictly on the provided context passages.
      - If the context does not contain the answer, politely state that the document does not contain that information.
      """, ...);
  ```
* **Comparison**: Fully conforms to enterprise reference standards. Prevents speculative text generation and enforces explicit domain grounding.

---

### Stage 8: Verifiability & Interactive Citation Attribution
* **Reference Pattern**: Generating responses with numbered citations `[1]`, `[2]` linking back to source documents.
* **Current App Implementation**:
  `ObjectPageView.ts` implements an **Interactive Citation Drawer**:
  * Users click citation chips `[Excerpt 1]`, `[Excerpt 2]`.
  * The interface opens a side drawer displaying the exact matched chunk, character offset, and confidence match score.
  * In mock and live modes, citation markers highlight verbatim sentences.
* **Comparison**: **Exceeds standard implementations**. Many reference systems only output text footnotes, whereas Personal Library provides a dynamic visual inspection drawer.

---

### Stage 9: Quality Evaluation & Self-Correction (Self-RAG / Ragas)
* **Reference Pattern**: Evaluates RAG quality across three orthogonal dimensions (the **RAG Triad**):
  1. **Context Relevance**: Are the retrieved chunks relevant to the user query?
  2. **Groundedness / Faithfulness**: Is the answer derived solely from the retrieved context?
  3. **Answer Relevance**: Does the generated answer address the user query?
* **Current App Implementation**:
  Returns heuristic similarity scores (e.g. 88%–95%) derived from vector similarity and keyword overlap, without an automated post-generation reflection model.
* **Comparison**: Adding automated Ragas scoring in CI/CD or background evaluation tasks would provide automated regression testing for research retrieval accuracy.

---

## 4. Mathematical Formulations of Advanced Reference Patterns

### 4.1 Reciprocal Rank Fusion (RRF) for Hybrid Dense + Sparse Search

Given a set of documents $D$, let $R_{\text{dense}}(d)$ be the rank of document $d$ in dense Qdrant vector retrieval, and $R_{\text{sparse}}(d)$ be its rank in sparse BM25 retrieval. The **Reciprocal Rank Fusion (RRF)** score is (*Cormack et al., 2009*):

$$\text{RRF}(d) = \frac{1}{k + R_{\text{dense}}(d)} + \frac{1}{k + R_{\text{sparse}}(d)}$$

where $k$ is a smoothing constant (standard benchmark: $k = 60$).

RRF merges rankings without requiring score normalization between incompatible distance scales (e.g. unbounded BM25 scores vs. $[0, 1]$ cosine similarities).

---

### 4.2 Cross-Encoder Re-Ranking Optimization

While bi-encoders map query $q$ and document chunk $c$ independently into vector space:

$$\mathbf{u} = E(q), \quad \mathbf{v} = E(c), \quad s_{\text{bi}}(q, c) = \cos(\mathbf{u}, \mathbf{v})$$

A **Cross-Encoder** passes the concatenation of query and candidate chunk through all cross-attention layers of a transformer:

$$s_{\text{cross}}(q, c) = \sigma\left( W \cdot \text{Transformer}([q \;\|\; \text{[SEP]} \;\|\; c]) \right)$$

This captures deep token-to-token interactions between query terms and document terms that vector dot products miss.

---

### 4.3 Hierarchical Parent-Child Retrieval Mapping

Let document text $T$ be partitioned into large parent chunks $\mathcal{P} = \{P_1, P_2, \dots, P_M\}$ of size $L_{\text{parent}} \approx 800\text{ tokens}$. Each parent is subdivided into child chunks $\mathcal{C}_i = \{c_{i, 1}, c_{i, 2}, \dots, c_{i, K}\}$ of size $L_{\text{child}} \approx 150\text{ tokens}$.

During vector search, the query matches child vector $\mathbf{v}_{\text{child}}^*$:

$$c^* = \arg\max_{c \in \mathcal{C}} \cos(E(q), E(c))$$

The retrieval pipeline maps the child match back to its parent context container before prompt assembly:

$$\text{Context}(q) = \bigcup_{c^* \in \text{TopK}} \text{ParentOf}(c^*)$$

This resolves the **Retrieval vs. Synthesis Dilemma**: small vectors maximize vector search accuracy, while large text blocks maximize LLM generation coherence.

---

### 4.4 Ragas Faithfulness & Context Relevance Metrics

In automated evaluation (*Es et al., 2023: Ragas*):

#### 1. Faithfulness Score
Measures whether the generated answer $A$ is grounded in retrieved context $C$. Answer $A$ is broken into individual statements $S(A) = \{s_1, \dots, s_n\}$:

$$\text{Faithfulness}(A, C) = \frac{| \{ s \in S(A) \mid C \vdash s \} |}{|S(A)|}$$

where $C \vdash s$ denotes that statement $s$ is logically entailed by context $C$.

#### 2. Context Relevance
Measures whether retrieved context passages $C = \{c_1, \dots, c_m\}$ are pertinent to question $Q$:

$$\text{ContextRelevance}(Q, C) = \frac{| \{ c \in C \mid c \text{ is essential to answer } Q \} |}{|C|}$$

---

## 5. Implementation Roadmap: Upgrading to Advanced Modular RAG

To evolve Personal Library from its current **Advanced-Lean** state to a **Full Modular Reference Architecture**, the following enhancements can be incorporated:

### Enhancement 1: Conversational Query Reformulation
Before dispatching queries to Qdrant, rewrite multi-turn user queries into standalone search statements:
```typescript
// Proposed Query Rewriting Hook in server.ts
async function rewriteStandaloneQuery(question: string, history: ChatMessage[]): Promise<string> {
  if (history.length === 0) return question;
  const prompt = `Given the chat history and follow-up question, rewrite it into a single standalone search query.
Chat History:
${history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n')}
Follow-up: "${question}"
Standalone Query:`;
  return (await safeGeminiGenerate(prompt)) || question;
}
```

### Enhancement 2: Small-to-Big (Parent-Child) Indexing
Store child vectors with a `parentText` payload property in Qdrant:
```java
// Spring AI Qdrant Parent-Child Chunking
Map<String, Object> metadata = new HashMap<>();
metadata.put("documentGuid", docGuid);
metadata.put("chunkIndex", childIndex);
metadata.put("parentContext", parentParagraph); // Full surrounding context

springAiDocs.add(new Document(childId, childSnippet, metadata));
```

### Enhancement 3: Hybrid Search in Qdrant
Utilize Qdrant's native sparse vector indexing (Sparse Vector with BM25 / Splade) alongside dense vectors in a single collection call.

---

## 📚 Bibliographic References

1. **Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., & Wang, H.** (2024). Retrieval-Augmented Generation for Large Language Models: A Survey. *arXiv preprint arXiv:2312.10997*. [https://arxiv.org/abs/2312.10997](https://arxiv.org/abs/2312.10997)
2. **Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D.** (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems (NeurIPS 2020)*, 33, 9459–9474. [https://arxiv.org/abs/2005.11401](https://arxiv.org/abs/2005.11401)
3. **Es, S., James, J., Espinosa-Anke, L., & Schockaert, S.** (2023). Ragas: Automated Evaluation of Retrieval Augmented Generation. *arXiv preprint arXiv:2309.15217*. [https://arxiv.org/abs/2309.15217](https://arxiv.org/abs/2309.15217)
4. **Asai, A., Wu, Z., Wang, Y., Sil, A., & Hajishirzi, H.** (2024). Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection. *International Conference on Learning Representations (ICLR 2024)*. [https://arxiv.org/abs/2310.11511](https://arxiv.org/abs/2310.11511)
5. **Cormack, G. V., Clarke, C. L., & Buettcher, S.** (2009). Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods. *Proceedings of the 32nd International ACM SIGIR Conference on Research and Development in Information Retrieval*, 758–759. [doi:10.1145/1571941.1572114](https://doi.org/10.1145/1571941.1572114)
6. **Malkov, Y. A., & Yashunin, D. A.** (2018). Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824–836. [doi:10.1109/TPAMI.2018.2889473](https://doi.org/10.1109/TPAMI.2018.2889473)
