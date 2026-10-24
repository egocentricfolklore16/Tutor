## 2025-05-10 - Pre-indexing Grid Layouts vs Cell Filtering
**Learning:** In multi-cell calendar grid components (e.g. 7 days x 12 hours = 84 cells), filtering an unindexed array (`sessions.filter(...)`) per cell creates $84 \times N$ operations and 84 array allocations per render. Pre-indexing into a Map keyed by `${date}-${hour}` via `useMemo` reduces this to $O(N)$ indexing + $O(1)$ lookups, speeding up render times by 30x–50x.
**Action:** When rendering grid or list views where items belong to specific slots/cells, always pre-index the collection into a Map or grouped object in `useMemo` before rendering the grid cells.

## 2025-05-11 - Single-pass Timestamp Parsing & Date Label Caching
**Learning:** In chat message grouping utilities (`groupMessagesByDateAndSender`), calling `new Date().getTime()` repeatedly inside `.sort()` and calling `formatDateSectionLabel` (which executes `toLocaleDateString`) per message creates $O(N \log N)$ date allocations and $O(N)$ expensive locale string calls. Parsing timestamps once in an $O(N)$ pass to check if pre-sorted (skipping `sort` entirely for already-sorted chat arrays) and caching section labels by `dateObj.toDateString()` speeds up chat rendering by ~10x-70x.
**Action:** In message or timeline grouping functions, perform timestamp parsing in a single $O(N)$ pass, avoid raw string sorting/slicing that breaks timezone awareness, and cache formatted date labels by local `toDateString()` key.

## 2025-05-12 - useRef for Effect Timers and Global Event Listeners
**Learning:** Including fast-changing state arrays (like `groupSessions`) in `useEffect` dependency arrays that run interval timers or event listeners causes effect cleanup and re-instantiation on every state update, triggering unnecessary re-fetch cascades. Ref-patterning (`useRef`) provides fresh state inside timers/listeners without effect re-triggers.
**Action:** When a `useEffect` sets up `setInterval` or window event listeners that access state, hold the state in a `useRef` and remove the state array from the `useEffect` dependency array.

## 2025-05-13 - Batching Queries Across Relations in Chat Inbox
**Learning:** Performing per-item subqueries inside `.map(async ...)` (e.g. fetching messages and attached resources per conversation) creates $O(N)$ sequential/parallel network requests to PostgREST. Batching queries via `.in("conversation_id", convIds)` with an upper bound limit (`Math.max(convIds.length * 20, 100)`) and pre-grouping into a `Map` in JS collapses $2N$ queries into $O(1)$ batch requests, preventing network waterfalls and PostgREST empty array syntax errors (`in.()`).
**Action:** When fetching nested relation summaries across a collection (e.g. latest messages per conversation, resource titles), batch the query using `.in()` with length guards and reasonable `.limit()` bounds, then group results in-memory with a Map.

## 2025-05-14 - Pre-parsing Date Timestamps in Memoized Sort Hooks
**Learning:** Calling date parsing helpers inside JavaScript `.sort()` comparators without pre-parsing invokes regex/string split/`Date` object allocations $O(N \log N)$ times per render. In hooks driving high-frequency Dashboard components (e.g. `useSlippingSessions`), wrapping the filter/sort pipeline in `useMemo` and pre-mapping candidate items to include numeric `startTime` timestamps beforehand reduces date parsing from $O(N \log N)$ per render down to $O(N)$ per session/timer update.
**Action:** When sorting collection state by computed Date values in React custom hooks, use `useMemo` and pre-map items to extract numeric `getTime()` timestamps in an $O(N)$ pass before running `.sort()`.

## 2025-05-15 - Single-Pass Aggregation for Session Analytics
**Learning:** Combining chained array transformations (`.filter()`, `.reduce()`, `.map()`) over raw session collections creates $O(k N)$ iterations and multiple intermediate array allocations. Refactoring multi-metric analytics derivations into a single $O(N)$ `for` loop pass that populates primitive counters and `Set` collections reduces execution time and garbage collection overhead.
**Action:** When deriving multiple aggregate metrics from an array in `useMemo`, consolidate the calculations into a single $O(N)$ loop rather than chaining multiple array methods.
