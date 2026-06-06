## Context

The TopBar component renders three speed buttons (pause/stop, normal, fast) with identical styling. The current `state.speed` value is available via the `state` prop but unused for styling. The BuildMenu component already implements an active-state highlighting pattern using conditional style spreading.

## Goals / Non-Goals

**Goals:**
- Speed buttons visually indicate which speed is currently active
- Follow existing UI patterns from BuildMenu

**Non-Goals:**
- Changing speed button layout or behavior
- Adding new speed levels or controls
- CSS modules or external stylesheets

## Decisions

- Use inline style objects (same pattern as existing codebase)
- Reuse the same active highlight colors from BuildMenu (`rgba(255, 200, 0, 0.3)` background, `#ffc800` border)
- Check `state.speed` against each button's speed value to conditionally apply active style
- No separate `activeSpeedButton` style needed — reuse the same `activeButton` approach (or define inline)

## Risks / Trade-offs

- No risks identified — purely additive visual change with established pattern
