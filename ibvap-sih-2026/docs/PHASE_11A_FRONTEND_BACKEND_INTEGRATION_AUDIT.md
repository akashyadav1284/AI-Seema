# PHASE 11A FRONTEND-BACKEND INTEGRATION AUDIT

## A. Current Frontend Architecture
- **Tech Stack:** React (Vite), TailwindCSS, Framer Motion, Recharts.
- **Routing:** Simple, unprotected client-side routing via `react-router-dom`.
- **State Management:** Local component state (`useState`, `useEffect`).
- **Real-time:** Uses `socket.io-client` for real-time dashboard updates.
- **Current Status:** A highly aesthetic UI shell exists with mocked behavior.

## B. Current Backend API Architecture
- **Tech Stack:** FastAPI, Motor (MongoDB async), PyJWT.
- **Security:** Strict RBAC; every endpoint (except `/health` and `/auth/login`) requires a valid JWT `Authorization: Bearer` token.
- **Real-time:** Uses native Python `fastapi.WebSocket` (Standard WS protocol, HTTP/1.1 Upgrade).
- **Pagination:** Uses a standardized paginated response model (`items`, `total`, `skip`, `limit`).

## C. Existing Integrations
- Frontend `api.js` exports basic fetch wrappers for `/api/health`, `/api/cameras/`, `/api/events/`, and `/api/zones/`.
- Configurable base URL via `import.meta.env.VITE_API_BASE_URL`.

## D. Missing Integrations
1. **Authentication:** No Login page, no JWT storage, no protected routing.
2. **Alerts & Actions:** `/api/alerts` is entirely missing from `api.js`. No UI to acknowledge/resolve alerts.
3. **Evidence Fetching:** No code exists to securely fetch images from `/api/evidence/snapshots/{filename}`.
4. **Live Streams:** UI attempts to load `${API_BASE}/stream/${cam.id}` which does not exist on the backend.
5. **Analytics:** Frontend has a beautiful UI but uses `Math.random()` to generate dummy charts instead of calling the backend's extensive analytics APIs.

## E. API Contract Mismatches
There are several severe schema mismatches that will crash the UI:
1. **Pagination Wrapping:** Frontend expects `const data = await getCameras(); setCameras(data.data);`. Backend returns `{"items": [...], "total": X}`. It should be `data.items`.
2. **Camera Schema:** Frontend uses `cam.id` and `cam.capabilities`. Backend provides `camera.camera_id` and has no `capabilities` field.
3. **Event Schema:** Frontend uses `evt.id`, `evt.type`, `evt.camera_name`, `evt.description`. Backend provides `event.event_id`, `event.event_type`, `event.camera_id`, `event.reason`.

## F. WebSocket Integration Status
🔴 **CRITICAL INCOMPATIBILITY**
- **Protocol Mismatch:** The frontend uses `socket.io-client`. The backend uses standard native WebSockets (`fastapi.WebSocket`). Socket.io uses a proprietary protocol on top of WebSockets. They cannot talk to each other.
- **Auth Mismatch:** The backend requires `ws://localhost:8000/?token=<JWT>`. The frontend currently initiates connection without any auth tokens.
- **Message Format:** Frontend expects `socket.on('new_alert', ...)`. Backend sends raw JSON text frames: `await websocket.send_json({"type": "new_alert", ...})`.

## G. Authentication Integration Status
🔴 **MISSING**
- No login UI exists.
- `fetch` wrappers in `api.js` do not attach the `Authorization: Bearer <token>` header.
- Because the backend is strictly secured, **every single API call the frontend makes currently results in a `401 Unauthorized`**.

## H. Evidence Integration Status
🔴 **MISSING**
- The frontend `Dashboard.jsx` and `Events.jsx` do not render the snapshot images.
- Fetching evidence requires JWT injection into the image fetch request, which is complex (cannot just use `<img src="..."/>`).

## I. Analytics Integration Status
🔴 **MOCKED**
- `Analytics.jsx` is completely fabricated using `Math.random()`. It needs to be wired to:
  - `/api/analytics/summary`
  - `/api/analytics/events`
  - `/api/analytics/events/trends`
  - `/api/analytics/alerts`

## J. Security Issues
- **Unprotected Routes:** All UI routes are accessible without logging in.
- **WebSocket Vulnerability:** Currently attempting to connect to WebSockets without auth.

## K. Exact Files That Need Modification
1. **Frontend Core:**
   - `frontend/src/App.jsx` (Add AuthProvider, Login route, ProtectedRoutes).
   - `frontend/src/services/api.js` (Add token management, interceptors, missing routes).
   - `frontend/src/services/socket.js` (Replace `socket.io-client` with native `WebSocket` API).
2. **Frontend Pages:**
   - `frontend/src/pages/Cameras.jsx` (Schema mapping).
   - `frontend/src/pages/Events.jsx` (Schema mapping).
   - `frontend/src/pages/Dashboard.jsx` (Schema mapping, stats updates).
   - `frontend/src/pages/Analytics.jsx` (Wire real backend API).
   - `frontend/src/pages/LiveMonitoring.jsx` (Decide how to handle missing `/stream` route).

## L. Recommended Implementation Order
1. **Authentication:** Create Login page, JWT storage, and update `api.js` to inject `Bearer` tokens.
2. **Schema Alignment:** Fix `Cameras.jsx`, `Events.jsx`, and `Dashboard.jsx` to correctly parse `items` and standard fields (`camera_id`, `event_type`).
3. **WebSocket Rewrite:** Strip `socket.io-client` and implement native `WebSocket` with `?token=` authentication.
4. **Analytics & Evidence:** Wire up the real Analytics APIs and implement a secure image-fetching component for Evidence.

## M. Blockers, if any
**BLOCKED:** The frontend cannot render any data because it lacks JWT authentication headers, resulting in global `401 Unauthorized` errors. Furthermore, the WebSocket layers are fundamentally incompatible (`socket.io` vs native `WebSocket`).

---
* BLOCKED — FIX REQUIRED BEFORE PHASE 11B
