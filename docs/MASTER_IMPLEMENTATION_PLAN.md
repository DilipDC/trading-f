# Trading-F Production Upgrade Blueprint

## 1) New Folder Structure

```text
frontend/
  src/
    core/
    modules/
      wallet/
    components/
    layouts/
    store/
    services/
    hooks/
    workers/
    utils/
    styles/
    assets/
    admin/
      dashboard/
      controls/
      logs/
      settings/
      wallet-control/
backend/
  app/
    api/
    models/
    schemas/
    services/
    core/
    utils/
  main.py
admin/
  dashboard/
  controls/
  logs/
  settings/
```

## 2) Backend Architecture (FastAPI)

- **API routers**: `routes_chart.py`, `routes_wallet.py`, `routes_admin.py`
- **Services**:
  - `chart_service.py`: strict 3 chart types + 4 timeframes + 1-hour sliding window
  - `wallet_service.py`: manual deposit/withdraw request lifecycle
  - `admin_service.py`: global toggles and refresh controls
- **Schemas**: Pydantic contracts for chart, wallet, admin payloads
- **Core config**: single runtime settings object for low-RAM safe constraints

## 3) Admin Control Panel Design

- Global feature flags (animations, low-RAM mode, deposit, withdraw)
- Wallet request queue with approve/reject actions
- QR manager for UPI image rotation
- Refresh-rate management with guard rails
- Chart cache clear endpoint

## 4) Performance Strategy

- Keep chart memory fixed to **last 60 minutes only** (server + client)
- Restrict timeframe fanout to fixed intervals: `1m, 2m, 3m, 5m`
- Avoid heavyweight libs for admin/wallet pages (plain React + axios)
- API payload minimization (only required OHLCV fields)
- Incremental rendering and lazy loading entry points
- Operational low-RAM mode via admin flags
- Manual cache clear API for memory reset

## 5) UI/UX System

- Trading-first layout with chart + order + wallet modules
- Wallet action surfaces for deposit/withdraw request creation
- Admin quick-glance widgets for pending items
- Smooth swap behavior planned for chart type/timeframe transitions

## 6) 220 Feature Backlog (No AI)

### Trading Engine & Charts (1-60)
1. Candlestick chart
2. Line chart
3. Area chart
4. 1m timeframe
5. 2m timeframe
6. 3m timeframe
7. 5m timeframe
8. 1-hour sliding window
9. OHLC rendering
10. Volume rendering
11. Symbol search
12. Symbol pinning
13. Multi-symbol tabs
14. Crosshair
15. Price tooltip
16. Zoom persist
17. Pan persist
18. Last-price marker
19. Spread view
20. Bid/ask ladder
21. Day high/low marker
22. Open price marker
23. Previous close marker
24. Session separator
25. Chart snapshots
26. Fullscreen chart
27. Compact chart mode
28. Dark chart palette
29. Light chart palette
30. Axis precision control
31. Tick-size snapping
32. Incremental candle updates
33. Polling fallback mode
34. WebSocket stream mode
35. Backfill-on-reconnect
36. Symbol metadata chip
37. Price alert create
38. Price alert edit
39. Price alert delete
40. Alert mute
41. Alert snooze
42. Watchlist 1
43. Watchlist 2
44. Watchlist import
45. Watchlist export
46. Favorites sync local
47. Indicator RSI
48. Indicator MACD
49. Indicator SMA
50. Indicator EMA
51. Indicator visibility toggles
52. Drawing trendline
53. Drawing horizontal line
54. Drawing vertical line
55. Drawing box
56. Undo drawing
57. Redo drawing
58. Clear drawings
59. Chart performance HUD
60. Chart cache clear

### Orders, Portfolio, Simulation (61-110)
61. Buy market order
62. Sell market order
63. Buy limit order
64. Sell limit order
65. Order validation
66. Order preview
67. Cost estimation
68. Brokerage estimation
69. Taxes estimation
70. Slippage simulation
71. Partial fill simulation
72. Order status timeline
73. Cancel pending order
74. Modify pending order
75. Position list
76. P&L unrealized
77. P&L realized
78. Daily P&L
79. Net worth widget
80. Holdings breakdown
81. Allocation by sector
82. Allocation by market cap
83. Cash balance view
84. Margin usage view
85. Buying power view
86. Risk meter
87. Exposure caps
88. Max position sizing
89. Max daily loss limit
90. Trade journal entry
91. Trade tag labels
92. Trade notes
93. Execution log export
94. Portfolio CSV export
95. Import holdings
96. Reset simulation account
97. Multi-account switch
98. Corporate action mock
99. Dividend mock credit
100. Portfolio rebalance helper
101. Rebalance preview
102. FIFO P&L mode
103. LIFO P&L mode
104. Avg cost mode
105. Open orders widget
106. Filled orders widget
107. Rejected orders widget
108. Order filter by symbol
109. Order filter by date
110. Order filter by status

### Wallet & Payments (111-150)
111. Wallet INR balance
112. Deposit request form
113. Withdraw request form
114. Min deposit enforcement
115. Withdraw amount validation
116. UPI ID validation
117. UPI name validation
118. Deposit pending state
119. Withdraw pending state
120. Approved status badge
121. Rejected status badge
122. Transaction history list
123. Request timestamps
124. Duplicate request guard
125. Balance insufficient guard
126. Manual admin approve deposit
127. Manual admin reject deposit
128. Manual admin approve withdraw
129. Manual admin reject withdraw
130. Admin set min deposit
131. Admin set withdraw limit
132. Admin enable deposit
133. Admin disable deposit
134. Admin enable withdraw
135. Admin disable withdraw
136. Admin active hours deposit
137. Admin active hours withdraw
138. Service-closed user message
139. Admin QR upload
140. Admin QR rotate
141. Admin QR preview
142. Admin wallet audit log
143. Admin wallet manual adjustment
144. Manual reason codes
145. Pending highlight in admin UI
146. Optional sound notification
147. Wallet request filtering
148. Wallet request pagination
149. Wallet request sorting
150. Wallet request search

### Admin Platform Control (151-185)
151. Global feature toggles
152. Theme control
153. Animation toggle
154. Low-RAM mode toggle
155. Refresh-rate control
156. Background task limit
157. Widget enable/disable
158. Homepage layout controls
159. Announcement manager
160. Market source selection
161. Module enable/disable
162. System health dashboard
163. Frontend logs panel
164. Backend logs panel
165. Error rate panel
166. API latency panel
167. Requests per minute panel
168. Memory usage panel
169. CPU usage panel
170. Cache hit panel
171. Session monitor
172. Session revoke
173. User ban
174. User unban
175. User role assignment
176. API key management
177. Rate limit manager
178. Suspicious activity queue
179. Device fingerprint viewer
180. Admin action audit trail
181. Backup trigger
182. Restore trigger
183. Config versioning
184. Maintenance mode
185. Safe rollback mode

### Performance, Security, DX, PWA (186-220)
186. Route-based code splitting
187. Component lazy loading
188. Dynamic import boundaries
189. Bundle chunk governance
190. Tree-shake-safe exports
191. Minified build pipeline
192. CSS critical-path extraction
193. Skeleton loading states
194. Virtualized long lists
195. Web worker indicator compute
196. IndexedDB chart backup
197. localStorage config cache
198. Service worker caching
199. Offline fallback shell
200. Background sync queue
201. Retry with backoff
202. API request batching
203. ETag support (planned)
204. Gzip/Brotli support
205. Input sanitization
206. Server-side validation
207. CSRF strategy
208. JWT session rotation
209. Route guards admin
210. Secure headers policy
211. Structured JSON logs
212. Correlation IDs
213. Feature-flag SDK
214. Health checks
215. Load test scripts
216. Lighthouse CI checks
217. Bundle size budgets
218. Developer API inspector
219. Debug console module
220. Crash-safe recovery state

## 7) Step-by-Step Implementation Plan

1. Baseline audit and dead-code cleanup.
2. Split frontend into domain modules (`wallet`, `admin`, `chart`).
3. Introduce FastAPI backend skeleton and health checks.
4. Implement chart API with strict chart/timeframe constraints.
5. Add 1-hour sliding-window cache + cache-clear endpoint.
6. Build wallet request APIs (deposit/withdraw/list/balance).
7. Implement admin approval APIs + feature flags.
8. Wire frontend wallet services and admin request views.
9. Introduce optimized polling/WebSocket adaptor for chart feed.
10. Add low-RAM mode toggles and conservative refresh defaults.
11. Add audit logs and request tracing.
12. Add service worker + IndexedDB backup for chart continuity.
13. Add load/perf testing and bundle budget checks.
14. Harden security and admin route guards.
15. Staged rollout with canary flags and rollback runbook.
