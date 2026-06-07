## 1. Core Implementation

- [x] 1.1 Restructure `JobSystem.tick()`: two-phase approach — Phase 1 per-colonist (hunger/sleep), Phase 2 task-first (build nearest idle colonist)
- [x] 1.2 Remove `getAvailableTask()` from `WorkGiver` — dead code after task-first refactor
- [x] 1.3 Remove unused `Colonist` import from `workGiver.ts`

## 2. Verification

- [x] 2.1 Verify task-first assignment: nearest idle colonist always gets the task, regardless of array order
- [x] 2.2 Verify edge cases: zero idle colonists (break), all tasks reserved (skip), colonist already assigned (pendingBuildTaskId check)
- [x] 2.3 Run test suite — all 11 tests pass
