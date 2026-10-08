/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Frontend Interaction Diagram Generator.
 *
 * Documents how the hand-rolled frontend runtime actually fits together: the
 * `Component` views, the observable `Store`s, the typed `backendBus`, the
 * `BackendGateway` and the swappable adapters.
 *
 * Generates two complementary diagrams, each in the five standard formats
 * (.mmd, .puml, .svg, .png, .pdf):
 *
 * 1. frontend_interaction_sequence — a UML sequence diagram tracing one
 *    complete round trip, from a user gesture to the re-rendered DOM.
 * 2. frontend_component_flow — a structural view of the same machinery,
 *    showing the unidirectional loop between the layers.
 *
 * WHY two diagrams: a sequence diagram shows ordering but not structure, and a
 * component diagram shows structure but not ordering. The interesting property
 * of this architecture — that a request leaves the store, crosses an event bus,
 * and returns as a state change rather than a return value — is only legible
 * when both are present.
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
export function generateSequenceMermaid(): string {
  return `%% Personal Library — Frontend Interaction Sequence
%% One complete round trip: user gesture -> view -> store -> event bus -> gateway
%% -> adapter -> HTTP -> store -> re-render.
%%
%% Source of truth:
%%   core/component.ts, core/store.ts, core/eventBus.ts,
%%   stores/appStore.ts, services/backend/BackendGateway.ts
%% NOTE: participant aliases must not contain HTML entities. Mermaid's sequence
%% parser rejects &lt;/&gt; in an alias ("expecting ARROW, got NEWLINE"), even though
%% the flowchart parser accepts them — hence "Store of AppState" rather than Store<AppState>.
sequenceDiagram
    autonumber
    actor User
    participant View as ListReportView<br/>(Component)
    participant Store as appStore<br/>Store of AppState
    participant Req as requestBackend()
    participant Bus as backendBus<br/>(TypedEventBus)
    participant GW as BackendGateway
    participant Adapter as RestBackendAdapter
    participant API as Spring Boot / Express

    User->>View: click "Search"
    View->>Store: applyFilters(filters)

    rect rgb(238, 246, 255)
    Note over Store,View: Optimistic busy state — painted before any network I/O
    Store->>Store: setState({ loadingDocs: true, fetchError: null })
    Store-->>View: listener(state) via queueMicrotask
    View->>View: requestRender() -> render() — spinner visible
    end

    Store->>Req: requestBackend('getDocuments', { filters, page, sortBy })
    Req->>Bus: subscribe(':success' / ':failure') keyed by requestId
    Req->>Bus: publish('backend:getDocuments:request', envelope)

    Note right of Bus: Dispatch is synchronous —<br/>a detached Comment node is the EventTarget

    Bus->>GW: handler(envelope)
    GW->>Bus: publish('backend:request:started')
    GW->>Adapter: invoke(operation, resolveAdapter(), request)
    Adapter->>API: GET /api/v1/documents?page=1&...
    API-->>Adapter: 200 PaginatedResponse
    Adapter-->>GW: result

    alt request succeeded
        GW->>Bus: publish(':success', { requestId, result, durationMs })
        Bus-->>Req: envelope — discarded unless requestId matches
        Req-->>Store: resolve(result)
        Store->>Store: setState({ documents, total, loadingDocs: false })
    else adapter threw / HTTP error
        GW->>Bus: publish(':failure', { requestId, error, durationMs })
        Bus-->>Req: envelope — discarded unless requestId matches
        Req-->>Store: reject(Error)
        Store->>Store: setState({ fetchError: msg, loadingDocs: false })
    end

    GW->>Bus: publish('backend:request:settled', { ok, durationMs })
    Store-->>View: listener(state) — coalesced into one microtask
    View->>View: render() — focus and scroll restored

    Note over View,Store: The view never awaits the adapter. It only ever reacts<br/>to store state, so mock and REST backends are indistinguishable.
`;
}

// =============================================================================
// 2. SEQUENCE DIAGRAM — PLANTUML
// =============================================================================
export function generateSequencePuml(): string {
  return `@startuml Frontend_Interaction_Sequence
!theme plain
skinparam roundCorner 8
skinparam defaultFontName Inter
skinparam sequenceMessageAlign center
skinparam ParticipantPadding 12
skinparam BoxPadding 14

title Personal Library — Frontend Interaction Sequence\\nUser gesture to re-rendered DOM, through the typed event bus

actor User

box "View layer" #EEF6FF
participant "ListReportView\\n<<Component>>" as View
end box

box "State layer" #F0FDF4
participant "appStore\\n<<Store<AppState>>>" as Store
end box

box "Messaging layer" #FAF5FF
participant "requestBackend()" as Req
participant "backendBus\\n<<TypedEventBus>>" as Bus
participant "BackendGateway" as GW
end box

box "Adapter layer" #FFF7ED
participant "RestBackendAdapter" as Adapter
end box

participant "Spring Boot / Express" as API

User -> View : click "Search"
View -> Store : applyFilters(filters)

group Optimistic busy state (no network I/O yet)
  Store -> Store : setState({ loadingDocs: true })
  Store --> View : listener(state) via queueMicrotask
  View -> View : requestRender() -> render()
  note right of View : Spinner is on screen before\\nthe request is even published
end

Store -> Req : requestBackend('getDocuments', {...})
Req -> Bus : subscribe(':success' / ':failure')\\nkeyed by requestId
Req -> Bus : publish('backend:getDocuments:request')

note right of Bus
  Dispatch is synchronous.
  The bus is a detached Comment
  node used as an EventTarget,
  so events cannot leak into
  the document.
end note

Bus -> GW : handler(envelope)
GW -> Bus : publish('backend:request:started')
GW -> Adapter : invoke(operation, resolveAdapter(), request)
Adapter -> API : GET /api/v1/documents
API --> Adapter : 200 PaginatedResponse
Adapter --> GW : result

alt request succeeded
  GW -> Bus : publish(':success', { requestId, result, durationMs })
  Bus --> Req : envelope (ignored unless requestId matches)
  Req --> Store : resolve(result)
  Store -> Store : setState({ documents, total, loadingDocs: false })
else adapter threw / HTTP error
  GW -> Bus : publish(':failure', { requestId, error, durationMs })
  Bus --> Req : envelope (ignored unless requestId matches)
  Req --> Store : reject(Error)
  Store -> Store : setState({ fetchError: msg, loadingDocs: false })
end

GW -> Bus : publish('backend:request:settled', { ok, durationMs })
Store --> View : listener(state) — coalesced into one microtask
View -> View : render() — focus and scroll restored

note over View, Store
  The view never awaits the adapter. It reacts only to
  store state, which is why the Mock and REST adapters
  are interchangeable at runtime.
end note

@enduml
`;
}

// =============================================================================
// 3. SEQUENCE DIAGRAM — VECTOR SVG
// =============================================================================
export function generateSequenceSvg(): string {
  const W = 1860;
  const H = 1310;

  // Lifeline anchors. Spacing is uneven on purpose: the bus sits at the centre
  // because it is the component every other participant talks through.
  const lanes = [
    { x: 120, label: 'User', sub: 'actor', fill: '#334155', stroke: '#64748b' },
    { x: 348, label: 'ListReportView', sub: 'Component', fill: '#1e3a5f', stroke: '#38bdf8' },
    { x: 598, label: 'appStore', sub: 'Store&lt;AppState&gt;', fill: '#14402c', stroke: '#34d399' },
    { x: 838, label: 'requestBackend()', sub: 'helper', fill: '#3b1f52', stroke: '#c084fc' },
    { x: 1078, label: 'backendBus', sub: 'TypedEventBus', fill: '#3b1f52', stroke: '#c084fc' },
    { x: 1318, label: 'BackendGateway', sub: 'consumer', fill: '#3b1f52', stroke: '#c084fc' },
    { x: 1558, label: 'RestBackendAdapter', sub: 'BackendAdapter', fill: '#4a2f10', stroke: '#fbbf24' },
    { x: 1772, label: 'REST API', sub: ':18080 / :8088', fill: '#450a0a', stroke: '#f87171' }
  ];

  const TOP = 104;
  const HEAD_H = 52;
  const LIFE_TOP = TOP + HEAD_H;
  const LIFE_BOTTOM = 1206;

  const headers = lanes
    .map((l) => {
      const w = l.label.length > 15 ? 196 : 170;
      const x = l.x - w / 2;
      return `  <g>
    <rect x="${x}" y="${TOP}" width="${w}" height="${HEAD_H}" rx="7" fill="${l.fill}" stroke="${l.stroke}" stroke-width="1.6" filter="url(#seq-shadow)" />
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
    note?: string;
  };

  const C_SYNC = '#38bdf8';
  const C_STATE = '#34d399';
  const C_BUS = '#c084fc';
  const C_NET = '#fbbf24';
  const C_ERR = '#f87171';

  const msgs: Msg[] = [
    { from: 0, to: 1, y: 196, text: '1. click "Search"', colour: C_SYNC },
    { from: 1, to: 2, y: 238, text: '2. applyFilters(filters)', colour: C_SYNC },
    { from: 2, to: 2, y: 314, text: '3. setState({ loadingDocs: true })', colour: C_STATE, self: true },
    { from: 2, to: 1, y: 360, text: '4. listener(state) — queueMicrotask', colour: C_STATE, dashed: true },
    { from: 1, to: 1, y: 404, text: '5. requestRender() → render()', colour: C_SYNC, self: true },
    { from: 2, to: 3, y: 450, text: "6. requestBackend('getDocuments', {…})", colour: C_BUS },
    { from: 3, to: 4, y: 492, text: "7. subscribe(':success' / ':failure') by requestId", colour: C_BUS },
    { from: 3, to: 4, y: 534, text: "8. publish('backend:getDocuments:request')", colour: C_BUS },
    { from: 4, to: 5, y: 620, text: '9. handler(envelope) — synchronous dispatch', colour: C_BUS },
    { from: 5, to: 4, y: 662, text: "10. publish('backend:request:started')", colour: C_BUS, dashed: true },
    { from: 5, to: 6, y: 704, text: '11. invoke(operation, resolveAdapter(), request)', colour: C_NET },
    { from: 6, to: 7, y: 746, text: '12. GET /api/v1/documents?page=1&amp;…', colour: C_NET },
    { from: 7, to: 6, y: 788, text: '13. 200 PaginatedResponse', colour: C_NET, dashed: true },
    { from: 6, to: 5, y: 828, text: '14. result', colour: C_NET, dashed: true },
    { from: 5, to: 4, y: 884, text: "15. publish(':success', { requestId, result, durationMs })", colour: C_BUS },
    { from: 4, to: 3, y: 926, text: '16. envelope — dropped unless requestId matches', colour: C_BUS, dashed: true },
    { from: 3, to: 2, y: 968, text: '17. resolve(result)', colour: C_BUS, dashed: true },
    { from: 2, to: 2, y: 1014, text: '18. setState({ documents, total, loadingDocs: false })', colour: C_STATE, self: true },
    { from: 5, to: 4, y: 1060, text: "19. publish('backend:request:settled', { ok, durationMs })", colour: C_BUS, dashed: true },
    { from: 2, to: 1, y: 1102, text: '20. listener(state) — coalesced into one microtask', colour: C_STATE, dashed: true },
    { from: 1, to: 1, y: 1146, text: '21. render() — focus &amp; scroll restored', colour: C_SYNC, self: true }
  ];

  /**
   * Renders label text on an opaque plate.
   *
   * WHY: Message labels are wider than the gap between lifelines, so without a backing plate
   * the dashed lifelines and the neighbouring phase bands show straight through the glyphs and
   * the text becomes unreadable at normal zoom.
   */
  const labelPlate = (cx: number, y: number, text: string, anchor: 'middle' | 'start'): string => {
    // Entities render as a single glyph, so measure the decoded length.
    const visible = text.replace(/&[a-z]+;/g, 'x').length;
    const w = visible * 7.4 + 16;
    const x = anchor === 'middle' ? cx - w / 2 : cx - 7;
    return `    <rect x="${x.toFixed(1)}" y="${y - 19}" width="${w.toFixed(1)}" height="17" rx="3" fill="#0f172a" fill-opacity="0.92" />
    <text x="${cx}" y="${y - 7}" font-size="11.5" font-weight="600" fill="#e2e8f0" text-anchor="${anchor}">${text}</text>`;
  };


  const arrows = msgs
    .map((m) => {
      const colour = m.colour ?? C_SYNC;
      const dash = m.dashed ? ' stroke-dasharray="6 4"' : '';
      const marker = `url(#seq-arrow-${colour.replace('#', '')})`;

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
    <linearGradient id="seq-hdr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <marker id="seq-arrow-38bdf8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" /></marker>
    <marker id="seq-arrow-34d399" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" /></marker>
    <marker id="seq-arrow-c084fc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" /></marker>
    <marker id="seq-arrow-fbbf24" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" /></marker>
    <marker id="seq-arrow-f87171" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f87171" /></marker>
    <filter id="seq-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Title banner -->
  <rect x="26" y="20" width="${W - 52}" height="66" rx="8" fill="url(#seq-hdr)" stroke="#334155" stroke-width="1.5" />
  <text x="50" y="52" font-size="20" font-weight="800" fill="#f8fafc">Personal Library — Frontend Interaction Sequence</text>
  <text x="50" y="72" font-size="12" font-weight="500" fill="#94a3b8">One round trip: user gesture &#8594; view &#8594; store &#8594; typed event bus &#8594; gateway &#8594; adapter &#8594; HTTP &#8594; store &#8594; re-render</text>
  <rect x="${W - 196}" y="38" width="170" height="28" rx="6" fill="#0070f2" />
  <text x="${W - 111}" y="56" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">UML Sequence</text>

  <!-- Phase band: optimistic busy state -->
  <rect x="286" y="266" width="446" height="164" rx="7" fill="#38bdf8" fill-opacity="0.07" stroke="#38bdf8" stroke-width="1.1" stroke-dasharray="5 4" />
  <text x="298" y="283" font-size="10.5" font-weight="700" fill="#7dd3fc">OPTIMISTIC BUSY STATE — painted before any network I/O</text>

  <!-- Phase band: bus round trip -->
  <rect x="768" y="572" width="856" height="282" rx="7" fill="#c084fc" fill-opacity="0.06" stroke="#c084fc" stroke-width="1.1" stroke-dasharray="5 4" />
  <text x="780" y="590" font-size="10.5" font-weight="700" fill="#d8b4fe">CORRELATED REQUEST / REPLY — requestId pairs the publish with its envelope</text>

${headers}

${lifelines}

${arrows}

  <!-- Failure path note -->
  <rect x="640" y="1218" width="560" height="62" rx="7" fill="#450a0a" fill-opacity="0.55" stroke="#f87171" stroke-width="1.3" />
  <text x="656" y="1238" font-size="11" font-weight="700" fill="#fca5a5">FAILURE PATH</text>
  <text x="656" y="1254" font-size="10.5" font-weight="500" fill="#fecaca">The adapter throwing publishes ':failure' instead, so requestBackend()</text>
  <text x="656" y="1270" font-size="10.5" font-weight="500" fill="#fecaca">rejects and the store lands on setState({ fetchError, loadingDocs: false }).</text>

  <!-- Key insight note -->
  <rect x="40" y="1218" width="560" height="62" rx="7" fill="#14402c" fill-opacity="0.55" stroke="#34d399" stroke-width="1.3" />
  <text x="56" y="1238" font-size="11" font-weight="700" fill="#6ee7b7">WHY IT IS BUILT THIS WAY</text>
  <text x="56" y="1254" font-size="10.5" font-weight="500" fill="#bbf7d0">The view never awaits the adapter — it only reacts to store state.</text>
  <text x="56" y="1270" font-size="10.5" font-weight="500" fill="#bbf7d0">Mock and REST adapters are therefore swappable at runtime.</text>

  <!-- Legend -->
  <g transform="translate(1232, 1218)">
    <rect x="0" y="0" width="588" height="62" rx="7" fill="#1e293b" fill-opacity="0.75" stroke="#334155" stroke-width="1.2" />
    <text x="14" y="20" font-size="11" font-weight="700" fill="#cbd5e1">LEGEND</text>
    <line x1="14" y1="34" x2="46" y2="34" stroke="#38bdf8" stroke-width="2" /><text x="52" y="38" font-size="10" fill="#94a3b8">view call</text>
    <line x1="120" y1="34" x2="152" y2="34" stroke="#34d399" stroke-width="2" /><text x="158" y="38" font-size="10" fill="#94a3b8">state change</text>
    <line x1="246" y1="34" x2="278" y2="34" stroke="#c084fc" stroke-width="2" /><text x="284" y="38" font-size="10" fill="#94a3b8">event bus</text>
    <line x1="366" y1="34" x2="398" y2="34" stroke="#fbbf24" stroke-width="2" /><text x="404" y="38" font-size="10" fill="#94a3b8">network</text>
    <line x1="14" y1="52" x2="46" y2="52" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 4" /><text x="52" y="56" font-size="10" fill="#94a3b8">asynchronous / reply</text>
  </g>
</svg>
`;
}

// =============================================================================
// 4. COMPONENT FLOW — MERMAID
// =============================================================================
export function generateComponentMermaid(): string {
  return `%% Personal Library — Frontend Component Interaction
%% Structural counterpart to frontend_interaction_sequence.
%% Shows the unidirectional loop: views call stores, stores dispatch through the
%% bus, replies land as state, state notifies views.
flowchart TB
    User([User gesture])

    subgraph VIEWS["VIEW LAYER — Component subclasses (core/component.ts)"]
        direction LR
        AppView["AppView<br/><i>root floorplan</i>"]
        ShellBar["ShellBarView"]
        ListReport["ListReportView"]
        ObjectPage["ObjectPageView"]
        Dialogs["Dialog views ×8<br/><i>Upload, VersionOverwrite,<br/>Delete, Auth, OpenAPI…</i>"]
        Toast["ToastView"]
    end

    subgraph STORES["STATE LAYER — Store&lt;S&gt; subclasses (core/store.ts)"]
        direction LR
        AppStore["appStore<br/><i>documents, filters,<br/>dialogs, toast</i>"]
        BackendStore["backendStore<br/><i>adapter config, health</i>"]
        ThemeStore["themeStore"]
        I18nStore["i18nStore"]
    end

    subgraph MSG["MESSAGING LAYER — services/backend"]
        direction LR
        ReqFn["requestBackend()<br/><i>promise ⇄ event bridge</i>"]
        Bus{{"backendBus<br/>TypedEventBus&lt;BackendEvents&gt;<br/><i>detached Comment node</i>"}}
        Gateway["BackendGateway<br/><i>subscribes to every<br/>:request topic</i>"]
    end

    subgraph ADAPTERS["ADAPTER LAYER — one active at a time"]
        direction LR
        Mock["MockBackendAdapter<br/><i>in-browser fixtures</i>"]
        Rest["RestBackendAdapter<br/><i>fetch + timeout + retry</i>"]
        Session["SessionService<br/><i>token renewal</i>"]
    end

    subgraph BACKEND["BACKEND"]
        direction LR
        Nginx["nginx :8088"]
        Spring["Spring Boot :18080"]
        Express["Express gateway"]
        KC["Keycloak :8180"]
    end

    User -->|"DOM event"| VIEWS
    VIEWS -->|"intent calls<br/>applyFilters, openUpload, logout"| STORES
    STORES -.->|"subscribe(listener)<br/>notify on microtask"| VIEWS

    STORES -->|"requestBackend(op, payload)"| ReqFn
    ReqFn -->|"publish :request<br/>+ await correlated reply"| Bus
    Bus -->|"handler(envelope)"| Gateway
    Gateway -->|"invoke(op, resolveAdapter(), req)"| ADAPTERS
    Gateway -.->|"publish :success / :failure<br/>keyed by requestId"| Bus
    Bus -.->|"resolve / reject"| ReqFn
    ReqFn -.->|"await returns"| STORES

    Rest -->|"HTTPS"| Nginx
    Nginx --> Spring
    Nginx --> Express
    Session -->|"POST /auth/refresh"| Nginx
    Spring --> KC

    BackendStore -.->|"'backend:adapter:changed'"| Bus
    Bus -.->|"triggers scheduleFetch()"| AppStore

    classDef view fill:#1e3a5f,stroke:#38bdf8,color:#f8fafc
    classDef store fill:#14402c,stroke:#34d399,color:#f8fafc
    classDef msg fill:#3b1f52,stroke:#c084fc,color:#f8fafc
    classDef adapter fill:#4a2f10,stroke:#fbbf24,color:#f8fafc
    classDef backend fill:#450a0a,stroke:#f87171,color:#f8fafc

    class AppView,ShellBar,ListReport,ObjectPage,Dialogs,Toast view
    class AppStore,BackendStore,ThemeStore,I18nStore store
    class ReqFn,Bus,Gateway msg
    class Mock,Rest,Session adapter
    class Nginx,Spring,Express,KC backend
`;
}

// =============================================================================
// 5. COMPONENT FLOW — PLANTUML
// =============================================================================
export function generateComponentPuml(): string {
  return `@startuml Frontend_Component_Interaction
!theme plain
skinparam roundCorner 8
skinparam defaultFontName Inter
skinparam componentStyle rectangle
skinparam packageStyle frame

title Personal Library — Frontend Component Interaction\\nUnidirectional loop across the hand-rolled runtime (no framework)

package "VIEW LAYER — Component subclasses" #EEF6FF {
  [AppView\\n<<root floorplan>>] as AppView
  [ShellBarView] as ShellBar
  [ListReportView] as ListReport
  [ObjectPageView] as ObjectPage
  [Dialog views x8] as Dialogs
  [ToastView] as Toast
}

package "STATE LAYER — Store<S> subclasses" #F0FDF4 {
  [appStore] as AppStore
  [backendStore] as BackendStore
  [themeStore] as ThemeStore
  [i18nStore] as I18nStore
}

package "MESSAGING LAYER — services/backend" #FAF5FF {
  [requestBackend()\\n<<promise/event bridge>>] as ReqFn
  [backendBus\\n<<TypedEventBus>>] as Bus
  [BackendGateway] as Gateway
}

package "ADAPTER LAYER — one active at a time" #FFF7ED {
  [MockBackendAdapter] as Mock
  [RestBackendAdapter] as Rest
  [SessionService] as Session
}

package "BACKEND" #FEF2F2 {
  [nginx :8088] as Nginx
  [Spring Boot :18080] as Spring
  [Express gateway] as Express
  [Keycloak :8180] as KC
}

AppView --> ShellBar : owns
AppView --> ListReport : mounts floorplan
AppView --> ObjectPage : mounts floorplan
AppView --> Dialogs : owns
AppView --> Toast : owns

ListReport --> AppStore : applyFilters() / openDocument()
Dialogs --> AppStore : openUpload() / submit()
ShellBar --> BackendStore : switch adapter

AppStore ..> ListReport : subscribe(listener)\\nnotify on microtask
AppStore ..> Dialogs : subscribe(listener)
I18nStore ..> ShellBar : subscribe(listener)
ThemeStore ..> AppView : applyToDocument()

AppStore --> ReqFn : requestBackend(op, payload)
ReqFn --> Bus : publish('backend:<op>:request')
Bus --> Gateway : handler(envelope)
Gateway --> Rest : invoke(op, resolveAdapter(), req)
Gateway --> Mock : invoke(op, resolveAdapter(), req)
Gateway ..> Bus : publish(':success' / ':failure')
Bus ..> ReqFn : correlated by requestId
ReqFn ..> AppStore : resolve / reject

Rest --> Nginx : fetch
Session --> Nginx : POST /auth/refresh
Nginx --> Spring
Nginx --> Express
Spring --> KC : token introspection

BackendStore ..> Bus : 'backend:adapter:changed'
Bus ..> AppStore : scheduleFetch()

note right of Bus
  A detached Comment node is the
  EventTarget, so dispatch is
  synchronous and events cannot
  bubble into the document.
end note

note bottom of AppStore
  setState() short-circuits when nothing
  changed and coalesces listeners into a
  single microtask, so repeated health
  probes never cause a re-render.
end note

@enduml
`;
}

// =============================================================================
// 6. COMPONENT FLOW — VECTOR SVG
// =============================================================================
export function generateComponentSvg(): string {
  const W = 1740;
  const H = 1180;

  type Node = { x: number; y: number; w: number; h: number; title: string; sub?: string };

  // `labelX` moves a band caption out from under the diagonal connectors that cross
  // the band's top edge; left-aligned captions would otherwise be struck through.
  const band = (
    y: number,
    h: number,
    label: string,
    stroke: string,
    labelX = 50
  ): string => `  <rect x="34" y="${y}" width="${W - 68}" height="${h}" rx="9" fill="#1e293b" fill-opacity="0.38" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="7 4" />
  <text x="${labelX}" y="${y + 21}" font-size="12" font-weight="800" fill="${stroke}">${label}</text>`;

  const box = (n: Node, fill: string, stroke: string): string => {
    const subLine = n.sub
      ? `\n    <text x="${n.x + n.w / 2}" y="${n.y + n.h - 13}" font-size="9.5" font-weight="500" fill="${stroke}" text-anchor="middle">${n.sub}</text>`
      : '';
    const titleY = n.sub ? n.y + n.h / 2 - 2 : n.y + n.h / 2 + 4;
    return `  <g>
    <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.5" filter="url(#cmp-shadow)" />
    <text x="${n.x + n.w / 2}" y="${titleY}" font-size="11.5" font-weight="700" fill="#f8fafc" text-anchor="middle">${n.title}</text>${subLine}
  </g>`;
  };

  // --- Band geometry -------------------------------------------------------
  const BAND_VIEW = 118;
  const BAND_STORE = 310;
  const BAND_MSG = 500;
  const BAND_ADAPTER = 702;
  const BAND_BACKEND = 894;

  const viewNodes: Node[] = [
    { x: 70, y: BAND_VIEW + 36, w: 190, h: 54, title: 'AppView', sub: 'root floorplan' },
    { x: 280, y: BAND_VIEW + 36, w: 180, h: 54, title: 'ShellBarView', sub: 'search, theme, auth' },
    { x: 480, y: BAND_VIEW + 36, w: 190, h: 54, title: 'ListReportView', sub: 'table, filters' },
    { x: 690, y: BAND_VIEW + 36, w: 190, h: 54, title: 'ObjectPageView', sub: 'detail, versions' },
    { x: 900, y: BAND_VIEW + 36, w: 230, h: 54, title: 'Dialog views ×8', sub: 'Upload, Overwrite, Auth…' },
    { x: 1150, y: BAND_VIEW + 36, w: 150, h: 54, title: 'ToastView', sub: 'notifications' },
    { x: 1320, y: BAND_VIEW + 36, w: 150, h: 54, title: 'FooterView', sub: 'status' }
  ];

  const storeNodes: Node[] = [
    { x: 70, y: BAND_STORE + 36, w: 230, h: 54, title: 'appStore', sub: 'documents, filters, dialogs' },
    { x: 320, y: BAND_STORE + 36, w: 220, h: 54, title: 'backendStore', sub: 'adapter config, health' },
    { x: 560, y: BAND_STORE + 36, w: 170, h: 54, title: 'themeStore', sub: 'dark mode' },
    { x: 750, y: BAND_STORE + 36, w: 170, h: 54, title: 'i18nStore', sub: '5 locales' }
  ];

  const msgNodes: Node[] = [
    { x: 70, y: BAND_MSG + 40, w: 230, h: 60, title: 'requestBackend()', sub: 'promise ⇄ event bridge' },
    { x: 360, y: BAND_MSG + 40, w: 280, h: 60, title: 'backendBus', sub: 'TypedEventBus&lt;BackendEvents&gt;' },
    { x: 700, y: BAND_MSG + 40, w: 230, h: 60, title: 'BackendGateway', sub: 'consumes every :request' }
  ];

  const adapterNodes: Node[] = [
    { x: 70, y: BAND_ADAPTER + 36, w: 230, h: 54, title: 'MockBackendAdapter', sub: 'in-browser fixtures' },
    { x: 320, y: BAND_ADAPTER + 36, w: 230, h: 54, title: 'RestBackendAdapter', sub: 'fetch + timeout + retry' },
    { x: 570, y: BAND_ADAPTER + 36, w: 210, h: 54, title: 'SessionService', sub: 'token renewal' }
  ];

  const backendNodes: Node[] = [
    { x: 70, y: BAND_BACKEND + 36, w: 180, h: 54, title: 'nginx :8088', sub: 'ingress' },
    { x: 270, y: BAND_BACKEND + 36, w: 200, h: 54, title: 'Spring Boot :18080', sub: 'JDK 21 / Boot 4.1' },
    { x: 490, y: BAND_BACKEND + 36, w: 190, h: 54, title: 'Express gateway', sub: 'Node adapter' },
    { x: 700, y: BAND_BACKEND + 36, w: 180, h: 54, title: 'Keycloak :8180', sub: 'OIDC realm' }
  ];

  const nodes = [
    ...viewNodes.map((n) => box(n, '#1e3a5f', '#38bdf8')),
    ...storeNodes.map((n) => box(n, '#14402c', '#34d399')),
    ...msgNodes.map((n) => box(n, '#3b1f52', '#c084fc')),
    ...adapterNodes.map((n) => box(n, '#4a2f10', '#fbbf24')),
    ...backendNodes.map((n) => box(n, '#450a0a', '#f87171'))
  ].join('\n');

  /**
   * Renders a floating annotation on an opaque plate.
   *
   * WHY: Connector labels sit over band fills and diagonal arrows, so they need an opaque
   * backing to stay legible. Sizing from the longest line keeps the text inside the plate
   * instead of overflowing it.
   */
  const tag = (cx: number, cy: number, lines: string[], stroke: string): string => {
    // Entities render as one glyph, so measure the decoded length.
    const widest = Math.max(...lines.map((l) => l.replace(/&[a-z#0-9]+;/g, 'x').length));
    const w = widest * 6.6 + 24;
    const h = lines.length * 15 + 16;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const text = lines
      .map(
        (l, i) =>
          `    <text x="${cx}" y="${(y + 22 + i * 15).toFixed(1)}" font-size="${i === 0 ? 10.5 : 9.5}" font-weight="${i === 0 ? 700 : 500}" fill="${i === 0 ? stroke : '#cbd5e1'}" text-anchor="middle">${l}</text>`
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
    <linearGradient id="cmp-hdr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <marker id="cmp-arrow-sky" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" /></marker>
    <marker id="cmp-arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#34d399" /></marker>
    <marker id="cmp-arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" /></marker>
    <marker id="cmp-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#fbbf24" /></marker>
    <filter id="cmp-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Title banner -->
  <rect x="26" y="20" width="${W - 52}" height="66" rx="8" fill="url(#cmp-hdr)" stroke="#334155" stroke-width="1.5" />
  <text x="50" y="52" font-size="20" font-weight="800" fill="#f8fafc">Personal Library — Frontend Component Interaction</text>
  <text x="50" y="72" font-size="12" font-weight="500" fill="#94a3b8">Hand-rolled runtime: Component views &#8226; observable Stores &#8226; typed event bus &#8226; swappable adapters &#8212; no framework</text>
  <rect x="${W - 206}" y="38" width="180" height="28" rx="6" fill="#0070f2" />
  <text x="${W - 116}" y="56" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Component / Data Flow</text>

${band(BAND_VIEW, 108, 'VIEW LAYER — Component subclasses (core/component.ts)', '#38bdf8')}
${band(BAND_STORE, 108, 'STATE LAYER — Store&lt;S&gt; subclasses (core/store.ts)', '#34d399', 1046)}
${band(BAND_MSG, 120, 'MESSAGING LAYER — services/backend (core/eventBus.ts)', '#c084fc', 1300)}
${band(BAND_ADAPTER, 108, 'ADAPTER LAYER — exactly one active at a time', '#fbbf24', 1150)}
${band(BAND_BACKEND, 108, 'BACKEND TIER', '#f87171', 1430)}

${nodes}

  <!-- ===== Views -> Stores: intent calls ===== -->
  <line x1="160" y1="208" x2="160" y2="340" stroke="#38bdf8" stroke-width="2.4" marker-end="url(#cmp-arrow-sky)" />
  <line x1="370" y1="208" x2="430" y2="340" stroke="#38bdf8" stroke-width="2" marker-end="url(#cmp-arrow-sky)" />
  <line x1="575" y1="208" x2="300" y2="340" stroke="#38bdf8" stroke-width="2" marker-end="url(#cmp-arrow-sky)" />
${tag(800, 262, ['INTENT CALLS — plain method invocation', 'applyFilters() · openDocument() · openUpload() · logout()'], '#38bdf8')}

  <!-- ===== Stores -> Views: the only path back up ===== -->
  <line x1="1672" y1="342" x2="1672" y2="212" stroke="#34d399" stroke-width="2.4" stroke-dasharray="7 4" marker-end="url(#cmp-arrow-green)" />
${tag(1340, 268, ['SUBSCRIBE / NOTIFY — the only path back up', 'store.subscribe(() =&gt; this.requestRender())', 'coalesced into one microtask; setState() short-circuits', 'when nothing actually changed'], '#34d399')}

  <!-- ===== Stores -> Messaging ===== -->
  <line x1="170" y1="400" x2="170" y2="534" stroke="#c084fc" stroke-width="2.4" marker-end="url(#cmp-arrow-purple)" />
  <line x1="104" y1="534" x2="104" y2="404" stroke="#34d399" stroke-width="2.2" stroke-dasharray="7 4" marker-end="url(#cmp-arrow-green)" />
${tag(430, 440, ['requestBackend(op, payload)'], '#c084fc')}
${tag(430, 476, ['resolve / reject &#8594; setState()'], '#34d399')}

  <!-- ===== Inside the messaging band ===== -->
  <line x1="302" y1="570" x2="354" y2="570" stroke="#c084fc" stroke-width="2.2" marker-end="url(#cmp-arrow-purple)" />
  <line x1="642" y1="570" x2="694" y2="570" stroke="#c084fc" stroke-width="2.2" marker-end="url(#cmp-arrow-purple)" />
${tag(370, 644, ["publish ':request' &#8594; handler &#8594; publish ':success' / ':failure' (correlated by requestId)"], '#c084fc')}

  <!-- ===== Gateway -> Adapters ===== -->
  <line x1="800" y1="602" x2="440" y2="734" stroke="#fbbf24" stroke-width="2.4" marker-end="url(#cmp-arrow-amber)" />
  <line x1="760" y1="602" x2="240" y2="734" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#cmp-arrow-amber)" />
${tag(1010, 668, ['invoke(op, resolveAdapter(), request)', 'the dashed path is the Mock adapter — same contract, no network'], '#fbbf24')}

  <!-- ===== Adapters -> Backend ===== -->
  <line x1="420" y1="794" x2="170" y2="926" stroke="#f87171" stroke-width="2.2" marker-end="url(#cmp-arrow-amber)" />
  <line x1="660" y1="794" x2="210" y2="926" stroke="#f87171" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#cmp-arrow-amber)" />
${tag(900, 860, ['fetch() through the nginx ingress', "SessionService renews on the dashed path: POST /auth/refresh"], '#f87171')}
  <line x1="252" y1="957" x2="266" y2="957" stroke="#f87171" stroke-width="2" marker-end="url(#cmp-arrow-amber)" />
  <line x1="472" y1="957" x2="486" y2="957" stroke="#f87171" stroke-width="2" marker-end="url(#cmp-arrow-amber)" />
  <line x1="682" y1="957" x2="696" y2="957" stroke="#f87171" stroke-width="2" marker-end="url(#cmp-arrow-amber)" />

  <!-- ===== Cross-cutting topics ===== -->
  <rect x="960" y="${BAND_MSG + 36}" width="460" height="68" rx="7" fill="#3b1f52" fill-opacity="0.5" stroke="#c084fc" stroke-width="1.2" />
  <text x="976" y="${BAND_MSG + 55}" font-size="10.5" font-weight="700" fill="#d8b4fe">CROSS-CUTTING TOPICS</text>
  <text x="976" y="${BAND_MSG + 71}" font-size="9.5" font-weight="500" fill="#e9d5ff">'backend:adapter:changed' &#8594; appStore.scheduleFetch()</text>
  <text x="976" y="${BAND_MSG + 85}" font-size="9.5" font-weight="500" fill="#e9d5ff">'backend:health:changed' &#8226; ':request:started' / ':settled'</text>
  <text x="976" y="${BAND_MSG + 99}" font-size="9.5" font-weight="500" fill="#c4b5fd">Swapping the adapter needs no listener rebuild.</text>

  <!-- ===== Explanatory notes ===== -->
  <rect x="40" y="1024" width="540" height="124" rx="8" fill="#1e293b" fill-opacity="0.7" stroke="#38bdf8" stroke-width="1.3" />
  <text x="58" y="1046" font-size="11.5" font-weight="800" fill="#7dd3fc">WHY AN EVENT BUS AT ALL</text>
  <text x="58" y="1066" font-size="10" font-weight="500" fill="#cbd5e1">A direct store &#8594; adapter call would work, but every request would</text>
  <text x="58" y="1081" font-size="10" font-weight="500" fill="#cbd5e1">then be invisible. Routing through topics makes the whole</text>
  <text x="58" y="1096" font-size="10" font-weight="500" fill="#cbd5e1">conversation observable, lets the gateway time and normalise</text>
  <text x="58" y="1111" font-size="10" font-weight="500" fill="#cbd5e1">errors in one place, and lets the adapter be swapped at runtime</text>
  <text x="58" y="1126" font-size="10" font-weight="500" fill="#cbd5e1">without rebuilding a single subscription.</text>
  <text x="58" y="1142" font-size="9.5" font-weight="600" fill="#7dd3fc">BackendGateway.execute() &#8226; services/backend/BackendGateway.ts</text>

  <rect x="600" y="1024" width="540" height="124" rx="8" fill="#1e293b" fill-opacity="0.7" stroke="#c084fc" stroke-width="1.3" />
  <text x="618" y="1046" font-size="11.5" font-weight="800" fill="#d8b4fe">PROMISES OVER AN EVENT BUS</text>
  <text x="618" y="1066" font-size="10" font-weight="500" fill="#cbd5e1">requestBackend() generates a requestId, subscribes to the</text>
  <text x="618" y="1081" font-size="10" font-weight="500" fill="#cbd5e1">matching :success and :failure topics, publishes the request,</text>
  <text x="618" y="1096" font-size="10" font-weight="500" fill="#cbd5e1">then resolves or rejects and disposes both listeners. Callers</text>
  <text x="618" y="1111" font-size="10" font-weight="500" fill="#cbd5e1">write plain await; the message still crosses the bus. Envelopes</text>
  <text x="618" y="1126" font-size="10" font-weight="500" fill="#cbd5e1">whose requestId does not match are ignored.</text>
  <text x="618" y="1142" font-size="9.5" font-weight="600" fill="#d8b4fe">requestBackend() &#8226; services/backend/BackendGateway.ts</text>

  <rect x="1160" y="1024" width="540" height="124" rx="8" fill="#1e293b" fill-opacity="0.7" stroke="#34d399" stroke-width="1.3" />
  <text x="1178" y="1046" font-size="11.5" font-weight="800" fill="#6ee7b7">LIFECYCLE AND LEAK SAFETY</text>
  <text x="1178" y="1066" font-size="10" font-weight="500" fill="#cbd5e1">Every subscription is registered through Component.track(),</text>
  <text x="1178" y="1081" font-size="10" font-weight="500" fill="#cbd5e1">so destroy() disposes store listeners, bus listeners and timers</text>
  <text x="1178" y="1096" font-size="10" font-weight="500" fill="#cbd5e1">together. render() replaces innerHTML wholesale, then restores</text>
  <text x="1178" y="1111" font-size="10" font-weight="500" fill="#cbd5e1">focus and scroll from a snapshot &#8212; which is what keeps typing</text>
  <text x="1178" y="1126" font-size="10" font-weight="500" fill="#cbd5e1">in a filter field from losing the caret on a background refresh.</text>
  <text x="1178" y="1142" font-size="9.5" font-weight="600" fill="#6ee7b7">core/component.ts &#8226; track() / render() / destroy()</text>
</svg>
`;
}

// =============================================================================
// 7. RENDER PIPELINE
// =============================================================================
interface DiagramSpec {
  name: string;
  svg: string;
  mmd: string;
  puml: string;
  /** PDF page size, matched to the SVG aspect ratio so nothing is letterboxed. */
  pdfSize: [number, number];
}

/**
 * Writes one diagram out across all five standard formats.
 *
 * WHAT: Emits .puml, .mmd and .svg verbatim, rasterises a 3600px-wide PNG via Resvg,
 * then wraps that PNG in a single-page PDF, into both `docs/diagrams/` and the
 * frontend `public/` directory.
 * WHY: Mirrors the convention already established by the other diagram generators, so
 * downstream consumers (docs pages, the in-app diagram modal, the export bundle) can
 * assume the same five artefacts exist for every diagram.
 *
 * @param spec Diagram name, source markup and PDF page dimensions.
 * @param docsDir Target directory for documentation copies.
 * @param publicDir Target directory for frontend-served copies.
 */
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
 * Generates both frontend interaction diagrams across all five formats.
 *
 * WHAT: Renders the sequence diagram and the component/data-flow diagram into
 * `docs/diagrams/` and `src/main/frontend/public/`.
 * WHY: These two views of the frontend runtime are the entry point for anyone trying to
 * understand how a click becomes a repaint without a framework in the stack.
 */
export async function generateAllFrontendInteractionDiagrams(): Promise<void> {
  console.log('📐 Generating Frontend Interaction Diagrams (PlantUML, Mermaid, SVG, PNG, PDF)...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  await emitDiagram(
    {
      name: 'frontend_interaction_sequence',
      svg: generateSequenceSvg(),
      mmd: generateSequenceMermaid(),
      puml: generateSequencePuml(),
      pdfSize: [1860, 1310]
    },
    docsDir,
    publicDir
  );

  await emitDiagram(
    {
      name: 'frontend_component_flow',
      svg: generateComponentSvg(),
      mmd: generateComponentMermaid(),
      puml: generateComponentPuml(),
      pdfSize: [1740, 1180]
    },
    docsDir,
    publicDir
  );

  console.log('🎉 Frontend Interaction Diagrams generated across all 5 standard formats!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllFrontendInteractionDiagrams().catch((err) => {
    console.error('Failed generating frontend interaction diagrams:', err);
    process.exit(1);
  });
}
