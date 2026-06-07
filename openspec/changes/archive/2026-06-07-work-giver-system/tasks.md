## 1. WorkGiver Class

- [x] 1.1 Create `src/game/colony/workGiver.ts` with `WorkGiver` class, `scan()` method that reads `world.buildQueue.all` and filters unreserved tasks
- [x] 1.2 Add `reserve(buildTask, colonistId): boolean` and `release(buildTask)` methods
- [x] 1.3 Add `getAvailableTask(colonist): BuildTask | null` — returns first unreserved task

## 2. BuildTask — reservedBy field

- [x] 2.1 Add `reservedBy: string | null` to `BuildTask` interface in `src/game/entities/building.ts`, initialize as `null`

## 3. Colonist — Wire Up Release

- [x] 3.1 On arrival via `onArrive` callback — release build task, clear `pendingBuildTaskId`
- [x] 3.2 On cancel mid-transit in `GameWorld` — detect via `pendingBuildTaskId`, release task, clear

## 4. JobSystem — Refactor

- [x] 4.1 Remove `tryAssignJob()` method — split concerns: needs check (self-preservation) stays, build assignment goes to WorkGiver
- [x] 4.2 Remove `isNearestColonist()` — no longer needed
- [x] 4.3 Rewrite `tick()`: first check needs per colonist (hunger/sleep autonomous), then for remaining idle colonists call `workGiver.getAvailableTask()`
- [x] 4.4 Remove `assignBuildJob()` — replaced by WorkGiver

## 5. GameWorld — Wire Up

- [x] 5.1 Add `workGiver: WorkGiver` field to `GameWorld`, instantiate in constructor
- [x] 5.2 In `update()`, call `this.jobSystem.tick(dt, this, this.workGiver)`

## 6. Verify

- [x] 6.1 Run `npx tsc --noEmit` and `npx vitest run` — confirm no errors
- [ ] 6.2 Manual test: place two build tasks, three idle colonists — only two should take tasks, third stays idle
