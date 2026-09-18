# Phase 11C: Native WebSocket Integration

## A. Previous Socket.IO problem
In previous phases, the backend and frontend used `socket.io-client` which was incompatible with the final production FastAPI deployment (where Socket.IO on FastAPI often creates dependency or native bridging issues). The frontend retained `socket.io-client` code, leading to console errors and blocked real-time data flow, which we temporarily bypassed with REST polling in Phase 11B.

## B. Native WebSocket implementation
We removed the `socket.io-client` dependency from the frontend completely.
We created a new service `NativeWebSocketService` in `frontend/src/services/socket.js`. This service utilizes the browser's native `WebSocket` API to establish a connection with the backend at `ws://.../api/ws/`.

## C. Authentication flow
Authentication is performed at the connection level via JWT. The connection URL is built dynamically appending `?token=<JWT>`. 
This integration occurs in `AuthContext.jsx`. When the user logs in, `socketService.connect(access_token)` is called. If the JWT is invalid, the backend terminates the connection immediately. On logout, `socketService.disconnect()` is invoked. The token is never exposed in logs or UI.

## D. Subscription mechanism
The backend WebSocket manager routes events based on channels. The `socketService` tracks active subscriptions and transmits them via JSON messages: `{"type": "subscribe", "channel": "<channel>"}`. When a reconnection happens, the service automatically resubscribes to these tracked channels.

## E. Event handling
The backend broadcasts JSON messages. The `NativeWebSocketService` parses these messages and uses an internal pub/sub event emitter (`on`, `off`) so React components can listen for specific message types (e.g., `event.created`).
In `Events.jsx` and `Dashboard.jsx`, we subscribe to the global `events` channel. When a new event arrives, it dynamically updates the tables and dashboard counters in real time without refreshing.

## F. Alert handling
In `Alerts.jsx`, we maintain the initial REST polling fallback to ensure legacy alerts load. We also listen for `alert.created`, `alert.acknowledged`, and `alert.resolved` messages over the WebSocket to mutate the alerts UI immediately as changes occur.

## G. Camera isolation
When users open the Live Stream for a specific camera in `Cameras.jsx`, we subscribe exclusively to that camera's channel (`camera:CAM-XXX`). The component unmounts and automatically sends an `unsubscribe` message when the camera stream modal is closed or changed, ensuring no cross-contamination of events across camera views.

## H. Reconnection behavior
The `NativeWebSocketService` incorporates automatic exponential backoff reconnection logic. It attempts to reconnect up to 5 times (scaling delay: 1s, 2s, 4s, 8s, 16s) in the event of a network failure, dropping subscriptions, or a backend reboot.

## I. Security handling
- The connection inherently fails and halts if a JWT is missing or invalid.
- JWTs are extracted directly from `AuthContext` and attached securely to the WS URL; never logged.
- The WebSocket explicitly disconnects when the `logout()` function is triggered in `AuthContext`.

## J. Files modified
- `frontend/package.json`
- `frontend/src/services/socket.js`
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Events.jsx`
- `frontend/src/pages/Alerts.jsx`
- `frontend/src/pages/Cameras.jsx`

## K. Tests performed
1. Verified `socket.io-client` package removal and frontend compilation.
2. Verified WS connection upgrades from HTTP.
3. Examined message routing and state updates.
4. Run complete backend automated test suite (`pytest`) verifying 95/95 test passes and 0 regressions.

## L. Remaining issues
None known. The real-time integration via Native WebSockets satisfies all Phase 11C criteria and is completely decoupled from Socket.IO.

**FINAL CLASSIFICATION:**
PHASE 11C COMPLETE — READY FOR PHASE 11D
