# PHASE 11A Frontend-Backend Integration Audit

## A. Current Frontend Architecture
- Built with React, Vite, and Tailwind CSS using a dark, high-tech theme.
- Navigation handled by React Router (via `App.jsx` and `Layout.jsx`).
- State managed primarily via local `useState` and `useEffect` hooks.
- Direct API calls handled centrally in `src/services/api.js`.
- Real-time updates via Socket.IO configured in `src/services/socket.js`.
- No global authentication state manager or JWT storage exists in the frontend.

## B. Current Backend API Architecture
- Built with FastAPI with a MongoDB data store.
- Robust Role-Based Access Control (RBAC) via `RoleChecker` (requires valid JWT tokens).
- API routes are logically separated (e.g., `cameras.py`, `events.py`, `alerts.py`, `zones.py`).
- Responses are strongly typed and paginated via Pydantic models (e.g., `PaginatedCameraResponse`).
- Evidence endpoints protect snapshots via auth mechanisms to prevent unauthorized access.

## C. Existing Integrations
- The frontend attempts to make network calls to the correct API base URL for `cameras`, `events`, and `zones`.
- `socket.js` connects to the same base URL for WebSocket events.
- UI expects real-time streams like `new_alert` and `tracks_update`.

## D. Missing Integrations
- **Authentication**: No login UI, token persistence (localStorage/cookies), or HTTP interceptors to attach `Authorization: Bearer <token>` to requests.
- **WebSocket Auth**: `socket.js` connects anonymously without passing authentication tokens, which will be rejected by the backend if it enforces auth on the socket connection.
- **Analytics/Dashboard**: The dashboard currently lacks connections to real endpoints like `/api/analytics/summary` or `/api/analytics/events/trends`. It seems to rely on some placeholder socket events or lacks robust HTTP fetching for historical analytics.
- **Evidence**: Evidence URLs (like snapshots) are not appending auth headers or tokens, meaning image requests to protected endpoints will fail with a 401 Unauthorized.

## E. API Contract Mismatches
- **Pagination Structure**: The backend routes (e.g., `GET /api/cameras/`) return a `PaginatedCameraResponse` schema which holds the array in `.items`. The frontend in some places expects the array directly, or at `data.data`, or relies on `data.items || data.data`. While this fallback exists in `Cameras.jsx` (`setCameras(data.data || [])`), it will evaluate to `[]` because the backend actually returns the list in `.items`, meaning no cameras will render.
- **Event Schemas**: Mismatches between frontend expectations (`evt.type`, `evt.camera_name`) and backend Pydantic models (e.g., `event_type`, `camera_id` vs `camera_name`).

## F. WebSocket Integration Status
- Connection exists in `socket.js` using `socket.io-client`.
- Frontend subscribes to `new_alert` globally.
- **Issues**: Lacks JWT authentication during handshake. Lacks dynamic subscription to specific `camera:<camera_id>` rooms, receiving firehose data instead.

## G. Authentication Integration Status
- **Status: 0%**.
- The backend fully guards its APIs with `Depends(RoleChecker([...]))`.
- The frontend has no mechanism to acquire, store, or transmit JWTs. Consequently, every API call from the frontend currently results in a `401 Unauthorized`.

## H. Evidence Integration Status
- Frontend displays evidence via a gallery (`Evidence.jsx`), expecting an image source URL.
- Since evidence snapshots are protected backend routes, rendering `<img src="/api/evidence/snapshots/..." />` directly in HTML will fail because the browser does not attach JWT headers to standard `<img>` tags.

## I. Analytics Integration Status
- Backend exposes comprehensive `/api/analytics/...` endpoints.
- Frontend lacks API calls to these specific endpoints, relying heavily on hardcoded or socket-based stats.

## J. Security Issues
- If JWTs are added, they must be stored securely (preferably HTTP-only cookies, or at least secure memory/localStorage with XSS protections).
- Evidence API vulnerability if left unprotected or if accessed via URL query parameters without short-lived tokens.
- Hardcoded fallback API URLs (`http://localhost:8000`) instead of relying purely on environment configs in production.

## K. Exact Files that need modification
1. **Frontend**:
   - `frontend/src/services/api.js` (Add interceptors to inject JWT).
   - `frontend/src/services/socket.js` (Add auth payload to connection).
   - `frontend/src/App.jsx` (Add authentication routing and context provider).
   - `frontend/src/pages/Cameras.jsx`, `Events.jsx`, `Zones.jsx` (Fix `.items` vs `.data` mismatches).
   - `frontend/src/pages/Evidence.jsx` (Implement secure image fetching with auth).
2. **Backend**:
   - No major rewrites needed, but `socket_app` initialization needs fixing (it currently breaks tests with `AttributeError: 'ASGIApp'`).

## L. Recommended Implementation Order
1. Implement Frontend Authentication (Login UI, `AuthContext`, Token Storage).
2. Update `api.js` with a fetch interceptor to append the `Authorization` header to all requests.
3. Fix API contract mismatches (`items` vs `data`) across all frontend pages.
4. Secure the WebSocket connection by passing the token during the handshake in `socket.js`.
5. Implement a secure mechanism for fetching Evidence images (e.g., fetch blob with headers, then create object URL).
6. Connect the Dashboard to the new Analytics endpoints.

## M. Blockers, if any
- The total absence of frontend authentication means that **no data can currently be fetched or displayed**.
- Backend tests are currently failing due to the ASGIApp SocketIO wrapping logic breaking standard TestClient executions, and `RoleChecker` enforcing auth in tests without tokens being passed.

* BLOCKED — FIX REQUIRED BEFORE PHASE 11B
