# Speaker Cue Cards — Memory Version
## *Beyond Prompting: Building a Local AI Document Assistant with LLMs and RAG*

**45 min talk + 15 min Q&A · 35 slides**
**Full script:** [`SPEAKER_NOTES.md`](SPEAKER_NOTES.md) · **Deck:** [`presentations/beyond-prompting-local-rag.pptx`](presentations/beyond-prompting-local-rag.pptx)

> One card per slide. Each card gives you the **beat** (what this slide is for), the **beats to hit**, and the **one line** you must not leave the slide without saying.

---

## Timing Checkpoints — glance at these, not the clock

| At | You should be on | Slide |
| :--- | :--- | :--- |
| 04:00 | Starting the demo | 4 |
| 10:00 | Starting Section 2 | 7 |
| 12:00 | The brief (five assumptions) | 10 |
| 14:00 | The "make it checkable" code | 12 |
| 18:00 | Starting architecture | 17 |
| 27:00 | Starting RAG / Kansas | 23 |
| 36:00 | Starting the numbers | 28 |
| 45:00 | Opening the floor | 33 |

**If you are behind:** cut slide 20 (diagrams) and slide 27 (RAG limits — fold into 26). **Never cut Section 2.**

---

# Opening · 00:00–04:00

### 1 · Title — `00:00`
* A model is a **generator, not a database**.
* We'll open one small real app completely — including what it *doesn't* do.
* Second thread: AI can write the code, it cannot choose the code.
* 🔑 **"It can write the code. It cannot decide what the code should be."**

### 2 · The Promise — `02:00`
* Private input → retrieval → grounded output → **engineering lesson**.
* The fourth one is the one that matters.
* 🔑 **"AI supplies implementation. It does not supply intent or verification."**

### 3 · Roadmap — `03:30`
* Demo first, theory second — so every later diagram answers a question you already have.
* 🔑 **"Section 2 is the one to stay awake for."**

---

# Section 1 · Live Demo · 04:00–10:00

### 4 · Divider — `04:00`
* Move fast. Don't narrate controls.
* 🔑 **"At every step ask: could I verify that?"**

### 5 · Live Demo — `04:30` ⏱ *4 min, longest block*
**Run in order:**
1. Select doc → metadata, version, **two** summaries
2. Ask question → answer → **click a citation**
3. Mongo Express → record + history
4. Qdrant dashboard → collection, points, **documentGuid payload**
5. Swagger → OpenAPI contract
6. Keycloak / Ollama / health
* Say which parts are **mock mode** vs real.
* If a model call hangs, narrate — don't go silent.
* 🔑 **"The answer is an assertion plus its evidence."**

### 6 · Demo Debrief — `08:30`
* VISIBLE / IMPLEMENTED / DOCUMENTED / **LIMITATION**.
* Concede now: **citation score is hardcoded**, BPMN doesn't execute, no RAG judge.
* No apology in the voice. This buys credibility.
* 🔑 **"Trust grows when a system exposes its boundaries."**

---

# Section 2 · Why and How · 10:00–18:00 ★ THE SPINE

### 7 · Divider — `10:00`
* Three questions: what does it know, what does it invent, what's left for us?

### 8 · Trained, Not Thinking — `10:15`
* **Frozen in time** — post-cutoff isn't "new" or "unknown," it's **absent**.
* **No imagination** — reproduces probable continuations, not designs.
* **No self-doubt** — recall and fabrication are the *same operation*; confidence is a writing style.
* **The prior wins** — drifts back to the familiar even when told not to. *(Flag: "watch this happen to me in two slides.")*
* Don't anthropomorphise. No "wants," "tries," "knows it doesn't know."
* 🔑 **"Hallucination isn't a malfunction — it's the same mechanism that produces every correct answer."**

### 9 · Model Boundary — `11:10`
* Left: patterns + prompt → plausible invention. Right: evidence → constrained answer.
* Retrieval changes the **input distribution** — the only lever that moves the output.
* "Don't use prior knowledge" = a string competing with the weights. Weights win.
* 🔑 **"Grounding doesn't make hallucination impossible — it makes it detectable."**

### 10 · The Brief — `12:00` *(sets up the next slide)*
**Five assumptions, written before any code:**
1. **Enterprise-grade** — layered services, real identity, versioned persistence, documented contracts, operable containers
2. **No coding by the end user** — librarian uploads a PDF, asks a question; no notebooks, no YAML
3. **Named technologies only** — SAP UI5 Web Components · Spring Boot · Ollama · Qdrant · Docker
4. **Latest version of each** — explicitly the newest release, not "something recent"
5. **Fully local** — inference, embeddings, vectors, storage; no document leaves the machine
* Tone: **premise, not complaint.** "Nothing exotic — any of you could have written this on day one."
* Then pivot: constraints **3 and 4** fight hardest against the prior. Naming a tech rejects the most-seen one; demanding *latest* demands the **least**-seen one.
* 🔑 **"An exacting brief is exactly the kind of brief a model is worst at honouring."**

### 11 · Told Explicitly. Ignored Anyway. — `12:45` ★ strongest evidence
* Brief said **SAP UI5** → got **React**. React dominates the corpus; UI5 is a thin slice.
* Brief said **latest Spring Boot (4)** → got **Boot 3** + `spring-boot-starter-web`.
  → *"'Latest' resolves to the latest **it has seen**."* Boot 4 is past the cutoff — absent, not unknown.
* Brief said **enterprise-grade** → got the statistical average tutorial app.
* Three constraints, three overrides, **zero defiance** — it fell down the gradient.
* 🔑 **"Statistical gravity beats an explicit instruction. A stronger prompt doesn't fix it."**

### 12 · Specify, Then Make It Checkable — `13:50`
* Left: parent pinned to **4.1.1**; `spring-boot-starter-webmvc`; `spring.mongodb.*` — *exactly* what it got wrong.
* Right: assert `@ui5/webcomponents` present, `react` **absent**, dependency tree is Boot 4.
* Also kills silent regressions at iteration 14.
* Point at the version + two renamed identifiers. Don't read code.
* 🔑 **"The agent cannot argue with a red build."**

### 13 · Grounding as Interface Contract — `14:45`
* Three things written down: **evidence boundary**, **abstention rule**, **citation shape**.
* The abstention clause does the heavy lifting — without it, "answer from context" becomes "...and improvise."
* API is incidental; the explicitness is the point.
* 🔑 **"'Be accurate' is a wish, not an instruction."**

### 14 · The Loop — `15:35`
* **Specify → Generate → Verify → Correct.**
* Generate was *never* the bottleneck.
* Verify found: wrong names, stale docs, mismatched ports, **fabricated doc claims**.
* Nothing crashed. The React app ran. The Boot 3 backend ran. That's the danger.
* 🔑 **"It doesn't fail dramatically. It fails plausibly."**

### 15 · Where the Human Edge Moved — `16:20`
* **Do not read the matrix.** Point at the failure-mode row only.
* Academic failure = suboptimal convergence. Strategic failure = **solving the wrong problem extremely well** — and AI made that one much easier to commit.
* Cognitive stack = shape of the Google AI Certificate (creativity, multi-model, lateral synthesis — not syntax): Grounding = Qdrant scoped retrieval · Reasoning = Llama + Mistral · Pipelines = agentic generation under a pinned contract.
* Those three layers *are* the next section's architecture.
* 🔑 **"The newest abstraction layer isn't a retreat from rigor — it's where the rigor now applies."**

### 16 · Human Leverage — `17:15`
* PhD → navigating ambiguity, discovering problems worth solving.
* Google AI Certificate → deliberate bridge to real-world strategy and business impact.
* Same skill from opposite directions.
* Land it, pause, move. **Don't let it become a biography.**
* 🔑 **"Success is no longer only how we build, but what we choose to build and why."**

---

# Section 3 · Architecture · 18:00–27:00

### 17 · Divider — `18:00`
* "Everything I claimed has to be true of a real system. Here it is."

### 18 · System Topology — `18:20`
* UI5 → REST/nginx → Spring Boot 4 → Mongo / Qdrant / Ollama / Keycloak.
* "Runs locally" is a **topology choice with a bill**: ports, persistence, model sizes, timeouts, ops.
* 🔑 **"You trade latency and convenience for privacy and control."**

### 19 · Ingestion — `20:00`
* One button, seven steps: Tika → BibTeX → chunk (~400 chars, paragraph-aligned) → 768-D embed → Qdrant → 2 summaries → Mongo.
* Today: sequential, synchronous, graceful excerpt fallback if Qdrant is down.
* 🔑 **"This is where every timeout and failure policy accumulates."**

### 20 · Diagrams — `21:30` *(cuttable)*
* Mind map = concepts. BPMN = intended process + governance.
* **BPMN is a static artifact.** No Camunda. No Zeebe.
* 🔑 **"A diagram is a decision surface — useful even when it's not executable, as long as everyone knows which it is."**

### 21 · Polyglot Persistence — `23:30`
* Mongo = system of record (metadata, versions, lifecycle). Qdrant = semantic index (768-D, cosine/HNSW, GUID scoping, top-k).
* Not technology collecting — separation of operational responsibility.
* 🔑 **"Don't ask a vector index to be your source of truth; don't ask a document DB to be your search engine."**

### 22 · BPMN Reality Check — `25:00`
* Intent: retry 3×10s, review gate, orchestration. Reality: `@Service` calls, synchronous happy path, no engine.
* Production needs: backoff, queue, idempotency, real review state, observable workflow.
* Same failure mode as the React slide — reads correctly, isn't true.
* 🔑 **"Documented policy is not enforced policy."**

---

# Section 4 · RAG from Kansas · 27:00–36:00

### 23 · Divider — `27:00`
* "One story, told twice: intuition, then engineering."

### 24 · Beginner RAG — `27:20`
* Small desk = context window.
* Closed book: green spectacles question → confident, unverifiable guess. *(Worse if it's right — you learn to trust it.)*
* Open book: librarian finds the passage → model answers from it → you can check.
* Keep it short.
* 🔑 **"RAG isn't a smarter model — it's a better evidence workflow around a model. Only the desk changed."**

### 25 · Advanced RAG — `29:30`
* Extract → Chunk → Embed → Retrieve → Generate.
* Strong: scoping, local embeddings, grounded prompt, interactive citations.
* Missing: hybrid BM25, query rewriting, cross-encoder re-ranking, faithfulness eval.
* 🔑 **"Mature advanced-leaning RAG — with four clearly labelled upgrade paths."**

### 26 · Retrieval Code — `32:00`
* **The filter expression is the whole slide.** `documentGuid ==` — without it, semantic search returns beautifully relevant passages from the *wrong* document.
* Then label excerpts, then generate grounded.
* Repeat: displayed score is a placeholder.
* 🔑 **"Retrieval and generation are separate failure surfaces — diagnose which one broke."**

### 27 · RAG Limits — `34:00` *(cuttable — fold into 25)*
* **Recall** (not in top-k) · **Precision** (similar ≠ relevant) · **Generation** (overstates) · **Evaluation** (placeholder score).
* 🔑 **"Not 'zero hallucinations' — a smaller, more inspectable surface for unsupported claims."**

---

# Section 5 · Evidence & Lessons · 36:00–45:00

### 28 · Divider — `36:00`
* "Engineering estimates, not audited accounting."

### 29 · Financial Ledger — `36:20`
* **~$270** total = $70 direct + ~20,000 credits ($200).
* **65–68M tokens** — *derived*, scaled from the revised credit baseline.
* **102,870 tokens** runtime inference — deliberately kept separate.
* 284 agent actions · **22–30 hrs** · $2.14 hosting.
* 🔑 **"Dollars and credits are solid; token volume is derived. I'd rather show the derivation."**

### 30 · ROI — `39:00`
* Manual 120–165 hrs → $12k–16.5k · Senior+copilot 55–70 hrs → $5.5k–7k · This build 22–30 hrs → **~$270**.
* ~98% savings.
* **Say the 90% line out loud** — if you skip it, it's the first Q&A question.
* 🔑 **"A defensible order of magnitude, not a business case. ~90% confident as an engineering estimate."**

### 31 · Lessons Learned — `42:00`
1. Specify architecture first *(React slide)*
2. Executable acceptance criteria *(Boot 4 slide)*
3. Inspect plausible output
4. Separate implemented / planned / documented *(BPMN slide)*
5. Retrieval + citations + abstention narrow the model's responsibility
* 🔑 **"Not a generic checklist — each rule came from a mistake in this project."**

### 32 · Closing Idea — `44:00` *(leave on screen through Q&A)*
* Commoditized execution → differentiation is curiosity, lateral thinking, choosing the right problem.
* 🔑 **"The model can accelerate the build. It cannot choose the problem."**
* Close: *"I'd rather be challenged than applauded."*

---

# Section 6 · Q&A · 45:00–60:00

### 33 · Open Questions
**Wait a full 10 seconds before using a seed prompt.**
1. Where's the trust boundary for local-first RAG?
2. When is dense retrieval enough vs. hybrid/re-ranking?
3. How would you verify faithfulness beyond a citation drawer?
4. What becomes an executing workflow engine first?
5. What changes at production scale?
6. Which business problem is worth building next?

**Anchor every answer back to:** implementation / evidence / architecture / problem choice are related but **not interchangeable**.

### 34–35 · Links & Bibliography *(on demand)*
* `github.com/epascalau/personal-library` · docs for frontend, backend, devops, RAG comparison, CS PhD perspective.
* Lewis 2020 · Gao 2024 · Vaswani 2017 · Qdrant / Spring AI / UI5 docs.

---

## Panic Card — facts you may be asked for

| | |
| :--- | :--- |
| Frontend | TypeScript + **SAP UI5 Web Components v2.27**, no framework |
| Backend | **Spring Boot 4.1.1**, Spring AI 2.0.1, Java 21 |
| Embeddings | `nomic-embed-text`, **768-D**, cosine |
| Collection | `personal_library_embeddings` |
| Retrieval | `topK(4)`, filtered on `documentGuid` |
| Chunking | paragraph-aligned, ~400 chars, 50-char min, **no overlap** |
| Models | `llama3.2`, `mistral`, `nomic-embed-text` |

**Concede fast, don't get caught:** hardcoded citation score (0.88) · BPMN never executes · `permitAll()` with no `@PreAuthorize` · UI labels overstate model sizes · no hybrid search / re-ranking / auto-eval.

**Hard questions:**
* *Long context instead of RAG?* → cost, latency, lost-in-the-middle, and no citations.
* *How do you evaluate retrieval?* → manually today; biggest gap; next thing I'd build.
* *Why two summarizers?* → different emphases; cheap multi-model demo.
* *400 chars too small?* → probably for some docs; alignment matters more than count; overlap would help recall.
* *Are the costs real?* → spend and credits yes; hours and ROI reconstructed; ~90% confidence.
