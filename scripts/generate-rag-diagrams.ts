/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Automated High-Fidelity Vector SVG, 2x PNG, and PDF Generator for:
 * 1. rag-tokens-embeddings-explained (Tokens, Embeddings, MongoDB & Qdrant with Wizard of Oz)
 * 2. rag-workflow (End-to-End Ingestion, Dual-Store, and Grounded Inference Pipeline)
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

export function generateRagTokensEmbeddingsSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1520 1020" width="1520" height="1020" style="background:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Gradients -->
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="blueCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="purpleCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#6d28d9" />
    </linearGradient>
    <linearGradient id="greenCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="navyHeaderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.06" />
    </filter>

    <!-- Marker Arrow -->
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
    </marker>
    <marker id="arrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
    </marker>
    <marker id="arrowPurple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#7c3aed" />
    </marker>
  </defs>

  <!-- Title Banner -->
  <text x="760" y="44" text-anchor="middle" font-size="28" font-weight="800" fill="#0284c7" letter-spacing="-0.02em">How RAG Works: Tokens, Embeddings, MongoDB &amp; Qdrant</text>
  <text x="760" y="70" text-anchor="middle" font-size="14" font-weight="500" fill="#64748b">Concrete Technical Deep Dive using &quot;The Wonderful Wizard of Oz&quot; by L. Frank Baum</text>

  <!-- ========================================================================= -->
  <!-- STEP 1: Document Text & Tokenization (Left Column) -->
  <!-- ========================================================================= -->
  <g transform="translate(40, 100)" filter="url(#cardShadow)">
    <rect width="440" height="410" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 0 14 Q 0 0 14 0 L 426 0 Q 440 0 440 14 L 440 42 L 0 42 Z" fill="url(#blueCardGrad)" />
    <text x="18" y="27" font-size="14" font-weight="700" fill="#ffffff">Step 1: Document Text &amp; Tokenization</text>

    <!-- Raw Text Excerpt Box -->
    <rect x="16" y="58" width="408" height="135" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="28" y="80" font-size="12" font-weight="700" fill="#334155">&#128196; "The Wonderful Wizard of Oz" (Chapter 1 Excerpt):</text>
    <text x="28" y="104" font-size="11.5" fill="#475569" font-style="italic">"Dorothy lived in the midst of the great Kansas prairies,</text>
    <text x="28" y="122" font-size="11.5" fill="#475569" font-style="italic">with Uncle Henry, who was a farmer, and Aunt Em, who</text>
    <text x="28" y="140" font-size="11.5" fill="#475569" font-style="italic">was the farmer's wife. Their house was small..."</text>
    <line x1="28" y1="156" x2="412" y2="156" stroke="#e2e8f0" stroke-width="1" />
    <text x="28" y="174" font-size="11" font-weight="600" fill="#64748b">Raw String: 198 characters • 34 words • UTF-8 Byte Stream</text>

    <!-- Arrow Down -->
    <text x="220" y="214" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0284c7">↓ Byte-Pair Encoding (BPE) Tokenizer ↓</text>

    <!-- Token Sub-Word Segmentation Box -->
    <rect x="16" y="230" width="408" height="164" rx="8" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
    <text x="28" y="252" font-size="12" font-weight="700" fill="#0369a1">Token Sub-Word Segmentation (Vocabulary IDs):</text>

    <!-- Token Chips Row 1 -->
    <g transform="translate(26, 266)">
      <rect x="0" y="0" width="60" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="30" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">Dorothy</text>
      <text x="30" y="31" text-anchor="middle" font-size="9" fill="#64748b">#14820</text>

      <rect x="66" y="0" width="48" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="90" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">lived</text>
      <text x="90" y="31" text-anchor="middle" font-size="9" fill="#64748b">#5829</text>

      <rect x="120" y="0" width="34" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="137" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">in</text>
      <text x="137" y="31" text-anchor="middle" font-size="9" fill="#64748b">#287</text>

      <rect x="160" y="0" width="36" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="178" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">the</text>
      <text x="178" y="31" text-anchor="middle" font-size="9" fill="#64748b">#262</text>

      <rect x="202" y="0" width="50" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="227" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">midst</text>
      <text x="227" y="31" text-anchor="middle" font-size="9" fill="#64748b">#27192</text>

      <rect x="258" y="0" width="34" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="275" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">of</text>
      <text x="275" y="31" text-anchor="middle" font-size="9" fill="#64748b">#286</text>

      <rect x="298" y="0" width="36" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="316" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">the</text>
      <text x="316" y="31" text-anchor="middle" font-size="9" fill="#64748b">#262</text>
    </g>

    <!-- Token Chips Row 2 -->
    <g transform="translate(26, 312)">
      <rect x="0" y="0" width="48" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="24" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">great</text>
      <text x="24" y="31" text-anchor="middle" font-size="9" fill="#64748b">#1049</text>

      <rect x="54" y="0" width="56" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="82" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">Kansas</text>
      <text x="82" y="31" text-anchor="middle" font-size="9" fill="#64748b">#14902</text>

      <rect x="116" y="0" width="58" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="145" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">prairies</text>
      <text x="145" y="31" text-anchor="middle" font-size="9" fill="#64748b">#39108</text>

      <rect x="180" y="0" width="56" height="38" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="208" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0284c7">farmer</text>
      <text x="208" y="31" text-anchor="middle" font-size="9" fill="#64748b">#8912</text>

      <text x="250" y="24" font-size="11" font-weight="600" fill="#64748b">... (42 tokens)</text>
    </g>

    <!-- Footer Note -->
    <text x="28" y="378" font-size="11" font-weight="600" fill="#0369a1">• 1 token ≈ 4 chars • Tokens map words to integer vectors</text>
  </g>

  <!-- ========================================================================= -->
  <!-- STEP 2: Dense Semantic Embeddings (Center Column) -->
  <!-- ========================================================================= -->
  <g transform="translate(510, 100)" filter="url(#cardShadow)">
    <rect width="460" height="410" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 0 14 Q 0 0 14 0 L 446 0 Q 460 0 460 14 L 460 42 L 0 42 Z" fill="url(#purpleCardGrad)" />
    <text x="18" y="27" font-size="14" font-weight="700" fill="#ffffff">Step 2: Dense Semantic Embeddings</text>

    <!-- Model Spec Box -->
    <rect x="16" y="56" width="428" height="96" rx="8" fill="#faf5ff" stroke="#e9d5ff" stroke-width="1" />
    <text x="26" y="78" font-size="12" font-weight="700" fill="#7c3aed">Embedding Model: nomic-embed-text (or text-embedding-004)</text>
    <text x="26" y="98" font-size="11.5" fill="#581c87">Transforms token sequence into a normalized 768-dim float32 vector:</text>
    <rect x="26" y="106" width="406" height="34" rx="4" fill="#ffffff" stroke="#d8b4fe" stroke-width="1" />
    <text x="34" y="123" font-size="11" font-family="monospace" font-weight="700" fill="#6b21a8">v = [ 0.0412, -0.0891, 0.1205, ..., 0.0074 ] ∈ ℝ⁷⁶⁸</text>
    <text x="34" y="135" font-size="9" fill="#7e22ce">Normalized length: ||v|| = 1.0 (Unit hypersphere for cosine similarity)</text>

    <!-- Hyperspace Coordinate Graph Box -->
    <rect x="16" y="162" width="428" height="232" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="26" y="184" font-size="12" font-weight="700" fill="#334155">Semantic Hyperspace (Geometric Distance = Meaning Similarity):</text>

    <!-- Coordinate Axes -->
    <line x1="60" y1="350" x2="410" y2="350" stroke="#cbd5e1" stroke-width="1.5" />
    <line x1="60" y1="350" x2="60" y2="200" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="410" y="364" font-size="10" fill="#64748b" text-anchor="end">Dimension 1 (Geographical / Context)</text>
    <text x="64" y="210" font-size="10" fill="#64748b">Dimension 2 (Characters / Roles)</text>

    <!-- Chunk 1 Point -->
    <circle cx="140" cy="245" r="7" fill="#0284c7" />
    <text x="154" y="244" font-size="11" font-weight="700" fill="#0369a1">v_chunk1</text>
    <text x="154" y="258" font-size="10" fill="#475569">"Dorothy lived in Kansas prairies..."</text>

    <!-- Query Vector Point -->
    <circle cx="180" cy="280" r="7" fill="#dc2626" />
    <text x="194" y="280" font-size="11" font-weight="700" fill="#b91c1c">v_query</text>
    <text x="194" y="294" font-size="10" fill="#475569">"Where did Dorothy live?"</text>

    <!-- Angle Arc / Line -->
    <line x1="140" y1="245" x2="180" y2="280" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3,3" />
    <text x="175" y="260" font-size="10" font-weight="700" fill="#16a34a">θ (cos θ = 0.892)</text>

    <!-- Unrelated Point (Emerald City) -->
    <circle cx="340" cy="310" r="7" fill="#94a3b8" />
    <text x="310" y="295" font-size="10.5" fill="#64748b">"Emerald City gates..."</text>
    <text x="310" y="308" font-size="9.5" fill="#94a3b8">(cos θ = 0.310 - Low Relevance)</text>

    <!-- Formula at bottom -->
    <rect x="26" y="358" width="406" height="26" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="229" y="375" text-anchor="middle" font-size="10.5" font-family="monospace" font-weight="700" fill="#334155">Cosine Similarity: cos(θ) = (u • v) / (||u|| ||v||) ∈ [-1.0, +1.0]</text>
  </g>

  <!-- ========================================================================= -->
  <!-- STEP 3: Dual Database Architecture (Right Column) -->
  <!-- ========================================================================= -->
  <g transform="translate(1000, 100)" filter="url(#cardShadow)">
    <rect width="480" height="410" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 0 14 Q 0 0 14 0 L 466 0 Q 480 0 480 14 L 480 42 L 0 42 Z" fill="url(#greenCardGrad)" />
    <text x="18" y="27" font-size="14" font-weight="700" fill="#ffffff">Step 3: Dual Database Architecture</text>

    <!-- MongoDB Box -->
    <rect x="16" y="56" width="448" height="154" rx="8" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1" />
    <text x="28" y="78" font-size="12" font-weight="700" fill="#166534">&#128194; MongoDB 7.0 (Relational / Document DB)</text>
    <text x="28" y="94" font-size="10" font-weight="600" fill="#15803d">Collection: "documents" • Full Record &amp; Version History</text>
    <rect x="28" y="102" width="424" height="98" rx="6" fill="#ffffff" stroke="#86efac" stroke-width="1" />
    <text x="36" y="118" font-size="9.5" font-family="monospace" fill="#14532d">{</text>
    <text x="48" y="132" font-size="9.5" font-family="monospace" fill="#14532d">"_id": ObjectId("66fc10..."),</text>
    <text x="48" y="146" font-size="9.5" font-family="monospace" fill="#14532d">"title": "The Wonderful Wizard of Oz",</text>
    <text x="48" y="160" font-size="9.5" font-family="monospace" fill="#14532d">"bibtex": { "author": "Baum, L. Frank", "year": "1900" },</text>
    <text x="48" y="174" font-size="9.5" font-family="monospace" fill="#14532d">"fullText": "Dorothy lived in the midst of...",</text>
    <text x="48" y="188" font-size="9.5" font-family="monospace" fill="#14532d">"version": 1, "summaries": { "llama": {...}, "mistral": {...} }</text>
    <text x="36" y="196" font-size="9.5" font-family="monospace" fill="#14532d">}</text>

    <!-- Qdrant DB Box -->
    <rect x="16" y="222" width="448" height="172" rx="8" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" />
    <text x="28" y="244" font-size="12" font-weight="700" fill="#1e40af">&#9889; Qdrant Vector DB (HNSW Index Engine)</text>
    <text x="28" y="260" font-size="10" font-weight="600" fill="#2563eb">Collection: "document_chunks" • Sub-millisecond ANN</text>
    <rect x="28" y="268" width="424" height="116" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
    <text x="36" y="284" font-size="9.5" font-family="monospace" fill="#1e3a8a">{</text>
    <text x="48" y="298" font-size="9.5" font-family="monospace" fill="#1e3a8a">"id": "c1b48f92-7f31-4a9c-9c71-09ba192f1b0a",</text>
    <text x="48" y="312" font-size="9.5" font-family="monospace" fill="#0284c7">"vector": [ 0.0412, -0.0891, 0.1205, ... ],</text>
    <text x="48" y="326" font-size="9.5" font-family="monospace" fill="#1e3a8a">"payload": {</text>
    <text x="60" y="340" font-size="9.5" font-family="monospace" fill="#1e3a8a">"documentId": "doc-oz-1900", "chunkIndex": 0,</text>
    <text x="60" y="354" font-size="9.5" font-family="monospace" fill="#1e3a8a">"text": "Dorothy lived in the midst of the great Kansas prairies..."</text>
    <text x="48" y="368" font-size="9.5" font-family="monospace" fill="#1e3a8a">}</text>
    <text x="36" y="380" font-size="9.5" font-family="monospace" fill="#1e3a8a">}</text>
  </g>

  <!-- ========================================================================= -->
  <!-- STEP 4: Interactive RAG Query Execution Pipeline (Bottom Span) -->
  <!-- ========================================================================= -->
  <g transform="translate(40, 540)" filter="url(#cardShadow)">
    <rect width="1440" height="430" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 0 14 Q 0 0 14 0 L 1426 0 Q 1440 0 1440 14 L 1440 42 L 0 42 Z" fill="url(#navyHeaderGrad)" />
    <text x="24" y="27" font-size="14" font-weight="700" fill="#ffffff">Step 4: Interactive RAG Query Execution Pipeline (Retrieval → Augmentation → Generation)</text>

    <!-- Sub-step 1: User Research Question -->
    <g transform="translate(24, 60)">
      <rect width="270" height="160" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <text x="16" y="26" font-size="12" font-weight="700" fill="#334155">&#128100; 1. User Research Question</text>
      <rect x="14" y="40" width="242" height="54" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />
      <text x="24" y="64" font-size="11.5" font-weight="700" fill="#0369a1">"Where did Dorothy live</text>
      <text x="24" y="80" font-size="11.5" font-weight="700" fill="#0369a1">and what was her home like?"</text>
      <text x="16" y="112" font-size="10.5" fill="#64748b">• Query Tokens: 11 tokens</text>
      <text x="16" y="128" font-size="10.5" fill="#64748b">• Model: nomic-embed-text</text>
      <text x="16" y="144" font-size="10.5" font-family="monospace" fill="#0284c7">• Vector: v_query ∈ ℝ⁷⁶⁸</text>
    </g>

    <!-- Arrow 1 -> 2 -->
    <line x1="310" y1="140" x2="350" y2="140" stroke="#0284c7" stroke-width="3" marker-end="url(#arrowBlue)" />

    <!-- Sub-step 2: Qdrant HNSW Search -->
    <g transform="translate(366, 60)">
      <rect width="310" height="160" rx="8" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
      <text x="16" y="26" font-size="12" font-weight="700" fill="#0369a1">&#9889; 2. Qdrant HNSW Search</text>
      <text x="16" y="44" font-size="10.5" fill="#0284c7">Filter: documentId == "doc-oz-1900"</text>
      <text x="16" y="58" font-size="10.5" fill="#0284c7">Metric: Cosine Similarity • Top-K = 1</text>
      <rect x="14" y="70" width="282" height="74" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="22" y="90" font-size="11" font-weight="700" fill="#1e40af">&#128269; Match: Chunk #0 (Score: 0.892)</text>
      <text x="22" y="106" font-size="10" fill="#475569">"Dorothy lived in the midst of the</text>
      <text x="22" y="120" font-size="10" fill="#475569">great Kansas prairies... house was small"</text>
      <text x="22" y="136" font-size="10" font-weight="700" fill="#16a34a">Relevance: 89.2% • Latency: 2.1 ms</text>
    </g>

    <!-- Arrow 2 -> 3 -->
    <line x1="692" y1="140" x2="732" y2="140" stroke="#059669" stroke-width="3" marker-end="url(#arrowGreen)" />

    <!-- Sub-step 3: Prompt Augmentation -->
    <g transform="translate(748, 60)">
      <rect width="340" height="160" rx="8" fill="#faf5ff" stroke="#e9d5ff" stroke-width="1" />
      <text x="16" y="26" font-size="12" font-weight="700" fill="#7c3aed">&#128221; 3. Prompt Augmentation</text>
      <rect x="14" y="38" width="312" height="110" rx="6" fill="#ffffff" stroke="#d8b4fe" stroke-width="1" />
      <text x="22" y="54" font-size="9.5" font-family="monospace" fill="#6b21a8">[SYSTEM: Answer based strictly on context]</text>
      <text x="22" y="68" font-size="9.5" font-family="monospace" font-weight="700" fill="#7e22ce">[CONTEXT CHUNK 0 (Relevance: 89%)]:</text>
      <text x="22" y="82" font-size="9.5" font-family="monospace" fill="#475569">"Dorothy lived in Kansas prairies... four walls,</text>
      <text x="22" y="94" font-size="9.5" font-family="monospace" fill="#475569">a floor and a roof, one room..."</text>
      <text x="22" y="112" font-size="9.5" font-family="monospace" font-weight="700" fill="#0369a1">[USER QUESTION]:</text>
      <text x="22" y="126" font-size="9.5" font-family="monospace" fill="#0284c7">"Where did Dorothy live and what was her home like?"</text>
    </g>

    <!-- Arrow 3 -> 4 -->
    <line x1="1104" y1="140" x2="1144" y2="140" stroke="#7c3aed" stroke-width="3" marker-end="url(#arrowPurple)" />

    <!-- Sub-step 4: Llama 3.3 Inference -->
    <g transform="translate(1160, 60)">
      <rect width="256" height="160" rx="8" fill="#fdf4ff" stroke="#f0abfc" stroke-width="1" />
      <text x="16" y="26" font-size="12" font-weight="700" fill="#c026d3">&#129302; 4. Llama 3.3 (70B) Inference</text>
      <rect x="14" y="38" width="228" height="110" rx="6" fill="#ffffff" stroke="#e879f9" stroke-width="1" />
      <text x="22" y="54" font-size="10" font-weight="700" fill="#86198f">Grounded Answer Output:</text>
      <text x="22" y="70" font-size="9.5" fill="#475569">"Dorothy lived in the midst of the</text>
      <text x="22" y="84" font-size="9.5" fill="#475569">Kansas prairies with Uncle Henry</text>
      <text x="22" y="98" font-size="9.5" fill="#475569">and Aunt Em. Her home was a small,</text>
      <text x="22" y="112" font-size="9.5" fill="#475569">one-room wooden house..."</text>
      <rect x="20" y="122" width="190" height="20" rx="4" fill="#f0fdf4" stroke="#86efac" stroke-width="1" />
      <text x="26" y="136" font-size="9" font-weight="700" fill="#15803d">&#128279; Citation: [Chunk 0 • Kansas Prairies]</text>
    </g>

    <!-- Comparison Table at bottom of Step 4 -->
    <g transform="translate(24, 240)">
      <rect width="1392" height="165" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
      <text x="18" y="24" font-size="12" font-weight="700" fill="#1e293b">Core Architectural Distinctions: MongoDB (Document Store) vs. Qdrant (Vector Database)</text>

      <!-- Table Header -->
      <rect x="16" y="36" width="1360" height="26" rx="4" fill="#e2e8f0" />
      <text x="26" y="53" font-size="11" font-weight="700" fill="#475569">CAPABILITY / ROLE</text>
      <text x="260" y="53" font-size="11" font-weight="700" fill="#047857">MONGODB 7.0 (DOCUMENT REPOSITORY)</text>
      <text x="760" y="53" font-size="11" font-weight="700" fill="#1d4ed8">QDRANT (VECTOR RETRIEVAL ENGINE)</text>

      <!-- Row 1 -->
      <line x1="16" y1="92" x2="1376" y2="92" stroke="#e2e8f0" stroke-width="1" />
      <text x="26" y="78" font-size="11" font-weight="600" fill="#334155">Primary Data Unit</text>
      <text x="260" y="78" font-size="10.5" fill="#475569">Hierarchical BSON documents (full text, metadata, authors, version history)</text>
      <text x="760" y="78" font-size="10.5" fill="#475569">High-dimensional points (vector float32 arrays + small payload metadata)</text>

      <!-- Row 2 -->
      <line x1="16" y1="126" x2="1376" y2="126" stroke="#e2e8f0" stroke-width="1" />
      <text x="26" y="112" font-size="11" font-weight="600" fill="#334155">Query Mechanism</text>
      <text x="260" y="112" font-size="10.5" fill="#475569">B-Tree index lookups, exact key matches, regex, aggregation pipelines</text>
      <text x="760" y="112" font-size="10.5" fill="#475569">Approximate Nearest Neighbor (ANN) search via HNSW graphs (Cosine / Dot product)</text>

      <!-- Row 3 -->
      <text x="26" y="148" font-size="11" font-weight="600" fill="#334155">RAG System Purpose</text>
      <text x="260" y="148" font-size="10.5" fill="#475569">Single source of truth for raw assets, BibTeX fields, versions, and generated summaries</text>
      <text x="760" y="148" font-size="10.5" fill="#475569">Sub-second semantic passage locator to extract exact relevant context for prompt injection</text>
    </g>
  </g>
</svg>`;
}

export function generateRagWorkflowSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" style="background:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="headerGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>

    <filter id="shadowBox" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.08" />
    </filter>

    <marker id="flowArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0070f2" />
    </marker>
    <marker id="flowArrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
    </marker>
    <marker id="flowArrowPurple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#7c3aed" />
    </marker>
  </defs>

  <!-- Title Banner -->
  <rect x="0" y="0" width="1600" height="80" fill="url(#headerGrad2)" />
  <text x="40" y="44" font-size="24" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">Dual-Database Retrieval-Augmented Generation (RAG) Architecture &amp; Workflow</text>
  <text x="40" y="66" font-size="13" font-weight="500" fill="#94a3b8">Spring Boot 3.3.4 • MongoDB 7.0 • Qdrant HNSW • Ollama Llama 3.3 (70B) &amp; Mistral Large • SAP Fiori Horizon UI</text>

  <!-- Lane 1: Ingestion & Vectorization Flow (Top Lane) -->
  <g transform="translate(40, 110)">
    <rect width="1520" height="290" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 0 12 Q 0 0 12 0 L 1508 0 Q 1520 0 1520 12 L 1520 36 L 0 36 Z" fill="#0284c7" />
    <text x="20" y="24" font-size="13" font-weight="700" fill="#ffffff">&#128392; INGESTION PHASE: Binary Parsing, Semantic Chunking, Dense Embedding &amp; Dual-Storage</text>

    <!-- Step 1.1: Upload -->
    <g transform="translate(24, 60)" filter="url(#shadowBox)">
      <rect width="190" height="190" rx="8" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
      <rect x="0" y="0" width="190" height="32" rx="8" fill="#eff6ff" />
      <text x="14" y="21" font-size="12" font-weight="700" fill="#0369a1">1. PDF / Doc Upload</text>
      <text x="14" y="56" font-size="11" fill="#334155">• Drag &amp; drop file</text>
      <text x="14" y="76" font-size="11" fill="#334155">• Auto-extract BibTeX</text>
      <text x="14" y="96" font-size="11" fill="#334155">• Extract full text</text>
      <text x="14" y="116" font-size="11" fill="#334155">• SHA-256 Checksum</text>
      <rect x="12" y="140" width="166" height="32" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
      <text x="95" y="160" text-anchor="middle" font-size="10.5" font-weight="600" fill="#0284c7">DocumentRecord</text>
    </g>

    <line x1="220" y1="155" x2="256" y2="155" stroke="#0070f2" stroke-width="2.5" marker-end="url(#flowArrow)" />

    <!-- Step 1.2: Text Extraction & Chunking -->
    <g transform="translate(264, 60)" filter="url(#shadowBox)">
      <rect width="210" height="190" rx="8" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
      <rect x="0" y="0" width="210" height="32" rx="8" fill="#eff6ff" />
      <text x="14" y="21" font-size="12" font-weight="700" fill="#0369a1">2. Semantic Chunking</text>
      <text x="14" y="56" font-size="11" fill="#334155">• Chunk size: ~500 chars</text>
      <text x="14" y="76" font-size="11" fill="#334155">• 100 char sliding overlap</text>
      <text x="14" y="96" font-size="11" fill="#334155">• Sentence boundary split</text>
      <text x="14" y="116" font-size="11" fill="#334155">• Preserves context flows</text>
      <rect x="12" y="140" width="186" height="32" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
      <text x="105" y="160" text-anchor="middle" font-size="10.5" font-weight="600" fill="#0284c7">Chunks: [C0, C1, ... Cn]</text>
    </g>

    <line x1="480" y1="155" x2="516" y2="155" stroke="#0070f2" stroke-width="2.5" marker-end="url(#flowArrow)" />

    <!-- Step 1.3: Vector Embedding -->
    <g transform="translate(524, 60)" filter="url(#shadowBox)">
      <rect width="220" height="190" rx="8" fill="#ffffff" stroke="#d8b4fe" stroke-width="1.5" />
      <rect x="0" y="0" width="220" height="32" rx="8" fill="#faf5ff" />
      <text x="14" y="21" font-size="12" font-weight="700" fill="#7c3aed">3. nomic-embed-text</text>
      <text x="14" y="56" font-size="11" fill="#334155">• Local Ollama Embedding Model</text>
      <text x="14" y="76" font-size="11" fill="#334155">• 768-dimensional float32</text>
      <text x="14" y="96" font-size="11" fill="#334155">• Unit L2 normalized</text>
      <text x="14" y="116" font-size="11" fill="#334155">• High-throughput batching</text>
      <rect x="12" y="140" width="196" height="32" rx="6" fill="#faf5ff" stroke="#d8b4fe" stroke-width="1" />
      <text x="110" y="160" text-anchor="middle" font-size="10" font-family="monospace" font-weight="700" fill="#6b21a8">v ∈ ℝ⁷⁶⁸ (||v|| = 1.0)</text>
    </g>

    <!-- Branch Fork Lines -->
    <path d="M 750 155 L 790 155 L 790 110 L 830 110" fill="none" stroke="#059669" stroke-width="2.5" marker-end="url(#flowArrowGreen)" />
    <path d="M 750 155 L 790 155 L 790 200 L 830 200" fill="none" stroke="#2563eb" stroke-width="2.5" marker-end="url(#flowArrow)" />

    <!-- Step 1.4: MongoDB -->
    <g transform="translate(840, 50)" filter="url(#shadowBox)">
      <rect width="320" height="100" rx="8" fill="#ffffff" stroke="#86efac" stroke-width="1.5" />
      <rect x="0" y="0" width="320" height="28" rx="8" fill="#f0fdf4" />
      <text x="14" y="19" font-size="11.5" font-weight="700" fill="#166534">&#128194; MongoDB 7.0 (System of Record)</text>
      <text x="14" y="46" font-size="10.5" fill="#334155">• Stores full BSON, BibTeX, versions, PDF asset</text>
      <text x="14" y="64" font-size="10.5" fill="#334155">• Caches dual Llama &amp; Mistral summaries</text>
      <text x="14" y="82" font-size="10.5" font-weight="700" fill="#047857">ACID Guarantees • B-Tree Index • Port 27017</text>
    </g>

    <!-- Step 1.5: Qdrant DB -->
    <g transform="translate(840, 160)" filter="url(#shadowBox)">
      <rect width="320" height="100" rx="8" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
      <rect x="0" y="0" width="320" height="28" rx="8" fill="#eff6ff" />
      <text x="14" y="19" font-size="11.5" font-weight="700" fill="#1e40af">&#9889; Qdrant Vector DB (Vector Index)</text>
      <text x="14" y="46" font-size="10.5" fill="#334155">• Stores 768-D dense vectors + chunk payload</text>
      <text x="14" y="64" font-size="10.5" fill="#334155">• Hierarchical Navigable Small World (HNSW)</text>
      <text x="14" y="82" font-size="10.5" font-weight="700" fill="#1d4ed8">&lt; 3ms Cosine Distance ANN • Port 6333/6334</text>
    </g>

    <!-- Step 1.6: Background Dual-Model Summarization -->
    <g transform="translate(1200, 50)" filter="url(#shadowBox)">
      <rect width="290" height="210" rx="8" fill="#ffffff" stroke="#f0abfc" stroke-width="1.5" />
      <rect x="0" y="0" width="290" height="32" rx="8" fill="#fdf4ff" />
      <text x="14" y="21" font-size="12" font-weight="700" fill="#a21caf">&#9881; Concurrent Summarization</text>
      <text x="14" y="56" font-size="11" font-weight="700" fill="#7c3aed">1. Llama 3.3 (70B Instruct):</text>
      <text x="20" y="74" font-size="10.5" fill="#475569">Analytical synthesis • Methodologies</text>
      <text x="14" y="104" font-size="11" font-weight="700" fill="#b91c1c">2. Mistral Large (2411):</text>
      <text x="20" y="122" font-size="10.5" fill="#475569">Executive brief • Key findings</text>
      <rect x="12" y="150" width="266" height="46" rx="6" fill="#fdf4ff" stroke="#e879f9" stroke-width="1" />
      <text x="145" y="168" text-anchor="middle" font-size="10" font-weight="700" fill="#86198f">Concurrent Async Threads</text>
      <text x="145" y="184" text-anchor="middle" font-size="9" fill="#a21caf">Duration tracked &amp; rendered in Object Page</text>
    </g>
    <path d="M 1166 100 L 1192 100" stroke="#a21caf" stroke-width="2.5" marker-end="url(#flowArrowPurple)" />
  </g>

  <!-- Lane 2: Retrieval-Augmented Generation (RAG) Interactive Loop (Bottom Lane) -->
  <g transform="translate(40, 440)">
    <rect width="1520" height="420" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <path d="M 0 12 Q 0 0 12 0 L 1508 0 Q 1520 0 1520 12 L 1520 36 L 0 36 Z" fill="url(#headerGrad2)" />
    <text x="20" y="24" font-size="13" font-weight="700" fill="#ffffff">&#128172; QUERY &amp; GENERATION PHASE: Interactive Conversational RAG with Multi-Head Attention</text>

    <!-- User Query -->
    <g transform="translate(30, 60)" filter="url(#shadowBox)">
      <rect width="250" height="320" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />
      <rect x="0" y="0" width="250" height="36" rx="8" fill="#0070f2" />
      <text x="14" y="23" font-size="12" font-weight="700" fill="#ffffff">&#128100; SAP Fiori User / Client</text>
      <text x="14" y="60" font-size="11" font-weight="700" fill="#334155">Natural Language Question:</text>
      <rect x="12" y="70" width="226" height="60" rx="6" fill="#ffffff" stroke="#0070f2" stroke-width="1.5" />
      <text x="20" y="94" font-size="11" font-weight="600" fill="#0854a0">"What are the primary</text>
      <text x="20" y="112" font-size="11" font-weight="600" fill="#0854a0">findings of this paper?"</text>
      <text x="14" y="156" font-size="10.5" fill="#475569">• Emitted from Object Page</text>
      <text x="14" y="174" font-size="10.5" fill="#475569">• POST /api/v1/documents/:id/chat</text>
      <text x="14" y="192" font-size="10.5" fill="#475569">• Passes prior chat history</text>
      <rect x="12" y="230" width="226" height="70" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
      <text x="125" y="254" text-anchor="middle" font-size="10" font-weight="700" fill="#0284c7">RestBackendAdapter</text>
      <text x="125" y="272" text-anchor="middle" font-size="9" fill="#64748b">Keycloak Bearer JWT Header</text>
      <text x="125" y="286" text-anchor="middle" font-size="9" fill="#64748b">Gateway Proxy / Express</text>
    </g>

    <line x1="286" y1="210" x2="330" y2="210" stroke="#0070f2" stroke-width="3" marker-end="url(#flowArrow)" />

    <!-- Query Vectorization & Qdrant Search -->
    <g transform="translate(340, 60)" filter="url(#shadowBox)">
      <rect width="280" height="320" rx="8" fill="#f0f9ff" stroke="#93c5fd" stroke-width="1.5" />
      <rect x="0" y="0" width="280" height="36" rx="8" fill="#0284c7" />
      <text x="14" y="23" font-size="12" font-weight="700" fill="#ffffff">&#128065; Qdrant HNSW Similarity</text>
      <text x="14" y="60" font-size="11" font-weight="700" fill="#0369a1">1. Query Vectorization:</text>
      <text x="20" y="78" font-size="10.5" fill="#475569">v_query = Embed(question)</text>
      <text x="14" y="106" font-size="11" font-weight="700" fill="#0369a1">2. Filtered Cosine Distance:</text>
      <text x="20" y="124" font-size="10.5" fill="#475569">doc_id == currentDocument</text>
      <text x="20" y="142" font-size="10.5" fill="#475569">Threshold: cos(θ) &gt; 0.65</text>
      <text x="14" y="170" font-size="11" font-weight="700" fill="#0369a1">3. Top-K Extraction (K=3):</text>
      <rect x="12" y="184" width="256" height="116" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1" />
      <text x="20" y="206" font-size="10" font-weight="700" fill="#16a34a">• Chunk #2 (Score: 0.94) • Page 4</text>
      <text x="20" y="222" font-size="9" fill="#64748b">"Multi-head attention allows..."</text>
      <text x="20" y="244" font-size="10" font-weight="700" fill="#16a34a">• Chunk #0 (Score: 0.88) • Page 1</text>
      <text x="20" y="260" font-size="9" fill="#64748b">"We propose the Transformer..."</text>
      <text x="20" y="282" font-size="10" font-weight="700" fill="#ca8a04">• Chunk #7 (Score: 0.73) • Page 9</text>
    </g>

    <line x1="626" y1="210" x2="670" y2="210" stroke="#0070f2" stroke-width="3" marker-end="url(#flowArrow)" />

    <!-- Prompt Assembly -->
    <g transform="translate(680, 60)" filter="url(#shadowBox)">
      <rect width="320" height="320" rx="8" fill="#faf5ff" stroke="#d8b4fe" stroke-width="1.5" />
      <rect x="0" y="0" width="320" height="36" rx="8" fill="#7c3aed" />
      <text x="14" y="23" font-size="12" font-weight="700" fill="#ffffff">&#128221; Grounding Prompt Assembly</text>
      <rect x="12" y="48" width="296" height="254" rx="6" fill="#ffffff" stroke="#e9d5ff" stroke-width="1" />
      <text x="20" y="70" font-size="10" font-family="monospace" font-weight="700" fill="#6b21a8">[SYSTEM PROMPT]</text>
      <text x="20" y="86" font-size="9" font-family="monospace" fill="#475569">You are Spring AI Assistant powered by</text>
      <text x="20" y="100" font-size="9" font-family="monospace" fill="#475569">Llama 3.3. Ground responses strictly in</text>
      <text x="20" y="114" font-size="9" font-family="monospace" fill="#475569">the retrieved passages with citations.</text>
      <text x="20" y="138" font-size="10" font-family="monospace" font-weight="700" fill="#15803d">[RETRIEVED PASSAGES]</text>
      <text x="20" y="154" font-size="8.5" font-family="monospace" fill="#334155">[Excerpt 1] Multi-Head Attention...</text>
      <text x="20" y="168" font-size="8.5" font-family="monospace" fill="#334155">[Excerpt 2] We propose the Transformer...</text>
      <text x="20" y="192" font-size="10" font-family="monospace" font-weight="700" fill="#0369a1">[RECENT CHAT TURNS]</text>
      <text x="20" y="208" font-size="8.5" font-family="monospace" fill="#475569">User: Tell me about parallelization.</text>
      <text x="20" y="222" font-size="8.5" font-family="monospace" fill="#475569">Assistant: Unlike RNNs, Transformer...</text>
      <text x="20" y="246" font-size="10" font-family="monospace" font-weight="700" fill="#b91c1c">[USER QUESTION]</text>
      <text x="20" y="262" font-size="8.5" font-family="monospace" fill="#b91c1c">"What are the primary findings?"</text>
      <rect x="20" y="274" width="280" height="20" rx="4" fill="#f0fdf4" stroke="#86efac" stroke-width="1" />
      <text x="160" y="288" text-anchor="middle" font-size="8.5" font-weight="700" fill="#166534">Zero-Hallucination Guardrail Active</text>
    </g>

    <line x1="1006" y1="210" x2="1050" y2="210" stroke="#7c3aed" stroke-width="3" marker-end="url(#flowArrowPurple)" />

    <!-- LLM Generation -->
    <g transform="translate(1060, 60)" filter="url(#shadowBox)">
      <rect width="430" height="320" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
      <rect x="0" y="0" width="430" height="36" rx="8" fill="#1e293b" />
      <text x="14" y="23" font-size="12" font-weight="700" fill="#ffffff">&#129302; Grounded Synthesis &amp; UI Citation Card</text>

      <rect x="14" y="48" width="402" height="150" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <text x="24" y="68" font-size="10.5" font-weight="700" fill="#0f172a">Streaming Synthesized Response (Markdown):</text>
      <text x="24" y="88" font-size="10" fill="#334155">"The primary findings demonstrate that the **Transformer**</text>
      <text x="24" y="104" font-size="10" fill="#334155">replaces recurrent layers with **Multi-Head Attention** [Excerpt 1].</text>
      <text x="24" y="120" font-size="10" fill="#334155">On WMT 2014 translation benchmarks, the big model achieves</text>
      <text x="24" y="136" font-size="10" font-weight="700" fill="#0284c7">28.4 BLEU, training in 3.5 days on 8 GPUs [Excerpt 2]."</text>
      <line x1="24" y1="150" x2="400" y2="150" stroke="#e2e8f0" stroke-width="1" />
      <text x="24" y="172" font-size="10" font-weight="700" fill="#059669">✓ Model: Llama 3.3 (70B Instruct) via Spring AI • Latency: 1.8s</text>
      <text x="24" y="188" font-size="9" fill="#64748b">Directly verifiable in SAP UI5 Object Page with interactive excerpt cards</text>

      <!-- Citation Footnotes Box -->
      <rect x="14" y="210" width="402" height="92" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1" />
      <text x="24" y="230" font-size="10.5" font-weight="700" fill="#065f46">&#128279; Interactive Citation Sources (Click to Jump):</text>
      <text x="24" y="250" font-size="9.5" fill="#047857">• <strong>[Excerpt 1]</strong> Chunk 2 (Relevance: 94.2%) — "Multi-Head Attention..."</text>
      <text x="24" y="268" font-size="9.5" fill="#047857">• <strong>[Excerpt 2]</strong> Chunk 0 (Relevance: 88.0%) — "Attention Is All You Need..."</text>
      <text x="24" y="286" font-size="9" font-style="italic" fill="#059669">Full audit trail preserved in MongoDB document version logs</text>
    </g>
  </g>
</svg>`;
}

async function main() {
  console.log('🎨 Generating RAG diagrams and documentation visual assets...');

  const diagramsDir = path.resolve(projectRoot, 'docs/diagrams');
  const docsDir = path.resolve(projectRoot, 'docs');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');
  const publicDiagramsDir = path.resolve(publicDir, 'diagrams');

  [diagramsDir, docsDir, publicDir, publicDiagramsDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // 1. Generate SVG strings
  const tokensEmbeddingsSvg = generateRagTokensEmbeddingsSvg();
  const ragWorkflowSvg = generateRagWorkflowSvg();

  // Save SVGs in docs/diagrams and docs
  fs.writeFileSync(path.join(diagramsDir, 'rag-tokens-embeddings-explained.svg'), tokensEmbeddingsSvg, 'utf8');
  fs.writeFileSync(path.join(diagramsDir, 'rag-workflow.svg'), ragWorkflowSvg, 'utf8');
  fs.writeFileSync(path.join(docsDir, 'rag-tokens-embeddings-explained.svg'), tokensEmbeddingsSvg, 'utf8');
  fs.writeFileSync(path.join(docsDir, 'rag-workflow.svg'), ragWorkflowSvg, 'utf8');

  // Also copy to public directory
  fs.writeFileSync(path.join(publicDiagramsDir, 'rag-tokens-embeddings-explained.svg'), tokensEmbeddingsSvg, 'utf8');
  fs.writeFileSync(path.join(publicDiagramsDir, 'rag-workflow.svg'), ragWorkflowSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'rag-tokens-embeddings-explained.svg'), tokensEmbeddingsSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'rag-workflow.svg'), ragWorkflowSvg, 'utf8');

  console.log('✅ Generated SVGs:');
  console.log('  - docs/diagrams/rag-tokens-embeddings-explained.svg');
  console.log('  - docs/diagrams/rag-workflow.svg');

  // 2. Rasterize to PNG via @resvg/resvg-js
  try {
    const resvg1 = new Resvg(tokensEmbeddingsSvg, {
      fitTo: { mode: 'width', value: 3040 } // 2x Retina
    });
    const pngData1 = resvg1.render().asPng();
    fs.writeFileSync(path.join(diagramsDir, 'rag-tokens-embeddings-explained.png'), pngData1);
    fs.writeFileSync(path.join(docsDir, 'rag-tokens-embeddings-explained.png'), pngData1);
    fs.writeFileSync(path.join(publicDiagramsDir, 'rag-tokens-embeddings-explained.png'), pngData1);
    fs.writeFileSync(path.join(publicDir, 'rag-tokens-embeddings-explained.png'), pngData1);

    const resvg2 = new Resvg(ragWorkflowSvg, {
      fitTo: { mode: 'width', value: 3200 } // 2x Retina
    });
    const pngData2 = resvg2.render().asPng();
    fs.writeFileSync(path.join(diagramsDir, 'rag-workflow.png'), pngData2);
    fs.writeFileSync(path.join(docsDir, 'rag-workflow.png'), pngData2);
    fs.writeFileSync(path.join(publicDiagramsDir, 'rag-workflow.png'), pngData2);
    fs.writeFileSync(path.join(publicDir, 'rag-workflow.png'), pngData2);

    console.log('✅ Generated 2x Retina PNGs:');
    console.log('  - docs/diagrams/rag-tokens-embeddings-explained.png');
    console.log('  - docs/diagrams/rag-workflow.png');
  } catch (err: any) {
    console.warn('⚠️ PNG generation warning:', err.message);
  }

  // 3. Generate PDFs via pdfkit
  try {
    // PDF 1: rag-tokens-embeddings-explained.pdf
    const doc1 = new PDFDocument({ layout: 'landscape', size: 'A3', margin: 20 });
    const pdfPath1 = path.join(diagramsDir, 'rag-tokens-embeddings-explained.pdf');
    const stream1 = fs.createWriteStream(pdfPath1);
    doc1.pipe(stream1);

    const png1Path = path.join(diagramsDir, 'rag-tokens-embeddings-explained.png');
    if (fs.existsSync(png1Path)) {
      doc1.image(png1Path, 20, 20, { width: doc1.page.width - 40 });
    }
    doc1.end();

    // PDF 2: rag-workflow.pdf
    const doc2 = new PDFDocument({ layout: 'landscape', size: 'A3', margin: 20 });
    const pdfPath2 = path.join(diagramsDir, 'rag-workflow.pdf');
    const stream2 = fs.createWriteStream(pdfPath2);
    doc2.pipe(stream2);

    const png2Path = path.join(diagramsDir, 'rag-workflow.png');
    if (fs.existsSync(png2Path)) {
      doc2.image(png2Path, 20, 20, { width: doc2.page.width - 40 });
    }
    doc2.end();

    console.log('✅ Generated PDFs:');
    console.log('  - docs/diagrams/rag-tokens-embeddings-explained.pdf');
    console.log('  - docs/diagrams/rag-workflow.pdf');
  } catch (err: any) {
    console.warn('⚠️ PDF generation warning:', err.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
