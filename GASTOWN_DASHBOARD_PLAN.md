# Gas Town Dashboard Enhancement Plan

## Overview

Enhance the Gas Town dashboard to provide better visibility into polecat work, molecule steps, and real-time activity feeds.

## Current Architecture

```
internal/web/
├── handler.go       # HTTP handler, serves convoy.html
├── fetcher.go       # Fetches data from beads (ConvoyRow, PolecatRow, MergeQueueRow)
├── templates.go     # Template loading and helpers
└── templates/
    └── convoy.html  # Single-page dashboard with htmx auto-refresh
```

**Current Data Flow:**
1. `FetchConvoys()` → queries `bd list --type=convoy`
2. `FetchPolecats()` → queries tmux sessions + beads
3. `FetchMergeQueue()` → queries merge-request beads
4. Template renders tables with 10s htmx refresh

---

## Proposed Enhancements

### Feature 1: Clickable Polecat Detail View

**Goal:** Click on a polecat row to see its assigned work, molecule steps, and activity.

**Implementation:**

1. **New endpoint: `/polecat/{name}`**
   ```go
   // handler.go
   func (h *ConvoyHandler) ServePolecatDetail(w http.ResponseWriter, r *http.Request) {
       name := r.PathValue("name") // or chi/mux param
       detail, err := h.fetcher.FetchPolecatDetail(name)
       // render polecat_detail.html
   }
   ```

2. **New fetcher method:**
   ```go
   // fetcher.go
   type PolecatDetail struct {
       Name         string
       Rig          string
       State        string           // idle, spawning, running, done
       HookBead     string           // assigned issue ID
       HookDetail   *IssueDetail     // full issue info
       Molecule     *MoleculeDetail  // if molecule attached
       RecentEvents []ActivityEvent  // from .events.jsonl
       SessionCost  string           // from gt costs
   }

   type MoleculeDetail struct {
       ID           string
       Formula      string
       Steps        []MoleculeStep
       CurrentStep  string
   }

   type MoleculeStep struct {
       ID          string
       Title       string
       Status      string  // pending, in_progress, completed, failed
       CompletedAt *time.Time
   }
   ```

3. **New template: `polecat_detail.html`**
   - Header with polecat name, rig, state
   - Assigned work section (hook_bead details)
   - Molecule progress (if attached) with step list
   - Recent activity feed (scrollable)
   - Session cost display

4. **UI interaction:**
   - Click polecat row → htmx loads detail panel (slide-in or modal)
   - Or: expand row inline to show details
   - Auto-refresh detail view every 5s

**Files to modify:**
- `internal/web/handler.go` - add route
- `internal/web/fetcher.go` - add FetchPolecatDetail()
- `internal/web/templates/polecat_detail.html` - new template
- `internal/web/templates/convoy.html` - add click handler

---

### Feature 2: Real-Time Activity Feed

**Goal:** Show live activity events in the dashboard (like `gt feed` but in browser).

**Implementation:**

1. **New endpoint: `/feed` (SSE - Server-Sent Events)**
   ```go
   func (h *ConvoyHandler) ServeActivityFeed(w http.ResponseWriter, r *http.Request) {
       w.Header().Set("Content-Type", "text/event-stream")
       w.Header().Set("Cache-Control", "no-cache")

       // Watch .events.jsonl and beads activity
       for event := range h.fetcher.WatchActivity(r.Context()) {
           fmt.Fprintf(w, "data: %s\n\n", event.JSON())
           w.(http.Flusher).Flush()
       }
   }
   ```

2. **Fetcher activity watcher:**
   ```go
   func (f *LiveConvoyFetcher) WatchActivity(ctx context.Context) <-chan ActivityEvent {
       events := make(chan ActivityEvent)
       go func() {
           // Tail .events.jsonl
           // Also poll bd activity periodically
           // Merge and dedupe events
       }()
       return events
   }
   ```

3. **Activity event types:**
   ```go
   type ActivityEvent struct {
       Timestamp time.Time
       Type      string   // spawn, sling, done, nudge, mail, merge, etc.
       Actor     string   // who did it
       Target    string   // what it affects
       Message   string   // human-readable summary
       Symbol    string   // emoji/icon for display
   }
   ```

4. **Template addition:**
   ```html
   <div id="activity-feed" class="activity-feed">
       <h2>📡 Live Activity</h2>
       <div id="events" hx-sse="connect:/feed swap:beforeend">
           <!-- Events stream in here -->
       </div>
   </div>
   ```

**Files to modify:**
- `internal/web/handler.go` - add SSE endpoint
- `internal/web/fetcher.go` - add WatchActivity()
- `internal/web/templates/convoy.html` - add feed panel
- `internal/activity/` - may need to expose event parsing

---

### Feature 3: Molecule Step Visibility

**Goal:** Show molecule steps in convoy issue list and polecat details.

**Implementation:**

1. **Enhance TrackedIssue struct:**
   ```go
   type TrackedIssue struct {
       ID           string
       Title        string
       Status       string
       Assignee     string
       MoleculeID   string           // if molecule attached
       CurrentStep  string           // current step name
       StepProgress string           // "3/7" format
       Steps        []MoleculeStep   // for expanded view
   }
   ```

2. **Fetch molecule data:**
   ```go
   func (f *LiveConvoyFetcher) getMoleculeForIssue(issueID string) *MoleculeDetail {
       // Query: bd show <issueID> --json
       // Check for molecule attachment
       // If found, query: gt mol progress <issueID> --json
       // Parse steps and current position
   }
   ```

3. **Template updates:**
   - Show step progress badge on issue rows: `[Step 3/7: implement]`
   - Expandable step list on click
   - Color-code steps: gray (pending), blue (current), green (done), red (failed)

---

### Feature 4: Cost/Token Tracking Display

**Goal:** Show session costs in dashboard.

**Implementation:**

1. **Enhance PolecatRow:**
   ```go
   type PolecatRow struct {
       Name         string
       Rig          string
       LastActivity activity.Info
       StatusHint   string
       SessionCost  string  // NEW: "$1.23" or "N/A"
   }
   ```

2. **Fetch costs:**
   ```go
   func (f *LiveConvoyFetcher) getSessionCost(sessionName string) string {
       // Parse output of: gt costs --json
       // Match session name to cost
   }
   ```

3. **Display in dashboard:**
   - Add "Cost" column to polecat table
   - Show total cost in header
   - Color-code: green (<$1), yellow ($1-5), red (>$5)

---

## Implementation Order

### Phase 1: Polecat Detail View (Highest Value)
1. Add `/polecat/{name}` endpoint
2. Create FetchPolecatDetail() fetcher
3. Build polecat_detail.html template
4. Add click interaction to polecat rows

### Phase 2: Activity Feed
1. Add SSE endpoint `/feed`
2. Implement WatchActivity() with file tailing
3. Add activity panel to dashboard
4. Style event entries

### Phase 3: Molecule Steps
1. Enhance fetcher to query molecule data
2. Update TrackedIssue struct
3. Add step progress to issue rows
4. Create expandable step view

### Phase 4: Cost Display
1. Integrate gt costs output
2. Add cost column to tables
3. Show summary totals

---

## Technical Considerations

### htmx Integration
The dashboard already uses htmx for auto-refresh. We can leverage:
- `hx-get` for loading detail views
- `hx-sse` for real-time activity feed
- `hx-trigger="click"` for expanding rows

### File Watching
For real-time feed, we need to tail:
- `~/gt/.events.jsonl` - Gas Town events
- `bd activity` output - beads changes

Consider using `fsnotify` for efficient file watching.

### Performance
- Cache molecule/step data (changes infrequently)
- Batch beads queries where possible
- Rate-limit SSE events (debounce rapid changes)

---

## Files to Create/Modify

### New Files
- `internal/web/templates/polecat_detail.html`
- `internal/web/templates/partials/activity_event.html`
- `internal/web/sse.go` (optional, for SSE logic)

### Modified Files
- `internal/web/handler.go` - new routes
- `internal/web/fetcher.go` - new fetch methods
- `internal/web/templates.go` - load new templates
- `internal/web/templates/convoy.html` - UI enhancements

---

## Mockup: Enhanced Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ 🚚 Gas Town Dashboard                    Auto-refresh: 10s  💰 $2.34 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ CONVOYS                                                         │
│ ┌─────────┬──────────────────────┬──────────┬─────────────────┐ │
│ │ Status  │ Convoy               │ Progress │ Last Activity   │ │
│ ├─────────┼──────────────────────┼──────────┼─────────────────┤ │
│ │ ● ACTIVE│ Phase 1: Foundation  │ 4/6 ████░│ 🟢 2m ago       │ │
│ │         │  └─ hh-004 [slit]    │ Step 5/7 │   implement     │ │
│ │         │  └─ hh-005 [rictus]  │ Step 3/7 │   branch-setup  │ │
│ └─────────┴──────────────────────┴──────────┴─────────────────┘ │
│                                                                 │
│ 🐾 POLECATS                              [Click row for details]│
│ ┌──────────┬────────┬─────────────┬────────┬──────────────────┐ │
│ │ Name     │ Rig    │ Activity    │ Cost   │ Status           │ │
│ ├──────────┼────────┼─────────────┼────────┼──────────────────┤ │
│ │ ▶ slit   │ heyhey │ 🟢 30s ago  │ $0.45  │ implement step   │ │
│ │   rictus │ heyhey │ 🟢 1m ago   │ $0.32  │ branch-setup     │ │
│ └──────────┴────────┴─────────────┴────────┴──────────────────┘ │
│                                                                 │
│ 📡 LIVE ACTIVITY                                                │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 17:48:40 ✓ slit completed step: self-review              │   │
│ │ 17:47:12 → rictus started step: implement                │   │
│ │ 17:45:03 🎯 mayor slung hh-006 to heyhey                 │   │
│ │ 17:42:53 ✓ slit done with slit-mk5qc6ag                  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 🔀 MERGE QUEUE                                                  │
│ ┌─────┬────────┬──────────────────────┬────────┬──────────────┐ │
│ │ PR  │ Repo   │ Title                │ CI     │ Mergeable    │ │
│ ├─────┼────────┼──────────────────────┼────────┼──────────────┤ │
│ │ #12 │ heyhey │ Card component lib   │ ✓ Pass │ Ready        │ │
│ └─────┴────────┴──────────────────────┴────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. Fork Gas Town repo
2. Create feature branch: `feature/dashboard-enhancements`
3. Implement Phase 1 (Polecat Detail View)
4. Test locally with HeyHey project
5. Submit PR with screenshots/demo

Would you like to proceed with implementation?
