## 1. Core type change

- [x] 1.1 Add optional `colonistId` to right-click variant in `PlayerAction`

## 2. Game server logic

- [x] 2.1 Update `handleRightClick` to accept optional `colonistId` and move specified colonist if provided, falling back to nearest

## 3. Client integration

- [x] 3.1 Pass `selectedColonistId` from `GameHost` to `handleAction` on right-click

## 4. Tests

- [x] 4.1 Write test: right-click with selected colonistId moves that colonist
- [x] 4.2 Write test: right-click without colonistId falls back to nearest
- [x] 4.3 Run all tests to verify nothing breaks
