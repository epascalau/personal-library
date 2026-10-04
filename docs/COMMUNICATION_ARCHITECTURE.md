# Communication Protocols & Event Architecture Specification (ADR-004)

This document formalizes the network communication protocols, client-side event dispatching mechanisms, and architectural decisions governing data exchange in the **Personal Library & AI Research Engine**.

---

## 1. Architectural Decision Summary (ADR-004)

### Context & Problem Statement
Enterprise document management and AI research assistants feature diverse communication requirements:
- Large binary document uploads (`PDF`, `DOCX`, `TXT`, `MD`, `PPTX`).
- Long-running dual-model LLM inferences (10s–30s generation latencies).
- Conversational RAG queries with vector similarity retrieval.
- Cross-component UI reactivity (filter changes, theme toggling, toasts, audit rollbacks).
- Asynchronous workflow lifecycle tracking modeled in Camunda BPMN 2.0.

Engineers often default to full-duplex persistent WebSockets (`ws://` / `wss://`) for AI applications under the assumption that streaming or push notifications require an open TCP socket. We evaluated whether persistent WebSockets or stateless HTTP/REST with an in-memory detached-DOM event bus best meets system requirements.

### Decision
**We chose stateless HTTP/REST for network communication, paired with an isolated, in-memory `TypedEventBus` for client-side event orchestration. Persistent WebSockets are deliberately omitted from the live runtime.**

---

## 2. Comparison: HTTP/REST vs. Persistent WebSockets

| Evaluation Criteria | Stateless HTTP/REST (Adopted) | Persistent WebSockets (Omitted) | Rationale |
| :--- | :--- | :--- | :--- |
| **Connection Lifecycle** | Ephemeral, stateless TCP connection per request. | Long-lived persistent duplex TCP connection. | Eliminates socket resource leaks, idle connection costs, and firewall proxy renegotiations. |
| **Authentication & AuthZ** | Standard Keycloak OIDC `Authorization: Bearer <JWT>` header on every request. | Initial handshake token validation; complex token renewal over socket. | OAuth2/OIDC token expiration and silent refresh work out-of-the-box with standard HTTP interceptors. |
| **Load Balancing & Ingress** | Stateless round-robin, standard Layer 7 ingress proxies, auto-scaling. | Requires sticky sessions, connection draining, and Redis socket adapters. | Simplifies Kubernetes / Cloud Run container horizontal autoscaling from 0 to N replicas. |
| **Buffering & Timeouts** | Configurable per-request timeouts (e.g., 120s for LLM inference). | Single socket ping/pong heartbeat; risk of silent connection drops during heavy GPU compute. | Heavy LLM tasks do not disrupt client-server heartbeat intervals. |
| **Binary File Ingestion** | Standard `multipart/form-data` with streaming chunk processing. | Custom binary framing and base64 packet fragmentation over socket. | Native browser `FormData` and Apache Commons / Spring Multipart handle multi-gigabyte uploads efficiently. |
| **Caching & Idempotency** | Standard HTTP caching headers (`ETag`, `Cache-Control`, `304 Not Modified`). | No standard caching; all caching must be manually engineered in payload protocols. | Document metadata and BibTeX queries leverage standard browser and CDN caching. |

---

## 3. Network Architecture: Stateless HTTP/REST (`RestBackendAdapter`)

All network operations are orchestrated through `src/main/frontend/services/backend/RestBackendAdapter.ts` using the browser's native `fetch` API:

```
[UI5 Views] ──> [BackendGateway Facade] ──> [RestBackendAdapter]
                                                    │
                                     HTTP/1.1 (JSON / Multipart)
                                     Header: "Authorization: Bearer <JWT>"
                                                    │
                                                    v
                                    [Spring Boot / Express Gateway]
                                           (/api/v1/*)
```

### Core REST Endpoints
* `POST /api/v1/documents/upload`: Multipart upload with automatic text extraction, chunking, and Qdrant vector indexing.
* `GET /api/v1/documents`: Paginated, multi-attribute filter queries with sort expressions.
* `POST /api/v1/documents/:guid/summarize`: Dual-model comparative inference (`llama` vs. `mistral`).
* `POST /api/v1/chat`: Conversational RAG with top-$K$ cosine vector retrieval and grounded citations.
* `POST /api/v1/documents/:guid/rollback/:version`: Non-destructive historical version restoration.

---

## 4. Client-Side Reactive EventBus (`TypedEventBus`)

Instead of pushing state updates across a server WebSocket, the frontend uses an isolated in-memory pub/sub broker (`src/main/frontend/core/eventBus.ts`).

### Detached DOM `Comment` Node Pattern
Standard browser pub/sub implementations often use `window.addEventListener` or node EventEmitter polyfills, risking global pollution and memory leaks. Our implementation anchors the event bus to a **detached DOM `Comment` node**:

```typescript
// src/main/frontend/core/eventBus.ts
export function createEventBus<TEvents extends EventsDefinition>(busName = 'app-bus'): TypedEventBus<TEvents> {
  // A real browser EventTarget that is NEVER mounted into document.body
  const target = document.createComment(busName);

  return {
    publish(eventName, payload) {
      target.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
    },
    subscribe(eventName, handler) {
      const listener = (event: Event) => handler((event as CustomEvent).detail);
      target.addEventListener(eventName, listener);
      return () => target.removeEventListener(eventName, listener);
    }
  };
}
```

#### Why This Design?
1. **Isolated Propagation**: Because the `Comment` node is detached, events never bubble into the window or pollute parent DOM hierarchies.
2. **Type Safety**: Event names and payload schemas are strictly enforced via TypeScript generics.
3. **Automatic Cleanup**: Components register unbind callbacks via `track(unsub)` during mount and unbind cleanly during `unmount()`.

---

## 5. Camunda BPMN 2.0 Ingestion Workflow Alignment

In the **Camunda BPMN 2.0 Ingestion Workflow** (`src/main/resources/bpmn/document_ingestion_rag.bpmn`), you will find the following task:

```xml
<!-- Send Task: Broadcast WebSocket / EventBus Notification -->
<bpmn:sendTask id="Task_BroadcastProgress" name="Broadcast Ingestion Status (EventBus / WebSocket)">
  <bpmn:incoming>SequenceFlow_StoreSuccess</bpmn:incoming>
  <bpmn:outgoing>SequenceFlow_EndSuccess</bpmn:outgoing>
</bpmn:sendTask>
```

### Architectural Mapping
1. **BPMN Architectural Specification**: The Send Task models an asynchronous progress notification step in the enterprise business workflow. In enterprise architectures with external subscribers, this step can bind to an STOMP/WebSocket broker or message queue (RabbitMQ / Kafka).
2. **Client Implementation**: In this application, this notification requirement is fulfilled directly when the REST adapter completes the ingestion transaction. The response payload triggers the client-side **`TypedEventBus`** (`DOCUMENT_INGESTED`), and the **`appStore`** broadcasts the updated document list reactively to all active UI5 floorplans.

---

## 6. Summary Matrix

| Capability | Implementation Mechanism | Protocol |
| :--- | :--- | :--- |
| **Client-to-Backend RPC** | `RestBackendAdapter` & `fetch` | HTTP/1.1 REST (JSON) |
| **Binary Ingestion** | Multipart Form Upload | HTTP Multipart (`multipart/form-data`) |
| **Authentication Flow** | Keycloak Bearer Tokens | HTTP `Authorization: Bearer` |
| **Component Reactivity** | Observable Stores (`Store<T>`) | In-Memory Observers |
| **Inter-View Messaging** | `TypedEventBus` | In-Memory Detached-DOM `EventTarget` |
| **WebSockets Active?** | **None** (Omitted by design) | N/A |
