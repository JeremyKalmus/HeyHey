# Gas Town Installation Issues - Bug Report

**Gas Town Version**: 0.2.1
**Beads Version**: 0.46.0
**Platform**: macOS Darwin 25.1.0 (arm64)
**Date**: 2026-01-08

## Summary

During fresh installation of Gas Town, several issues prevented the intended workflow from functioning. The main blocker was that custom beads types (`agent`, `role`, `convoy`, `slot`, `rig`) were not automatically registered during `gt install`, causing most Gas Town operations to fail.

---

## Issue 1: Custom Types Not Registered During Install

### Problem
`gt install ~/gt --git` completes but does not register custom beads types. Subsequent operations fail with:

```
Error: validation failed: invalid issue type: convoy
Error: validation failed: invalid issue type: agent
Error: validation failed: invalid issue type: role
```

### Root Cause
The `ensureCustomTypes()` function in `internal/cmd/install.go` runs:
```go
cmd := exec.Command("bd", "config", "set", "types.custom", "agent,role,rig,convoy,slot")
```

But this appears to fail silently or not execute properly. The install output shows warnings:
```
⚠ Could not create role bead hq-mayor-role: ... invalid issue type: role
⚠ Could not create role bead hq-deacon-role: ... invalid issue type: role
```

### Workaround
Manually register types after installation:
```bash
cd ~/gt
bd config set types.custom "agent,role,rig,convoy,slot"

# Also for each rig:
cd ~/gt/<rig-name>
bd config set types.custom "agent,role,rig,convoy,slot"
```

### Suggested Fix
1. Make `ensureCustomTypes()` error more visible (not just a warning)
2. Verify types are actually registered before proceeding
3. Add a `gt doctor` check for custom types
4. Consider registering types in both HQ and rig `.beads/` directories

---

## Issue 2: Legacy Database Warning on Fresh Install

### Problem
Immediately after `gt install --git`, beads shows:

```
LEGACY DATABASE DETECTED!

This database was created before version 0.17.5 and lacks a repository fingerprint.
To continue using this database, you must explicitly set its repository ID:

  bd migrate --update-repo-id
```

This is confusing because the database was just created - it shouldn't be "legacy".

### Root Cause
The `ensureRepoFingerprint()` function may not be running successfully, or there's a race condition between database creation and fingerprint assignment.

### Workaround
```bash
cd ~/gt
bd migrate --update-repo-id
```

### Suggested Fix
1. Run `bd migrate --update-repo-id` as part of install after `bd init`
2. Or ensure `bd init` creates databases with fingerprints by default

---

## Issue 3: Auto-Import Error with Empty/Malformed JSONL

### Problem
Many operations show:
```
Auto-import failed: error creating depth-0 issues: validation failed for issue 0: title is required
```

### Root Cause
The `.beads/routes.jsonl` or other JSONL files may have empty lines or malformed entries that trigger validation errors during auto-import.

### Impact
Operations still succeed, but the error message is confusing and suggests something is wrong.

### Suggested Fix
1. Make auto-import more tolerant of empty lines
2. Or ensure JSONL files don't have trailing empty entries
3. Suppress this warning if import partially succeeds

---

## Issue 4: Rig Add Doesn't Inherit HQ Custom Types

### Problem
After running `gt rig add`, the rig's `.beads/` directory doesn't have custom types registered, even though HQ does.

```bash
cd ~/gt
bd config set types.custom "agent,role,rig,convoy,slot"  # Works

gt rig add myproject https://github.com/...
cd ~/gt/myproject
bd create --type=agent ...  # Fails: invalid issue type: agent
```

### Workaround
Manually register types in each rig after creation.

### Suggested Fix
`gt rig add` should copy or inherit the `types.custom` config from HQ.

---

## Issue 5: PATH Not Configured

### Problem
After `go install github.com/steveyegge/gastown/cmd/gt@latest`, the `gt` command is not found.

### Root Cause
`~/go/bin` is not in PATH by default on many systems.

### Impact
Users must use full path `~/go/bin/gt` or manually add to PATH.

### Suggested Fix
Add to README:
```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$PATH:$HOME/go/bin"
```

Or provide platform-specific install instructions.

---

## Issue 6: Convoy Tracking Fails Without Agent Beads

### Problem
Creating convoys works after custom types are registered, but operations that need agent beads (like `--notify`) may still fail if agent beads weren't created during install.

### Suggested Fix
Add a `gt repair` or `gt doctor --fix` command that:
1. Verifies custom types are registered
2. Creates missing system beads (mayor, deacon, roles)
3. Fixes database fingerprints

---

## Reproduction Steps

```bash
# Fresh install
go install github.com/steveyegge/gastown/cmd/gt@latest
export PATH="$PATH:$HOME/go/bin"

# Install Gas Town
gt install ~/gt --git
cd ~/gt

# This fails:
gt convoy create "Test" --notify
# Error: invalid issue type: convoy

# Fix:
bd config set types.custom "agent,role,rig,convoy,slot"
bd migrate --update-repo-id

# Now it works:
gt convoy create "Test" --notify
```

---

## Environment Details

```
$ gt version
gt version 0.2.1 (dev)

$ bd --version
bd version 0.46.0 (812f4e52)

$ go version
go version go1.25.5 darwin/arm64

$ git --version
git version 2.50.1

$ uname -a
Darwin [hostname] 25.1.0 Darwin Kernel Version 25.1.0 ... arm64
```

---

## Proposed PR Changes

1. **install.go**: Add verification that custom types were registered
2. **install.go**: Run `bd migrate --update-repo-id` after `bd init`
3. **rig.go**: Inherit `types.custom` config when creating new rigs
4. **doctor.go**: Add checks for custom types and offer to fix
5. **README.md**: Add PATH configuration to install instructions
6. **README.md**: Add troubleshooting section for common issues

---

---

## Issue 7: Mayor Works Directly Instead of Delegating

### Problem
The Mayor is supposed to be a coordinator that delegates work to polecats/crew, but instead it:
1. Marks issues as `@mayor` assignee
2. Closes issues without spawning polecats
3. Doesn't actually create any code/files

The `CLAUDE.md` clearly states:
> **CRITICAL: Mayor Does NOT Edit Code**
> **The Mayor is a coordinator, not an implementer.**

But in practice, the Mayor marked 4 issues as "closed" without:
- Spawning any polecats via `gt sling <issue> <rig>`
- Creating any actual code in the workspace
- Delegating to crew members

### Evidence
```bash
$ bd list --status=all
hh-004 [P2] [task] closed @mayor - Build Card component library
hh-003 [P2] [task] closed @mayor - Create shared types package
hh-002 [P2] [task] closed @mayor - Configure development tooling
hh-001 [P2] [task] closed @mayor - Initialize monorepo with npm workspaces

$ ls ~/gt/heyhey/mayor/rig/packages/
ls: No such file or directory  # Nothing was created!
```

### Expected Behavior
When Mayor receives work, it should:
1. Analyze the convoy/issues
2. Run `gt sling <issue> heyhey` to spawn polecats
3. Monitor progress via `gt convoy status`
4. Coordinate handoffs and escalations

### Possible Causes
1. Mayor's CLAUDE.md instructions aren't being followed
2. No explicit "delegate" instruction in the workflow
3. Mayor misinterpreting "execute" as "mark done" rather than "dispatch"

### Suggested Fix
1. Add explicit delegation instructions to Mayor's prompt
2. Add validation that prevents Mayor from closing issues directly
3. Create a "Mayor workflow" molecule that enforces delegation
4. Add `gt doctor` check for "Mayor closing issues without polecat activity"

---

## Issue 8: Convoy Status Out of Sync with Beads

### Problem
Convoy shows issues as "unassigned" even when beads shows them as closed:

```bash
$ gt convoy status hq-cv-sbh56
  Progress:  0/6 completed
  ○ hh-001: (external) [unassigned]

$ bd list --status=all
  hh-001 [P2] [task] closed @mayor
```

### Expected
Convoy should reflect actual beads status.

### Suggested Fix
Add `gt convoy refresh` or automatic sync between convoy tracking and beads status.

---

## Issue 9: Mayor Doesn't Auto-Wake on Convoy Completion

### Problem
When a convoy completes, the Mayor receives a notification in its mailbox, but doesn't automatically wake up to process it. The Mayor only checks mail when it's actively in a Claude session (via the `UserPromptSubmit` hook that runs `gt mail check --inject`).

This means autonomous multi-phase execution doesn't work - the user must manually nudge the Mayor after each phase completes.

### Expected Behavior
```
Convoy completes → Mayor auto-wakes → Reads mail → Creates next convoy → Dispatches polecats
```

### Actual Behavior
```
Convoy completes → Notification sits in Mayor's inbox → Nothing happens until manual nudge
```

### Evidence
```bash
# Phase 2 completed, Mayor has unread mail
$ gt mail inbox mayor/
📬 Inbox: mayor/ (2 messages, 2 unread)
  ● ROADMAP: Sequential Phase Execution for HeyHey !
  ● New convoy: Dashboard Enhancements !

# But Mayor is idle, not processing the mail
$ gt status
🎩 mayor        ● 📬2   # Has mail but not reading it
```

### Root Cause
The `gt mail check --inject` hook only fires during active Claude sessions (on `UserPromptSubmit`). There's no background daemon or cron-like mechanism to wake the Mayor when new mail arrives or convoys complete.

### Workarounds
1. **Manual nudge**: `gt nudge mayor "Check your mail"`
2. **Keep Mayor attached**: Stay in `gt mayor attach` session
3. **Periodic nudge**: `watch -n 300 'gt nudge mayor "Check convoys"'`
4. **Start Deacon**: The Deacon can monitor and nudge the Mayor

### Suggested Fix
1. Add a `gt mayor daemon` mode that runs a persistent watch loop
2. Or add convoy completion hooks that auto-nudge the Mayor
3. Or have the Deacon automatically nudge Mayor when convoys complete
4. Consider a `gt autopilot` command that keeps the system running autonomously

### Impact
This breaks the "fire and forget" autonomous workflow for multi-phase projects. Users must babysit the Mayor between phases.

---

## Related Files

- `internal/cmd/install.go` - `ensureCustomTypes()` function
- `internal/cmd/rig.go` - rig creation logic
- `internal/beads/` - beads integration layer
- `templates/CLAUDE.md` - Mayor instructions (need enforcement)
- `internal/cmd/mayor.go` - Mayor lifecycle management
