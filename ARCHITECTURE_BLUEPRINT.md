# Trading Platform vNext Blueprint

## 1) Target Folder Structure

```text
/frontend/src/core
/frontend/src/modules/wallet
/frontend/src/components
/frontend/src/layouts
/frontend/src/store
/frontend/src/services
/frontend/src/hooks
/frontend/src/workers
/frontend/src/utils
/frontend/src/styles
/frontend/src/assets

/backend/app/api
/backend/app/models
/backend/app/schemas
/backend/app/services
/backend/app/core
/backend/app/utils
/backend/main.py

/admin/dashboard
/admin/controls
/admin/logs
/admin/settings
```

## 2) Backend Architecture

- FastAPI app with modular routers: `market`, `wallet`, `admin`.
- In-memory state service optimized for low RAM using capped deques.
- One-hour sliding chart window enforced in backend for all symbols.
- Wallet service supports manual INR deposit/withdraw with admin approval.
- Config core exposes feature flags, wallet rules, and performance knobs.

## 3) Admin Control Panel Design

- Dashboard: real-time KPIs (requests, balances, errors, latency).
- Controls: feature toggles, chart lock, timeframe lock, refresh rate control.
- Wallet Control: request queue, approve/reject, QR manager, balance adjust.
- Logs: security log, transaction log, frontend+backend error stream.
- Settings: caching mode, low-RAM mode, timings, limits, API key registry.

## 4) 200+ Feature Catalog (No AI)

### Trading Engine
1. Real-time quote stream
2. Order book snapshot
3. Depth heatmap
4. Market status badge
5. Circuit limit indicator
6. Tick-by-tick tape
7. OHLC summary
8. Session high/low marker
9. VWAP marker
10. Volume profile
11. Spread tracker
12. Price alert rules
13. Gap scanner
14. Top gainers list
15. Top losers list
16. Watchlist pinning
17. Multi-watchlist folders
18. Symbol quick switch
19. Custom symbol notes
20. Brokerage calculator
21. Margin estimator
22. Position sizing tool
23. Risk-reward ruler
24. Partial close action
25. Bracket order template
26. Stop-loss template
27. Take-profit template
28. Order confirmation mode
29. Slippage tolerance
30. Order retry logic
31. Intraday P&L card
32. Realized P&L card
33. Unrealized P&L card
34. Exposure by symbol
35. Exposure by sector
36. Daily turnover meter
37. Trade journal tagging
38. Session replay
39. Backtest-lite simulation
40. Latency indicator

### Chart System
41. Candlestick chart
42. Line chart
43. Area chart
44. 1m timeframe
45. 2m timeframe
46. 3m timeframe
47. 5m timeframe
48. One-hour sliding window
49. Incremental candle updates
50. Chart state persistence
51. Crosshair tooltip
52. Zoom retention
53. Pan retention
54. Switch transition animation
55. Canvas rendering
56. Frame throttling
57. Data chunking
58. Point decimation
59. Viewport culling
60. Manual cache clear

### Wallet & Payments
61. INR wallet balance
62. Manual UPI deposit
63. Manual UPI withdrawal
64. Minimum deposit rule
65. Withdraw min/max rule
66. Pending request queue
67. Approve deposit
68. Reject deposit
69. Approve withdrawal
70. Reject withdrawal
71. UPI ID validation
72. UPI name validation
73. Duplicate request prevention
74. Service closed banner
75. Timed deposit window
76. Timed withdraw window
77. QR code management
78. Wallet adjustment tool
79. Transaction ledger
80. Wallet audit trail

### Admin Control
81. Global feature toggles
82. Theme switch control
83. Animation master toggle
84. Performance mode toggle
85. Data source selector
86. Refresh-rate control
87. Module enable/disable
88. Widget visibility matrix
89. Homepage layout editor
90. Announcement manager
91. User list
92. Ban user
93. Unban user
94. Force logout session
95. API key registry
96. Rate limit policy
97. Suspicious activity feed
98. System config history
99. Admin action logs
100. Emergency read-only mode
101. Chart type lock
102. Timeframe lock
103. Cache flush trigger
104. Background jobs limiter
105. Low-RAM policy switch
106. Request SLA monitor
107. Error budget monitor
108. Backend health card
109. Frontend health card
110. Release flag rollout

### Performance
111. Route-level code splitting
112. Component lazy loading
113. Dynamic import boundaries
114. Tree-shaken bundles
115. CSS minification
116. JS minification
117. SVG-first icon pipeline
118. WebP image fallback
119. Font preloading
120. Preconnect hints
121. Service worker cache
122. API response cache
123. Cache invalidation policy
124. Batch request transport
125. Debounced search
126. Throttled resize
127. Memoized selectors
128. Stable callback hooks
129. Virtualized lists
130. Idle task scheduling
131. Web worker indicators
132. Main-thread budget guard
133. Reduced animation profile
134. Battery saver profile
135. Low-bandwidth mode
136. Offline fallback shell
137. Background sync queue
138. Crash-safe local snapshot
139. IndexedDB market cache
140. Memory watermark alarms

### Security & Compliance
141. Input schema validation
142. Strict CORS policy
143. Security headers
144. Rate-limited endpoints
145. Admin route guard
146. Session timeout
147. JWT rotation
148. CSRF token checks
149. Password hashing hooks
150. Audit event signing
151. Immutable transaction IDs
152. Balance underflow protection
153. Idempotent wallet APIs
154. Request signature option
155. PII masking in logs
156. Secrets vault adapter
157. Environment profile checks
158. Tamper-evident logs
159. Permission scopes
160. Account lockout threshold

### UX & Productivity
161. Responsive grid
162. Mobile-first nav
163. Tablet split panes
164. Desktop multi-panel
165. Keyboard shortcut map
166. Command palette
167. Saved workspaces
168. Workspace import/export
169. Dockable widgets
170. Draggable panels
171. Skeleton loaders
172. Optimistic UI hints
173. Toast center
174. Sound alerts
175. Color-blind palette
176. High contrast mode
177. Reduced motion mode
178. Touch gesture pan
179. Touch long-press menu
180. Context tooltips
181. Quick actions bar
182. Inline validation
183. Empty-state guidance
184. First-run checklist
185. Session restore
186. Auto-save preferences
187. Notification center
188. Unread badge
189. Compact density mode
190. Large text mode

### Developer & Ops
191. API inspector panel
192. Network timing panel
193. Redux/dev state viewer
194. Console overlay
195. Error boundary UI
196. Feature flag explorer
197. Mock data switch
198. Synthetic load mode
199. Health endpoint
200. Metrics endpoint
201. Structured JSON logs
202. Trace ID propagation
203. Request timing middleware
204. Runtime config endpoint
205. Version endpoint
206. Build metadata card
207. Deployment profile
208. Automated smoke checks
209. Canary readiness toggle
210. Rollback switch


## 5) Performance Strategy

1. Keep initial bundle under 180KB gzip via route and module splitting.
2. Use canvas-based chart renderer only for 3 chart types and 4 timeframes.
3. Enforce one-hour retention in memory with sliding window prune on write.
4. Persist only minimal snapshots in IndexedDB/localStorage.
5. Batch market polling and cap payload per request.
6. Prefer memoized selectors and virtualization for large tables.

## 6) UI/UX System

- Visual style: clean pro trading dark mode with optional light mode.
- Interaction: instant tab switches, retained chart zoom/pan, no page reload.
- Motion: GPU-friendly transform/opacity animations and reduced-motion fallback.
- States: skeletons, empty/error states, and high-contrast accessibility presets.

## 7) Step-by-Step Implementation Plan

1. Baseline audit (bundle, render, memory, API latency).
2. Introduce backend FastAPI skeleton and health checks.
3. Implement market and chart APIs with strict timeframe contract.
4. Implement wallet APIs with pending/approve/reject workflow.
5. Build admin APIs for feature and rule controls.
6. Introduce frontend service layer for backend integration.
7. Add wallet module UI and admin wallet controls.
8. Add performance modes and cache strategy controls.
9. Add logs/monitoring dashboards and security middleware.
10. Run load/perf tests, fix hotspots, ship phased rollout.

Total explicit features listed: 210.