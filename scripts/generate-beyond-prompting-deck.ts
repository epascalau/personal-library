import pptxgen from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const output = resolve(root, 'docs/presentations/beyond-prompting-local-rag.pptx');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Personal Library';
pptx.subject = 'Beyond Prompting: Building a Local AI Document Assistant with LLMs and RAG';
pptx.title = 'Beyond Prompting: Building a Local AI Document Assistant with LLMs and RAG';
pptx.company = 'Personal Library';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
};
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: 'F7F9FC' },
  objects: [
    { rect: { x: 0, y: 7.38, w: 13.333, h: 0.12, fill: { color: '0F766E' }, line: { color: '0F766E' } } },
    { text: { text: 'Personal Library  |  Beyond Prompting', options: { x: 0.45, y: 7.08, w: 4.5, h: 0.18, fontFace: 'Aptos', fontSize: 8, color: '64748B', margin: 0 } } },
  ],
  slideNumber: { x: 12.58, y: 7.04, color: '64748B', fontFace: 'Aptos', fontSize: 8 },
});

const C = {
  navy: '0F172A',
  slate: '334155',
  muted: '64748B',
  line: 'CBD5E1',
  pale: 'E2E8F0',
  canvas: 'F7F9FC',
  white: 'FFFFFF',
  blue: '1D4ED8',
  teal: '0F766E',
  tealPale: 'CCFBF1',
  amber: 'B45309',
  amberPale: 'FEF3C7',
  red: 'B91C1C',
  redPale: 'FEE2E2',
  purple: '6D28D9',
  purplePale: 'EDE9FE',
};
const W = 13.333;
const H = 7.5;
const img = (name: string) => resolve(root, 'docs/diagrams', name);
const addNotes = (slide: pptxgen.Slide, text: string) => {
  if (typeof (slide as any).addNotes === 'function') (slide as any).addNotes(text);
};
const box = (slide: pptxgen.Slide, x: number, y: number, w: number, h: number, fill = C.white, line = C.line, radius = 0.08) => {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: line, width: 1 } });
};
const text = (slide: pptxgen.Slide, value: string, x: number, y: number, w: number, h: number, opts: Record<string, unknown> = {}) => {
  slide.addText(value, { x, y, w, h, margin: 0, breakLine: false, fit: 'shrink', fontFace: 'Aptos', fontSize: 18, color: C.navy, valign: 'middle', ...opts });
};
const title = (slide: pptxgen.Slide, kicker: string, heading: string, subtitle?: string) => {
  text(slide, kicker.toUpperCase(), 0.55, 0.32, 4.5, 0.22, { fontSize: 9, bold: true, color: C.teal, charSpacing: 1.1 });
  text(slide, heading, 0.55, 0.65, 12.15, 0.58, { fontSize: 27, bold: true, color: C.navy });
  if (subtitle) text(slide, subtitle, 0.58, 1.3, 11.9, 0.38, { fontSize: 12, color: C.muted });
};
const bullet = (slide: pptxgen.Slide, value: string, x: number, y: number, w: number, h: number, opts: Record<string, unknown> = {}) => {
  text(slide, value, x, y, w, h, { fontSize: 16, breakLine: true, bullet: { indent: 14 }, paraSpaceAfterPt: 8, ...opts });
};
const pill = (slide: pptxgen.Slide, value: string, x: number, y: number, w: number, fill = C.pale, color = C.slate) => {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.34, rectRadius: 0.15, fill: { color: fill }, line: { color: fill } });
  text(slide, value, x, y + 0.02, w, 0.2, { fontSize: 9, bold: true, color, align: 'center' });
};
const section = (slide: pptxgen.Slide, number: string, heading: string, accent = C.teal) => {
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.05, w: 0.12, h: 4.9, fill: { color: accent }, line: { color: accent } });
  text(slide, number, 1.12, 1.05, 2.2, 1.2, { fontSize: 58, bold: true, color: accent });
  text(slide, heading, 1.12, 2.35, 10.7, 1.1, { fontSize: 32, bold: true, color: C.white });
  text(slide, 'The goal is not to make the model sound confident.\nThe goal is to make the system useful, inspectable, and honest.', 1.16, 5.08, 9.4, 0.72, { fontSize: 19, italic: true, color: 'E2E8F0', breakLine: true });
};
const arrow = (slide: pptxgen.Slide, x1: number, y1: number, x2: number, y2: number, color = C.teal) => {
  slide.addShape(pptx.ShapeType.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width: 2, beginArrowType: 'none', endArrowType: 'triangle' } });
};
const code = (slide: pptxgen.Slide, value: string, x: number, y: number, w: number, h: number, fontSize = 12) => {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: '0B1220' }, line: { color: '1E293B' } });
  text(slide, value, x + 0.18, y + 0.14, w - 0.36, h - 0.24, { fontFace: 'Consolas', fontSize, color: 'D1FAE5', breakLine: true, valign: 'top' });
};
const image = (slide: pptxgen.Slide, path: string, x: number, y: number, w: number, h: number) => {
  if (existsSync(path)) slide.addImage({ path, x, y, w, h });
  else box(slide, x, y, w, h, C.pale, C.line);
};
const note = (slide: pptxgen.Slide, timing: string, body: string) => addNotes(slide, `Timing: ${timing}\n\n${body}`);

// 1
{
  const s = pptx.addSlide('MASTER');
  s.background = { color: C.navy };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { color: C.navy } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: H, fill: { color: C.teal }, line: { color: C.teal } });
  text(s, 'BEYOND PROMPTING', 0.8, 0.8, 7, 0.35, { fontSize: 14, bold: true, color: '5EEAD4', charSpacing: 2 });
  text(s, 'Building a Local AI\nDocument Assistant\nwith LLMs and RAG', 0.8, 1.4, 8.9, 2.25, { fontSize: 35, bold: true, color: C.white, breakLine: true, valign: 'top' });
  text(s, 'A practical tour from PDF upload to grounded answers — and a reflection on what AI can build, what it cannot decide, and what humans must verify.', 0.83, 4.15, 8.3, 0.85, { fontSize: 18, color: 'CBD5E1', breakLine: true });
  pill(s, 'LOCAL-FIRST', 0.82, 5.62, 1.35, '134E4A', 'CCFBF1');
  pill(s, 'GROUNDED AI', 2.32, 5.62, 1.35, '1E3A8A', 'DBEAFE');
  text(s, 'Personal Library  |  Local-first document intelligence', 0.83, 6.55, 7, 0.25, { fontSize: 11, color: '94A3B8' });
  note(s, '00:00–02:00', 'Open with the advertised promise: an LLM is a generator, not a reliable document database. The session shows how retrieval changes the boundary of what the system can responsibly answer.');
}

// 2
{
  const s = pptx.addSlide('MASTER'); title(s, 'The promise', 'What this session will make concrete', 'The abstract becomes a sequence of inspectable engineering decisions.');
  const cards = [
    ['PRIVATE INPUT', 'A PDF is uploaded locally. The system extracts text and metadata.'],
    ['RETRIEVAL', 'Chunks become embeddings, then searchable points in Qdrant.'],
    ['GROUNDED OUTPUT', 'The model answers from retrieved passages and exposes citations.'],
    ['ENGINEERING LESSON', 'AI can accelerate implementation, but it does not supply intent or verification.'],
  ];
  cards.forEach((c, i) => {
    const x = 0.65 + (i % 2) * 6.25, y = 2.05 + Math.floor(i / 2) * 1.85;
    box(s, x, y, 5.75, 1.35, i === 3 ? C.tealPale : C.white, i === 3 ? C.teal : C.line);
    text(s, c[0], x + 0.25, y + 0.2, 5.2, 0.22, { fontSize: 10, bold: true, color: C.teal, charSpacing: 1 });
    text(s, c[1], x + 0.25, y + 0.55, 5.15, 0.55, { fontSize: 17, bold: i === 3, breakLine: true });
  });
  text(s, 'Keywords', 0.7, 6.05, 1, 0.2, { fontSize: 10, bold: true, color: C.muted });
  ['RAG', 'Ollama', 'Qdrant', 'Embeddings', 'Spring AI', 'Local AI', 'Semantic Search'].forEach((v, i) => pill(s, v, 1.65 + i * 1.45, 5.98, 1.25, i % 2 ? C.pale : C.tealPale, i % 2 ? C.slate : C.teal));
  note(s, '02:00–03:30', 'Read the four promises as the contract for the talk. Emphasize that the point is not a product tour; it is understanding the boundaries and trade-offs behind the product.');
}

// 3
{
  const s = pptx.addSlide('MASTER'); title(s, 'Roadmap', 'Six sections, one continuous story', 'The live application appears early; the architecture and lessons explain what the audience just saw.');
  const rows = [
    ['1', 'Live demo', 'See upload, summaries, RAG chat, citations, and system consoles.'],
    ['2', 'Why / how', 'Hallucination, training priors, machine-checkable architecture, human judgment.'],
    ['3', 'Architecture', 'Mind map, BPMN, services, persistence, and contracts.'],
    ['4', 'RAG from Kansas', 'Beginner analogy, then a condensed advanced pipeline with code.'],
    ['5', 'Evidence & lessons', 'Comparison tables, estimates, limits, and the closing motto.'],
    ['6', 'Open questions', 'Discussion, objections, implementation details, and next steps.'],
  ];
  rows.forEach((r, i) => {
    const y = 1.85 + i * 0.78;
    s.addShape(pptx.ShapeType.line, { x: 0.78, y: y + 0.48, w: 11.85, h: 0, line: { color: C.line, width: 1 } });
    text(s, r[0], 0.78, y, 0.45, 0.4, { fontSize: 20, bold: true, color: C.teal, align: 'center' });
    text(s, r[1], 1.5, y, 3.0, 0.32, { fontSize: 17, bold: true });
    text(s, r[2], 5.0, y, 7.4, 0.32, { fontSize: 14, color: C.slate });
  });
  note(s, '03:30–04:00', 'Set expectations: the demo is intentionally short and focused. The audience will see the app before receiving the theory, so every later diagram answers a question raised by the demo.');
}

// 4 section
{ const s = pptx.addSlide(); section(s, '01', 'Live demo: from library item to grounded answer', C.teal); note(s, '04:00–04:30', 'Transition immediately to the running application. Keep the demo moving; do not explain every UI control. The audience should see a complete journey.'); }

// 5
{
  const s = pptx.addSlide('MASTER'); title(s, 'Live demo', 'One document, several inspectable surfaces', 'Use the application, then open the linked consoles to make the system visible beyond the UI.');
  const steps = [
    ['1', 'Upload / select', 'PDF → extracted metadata, versioned file, summaries'],
    ['2', 'Ask a question', 'RAG chat → answer plus source excerpts'],
    ['3', 'Inspect storage', 'Mongo Express → document state and version history'],
    ['4', 'Inspect vectors', 'Qdrant dashboard → collection and payload points'],
    ['5', 'Inspect contracts', 'Swagger Editor → OpenAPI endpoints'],
    ['6', 'Inspect operations', 'Keycloak, Ollama, storage browser, health'],
  ];
  steps.forEach((r, i) => {
    const x = 0.65 + (i % 3) * 4.15, y = 1.95 + Math.floor(i / 3) * 2.05;
    box(s, x, y, 3.65, 1.42, C.white, C.line);
    text(s, r[0], x + 0.22, y + 0.18, 0.4, 0.35, { fontSize: 22, bold: true, color: C.teal });
    text(s, r[1], x + 0.8, y + 0.18, 2.6, 0.25, { fontSize: 16, bold: true });
    text(s, r[2], x + 0.8, y + 0.58, 2.55, 0.55, { fontSize: 12, color: C.slate, breakLine: true });
  });
  text(s, 'Demo discipline: show what is real, what is simulated, and what is a documentation artifact.', 0.7, 6.35, 11.7, 0.3, { fontSize: 16, bold: true, color: C.amber });
  note(s, '04:30–08:30', 'Live sequence: select a document, show both summaries, ask a question, click a citation, then open System Services & Admin Consoles. Be explicit that mock mode and real mode are different paths.');
}

// 6
{
  const s = pptx.addSlide('MASTER'); title(s, 'Demo debrief', 'The first engineering question is: what can I verify?', 'A polished interface can hide very different levels of implementation underneath.');
  const cols = [
    ['VISIBLE', 'UI5 floorplans, filters, summaries, chat, citations, links', C.white],
    ['IMPLEMENTED', 'Spring services, MongoDB state, Qdrant search, Ollama calls', C.tealPale],
    ['DOCUMENTED', 'BPMN retry policy, human review gate, future modular RAG', C.amberPale],
    ['LIMITATION', 'Citation score is a placeholder; no automated RAG judge loop', C.redPale],
  ];
  cols.forEach((c, i) => {
    const x = 0.62 + i * 3.12;
    box(s, x, 2.05, 2.75, 3.25, c[2], i === 3 ? C.red : C.line);
    text(s, c[0], x + 0.2, 2.34, 2.3, 0.25, { fontSize: 11, bold: true, color: i === 3 ? C.red : C.teal, charSpacing: 1 });
    text(s, c[1], x + 0.2, 2.9, 2.32, 1.6, { fontSize: 16, bold: i === 3, breakLine: true, valign: 'top' });
  });
  text(s, 'Trust grows when the system exposes its boundaries instead of presenting every value as a fact.', 0.75, 5.85, 11.8, 0.45, { fontSize: 20, bold: true, color: C.navy, align: 'center' });
  note(s, '08:30–10:00', 'Use this slide to protect credibility. Say plainly that a visible score is not automatically a measured score and that a BPMN diagram is not automatically an executing workflow.');
}

// 7 section
{ const s = pptx.addSlide(); section(s, '02', 'Why and how: what a model knows, what it invents, and what only you can decide', C.blue); note(s, '10:00–10:15', 'This is the heart of the talk. Everything after the demo exists to explain two things: why retrieval is necessary, and why an AI agent left unsupervised builds something plausible instead of something correct.'); }

// 8
{
  const s = pptx.addSlide('MASTER'); title(s, 'Trained, not thinking', 'A model knows what it learned, at the moment it learned it', 'No imagination. No creativity. No awareness of anything that happened after the training cut-off.');
  const cards = [
    ['FROZEN IN TIME', 'Knowledge stops at the training cut-off. Anything released afterwards is, to the model, simply absent — not “new”, not “unknown”, absent.', C.white, C.line, C.blue],
    ['NO IMAGINATION', 'It does not invent a design. It reproduces the most probable continuation of the patterns it has already seen many times.', C.white, C.line, C.blue],
    ['NO SELF-DOUBT', 'Recalling and fabricating are the same operation internally. Confidence is a writing style, not a measure of evidence.', C.amberPale, C.amber, C.amber],
    ['THE PRIOR WINS', 'Tell it not to use a familiar pattern and it still drifts back whenever the alternative is thin in its training data.', C.redPale, C.red, C.red],
  ];
  cards.forEach((c, i) => {
    const x = 0.62 + i * 3.12;
    box(s, x, 1.95, 2.75, 3.4, c[2], c[3]);
    text(s, c[0], x + 0.2, 2.22, 2.35, 0.25, { fontSize: 11, bold: true, color: c[4], charSpacing: 1 });
    text(s, c[1], x + 0.2, 2.72, 2.35, 2.4, { fontSize: 14, breakLine: true, valign: 'top', color: C.slate });
  });
  text(s, 'Hallucination is not a malfunction. It is the very same mechanism that produces all the correct answers.', 0.8, 5.72, 11.7, 0.45, { fontSize: 20, bold: true, color: C.navy, align: 'center' });
  text(s, 'So the engineering question is never “how do I stop it inventing?” — it is “what evidence did I put in front of it, and can I check the answer against that evidence?”', 0.8, 6.3, 11.7, 0.4, { fontSize: 14, color: C.muted, align: 'center' });
  note(s, '10:15–11:10', 'Resist anthropomorphising. The model is an inference engine whose output distribution is shaped by training data and by the context you supply. It has no concept of “I have not seen this.” That single fact explains both hallucination on documents and the implementation failures shown in three slides.');
}

// 9
{
  const s = pptx.addSlide('MASTER'); title(s, 'Model boundary', 'A model predicts plausible continuations; it does not “know” your document', 'This is why “please do not use your prior knowledge” is not a reliable control boundary.');
  box(s, 0.7, 1.95, 5.45, 3.65, C.white, C.line);
  text(s, 'Without retrieval', 1.0, 2.25, 4.8, 0.35, { fontSize: 20, bold: true, color: C.red });
  text(s, 'Question about a private PDF\n        ↓\nmodel’s learned patterns + prompt\n        ↓\nplausible answer, possibly invented', 1.0, 2.95, 4.75, 1.8, { fontSize: 20, breakLine: true, align: 'center', valign: 'middle' });
  box(s, 7.15, 1.95, 5.45, 3.65, C.tealPale, C.teal);
  text(s, 'With retrieval', 7.45, 2.25, 4.8, 0.35, { fontSize: 20, bold: true, color: C.teal });
  text(s, 'Question about a private PDF\n        ↓\nretrieve relevant source passages\n        ↓\nanswer constrained by evidence', 7.45, 2.95, 4.75, 1.8, { fontSize: 20, breakLine: true, align: 'center', valign: 'middle' });
  text(s, 'Grounding does not make hallucination impossible. It makes unsupported answers easier to detect, limit, and investigate.', 0.95, 6.12, 11.5, 0.45, { fontSize: 16, bold: true, color: C.slate, align: 'center' });
  note(s, '11:10–12:00', 'A prompt cannot conjure missing evidence. Retrieval changes the input distribution, which is the only lever that actually moves the output. Say clearly that grounding reduces and localises hallucination rather than eliminating it.');
}

// 10
{
  const s = pptx.addSlide('MASTER'); title(s, 'The brief', 'Five non-negotiable assumptions, stated before a single line of code', 'None of these were preferences. They were the premise of the project — and they were written down first.');
  const asks = [
    ['01', 'Enterprise-grade', 'Not a demo script. Layered services, real identity, persistence with history, documented contracts, operable containers.', C.blue],
    ['02', 'No coding by the end user', 'The librarian uploads a PDF and asks a question. No notebooks, no YAML, no prompt engineering demanded of the user.', C.blue],
    ['03', 'Named technologies only', 'SAP UI5 Web Components · Spring Boot · Ollama · Qdrant · Docker. Chosen deliberately, not left to the model to pick.', C.purple],
    ['04', 'Latest version of each', 'Explicitly the newest release of every named technology — not whatever the model had most often seen.', C.red],
    ['05', 'Fully local', 'Inference, embeddings, vectors and storage all on own infrastructure. No document leaves the machine.', C.teal],
  ];
  asks.forEach((a, i) => {
    const y = 1.84 + i * 0.93;
    box(s, 0.72, y, 11.9, 0.8, i === 3 ? C.redPale : C.white, i === 3 ? C.red : C.line);
    text(s, a[0], 0.96, y + 0.2, 0.5, 0.4, { fontSize: 18, bold: true, color: a[3] });
    text(s, a[1], 1.62, y + 0.2, 3.3, 0.4, { fontSize: 16, bold: true, color: C.navy, valign: 'middle' });
    text(s, a[2], 5.1, y + 0.12, 7.3, 0.56, { fontSize: 13, color: C.slate, breakLine: true, valign: 'middle' });
  });
  text(s, 'An exacting brief is exactly the kind of brief a model is worst at honouring — every constraint above narrows it away from its most probable output.', 0.8, 6.58, 11.7, 0.4, { fontSize: 16, bold: true, color: C.navy, align: 'center' });
  note(s, '12:00–12:45', 'Set this up as the premise, not as a complaint. Make the point that these five constraints are ordinary engineering requirements — the sort any enterprise project states on day one. Dwell on numbers 3 and 4: naming a technology and demanding its latest version are precisely the two instructions that fight hardest against the training prior, because the model has seen the alternative and the older version far more often. This slide exists so the next slide is evidence rather than anecdote.');
}

// 11
{
  const s = pptx.addSlide('MASTER'); title(s, 'Told explicitly. Ignored anyway.', 'The same mechanism that invents facts also overrides your instructions', 'What came back against the brief on the previous slide — all of it asked for in writing.');
  const head = ['WHAT THE BRIEF SAID', 'WHAT ARRIVED', 'WHY THE MODEL DID THAT'];
  head.forEach((h, i) => text(s, h, [0.9, 4.65, 8.1][i], 1.86, [3.5, 3.2, 4.4][i], 0.24, { fontSize: 10, bold: true, color: C.teal, charSpacing: 1 }));
  const rows = [
    ['SAP UI5 Web Components', 'A React single-page app', 'React is overwhelmingly dominant in the training corpus for “web UI”. UI5 Web Components is a thin slice beside it.'],
    ['Latest Spring Boot — i.e. 4', 'Spring Boot 3 + spring-boot-starter-web', '“Latest” resolves to the latest it has seen. Boot 4 sits at or past the cut-off, so it wrote the names it knew.'],
    ['Enterprise-grade, as specified', 'A generic, perfectly reasonable tutorial app', 'Absent an explicit contract, it fills the gap with the statistical average of every similar project it has read.'],
  ];
  rows.forEach((r, i) => {
    const y = 2.2 + i * 1.18;
    box(s, 0.72, y, 11.9, 1.02, C.white, C.line);
    text(s, r[0], 0.95, y + 0.3, 3.5, 0.42, { fontSize: 15, bold: true, color: C.blue, breakLine: true, valign: 'middle' });
    text(s, r[1], 4.65, y + 0.3, 3.2, 0.42, { fontSize: 15, bold: true, color: C.red, breakLine: true, valign: 'middle' });
    text(s, r[2], 8.1, y + 0.18, 4.3, 0.68, { fontSize: 12, color: C.slate, breakLine: true, valign: 'middle' });
  });
  text(s, 'Statistical gravity beats an explicit instruction. A stronger prompt does not fix this — a machine-checkable constraint does.', 0.8, 5.95, 11.7, 0.45, { fontSize: 19, bold: true, color: C.navy, align: 'center' });
  note(s, '12:45–13:50', 'Tell this honestly; it is the strongest evidence in the talk. The request was explicit in both cases and the output was still React and Boot 3. Connect it straight back to the previous slide: the model is not disobeying, it is returning to its prior because the requested alternative is sparse or post-cut-off in what it learned.');
}

// 12
{
  const s = pptx.addSlide('MASTER'); title(s, 'Specify the architecture, then make it checkable', 'Prose is a suggestion. A pinned version and a failing check are not.', 'The fix for “it ignored me” is to move the requirement out of the prompt and into the build.');
  code(s, `<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.1.1</version>
</parent>

<!-- Boot 4 renamed the MVC starter -->
<artifactId>spring-boot-starter-webmvc</artifactId>

# and the property prefix moved too
spring.mongodb.uri=mongodb://localhost:27017`, 0.75, 1.88, 5.85, 3.8, 12);
  code(s, `# architecture contract, verified every run
grep -q '"@ui5/webcomponents"' package.json
! grep -q '"react"' package.json

mvn -q dependency:tree \\
  | grep -q 'spring-boot:jar:4'

# the agent cannot argue with a red build`, 6.85, 1.88, 5.75, 3.8, 12);
  pill(s, 'PIN THE VERSION', 0.85, 5.92, 2.6, C.tealPale, C.teal);
  pill(s, 'NAME THE EXACT LIBRARY', 3.65, 5.92, 3.0, C.tealPale, C.teal);
  pill(s, 'FORBID THE DEFAULT', 6.85, 5.92, 2.6, C.redPale, C.red);
  pill(s, 'FAIL THE BUILD', 9.65, 5.92, 2.3, C.purplePale, C.purple);
  text(s, 'Everything the model must not guess should exist as a version, a test, a lint rule, or a schema.', 0.8, 6.5, 11.7, 0.35, { fontSize: 15, bold: true, color: C.slate, align: 'center' });
  note(s, '13:50–14:45', 'The exact commands matter less than the principle: convert intent into an artefact the build can evaluate. Mention that this is also how you stop silent regressions when a later iteration quietly reintroduces the familiar pattern.');
}

// 13
{
  const s = pptx.addSlide('MASTER'); title(s, 'Grounding is an interface contract', 'The same discipline applied to the model at runtime', 'Define the allowed evidence, the abstention rule, and the citation shape explicitly.');
  code(s, `String systemPrompt = """
  Answer using ONLY the retrieved context below.
  If the context does not contain the answer,
  say that the document does not provide it.
  Cite the supporting excerpts.

  Retrieved context:
  %s
  """;`, 0.75, 1.9, 5.85, 3.75, 13);
  code(s, `const context = results
  .map((chunk, i) => \`[Excerpt \${i + 1}] \${chunk.text}\`)
  .join(String.fromCharCode(10));

const answer = await chatClient
  .prompt()
  .system(systemPrompt.formatted(context))
  .user(question)
  .call();`, 6.85, 1.9, 5.75, 3.75, 13);
  pill(s, 'GOOD: evidence boundary + abstention path', 0.85, 5.95, 3.25, C.tealPale, C.teal);
  pill(s, 'NOT ENOUGH: “be accurate”', 4.35, 5.95, 2.3, C.redPale, C.red);
  pill(s, 'ALSO NEEDED: inspectable citations', 6.95, 5.95, 3.0, C.purplePale, C.purple);
  note(s, '14:45–15:35', 'Walk through both fragments. The API is incidental; what matters is that the evidence boundary, the failure behaviour and the citation format are written down rather than hoped for.');
}

// 14
{
  const s = pptx.addSlide('MASTER'); title(s, 'The loop that produced this repository', 'AI can absolutely implement an application — just not in one pass', 'Specify, generate, verify, correct. Remove any one step and the result drifts.');
  const steps = [
    ['SPECIFY', 'Stack, exact versions, module boundaries, acceptance criteria — written before any code.', C.white, C.line, C.blue],
    ['GENERATE', 'The agent writes the implementation far faster than a human could. This step was never the bottleneck.', C.white, C.line, C.blue],
    ['VERIFY', 'A repo-wide audit found wrong component names, stale docs, mismatched ports and fabricated documentation claims.', C.amberPale, C.amber, C.amber],
    ['CORRECT', 'React → UI5 Web Components, Boot 3 → Boot 4.1.1, and every claim rewritten to match what the code actually does.', C.tealPale, C.teal, C.teal],
  ];
  steps.forEach((c, i) => {
    const x = 0.62 + i * 3.12;
    box(s, x, 1.95, 2.75, 3.35, c[2], c[3]);
    text(s, String(i + 1), x + 0.2, 2.18, 0.4, 0.3, { fontSize: 20, bold: true, color: c[4] });
    text(s, c[0], x + 0.72, 2.22, 1.8, 0.25, { fontSize: 11, bold: true, color: c[4], charSpacing: 1 });
    text(s, c[1], x + 0.2, 2.72, 2.35, 2.35, { fontSize: 14, breakLine: true, valign: 'top', color: C.slate });
    if (i < 3) arrow(s, x + 2.82, 3.62, x + 3.06, 3.62, C.muted);
  });
  text(s, 'Without close verification an AI agent does not fail dramatically. It fails plausibly.', 0.8, 5.68, 11.7, 0.45, { fontSize: 20, bold: true, color: C.red, align: 'center' });
  text(s, 'AI accelerates synthesis. The engineer still owns intent, architecture and acceptance criteria.', 0.8, 6.3, 11.7, 0.35, { fontSize: 15, color: C.muted, align: 'center' });
  note(s, '15:35–16:20', 'Make the point that none of these failures were dramatic crashes. The React app ran. The Boot 3 backend ran. That is exactly the danger: plausible output passes a casual look and only fails an exacting one.');
}

// 15
{
  const s = pptx.addSlide('MASTER'); title(s, 'Where the human edge moved', 'As generation commoditizes syntax, leverage shifts to framing and orchestration', 'Implementation and boilerplate are rapidly automated. Problem formulation and divergent exploration are not.');
  box(s, 0.68, 1.82, 6.55, 4.3, C.white, C.line);
  text(s, 'TWO LENSES ON THE SAME WORK', 0.95, 2.05, 6.0, 0.24, { fontSize: 10, bold: true, color: C.teal, charSpacing: 1 });
  text(s, 'CS PhD lens', 0.95, 2.42, 2.9, 0.24, { fontSize: 12, bold: true, color: C.blue });
  text(s, 'Strategic lens', 4.15, 2.42, 2.9, 0.24, { fontSize: 12, bold: true, color: C.purple });
  const matrix = [
    ['Algorithmic rigor, proofs, bounds', 'System affordances, real-world utility'],
    ['Convergent: narrow to the optimal', 'Divergent: explore lateral possibilities'],
    ['Handcrafted implementer, debugger', 'Intent director, curator, governor'],
    ['Failure: suboptimal convergence', 'Failure: solving the wrong problem well'],
  ];
  matrix.forEach((r, i) => {
    const y = 2.8 + i * 0.8;
    s.addShape(pptx.ShapeType.line, { x: 0.95, y: y + 0.68, w: 6.0, h: 0, line: { color: C.pale, width: 1 } });
    text(s, r[0], 0.95, y, 2.95, 0.6, { fontSize: 13, color: C.slate, breakLine: true, valign: 'middle' });
    text(s, r[1], 4.15, y, 2.95, 0.6, { fontSize: 13, color: C.slate, breakLine: true, valign: 'middle' });
  });
  text(s, 'THE COGNITIVE STACK — AND WHERE THIS APP SITS', 7.62, 2.05, 5.0, 0.24, { fontSize: 10, bold: true, color: C.purple, charSpacing: 1 });
  const stack = [
    ['Grounding', 'Anchor reasoning in a curated corpus', 'here: Qdrant retrieval scoped to one document', C.tealPale, C.teal],
    ['Reasoning & synthesis', 'Multi-model, multi-modal, lateral hypotheses', 'here: Llama and Mistral for different tasks', C.white, C.line],
    ['Prototyping & pipelines', 'Turn intent into reproducible pipelines', 'here: agentic generation under a pinned contract', C.purplePale, C.purple],
  ];
  stack.forEach((c, i) => {
    const y = 2.42 + i * 1.28;
    box(s, 7.4, y, 5.2, 1.12, c[3], c[4]);
    text(s, c[0], 7.62, y + 0.14, 4.8, 0.26, { fontSize: 14, bold: true, color: C.navy });
    text(s, c[1], 7.62, y + 0.46, 4.8, 0.24, { fontSize: 12, color: C.slate });
    text(s, c[2], 7.62, y + 0.76, 4.8, 0.24, { fontSize: 11, italic: true, color: C.muted });
  });
  text(s, 'Engaging with the newest abstraction layer is not a retreat from rigor — it is where the rigor now applies.', 0.8, 6.35, 11.7, 0.35, { fontSize: 15, bold: true, color: C.navy, align: 'center' });
  note(s, '16:20–17:15', 'Do not read the table aloud. Make one point: the Google AI Professional Certificate is built around creativity, multi-model use and lateral synthesis rather than syntax, and that is precisely the skill set that survives when generation becomes cheap. The three layers on the right map directly onto the architecture shown in the next section.');
}

// 16
{
  const s = pptx.addSlide('MASTER'); title(s, 'Human leverage', 'From technical execution to problem formulation', 'Not “AI replaces rigor” — rigor moves up a level, to deciding what deserves to be built.');
  text(s, 'A PhD in Computer Science taught me how to navigate ambiguity and discover problems worth solving.', 0.95, 1.72, 11.4, 0.5, { fontSize: 21, bold: true, color: C.navy, align: 'center' });
  box(s, 0.9, 2.42, 5.35, 1.12, C.white, C.line);
  text(s, 'Research foundation', 1.2, 2.66, 4.75, 0.25, { fontSize: 17, bold: true, color: C.blue, align: 'center' });
  text(s, 'ambiguity · abstraction · evidence · critique', 1.2, 3.06, 4.75, 0.25, { fontSize: 14, color: C.slate, align: 'center' });
  arrow(s, 6.38, 2.98, 6.98, 2.98, C.teal);
  box(s, 7.05, 2.42, 5.35, 1.12, C.tealPale, C.teal);
  text(s, 'Applied AI strategy', 7.35, 2.66, 4.75, 0.25, { fontSize: 17, bold: true, color: C.teal, align: 'center' });
  text(s, 'business impact · workflow · governance · adoption', 7.35, 3.06, 4.75, 0.25, { fontSize: 14, color: C.slate, align: 'center' });
  text(s, 'Earning the Google AI Professional Certificate was a deliberate step toward connecting that research foundation with real-world AI strategy and business impact.', 0.95, 3.66, 11.4, 0.4, { fontSize: 14, color: C.muted, align: 'center' });
  box(s, 0.9, 4.22, 11.5, 0.95, C.purplePale, C.purple);
  text(s, 'As AI increasingly commoditizes execution, leadership differentiation comes from human-in-the-loop curiosity, lateral thinking, and identifying the business challenges truly worth solving.', 1.2, 4.42, 10.9, 0.6, { fontSize: 16, bold: true, color: C.navy, align: 'center', breakLine: true });
  text(s, 'Success is no longer only how we build, but what we choose to build and why.', 1.0, 5.5, 11.3, 0.5, { fontSize: 22, italic: true, bold: true, color: C.purple, align: 'center' });
  note(s, '17:15–18:00', 'Land this without turning it into a biography. The through-line is that the research training and the certificate serve the same purpose from two directions: navigating ambiguity, and choosing the problem. Pause here before moving into the architecture section.');
}

// 17 section
{ const s = pptx.addSlide(); section(s, '03', 'Architecture: make the invisible system visible', C.purple); note(s, '18:00–18:20', 'Now show the architecture that makes the earlier claims possible. This section should feel like opening the application’s walls.'); }

// 18
{
  const s = pptx.addSlide('MASTER'); title(s, 'System topology', 'A local-first stack with explicit boundaries', 'The app is a set of contracts between UI, gateway, business services, models, and persistence.');
  image(s, img('system_architecture.png'), 0.62, 1.65, 12.05, 4.95);
  pill(s, 'UI5 Web Components', 0.75, 6.55, 1.65, C.pale, C.slate);
  pill(s, 'REST / nginx', 2.55, 6.55, 1.4, C.pale, C.slate);
  pill(s, 'Spring Boot 4', 4.1, 6.55, 1.4, C.tealPale, C.teal);
  pill(s, 'MongoDB', 5.65, 6.55, 1.15, C.pale, C.slate);
  pill(s, 'Qdrant', 6.95, 6.55, 1.05, C.purplePale, C.purple);
  pill(s, 'Ollama', 8.15, 6.55, 1.0, C.amberPale, C.amber);
  pill(s, 'Keycloak', 9.3, 6.55, 1.15, C.pale, C.slate);
  note(s, '18:20–20:00', 'Orient the audience from left to right. Stress that local inference and storage are not a single feature; they are a topology choice involving ports, persistence, timeouts, and operations.');
}

// 19
{
  const s = pptx.addSlide('MASTER'); title(s, 'Ingestion', 'The upload path is a pipeline, not a single model call', 'A document becomes several synchronized representations.');
  const nodes = [
    ['PDF', 'bytes'],
    ['Tika', 'text'],
    ['Metadata', 'BibTeX'],
    ['Chunks', '~400 chars'],
    ['Embedding', '768-D'],
    ['Qdrant', 'vectors'],
    ['Summaries', 'Llama + Mistral'],
    ['MongoDB', 'record + history'],
  ];
  nodes.forEach((n, i) => {
    const x = 0.55 + (i % 4) * 3.15, y = 1.95 + Math.floor(i / 4) * 2.25;
    box(s, x, y, 2.45, 1.15, i === 5 ? C.purplePale : C.white, i === 5 ? C.purple : C.line);
    text(s, n[0], x + 0.15, y + 0.2, 2.15, 0.25, { fontSize: 17, bold: true, align: 'center' });
    text(s, n[1], x + 0.15, y + 0.62, 2.15, 0.22, { fontSize: 12, color: C.muted, align: 'center' });
    if (i < 3) arrow(s, x + 2.5, y + 0.56, x + 3.08, y + 0.56);
    if (i === 3) arrow(s, x + 1.22, y + 1.2, x + 1.22, y + 1.95);
    if (i === 4) arrow(s, x + 2.5, y + 0.56, x + 3.08, y + 0.56);
    if (i === 5) arrow(s, x + 1.22, y + 1.2, x + 1.22, y + 1.95);
    if (i === 6) arrow(s, x + 2.5, y + 0.56, x + 3.08, y + 0.56);
  });
  text(s, 'Current behavior: sequential Ollama calls; synchronous ingestion; graceful degradation when Qdrant is unavailable.', 0.7, 6.35, 11.8, 0.32, { fontSize: 15, bold: true, color: C.slate, align: 'center' });
  note(s, '20:00–21:30', 'Explain that “upload” creates a source-of-truth record, a searchable index, and two summaries. This is also where timeouts and failure policies accumulate.');
}

// 20
{
  const s = pptx.addSlide('MASTER'); title(s, 'Architecture documentation', 'Mind map and BPMN are decision surfaces', 'They are useful even when they are not executable.');
  image(s, img('mindmap.png'), 0.6, 1.7, 5.85, 4.65);
  image(s, img('document_ingestion_rag.png'), 6.85, 1.7, 5.85, 4.65);
  pill(s, 'MIND MAP: concepts and learning path', 0.85, 6.52, 3.35, C.pale, C.slate);
  pill(s, 'BPMN: intended process and governance', 7.05, 6.52, 3.35, C.amberPale, C.amber);
  note(s, '21:30–23:30', 'Make the crucial distinction: the BPMN file is a static design artifact. No Camunda or Zeebe engine executes it. The running system uses sequential Spring services. That honesty is itself an architectural lesson.');
}

// 21
{
  const s = pptx.addSlide('MASTER'); title(s, 'Polyglot persistence', 'One document, different questions, different stores', 'MongoDB is the system of record; Qdrant is the semantic index.');
  box(s, 0.85, 1.9, 5.55, 3.65, C.white, C.line);
  text(s, 'MongoDB — authoritative record', 1.15, 2.25, 4.9, 0.3, { fontSize: 21, bold: true, color: C.teal });
  bullet(s, 'document metadata and BibTeX', 1.2, 2.9, 4.6, 0.38);
  bullet(s, 'current content and summaries', 1.2, 3.55, 4.6, 0.38);
  bullet(s, 'version history and rollback', 1.2, 4.2, 4.6, 0.38);
  bullet(s, 'transactional lifecycle queries', 1.2, 4.85, 4.6, 0.38);
  box(s, 6.95, 1.9, 5.55, 3.65, C.purplePale, C.purple);
  text(s, 'Qdrant — semantic retrieval index', 7.25, 2.25, 4.9, 0.3, { fontSize: 21, bold: true, color: C.purple });
  bullet(s, '768-dimensional embeddings', 7.3, 2.9, 4.6, 0.38);
  bullet(s, 'cosine similarity and HNSW', 7.3, 3.55, 4.6, 0.38);
  bullet(s, 'documentGuid payload scoping', 7.3, 4.2, 4.6, 0.38);
  bullet(s, 'top-k context selection', 7.3, 4.85, 4.6, 0.38);
  text(s, 'Do not ask a vector index to be your source of truth. Do not ask a document database to be your semantic search engine.', 0.95, 6.15, 11.55, 0.45, { fontSize: 17, bold: true, color: C.navy, align: 'center' });
  note(s, '23:30–25:00', 'Use this as the architectural trade-off slide. Polyglot persistence is not about collecting technologies; it is about separating operational responsibilities.');
}

// 22
{
  const s = pptx.addSlide('MASTER'); title(s, 'BPMN reality check', 'A model can reveal the gap between intent and execution', 'This project deliberately ships the model and calls out the missing engine.');
  code(s, `BPMN intent:
  retry 3 × 10 seconds
  librarian review gate
  model + vector orchestration

Runtime today:
  Spring @Service calls
  synchronous happy path
  graceful fallback to excerpt
  no workflow engine`, 0.95, 2.0, 5.4, 3.75, 15);
  code(s, `// The next production step
@Transactional
public DocumentResponse upload(...) {
    String text = tika.parseToString(file.getInputStream());
    indexChunks(guid, text);
    summarizeWithLlama(text);
    summarizeWithMistral(text);
    return repository.save(entity);
}`, 6.85, 2.0, 5.45, 3.75, 14);
  pill(s, 'DOCUMENTED POLICY ≠ ENFORCED POLICY', 3.95, 6.18, 3.2, C.amberPale, C.amber);
  note(s, '25:00–27:00', 'Close architecture with a concrete “what would production require?” question: retries, queues, idempotency, human review, and observable workflow state. The deck should not overclaim that these already exist.');
}

// 23 section
{ const s = pptx.addSlide(); section(s, '04', 'RAG from Kansas: beginner intuition to advanced retrieval', C.amber); note(s, '27:00–27:20', 'Introduce the teaching device: one familiar story, two explanations. First, the audience gets the mental model; then they see the engineering detail.'); }

// 24
{
  const s = pptx.addSlide('MASTER'); title(s, 'Beginner RAG', 'The tiny-desk / super-librarian example', 'An LLM with a limited desk should not be handed an entire library and asked to remember page 420.');
  box(s, 0.75, 1.9, 5.3, 3.8, C.white, C.line);
  text(s, 'Closed-book exam', 1.05, 2.25, 4.7, 0.3, { fontSize: 22, bold: true, color: C.red, align: 'center' });
  text(s, 'Question:\n“Why do visitors wear green spectacles?”\n\nModel guesses from patterns\n→ confident but unverifiable answer', 1.05, 3.0, 4.7, 1.7, { fontSize: 19, breakLine: true, align: 'center' });
  box(s, 7.15, 1.9, 5.3, 3.8, C.tealPale, C.teal);
  text(s, 'Open-book exam', 7.45, 2.25, 4.7, 0.3, { fontSize: 22, bold: true, color: C.teal, align: 'center' });
  text(s, 'Question\n→ librarian finds the relevant passage\n→ model answers from the passage\n→ reader can inspect the excerpt', 7.45, 3.0, 4.7, 1.7, { fontSize: 19, breakLine: true, align: 'center' });
  text(s, 'RAG is not a smarter model. It is a better evidence workflow around a model.', 0.9, 6.18, 11.55, 0.38, { fontSize: 19, bold: true, color: C.navy, align: 'center' });
  note(s, '27:20–29:30', 'Use the Kansas/Oz example because it is concrete and memorable. Keep the analogy short; the goal is to make the later terms—chunk, embedding, retrieval, context—feel inevitable.');
}

// 25
{
  const s = pptx.addSlide('MASTER'); title(s, 'Advanced RAG', 'The same story as a retrieval pipeline', 'This implementation is strong in grounding and traceability, while still leaving clear upgrade paths.');
  const stages = [
    ['1', 'Extract', 'PDF text via Tika / pdf-parse'],
    ['2', 'Chunk', 'paragraph-aligned, ~400 chars'],
    ['3', 'Embed', 'nomic-embed-text, 768-D'],
    ['4', 'Retrieve', 'Qdrant cosine, top-k, GUID filter'],
    ['5', 'Generate', 'Llama grounded prompt + citations'],
  ];
  stages.forEach((v, i) => {
    const x = 0.55 + i * 2.55;
    box(s, x, 2.05, 2.1, 2.2, i === 3 ? C.purplePale : C.white, i === 3 ? C.purple : C.line);
    text(s, v[0], x + 0.15, 2.28, 0.35, 0.35, { fontSize: 22, bold: true, color: C.teal });
    text(s, v[1], x + 0.15, 2.78, 1.75, 0.28, { fontSize: 17, bold: true, align: 'center' });
    text(s, v[2], x + 0.17, 3.35, 1.72, 0.6, { fontSize: 12, color: C.slate, align: 'center', breakLine: true });
    if (i < stages.length - 1) arrow(s, x + 2.12, 3.12, x + 2.45, 3.12);
  });
  text(s, 'Reference upgrades not yet implemented: hybrid BM25 + dense search, query rewriting, cross-encoder re-ranking, automated faithfulness evaluation.', 0.85, 5.05, 11.65, 0.7, { fontSize: 16, color: C.slate, breakLine: true, align: 'center' });
  pill(s, 'CURRENT: mature advanced-lean RAG', 4.25, 6.12, 3.25, C.tealPale, C.teal);
  note(s, '29:30–32:00', 'Contrast the current implementation with a modular reference architecture. The strongest current features are document scoping, local embeddings, grounded prompts, and interactive citations—not automated self-evaluation.');
}

// 26
{
  const s = pptx.addSlide('MASTER'); title(s, 'Concrete retrieval code', 'The important line is the boundary filter', 'Semantic search without document scoping can leak context across documents.');
  code(s, `SearchRequest request = SearchRequest
    .query(question)
    .withTopK(4)
    .withFilterExpression(
        "documentGuid == '" + 'guid' + "'"
    );

List<Document> passages =
    vectorStore.similaritySearch(request);`, 0.8, 1.9, 5.9, 3.55, 15);
  code(s, `String context = passages.stream()
    .map(p -> "[Excerpt] " + p.getContent())
    .collect(Collectors.joining(System.lineSeparator()));

return chatClient.prompt()
    .system(groundedPrompt(context))
    .user(question)
    .call()
    .content();`, 6.85, 1.9, 5.7, 3.55, 15);
  box(s, 1.0, 5.95, 11.2, 0.65, C.amberPale, C.amber);
  text(s, 'Retrieval answers “which passages are relevant?” — generation answers “how do I explain them?” They are separate failure surfaces.', 1.25, 6.15, 10.7, 0.25, { fontSize: 15, bold: true, color: C.amber, align: 'center' });
  note(s, '32:00–34:00', 'Explain the code in terms of responsibility: retrieve with a scope, label the context, then generate under a grounded system instruction. Mention that the actual score exposed in the UI is not currently a measured cosine value.');
}

// 27
{
  const s = pptx.addSlide('MASTER'); title(s, 'RAG limits', 'Grounding is necessary, not sufficient', 'A retrieved passage can still be irrelevant, incomplete, stale, or misinterpreted.');
  const limits = [
    ['Recall', 'The answer may exist in the PDF but not in top-k.', C.redPale, C.red],
    ['Precision', 'A semantically similar chunk may not answer the question.', C.amberPale, C.amber],
    ['Generation', 'The model can still overstate what the evidence supports.', C.purplePale, C.purple],
    ['Evaluation', 'The current citation score is a hardcoded placeholder.', C.tealPale, C.teal],
  ];
  limits.forEach((v, i) => {
    const x = 0.7 + (i % 2) * 6.25, y = 1.95 + Math.floor(i / 2) * 1.85;
    box(s, x, y, 5.65, 1.35, v[2], v[3]);
    text(s, v[0], x + 0.25, y + 0.2, 1.2, 0.25, { fontSize: 17, bold: true, color: v[3] });
    text(s, v[1], x + 1.55, y + 0.2, 3.7, 0.62, { fontSize: 15, color: C.slate, breakLine: true });
  });
  text(s, 'The honest claim is not “zero hallucinations.” It is “a smaller, more inspectable surface for unsupported claims.”', 0.85, 6.05, 11.65, 0.5, { fontSize: 19, bold: true, color: C.navy, align: 'center' });
  note(s, '34:00–36:00', 'This slide is important for technical credibility. Explicitly distinguish hallucination reduction from hallucination elimination, and retrieval quality from answer quality.');
}

// 28 section
{ const s = pptx.addSlide(); section(s, '05', 'Evidence, economics, and lessons learned', C.teal); note(s, '36:00–36:20', 'The final section combines two tables and a short set of lessons. Present the numbers as engineering estimates, not audited accounting.'); }

// 29
{
  const s = pptx.addSlide('MASTER'); title(s, 'Financial ledger', 'Unified Financial & Consumption Ledger', 'Engineering estimate for educational and comparative analysis; values are not audited accounting.');
  const headers = ['Metric / Parameter', 'Consolidated Total', 'Measurement Basis & Technical Details'];
  const rows = [
    ['Total Out-of-Pocket Compute Cost', '~$210 USD', 'Direct prepaid balance deductions ($70 USD) + ~14,000 AI developer credits ($140.00 standard valuation)'],
    ['Gross AI Processing Volume', '~45.5M – 47.6M Tokens (estimated)', 'Prior ~32.5M–34.0M estimate scaled by revised ~14,000-credit usage versus the former 10,000-credit baseline; includes coding-agent context windows, AST refactorings, multi-file inspections, and prompt iteration'],
    ['Application Runtime Inference', '102,870 Tokens', 'In-app user document chat, embeddings (text-embedding-004), and dual-model summarization cascades'],
    ['Total Autonomous Agent Actions', '284 Invocations', 'Compiles, multi-file atomic edits, TypeScript linter executions, AST inspections, and container restarts'],
    ['Active Engineering Turnaround', '~14 – 22 Hours', 'Revised estimate covering total hands-on prompt turns, refactoring cycles, and full integration across sessions'],
    ['Container & Hosting Overhead', '$2.14 USD', 'Dual Cloud Run instances (dev & preview applets), 4 Docker images, 6.8 GB Artifact Registry storage'],
  ];
  const widths = [2.55, 2.35, 7.35];
  const xs = [0.55, 3.25, 5.75];
  headers.forEach((header, i) => text(s, header, xs[i], 1.72, widths[i], 0.42, { fontSize: 11, bold: true, color: C.teal, breakLine: true }));
  rows.forEach((r, i) => {
    const y = 2.22 + i * 0.68;
    box(s, 0.55, y, 12.0, 0.56, i === 1 ? C.tealPale : C.white, i === 1 ? C.teal : C.line);
    text(s, r[0], xs[0] + 0.12, y + 0.1, widths[0] - 0.2, 0.34, { fontSize: 10.5, bold: true, breakLine: true });
    text(s, r[1], xs[1] + 0.12, y + 0.1, widths[1] - 0.2, 0.34, { fontSize: 10.5, bold: true, color: C.blue, breakLine: true });
    text(s, r[2], xs[2] + 0.12, y + 0.08, widths[2] - 0.2, 0.39, { fontSize: 9.2, color: C.slate, breakLine: true });
  });
  note(s, '36:20–39:00', 'Walk through the exact financial-consumption table from the synchronized ledger. Emphasize that gross AI processing is estimated from the revised credit baseline, while runtime inference remains a separate figure.');
}

// 30
{
  const s = pptx.addSlide('MASTER'); title(s, 'Financial ledger', 'Commercial Valuation & Real-World ROI Analysis', 'Engineering estimate for educational and comparative analysis; values are not audited accounting.');
  const rows = [
    ['Traditional Manual Build (No AI)', '120 – 165 hrs', '$100 / hr', '$12,000 – $16,500 USD', '~100x – 140x Cheaper'],
    ['Senior Engineer (with AI Copilot)', '55 – 70 hrs', '$100 / hr', '$5,500 – $7,000 USD', '~45x – 60x Cheaper'],
    ['Autonomous Agent Build (This Project)', '~14 – 22 hrs', 'Direct Compute', '~$210 USD', 'Baseline Direct Cost'],
  ];
  const headers = ['Development Workflow Model', 'Estimated Hours', 'Market Labor Rate', 'Total Commercial Value', 'Net Savings / Multiplier'];
  const xs = [0.55, 3.35, 5.15, 6.95, 9.55];
  const widths = [2.65, 1.65, 1.65, 2.4, 2.95];
  headers.forEach((header, i) => text(s, header, xs[i], 1.78, widths[i], 0.43, { fontSize: 10.5, bold: true, color: C.teal, breakLine: true }));
  rows.forEach((r, i) => {
    const y = 2.55 + i * 0.87;
    box(s, 0.55, y, 12.0, 0.7, i === 2 ? C.tealPale : C.white, i === 2 ? C.teal : C.line);
    r.forEach((value, j) => text(s, value, xs[j] + 0.1, y + 0.15, widths[j] - 0.15, 0.38, { fontSize: 11, bold: i === 2 || j === 0, color: j === 4 ? C.slate : (j === 0 ? C.navy : C.blue), breakLine: true }));
  });
  box(s, 0.9, 5.55, 11.5, 0.72, C.amberPale, C.amber);
  text(s, 'Capital Efficiency: ~$210 USD represents approximately 98%–99% savings compared with conventional contractor or agency rates.', 1.2, 5.77, 10.9, 0.25, { fontSize: 14, bold: true, color: C.amber, align: 'center' });
  text(s, 'Overall confidence: approximately 90% accurate as an engineering estimate; direct costs and recorded credits are stronger than reconstructed ROI and time figures.', 0.9, 6.48, 11.5, 0.28, { fontSize: 11, bold: true, color: C.muted, align: 'center' });
  note(s, '39:00–42:00', 'Walk through the exact commercial-valuation table from the synchronized ledger. Explain that the manual and senior-engineer values are market benchmarks, while the autonomous-agent row uses the revised engineering estimate.');
}

// 31
{
  const s = pptx.addSlide('MASTER'); title(s, 'Lessons learned', 'Five rules for building applications with AI', 'A short checklist to take back to the next project.');
  const rules = [
    ['1', 'Specify the architecture before asking for implementation.'],
    ['2', 'Make acceptance criteria executable: builds, type checks, endpoint checks, and document audits.'],
    ['3', 'Inspect plausible output; the most dangerous errors often look professional.'],
    ['4', 'Separate implemented behavior from planned behavior and documentation artifacts.'],
    ['5', 'Use retrieval, citations, and abstention to narrow the model’s responsibility.'],
  ];
  rules.forEach((r, i) => {
    const y = 1.82 + i * 0.82;
    text(s, r[0], 0.9, y, 0.42, 0.35, { fontSize: 21, bold: true, color: C.teal, align: 'center' });
    s.addShape(pptx.ShapeType.line, { x: 1.55, y: y + 0.32, w: 10.3, h: 0, line: { color: C.line, width: 1 } });
    text(s, r[1], 1.85, y, 9.8, 0.35, { fontSize: 17, color: C.navy });
  });
  box(s, 1.05, 6.0, 11.1, 0.62, C.navy, C.navy);
  text(s, 'Human-in-the-loop curiosity · lateral thinking · identifying the business challenges truly worth solving', 1.3, 6.18, 10.6, 0.25, { fontSize: 14, bold: true, color: C.white, align: 'center' });
  note(s, '42:00–44:00', 'Deliver the five rules briskly. This is the practical summary of the talk, not a generic AI checklist: each rule comes directly from the project’s evolution.');
}

// 32
{
  const s = pptx.addSlide('MASTER'); title(s, 'Closing idea', 'The model can accelerate the build.\nIt cannot choose the problem.', 'Keep this slide on screen as the transition into Q&A.');
  text(s, '“As AI increasingly commoditizes execution, leadership differentiation comes from human-in-the-loop curiosity, lateral thinking, and identifying the business challenges truly worth solving.”', 1.0, 2.0, 11.3, 1.35, { fontSize: 24, bold: true, italic: true, color: C.navy, breakLine: true, align: 'center', valign: 'mid' });
  text(s, 'Beyond prompting is not less engineering. It is engineering with a larger responsibility for intent, evidence, and consequences.', 1.1, 4.15, 11.1, 0.72, { fontSize: 20, color: C.teal, bold: true, breakLine: true, align: 'center' });
  note(s, '44:00–45:00', 'Pause here. Invite questions about the live demo, RAG design, local inference, the AI-assisted development process, the estimates, or how to move the BPMN design toward an executable workflow.');
}

// 33
{
  const s = pptx.addSlide('MASTER'); title(s, 'Open questions', 'Challenge the assumptions', 'Suggested prompts for the room — not a scripted Q&A.');
  const qs = [
    'Where should a local-first RAG system draw its trust boundary?',
    'When is dense retrieval enough, and when do you need hybrid search or re-ranking?',
    'How would you verify faithfulness beyond a citation drawer?',
    'What should become an executing workflow engine first?',
    'What would you change in the architecture for production scale?',
    'Which business problem is worth building next?',
  ];
  qs.forEach((q, i) => {
    const x = 0.85 + (i % 2) * 6.15, y = 1.9 + Math.floor(i / 2) * 1.25;
    box(s, x, y, 5.55, 0.85, i === 5 ? C.tealPale : C.white, i === 5 ? C.teal : C.line);
    text(s, `${i + 1}.`, x + 0.2, y + 0.22, 0.4, 0.28, { fontSize: 16, bold: true, color: C.teal });
    text(s, q, x + 0.75, y + 0.18, 4.45, 0.45, { fontSize: 14, color: C.navy, breakLine: true });
  });
  note(s, '45:00–60:00', 'Use audience questions to return to the central distinction: implementation, evidence, architecture, and problem choice are related but not interchangeable.');
}

// 34
{
  const s = pptx.addSlide('MASTER'); title(s, 'Take the project further', 'Repository, technical documentation, and references', 'Keep these links in the final deck and in the eventual GitHub Pages documentation site.');
  const links = [
    ['Project', 'https://github.com/epascalau/personal-library'],
    ['Frontend architecture', 'docs/FRONTEND_ARCHITECTURE.md'],
    ['Backend architecture', 'docs/BACKEND_ARCHITECTURE.md'],
    ['DevOps guide', 'docs/DEVOPS_GUIDE.md'],
    ['RAG comparison', 'docs/RAG_ARCHITECTURE_COMPARISON.md'],
    ['CS PhD perspective', 'docs/CS_PHD_PERSPECTIVE.md'],
  ];
  links.forEach((r, i) => {
    const y = 1.78 + i * 0.62;
    text(s, r[0], 1.0, y, 2.25, 0.25, { fontSize: 15, bold: true, color: C.teal });
    text(s, r[1], 3.25, y, 8.8, 0.25, { fontSize: 14, color: C.blue });
  });
  box(s, 1.0, 5.9, 11.15, 0.72, C.pale, C.line);
  text(s, 'Planned final release: publish the versioned docs/ collection through GitHub Pages; keep the repository Markdown as the source of truth.', 1.3, 6.1, 10.55, 0.3, { fontSize: 14, bold: true, color: C.slate, align: 'center' });
  note(s, 'Reference slide', 'Use this slide as the handoff. The project documentation remains versioned with the code; GitHub Pages is the presentation layer planned for the final release.');
}

// 35
{
  const s = pptx.addSlide('MASTER'); title(s, 'Selected bibliography', 'Start with the ideas behind the implementation', 'The full bibliography remains in the repository learning and RAG documents.');
  const refs = [
    ['Lewis et al. (2020)', 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks'],
    ['Gao et al. (2024)', 'Retrieval-Augmented Generation for Large Language Models: A Survey'],
    ['Vaswani et al. (2017)', 'Attention Is All You Need'],
    ['Qdrant documentation', 'Vector search, payload filtering, and HNSW indexing'],
    ['Spring AI documentation', 'Chat clients, Ollama integration, and vector stores'],
    ['SAP UI5 Web Components', 'Enterprise design system and accessible web components'],
  ];
  refs.forEach((r, i) => {
    const y = 1.75 + i * 0.68;
    text(s, r[0], 0.95, y, 2.55, 0.28, { fontSize: 15, bold: true, color: C.teal });
    text(s, r[1], 3.7, y, 8.5, 0.28, { fontSize: 14, color: C.slate });
  });
  text(s, 'Thank you', 5.25, 6.15, 2.8, 0.38, { fontSize: 25, bold: true, color: C.navy, align: 'center' });
  note(s, 'Reference slide', 'Leave this as the final slide if the audience wants references, or return to the Q&A slide for discussion.');
}

await pptx.writeFile({ fileName: output });
console.log(`Wrote ${output}`);
