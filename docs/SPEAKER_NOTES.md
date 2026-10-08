# Presenter Side Notes & Full Speaker Script
## *Beyond Prompting: Building a Local AI Document Assistant with LLMs and RAG*

**Format:** 1-Hour Session (45-Minute Talk + 15-Minute Open Floor Q&A)
**Target Audience:** Software Architects, Senior Engineers, CS Academics, Engineering Leaders, Technical Researchers
**Companion Deck:** [`presentations/beyond-prompting-local-rag.pptx`](presentations/beyond-prompting-local-rag.pptx) — 35 slides
**Deck Source:** `scripts/generate-beyond-prompting-deck.ts` (regenerate with `npx tsx scripts/generate-beyond-prompting-deck.ts`)
**Condensed Version:** [`SPEAKER_NOTES_CUE_CARDS.md`](SPEAKER_NOTES_CUE_CARDS.md) — bullet cue cards for speaking from memory

> **How to use this document.** Every slide below maps 1:1 to a slide in the PPTX, in order, with the same timings embedded in the deck's own notes pane. The verbatim script is a safety net, not a straitjacket — speak it if you need it, paraphrase it if the room is with you.

---

## Session Overview & Timing Blueprint

```
+-----------------------------------------------------------------------------------------+
|  00:00 - 04:00 | Opening: title, the promise, roadmap                     | Slides  1-3  |
|  04:00 - 10:00 | Section 1: Live demo and demo debrief                    | Slides  4-6  |
|  10:00 - 18:00 | Section 2: Why and how — models, priors, human judgment  | Slides  7-16 |
|  18:00 - 27:00 | Section 3: Architecture made visible                     | Slides 17-22 |
|  27:00 - 36:00 | Section 4: RAG from Kansas to production retrieval       | Slides 23-27 |
|  36:00 - 45:00 | Section 5: Evidence, economics, lessons, closing idea    | Slides 28-32 |
|  45:00 - 60:00 | Section 6: Open floor Q&A                                | Slide     33 |
|     reference  | Links and bibliography (shown on demand)                 | Slides 34-35 |
+-----------------------------------------------------------------------------------------+
```

**Section 2 is the spine of the talk.** It is the longest content section (8 minutes, 10 slides) and it is where the argument actually lives. If you are running late, cut from Section 3 or Section 4 — never from Section 2.

---

# Opening (00:00 – 04:00)

### Slide 1: Title
* **Elapsed:** `00:00 – 02:00`
* **Visual anchor:** Navy title slide, "LOCAL-FIRST" and "GROUNDED AI" pills.
* **Core takeaway:** An LLM is a generator, not a reliable document database.

#### Verbatim Script
> *"Good morning, and welcome to **Beyond Prompting: Building a Local AI Document Assistant with LLMs and RAG**.*
>
> *I want to start with the sentence that this whole session is built around: a large language model is a generator, not a database. It is extraordinarily good at producing plausible text. It is not, by construction, able to tell you what is inside a PDF it has never seen.*
>
> *Over the next forty-five minutes we are going to take one small, real, local-first application and open it completely. You will see the running app, the vector store, the model server, the architecture, the code, and — this is the part people usually leave out — the things it does not do, the places where it is a documentation artifact rather than an implementation.*
>
> *And woven through all of that is a second argument, which is really the reason I built this thing: AI can write the code. It cannot decide what the code should be. Those are not the same skill, and the gap between them is where our job is moving."*

* **Pitfall:** Do not read the abstract aloud. The audience already chose to be here.

---

### Slide 2: The Promise
* **Elapsed:** `02:00 – 03:30`
* **Visual anchor:** Four cards — Private Input, Retrieval, Grounded Output, Engineering Lesson — plus keyword chips.
* **Core takeaway:** This is the contract for the talk, not a product tour.

#### Verbatim Script
> *"Here is the contract for the session, in four parts.*
>
> *One: **private input**. A PDF is uploaded locally. Nothing leaves the machine. Text and metadata are extracted on your own hardware.*
>
> *Two: **retrieval**. Those chunks become embeddings, and those embeddings become searchable points in a vector database — Qdrant, in this case.*
>
> *Three: **grounded output**. The model answers from the passages that were actually retrieved, and it shows you which ones. You can click them.*
>
> *And four — the one I care about most — the **engineering lesson**. AI can accelerate implementation enormously. It does not supply intent, and it does not supply verification. Those remain ours.*
>
> *If you only remember one of these four, remember the fourth."*

* **Pitfall:** Resist the urge to define RAG here. The demo does it better.

---

### Slide 3: Roadmap
* **Elapsed:** `03:30 – 04:00`
* **Visual anchor:** Six numbered rows.
* **Core takeaway:** Demo first, theory second.

#### Verbatim Script
> *"Six sections. Notice that the live demo comes first, before any theory. That is deliberate. I want you to see the thing working, form your own questions about how it could possibly work, and then spend the rest of the hour answering those questions.*
>
> *Section two is the longest and it is the one I would ask you to stay awake for. Sections three and four are the engineering. Section five is the money and the lessons. And section six is yours."*

---

# Section 1 — Live Demo (04:00 – 10:00)

### Slide 4: Section Divider — 01 Live Demo
* **Elapsed:** `04:00 – 04:30`
* **Core takeaway:** Transition immediately; keep moving.

#### Verbatim Script
> *"Let's just look at it. I am going to move quickly, I am not going to explain every control, and I want you to watch for one thing specifically: at every step, ask yourself 'could I verify that?'"*

---

### Slide 5: Live Demo — Six Inspectable Surfaces
* **Elapsed:** `04:30 – 08:30` (the longest single block in the deck — 4 minutes)
* **Visual anchor:** Six numbered demo steps.
* **Core takeaway:** The UI is one surface; the consoles behind it are the proof.

#### Live Sequence (run this in order)
1. **Upload / select** a document → show extracted metadata, the versioned file, and *both* summaries.
2. **Ask a question** in the RAG chat → show the answer, then open the citation drawer and click a source excerpt.
3. **Inspect storage** → Mongo Express: the document record, its state, its version history.
4. **Inspect vectors** → Qdrant dashboard: the `personal_library_embeddings` collection, the points, the `documentGuid` payload.
5. **Inspect contracts** → Swagger Editor: the OpenAPI endpoints.
6. **Inspect operations** → Keycloak, Ollama, storage browser, health endpoints.

#### Verbatim Script
> *"So — I select a document. It has been through the pipeline already; I'll explain that pipeline in section three. Notice there are two summaries, generated by two different models, because they are good at different things.*
>
> *Now I ask it a question about the content. Here is the answer — and here, in the drawer, are the actual passages it used. I can click one and read the source. That is the whole point. The answer is not an assertion, it is an assertion plus its evidence.*
>
> *But I don't want you to take the UI's word for anything, so let's go behind it. This is Mongo Express — there is the document record, the metadata, the version history. This is the Qdrant dashboard — there is the collection, there are the vector points, and notice each one carries a document GUID in its payload. That GUID is what stops one document's content leaking into another document's answer.*
>
> *Here is the OpenAPI contract. Here is Keycloak. Here is the Ollama model server, running locally. Nothing here is a cloud call."*

* **Demo discipline:** Say out loud which parts are real and which parts are mock mode. Mock mode and real mode are different code paths.
* **Pitfall:** If a model call is slow, keep talking — narrate what is happening rather than standing in silence.

---

### Slide 6: Demo Debrief
* **Elapsed:** `08:30 – 10:00`
* **Visual anchor:** Four columns — VISIBLE, IMPLEMENTED, DOCUMENTED, LIMITATION.
* **Core takeaway:** A polished interface can hide very different levels of implementation.

#### Verbatim Script
> *"Now the honest debrief, because this slide is where I spend my credibility rather than build it.*
>
> *What is **visible**: the UI5 floorplans, the filters, the summaries, the chat, the citations, the links. What is genuinely **implemented** underneath: Spring services, MongoDB state, Qdrant search, real Ollama calls.*
>
> *What is only **documented**: the BPMN retry policy, the librarian review gate, the modular RAG roadmap. Those exist as design artifacts. No engine executes them.*
>
> *And the **limitation** I want to name before anyone finds it: that relevance score you saw next to each citation is a hardcoded placeholder. It is not a measured cosine distance. There is no automated RAG judge loop in this system.*
>
> *I am telling you that on slide six rather than hoping you don't ask on slide thirty-three. Trust grows when a system exposes its boundaries instead of presenting every value as a fact."*

* **Pitfall:** Deliver this without apology. It is a strength of the talk, not a confession.

---

# Section 2 — Why and How (10:00 – 18:00)
> **This is the heart of the talk.** Ten slides, eight minutes. Everything after the demo exists to explain two things: why retrieval is necessary, and why an AI agent left unsupervised builds something *plausible* instead of something *correct*.

### Slide 7: Section Divider — 02 Why and How
* **Elapsed:** `10:00 – 10:15`
* **Visual anchor:** "What a model knows, what it invents, and what only you can decide."

#### Verbatim Script
> *"Right. Theory — but the useful kind. Three questions: what does a model actually know, what does it invent, and what is left that only a human can decide?"*

---

### Slide 8: Trained, Not Thinking
* **Elapsed:** `10:15 – 11:10`
* **Visual anchor:** Four cards — FROZEN IN TIME, NO IMAGINATION, NO SELF-DOUBT, THE PRIOR WINS.
* **Core takeaway:** Hallucination is not a malfunction; it is the same mechanism that produces correct answers.

#### Verbatim Script
> *"A model knows what it learned, at the moment it learned it. I want to unpack that sentence in four pieces, because every failure in this talk falls out of it.*
>
> ***Frozen in time.** Its knowledge stops at the training cut-off. And here is the subtle part: anything released after that date is not 'new' to the model, and it is not 'unknown' to the model. It is simply **absent**. The model has no slot for it. It cannot miss what it has no representation of.*
>
> ***No imagination.** This is the one that surprises people. It does not invent a design. It reproduces the most probable continuation of patterns it has already seen, many times. What looks like creativity is interpolation across an enormous corpus — which is genuinely useful, but it is not invention.*
>
> ***No self-doubt.** Internally, recalling a fact and fabricating one are the same operation. There is no separate 'I am making this up now' pathway that could raise a flag. So confidence in the output is a property of writing style, not a measure of evidence. A fabricated citation and a real one are produced by identical machinery.*
>
> ***And the prior wins.** Tell it explicitly not to use a familiar pattern, and it will still drift back to that pattern whenever the alternative you asked for is thin in its training data. Hold on to that one. I am going to show you exactly that happening, to me, twice, in two slides.*
>
> *Put those together and you get the line at the bottom: hallucination is not a malfunction. It is the very same mechanism that produces all of the correct answers. You cannot remove it without removing the model.*
>
> *Which means the engineering question is never 'how do I stop it inventing?' It is: what evidence did I put in front of it, and can I check the answer against that evidence?"*

* **Pitfall:** Resist anthropomorphising. Do not say the model "wants," "tries," or "knows that it doesn't know."

---

### Slide 9: Model Boundary
* **Elapsed:** `11:10 – 12:00`
* **Visual anchor:** Two-column flow — without retrieval (red) vs. with retrieval (teal).
* **Core takeaway:** A prompt cannot conjure missing evidence.

#### Verbatim Script
> *"So here is the same idea as a picture.*
>
> *On the left, without retrieval: a question about a private PDF goes in, it meets the model's learned patterns plus whatever is in the prompt, and out comes a plausible answer that may be entirely invented. Not because the model is broken — because that is the only thing it can do with the inputs it has.*
>
> *On the right, with retrieval: the same question, but first we go and fetch the relevant source passages and put them into the context. Now the answer is constrained by evidence.*
>
> *And I want to be precise about the mechanism, because this is where a lot of RAG explanations get hand-wavy. Retrieval does not make the model more honest. Retrieval changes the **input distribution**, and the input distribution is the only lever that actually moves the output. That is it. That is the whole trick.*
>
> *Which is also why the instruction 'please do not use your prior knowledge' is not a reliable control boundary. It is a string in a prompt competing against the weights. The weights usually win.*
>
> *And the line at the bottom matters: grounding does not make hallucination impossible. It makes unsupported answers easier to detect, to limit, and to investigate. That is a smaller claim than most vendors make, and it is the one I can defend."*

---

### Slide 10: The Brief — Five Non-Negotiable Assumptions
* **Elapsed:** `12:00 – 12:45`
* **Visual anchor:** Five numbered constraint rows; row 04 ("latest version") highlighted in red.
* **Core takeaway:** An exacting brief is exactly the kind of brief a model is worst at honouring.

#### Verbatim Script
> *"Before I show you what went wrong, you need to know what was asked for. Because 'the AI got it wrong' is a worthless story unless you know how specific the instruction was. So here is the brief, written down before a single line of code existed.*
>
> ***One: enterprise-grade.** Not a demo script, not a notebook with a nice output. Layered services, real identity, persistence with version history, documented contracts, operable containers. The kind of thing you could hand to another team.*
>
> ***Two: no coding by the end user.** The person using this is a librarian, not an engineer. They upload a PDF and they ask a question. No notebooks, no YAML, no prompt engineering demanded of them. The whole burden of making the model behave sits inside the application, not on the user.*
>
> ***Three: named technologies only.** SAP UI5 Web Components. Spring Boot. Ollama. Qdrant. Docker. These were chosen deliberately, for reasons — design system consistency, enterprise Java, local inference, vector search, reproducible environments. They were not left to the model to pick.*
>
> ***Four: the latest version of each.** Explicitly the newest release of every named technology. Not 'something recent.' The newest.*
>
> ***And five: fully local.** Inference, embeddings, vectors, storage — all on own infrastructure. No document leaves the machine. That is the privacy requirement that makes this architecture interesting at all.*
>
> *Now — I want you to notice something about this list. There is nothing exotic here. This is an ordinary enterprise brief. Any of you could have written it on day one of a project and nobody would have blinked.*
>
> *But look at it through slide eight. Constraints three and four are the two that fight hardest against the training prior. Naming a specific technology means rejecting the one the model has seen most often. Demanding the latest version means demanding the one it has seen **least** often, or not at all.*
>
> *So the line at the bottom: an exacting brief is exactly the kind of brief a model is worst at honouring. Every constraint on this slide narrows it away from its most probable output.*
>
> *Hold that thought for about fifteen seconds."*

* **Pitfall:** Deliver this as the **premise**, not as a complaint. The tone is "here is what any engineer would have specified," not "here is my list of grievances." The slide exists so that the next slide is evidence rather than anecdote.

---

### Slide 11: Told Explicitly. Ignored Anyway.
* **Elapsed:** `12:45 – 13:50`
* **Visual anchor:** Three-column table — what the brief said / what arrived / why.
* **Core takeaway:** Statistical gravity beats an explicit instruction.

#### Verbatim Script
> *"This is what came back against that brief. Every one of these was asked for in writing, on the previous slide, before any code existed.*
>
> *The brief said **SAP UI5 Web Components**. What arrived was a **React single-page app**. Not a broken one — a perfectly competent React app. Why? Because React is overwhelmingly dominant in the training corpus for anything labelled 'web UI.' UI5 Web Components is a thin slice sitting next to a mountain. The model did not defy me; it fell down the gradient.*
>
> *The brief said **the latest Spring Boot**, which is 4. What arrived was **Spring Boot 3**, with `spring-boot-starter-web` in the POM. And this one is the most instructive failure in the whole talk, because of what the word 'latest' actually does. 'Latest' does not resolve to the latest release. It resolves to **the latest release the model has seen**. Boot 4 sits at or past the cut-off, so — remember slide eight — it is not 'new' to the model and it is not 'unknown' to the model. It is absent. So the model confidently wrote the starter names and property prefixes it did know.*
>
> *And the third row: the brief said enterprise-grade, as specified. What arrived was a generic, perfectly reasonable tutorial app. Because absent an explicit, checkable contract, the model fills the gap with the statistical average of every similar project it has ever read.*
>
> *Three constraints, three overrides, zero defiance.*
>
> *So here is the lesson, and it is the one I would tattoo on the inside of my eyelids: **statistical gravity beats an explicit instruction**. And critically — a stronger prompt does not fix this. Writing 'IMPORTANT: YOU MUST USE SPRING BOOT 4' in capital letters does not fix this. A machine-checkable constraint fixes this."*

* **Pitfall:** Tell this honestly and without embarrassment. It is the single strongest piece of evidence in the talk. The model was not disobeying — it was returning to its prior.

---

### Slide 12: Specify the Architecture, Then Make It Checkable
* **Elapsed:** `13:50 – 14:45`
* **Visual anchor:** Two code blocks — pinned Maven parent / shell contract checks. Four pills: PIN THE VERSION, NAME THE EXACT LIBRARY, FORBID THE DEFAULT, FAIL THE BUILD.
* **Core takeaway:** Move the requirement out of the prompt and into the build.

#### Verbatim Script
> *"So this is the fix. Prose is a suggestion. A pinned version and a failing check are not.*
>
> *On the left: the Maven parent, pinned to `4.1.1`. Not 'use Spring Boot 4' in a prompt — the actual version, in the actual POM. And notice the two things underneath, because they are exactly what the model got wrong: Boot 4 renamed the MVC starter to `spring-boot-starter-webmvc`, and the Mongo property prefix moved to `spring.mongodb`. Those are precisely the details a model trained before the release cannot possibly have, and will cheerfully supply from the old version anyway.*
>
> *On the right: the architecture contract as executable checks. Assert that `@ui5/webcomponents` is in `package.json`. Assert that `react` is **not**. Walk the dependency tree and assert Spring Boot 4. Three lines of shell.*
>
> *Why does this work when the prompt didn't? Because the agent cannot argue with a red build. An instruction is a request. A failing check is a fact.*
>
> *And there is a second benefit that you only discover later: this is also how you stop silent regressions, where iteration fourteen quietly reintroduces the familiar pattern that iteration three removed.*
>
> *The general rule is at the bottom: everything the model must not guess should exist as a version, a test, a lint rule, or a schema."*

* **Pitfall:** Do not read the code character by character. Point at the version number and the two renamed identifiers; that is the whole story.

---

### Slide 13: Grounding Is an Interface Contract
* **Elapsed:** `14:45 – 15:35`
* **Visual anchor:** Java system prompt / TypeScript context assembly. Pills: GOOD / NOT ENOUGH / ALSO NEEDED.
* **Core takeaway:** The same discipline, applied to the model at runtime.

#### Verbatim Script
> *"The previous slide was about constraining the agent that writes your code. This slide is the same discipline applied to the model at runtime.*
>
> *On the left, the system prompt. Three things are written down explicitly. The **evidence boundary**: answer using only the retrieved context. The **abstention rule**: if the context does not contain the answer, say that the document does not provide it. And the **citation requirement**: cite the supporting excerpts.*
>
> *That abstention clause is doing enormous work. Without it, 'answer from the context' quietly becomes 'answer from the context, and if that's thin, improvise.'*
>
> *On the right, the context assembly. Each retrieved chunk gets labelled as a numbered excerpt before it goes into the prompt, which is what makes the citation drawer you saw in the demo possible at all.*
>
> *The API here is incidental — this is Spring AI, it could be anything. What matters is that the evidence boundary, the failure behaviour, and the citation format are **written down** rather than hoped for.*
>
> *So: good — an evidence boundary with an abstention path. Not enough — 'be accurate,' which is a wish, not an instruction. Also needed — citations the user can actually inspect."*

---

### Slide 14: The Loop That Produced This Repository
* **Elapsed:** `15:35 – 16:20`
* **Visual anchor:** Four-step flow — SPECIFY, GENERATE, VERIFY, CORRECT.
* **Core takeaway:** It fails plausibly, not dramatically.

#### Verbatim Script
> *"So can AI build an application? Yes. Absolutely yes. Just not in one pass. Here is the loop that actually produced this repository.*
>
> ***Specify.** Stack, exact versions, module boundaries, acceptance criteria — written before any code exists.*
>
> ***Generate.** The agent writes the implementation far faster than I could. And I want to be clear about this: this step was never the bottleneck. Not once. Generation is solved.*
>
> ***Verify.** A repo-wide audit found wrong component names, stale documentation, mismatched ports, and — this one stung — documentation claims that were simply fabricated. Claims about what the code did that the code did not do.*
>
> ***Correct.** React became UI5 Web Components. Boot 3 became Boot 4.1.1. And every claim in the docs was rewritten to match what the code actually does.*
>
> *Here is what I want you to take from this. None of those failures was a crash. The React app ran. The Boot 3 backend ran. The fabricated docs read beautifully. **Without close verification, an AI agent does not fail dramatically — it fails plausibly.** Plausible output survives a casual look and only dies under an exacting one.*
>
> *AI accelerates synthesis. The engineer still owns intent, architecture, and acceptance criteria."*

---

### Slide 15: Where the Human Edge Moved
* **Elapsed:** `16:20 – 17:15`
* **Visual anchor:** Left — CS PhD lens vs. Strategic lens matrix. Right — the cognitive stack mapped onto this app.
* **Core takeaway:** Engaging the newest abstraction layer is not a retreat from rigor.

#### Verbatim Script
> *"Let me step up a level, because this is where the two halves of the talk meet.*
>
> *On the left are two lenses on the same work. The academic lens values algorithmic rigor, proofs, bounds. The strategic lens values system affordances and real-world utility. One is **convergent** — narrow down to the optimal solution. The other is **divergent** — explore lateral possibilities. One makes you a handcrafted implementer; the other makes you an intent director.*
>
> *And look at the failure modes, because that row is the whole argument. The academic failure mode is suboptimal convergence. The strategic failure mode is **solving the wrong problem extremely well**. Generative AI has made the first failure cheap to avoid and the second one much easier to commit — because you can now build the wrong thing in a weekend.*
>
> *On the right is the cognitive stack, and I'll note that this is exactly the shape of the Google AI Professional Certificate — which is built around creativity, multi-model use, and lateral synthesis rather than syntax. Grounding: anchor reasoning in a curated corpus — here, that is Qdrant retrieval scoped to one document. Reasoning and synthesis: multi-model, lateral hypotheses — here, Llama and Mistral doing different jobs. Prototyping and pipelines: turn intent into something reproducible — here, agentic generation under a pinned contract.*
>
> *That is not a coincidence. The three layers on the right are the architecture I am about to show you in the next section.*
>
> *And the line at the bottom: the history of computing is one long migration up the abstraction stack — machine code, assembly, managed runtimes, and now natural-language orchestration. Engaging with the newest layer is not a retreat from rigor. It is where the rigor now applies."*

* **Pitfall:** Do **not** read the matrix row by row. Point at the failure-mode row, make that one point, and move.

---

### Slide 16: Human Leverage
* **Elapsed:** `17:15 – 18:00`
* **Visual anchor:** Research foundation → Applied AI strategy, with the positioning statement and the motto.
* **Core takeaway:** Rigor moves up a level — to deciding what deserves to be built.

#### Verbatim Script
> *"So, briefly and then I'll move on.*
>
> *A PhD in Computer Science taught me how to navigate ambiguity and discover problems worth solving. That is genuinely what the training is for — not the thesis topic, the capacity to work in a space where nobody has told you what the question is.*
>
> *Earning the Google AI Professional Certificate was a deliberate step toward connecting that research foundation with real-world AI strategy and business impact. Those two boxes are the same skill approached from opposite directions: one gives you ambiguity, abstraction, evidence, critique; the other gives you business impact, workflow, governance, adoption.*
>
> *And here is why it matters now. As AI increasingly commoditizes execution, leadership differentiation comes from human-in-the-loop curiosity, lateral thinking, and identifying the business challenges truly worth solving.*
>
> *Which is the whole talk in one line: **success is no longer only how we build, but what we choose to build and why**."*

* **Pitfall:** Land it, pause, and move. If this becomes a biography you lose the room.

---

# Section 3 — Architecture (18:00 – 27:00)

### Slide 17: Section Divider — 03 Architecture
* **Elapsed:** `18:00 – 18:20`

#### Verbatim Script
> *"Let's open the walls. Everything I have claimed so far has to be true of an actual system, so here is the actual system."*

---

### Slide 18: System Topology
* **Elapsed:** `18:20 – 20:00`
* **Visual anchor:** UI5 → REST/nginx → Spring Boot 4 → MongoDB / Qdrant / Ollama / Keycloak.

#### Verbatim Script
> *"Left to right. A UI5 Web Components front end. A REST gateway behind nginx. A Spring Boot 4 backend holding the business services. And then four backing systems: MongoDB as the system of record, Qdrant as the vector index, Ollama for local inference, and Keycloak for identity.*
>
> *I want to push back on one phrase I hear a lot — 'it runs locally' as though that were a feature checkbox. It is not. It is a topology choice, and it comes with a bill: ports, persistence, model pull sizes, timeouts, container memory, and operations. Local inference is slower and lumpier than a hosted API. You trade latency and convenience for privacy and control. That is a real trade, and it should be made deliberately."*

---

### Slide 19: Ingestion
* **Elapsed:** `20:00 – 21:30`
* **Visual anchor:** PDF → Tika → metadata → chunks → embedding → Qdrant → summaries → MongoDB.

#### Verbatim Script
> *"'Upload' is one button and seven things.*
>
> *The PDF bytes go to Tika for text extraction. Metadata comes out as BibTeX. The text is chunked — paragraph-aligned, around four hundred characters, which I'll come back to. Each chunk is embedded into a 768-dimensional vector by `nomic-embed-text`. Those vectors land in Qdrant. In parallel, two summaries are generated by two different models. And the authoritative record, with its version history, goes into MongoDB.*
>
> *Current behaviour, stated plainly: the Ollama calls are sequential, ingestion is synchronous, and if Qdrant is unavailable the system degrades gracefully to excerpt-based answers rather than failing. That is also where every timeout and failure policy in this system accumulates."*

---

### Slide 20: Architecture Documentation
* **Elapsed:** `21:30 – 23:30`
* **Visual anchor:** Mind map image and BPMN image.

#### Verbatim Script
> *"Two diagrams. The mind map is the concept and learning path. The BPMN is the intended process and its governance — retries, review gates, model orchestration.*
>
> *And here is the crucial distinction, which I flagged in the demo debrief: **that BPMN file is a static design artifact**. There is no Camunda. There is no Zeebe. Nothing executes it. The running system is a sequence of Spring service calls.*
>
> *I could have quietly not mentioned that. I think shipping the model and naming the missing engine is itself the architectural lesson: a diagram is a decision surface, and it is useful even when it is not executable — as long as everyone knows which it is."*

---

### Slide 21: Polyglot Persistence
* **Elapsed:** `23:30 – 25:00`
* **Visual anchor:** MongoDB column vs. Qdrant column.

#### Verbatim Script
> *"One document, two stores, because they answer different questions.*
>
> *MongoDB is the authoritative record: metadata and BibTeX, current content and summaries, version history and rollback, transactional lifecycle queries. Qdrant is the semantic index: 768-dimensional embeddings, cosine similarity over an HNSW graph, `documentGuid` payload scoping, top-k context selection.*
>
> *This is not technology collecting. It is a separation of operational responsibilities. And the rule at the bottom is the one worth writing down: do not ask a vector index to be your source of truth, and do not ask a document database to be your semantic search engine. Both of those mistakes are easy and both of them hurt about six months in."*

---

### Slide 22: BPMN Reality Check
* **Elapsed:** `25:00 – 27:00`
* **Visual anchor:** BPMN intent vs. runtime today, plus the `@Transactional` upload method. Banner: DOCUMENTED POLICY ≠ ENFORCED POLICY.

#### Verbatim Script
> *"Let me make the gap concrete, side by side.*
>
> *The BPMN intent: retry three times at ten-second intervals, a librarian review gate, orchestrated model and vector steps. The runtime today: Spring `@Service` calls, a synchronous happy path, graceful fallback to excerpts, and no workflow engine at all.*
>
> *And here is the actual method. One `@Transactional` upload: parse, index, summarize twice, save. That is the honest version of the diagram.*
>
> *So what would production require? Real retries with backoff. A queue, so ingestion is not synchronous. Idempotency, so a retried upload does not double-index. An actual human review step with state. And observable workflow state, so you can answer 'where is document 4,000?'*
>
> *The banner is the takeaway: **documented policy is not enforced policy**. And notice this is the same failure mode as the React slide — something that reads correctly and is not actually true of the running system."*

---

# Section 4 — RAG from Kansas (27:00 – 36:00)

### Slide 23: Section Divider — 04 RAG from Kansas
* **Elapsed:** `27:00 – 27:20`

#### Verbatim Script
> *"One familiar story, told twice. First for intuition, then for engineering."*

---

### Slide 24: Beginner RAG — The Tiny-Desk Problem
* **Elapsed:** `27:20 – 29:30`
* **Visual anchor:** Closed-book exam vs. open-book exam.

#### Verbatim Script
> *"Picture a model as a brilliant student with a very small desk. The desk is the context window.*
>
> *Closed-book exam: I ask 'why do visitors to the Emerald City wear green spectacles?' The model has a vague memory of the Wizard of Oz, so it guesses from patterns. It gives a confident, fluent, unverifiable answer. It might even be right, which is worse, because you learn to trust it.*
>
> *Open-book exam: the same question goes to a librarian first. The librarian finds the relevant passage, puts just that passage on the small desk, and the model answers from it. And now the reader can inspect the excerpt and check the work.*
>
> *That librarian is the retriever. That is RAG. **RAG is not a smarter model — it is a better evidence workflow around a model.** The model did not change at all between those two scenarios. Only the desk changed."*

* **Pitfall:** Keep the analogy short. Its only job is to make "chunk," "embedding," and "retrieval" feel inevitable.

---

### Slide 25: Advanced RAG — The Same Story as a Pipeline
* **Elapsed:** `29:30 – 32:00`
* **Visual anchor:** Five numbered pipeline stages, plus the "not yet implemented" list.

#### Verbatim Script
> *"Same story, engineering vocabulary. Extract the text with Tika. Chunk it — paragraph-aligned, roughly four hundred characters, which keeps semantic units intact rather than slicing mid-thought. Embed with `nomic-embed-text` into 768 dimensions. Retrieve from Qdrant by cosine similarity, top-k, filtered by document GUID. Generate with a grounded prompt and citations.*
>
> *Where this implementation is genuinely strong: document scoping, local embeddings, a grounded prompt, and interactive citations.*
>
> *Where it is not, and I'd rather say it than have it asked: there is no hybrid BM25-plus-dense search. No query rewriting. No cross-encoder re-ranking. No automated faithfulness evaluation. Those are the standard next four upgrades and this system has none of them.*
>
> *So I would call it a mature, advanced-leaning RAG — with four clearly labelled upgrade paths."*

---

### Slide 26: Concrete Retrieval Code
* **Elapsed:** `32:00 – 34:00`
* **Visual anchor:** `SearchRequest` with filter expression; context assembly; grounded call.

#### Verbatim Script
> *"Three responsibilities, three blocks.*
>
> *Retrieve **with a scope** — and the important line on this entire slide is the filter expression. `documentGuid` equals this document. Without that one line, semantic search happily returns a beautifully relevant passage from a completely different document, and your citation drawer becomes a liability. Semantic similarity does not respect your tenancy model unless you make it.*
>
> *Then label the context — each passage tagged as an excerpt, joined with line separators.*
>
> *Then generate under the grounded system instruction we saw earlier.*
>
> *And the line at the bottom is worth more than the code: retrieval answers 'which passages are relevant?' Generation answers 'how do I explain them?' Those are **separate failure surfaces**, and when an answer is wrong your first diagnostic job is deciding which of the two broke. One more time, so nobody is surprised: the score displayed in the UI is not a measured cosine value — it is a placeholder."*

---

### Slide 27: RAG Limits
* **Elapsed:** `34:00 – 36:00`
* **Visual anchor:** Four cards — Recall, Precision, Generation, Evaluation.

#### Verbatim Script
> *"Four ways this still goes wrong.*
>
> ***Recall:** the answer is in the PDF but not in top-k. The system then confidently abstains, or worse, answers from the wrong four chunks. **Precision:** a chunk is semantically similar but does not actually answer the question — similarity is not relevance. **Generation:** even with good passages, the model can overstate what the evidence supports. And **evaluation:** as I have now said three times, the citation score is a hardcoded placeholder, so this system cannot grade itself.*
>
> *So the honest claim is not 'zero hallucinations.' It never was. The honest claim is: a smaller, more inspectable surface for unsupported claims. That is a real engineering win and I will defend it. 'Zero hallucinations' I would not defend for thirty seconds in this room."*

---

# Section 5 — Evidence, Economics, Lessons (36:00 – 45:00)

### Slide 28: Section Divider — 05 Evidence and Economics
* **Elapsed:** `36:00 – 36:20`

#### Verbatim Script
> *"Numbers. And a warning label: these are engineering estimates, not audited accounting."*

---

### Slide 29: Unified Financial & Consumption Ledger
* **Elapsed:** `36:20 – 39:00`
* **Visual anchor:** Six-row ledger table (verbatim from `docs/unified_financial_ledger_roi_key_takeaways.md`).

#### Verbatim Script
> *"Total out-of-pocket compute: about **$270**. That is $70 of direct prepaid balance plus roughly 20,000 AI developer credits valued at $200.*
>
> *Gross AI processing: an estimated **65 to 68 million tokens**. Be clear on how that number was produced — it is a prior estimate scaled against the revised credit usage. It covers coding-agent context windows, AST refactorings, multi-file inspections, and a great deal of prompt iteration.*
>
> *Separately, application runtime inference: **102,870 tokens**. That is the actual in-app document chat, embeddings, and the dual-model summarization. I deliberately do not fold that into the figure above — it is a different measurement of a different thing.*
>
> *284 autonomous agent actions. Roughly **22 to 30 hours** of active engineering turnaround. And $2.14 of container and hosting overhead.*
>
> *Note the asymmetry: the dollar figures and the recorded credits are solid. The token volume is derived. I would rather show you the derivation than present an estimate as a measurement."*

---

### Slide 30: Commercial Valuation & ROI
* **Elapsed:** `39:00 – 42:00`
* **Visual anchor:** Three-row ROI table, capital efficiency line, and the ~90% accuracy statement.

#### Verbatim Script
> *"Three ways to have built this.*
>
> *Traditional manual build, no AI: 120 to 165 hours, at $100 an hour, so $12,000 to $16,500 of commercial value. Senior engineer with an AI copilot: 55 to 70 hours, $5,500 to $7,000. Autonomous agent build — this project: roughly 22 to 30 hours and about $270 of direct compute.*
>
> *That is on the order of 98 percent savings against conventional contractor or agency rates.*
>
> *And now the sentence that makes this credible rather than a marketing slide: **overall confidence is approximately 90 percent as an engineering estimate.** The direct costs and the recorded credits are strong. The reconstructed ROI and the time figures are weaker — they were rebuilt from session history, not from a timesheet.*
>
> *Please read it as a defensible order of magnitude, not as a number to put in a business case. The honest claim is 'one to two orders of magnitude cheaper,' and that is remarkable enough without precision theatre."*

* **Pitfall:** Say the 90% line out loud. If you skip it, the first Q&A question will be about methodology.

---

### Slide 31: Lessons Learned
* **Elapsed:** `42:00 – 44:00`
* **Visual anchor:** Five numbered rules and the motto strip.

#### Verbatim Script
> *"Five rules, briskly. These are not a generic AI checklist — each one comes directly from a mistake in this project.*
>
> *One: specify the architecture before asking for implementation. That is the React slide.*
>
> *Two: make acceptance criteria executable — builds, type checks, endpoint checks, document audits. That is the Spring Boot 4 slide.*
>
> *Three: inspect plausible output. The most dangerous errors look professional.*
>
> *Four: separate implemented behaviour from planned behaviour from documentation artifacts. That is the BPMN slide.*
>
> *Five: use retrieval, citations, and abstention to narrow the model's responsibility. Give it less to be wrong about.*
>
> *And underneath: human-in-the-loop curiosity, lateral thinking, and identifying the business challenges truly worth solving."*

---

### Slide 32: Closing Idea
* **Elapsed:** `44:00 – 45:00`
* **Visual anchor:** "The model can accelerate the build. It cannot choose the problem."
* **Leave this slide on screen through the Q&A.**

#### Verbatim Script
> *"So. The model can accelerate the build. It cannot choose the problem.*
>
> *As AI increasingly commoditizes execution, leadership differentiation comes from human-in-the-loop curiosity, lateral thinking, and identifying the business challenges truly worth solving.*
>
> *Beyond prompting is not less engineering. It is engineering with a larger responsibility for intent, for evidence, and for consequences.*
>
> *Thank you — I have about fifteen minutes, and I would genuinely rather be challenged than applauded."*

---

# Section 6 — Q&A (45:00 – 60:00)

### Slide 33: Open Questions
* **Elapsed:** `45:00 – 60:00`
* **Visual anchor:** Six seed questions — use only if the room is hesitant.

#### Seed Prompts
1. Where should a local-first RAG system draw its trust boundary?
2. When is dense retrieval enough, and when do you need hybrid search or re-ranking?
3. How would you verify faithfulness beyond a citation drawer?
4. What should become an executing workflow engine first?
5. What would you change in the architecture for production scale?
6. Which business problem is worth building next?

#### Facilitation Guidance
* Wait a full ten seconds before reaching for a seed prompt. Silence is thinking.
* Use questions to return to the central distinction: **implementation, evidence, architecture, and problem choice are related but not interchangeable.**
* If a question exposes a gap, say so. The deck has already conceded four major limitations; one more costs nothing and buys a lot.

---

### Slide 34: Take the Project Further *(reference slide)*
* **Shown on demand.**
* Repository: `https://github.com/epascalau/personal-library`
* `docs/FRONTEND_ARCHITECTURE.md`, `docs/BACKEND_ARCHITECTURE.md`, `docs/DEVOPS_GUIDE.md`, `docs/RAG_ARCHITECTURE_COMPARISON.md`, `docs/CS_PHD_PERSPECTIVE.md`

> *"Everything is in the repository. The documentation is versioned alongside the code, which is the only way I have found to stop it drifting into fiction. The plan for the final release is to publish the `docs/` collection through GitHub Pages, with the repository Markdown remaining the source of truth."*

---

### Slide 35: Selected Bibliography *(reference slide)*
* **Shown on demand.** Leave up if the audience wants references; otherwise return to slide 32 or 33.
* Lewis et al. (2020) — *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*
* Gao et al. (2024) — *Retrieval-Augmented Generation for Large Language Models: A Survey*
* Vaswani et al. (2017) — *Attention Is All You Need*
* Qdrant, Spring AI, and SAP UI5 Web Components documentation

---

## Technical Cheatsheet & FAQ for Presenter

**Stack facts (verified against the repository):**

| Component | Actual implementation |
| :--- | :--- |
| Frontend | Framework-free TypeScript + SAP UI5 Web Components v2.27 — deliberately **no** React/Vue/Angular |
| Gateway | Node/Express behind nginx |
| Backend | Spring Boot 4.1.1, Spring AI 2.0.1, Java 21 |
| Embeddings | `nomic-embed-text`, 768-D, cosine, collection `personal_library_embeddings` |
| Retrieval | `similaritySearch(SearchRequest.query(q).topK(4))`, filtered by `documentGuid` payload |
| Chunking | Paragraph-aligned, non-overlapping, ~400 chars, 50-char minimum |
| Models pulled | `llama3.2`, `mistral`, `nomic-embed-text` |
| Orchestration | Docker Compose; Keycloak for identity |

**Known limitations — concede these early, do not wait to be caught:**
* The citation relevance score is **hardcoded** (0.88; 1.0 for the excerpt fallback). It is not a measured cosine value.
* The BPMN file is a **static design artifact**. No Camunda or Zeebe engine executes it. The `R3/PT10S` retry boundary and the librarian review gate are documented, not implemented.
* `SecurityConfig` ends with `.anyRequest().permitAll()` and there are **no** `@PreAuthorize` annotations. This is a learning project, not a hardened deployment.
* Some UI labels name larger models ("Llama 3.3 70B," "Mistral Large") than the ones actually pulled.
* No hybrid search, query rewriting, re-ranking, or automated faithfulness evaluation.

**Likely hard questions:**
* *"Why not just use a long context window?"* — Cost, latency, and lost-in-the-middle degradation; and you still get no citations.
* *"How do you evaluate retrieval quality?"* — Today: manually. That is the single biggest gap, and the next thing I would build.
* *"Why two summarization models?"* — They emphasise different things; it also demonstrates multi-model orchestration cheaply.
* *"Isn't 400-character chunking too small?"* — Probably, for some documents. It is paragraph-aligned, which matters more than the count, but overlapping chunks would likely improve recall.
* *"Are those cost numbers real?"* — Direct spend and credits, yes. Hours and ROI are reconstructed. Overall ~90% confidence, stated on the slide.
