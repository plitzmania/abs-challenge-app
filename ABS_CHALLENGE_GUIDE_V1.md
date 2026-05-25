# ABS Challenge Strategy Guide v1

## Purpose

This guide converts ABS challenge math into simple pre-plate-appearance instructions for batters and catchers.

The player should not calculate count value, win probability, or challenge inventory cost in the moment. The coach/model layer sets an aggression level. The player then makes one binary decision:

```text
Do I believe this call was wrong enough to challenge?
```

The level controls when the player is allowed to act on that belief.

## Core Model

```text
Expected Value = p * V - (1 - p) * C
```

Challenge when expected value is positive.

Definitions:

```text
p = expected challenge success probability
V = win probability value of a successful overturn
C = win probability cost of losing a challenge
```

For v1:

```text
V = WinExpectancy(overturned_state) - WinExpectancy(ump_call_state)
```

`V` is measured in win probability points, not runs.

## Player Levels

| Level | Batter Instruction | Catcher Instruction |
|---|---|---|
| No-Brainers | Only challenge unmistakable misses. | Only challenge unmistakable misses. |
| Full Count | Only challenge on 3-2. | Only challenge on 3-2. |
| Deep Count | Challenge on any two-strike or three-ball count. | Challenge on any two-strike or three-ball count. |
| Aggressive | Challenge any close pitch. | Challenge any close pitch. |

Player-facing shorthand:

```text
No-Brainers
Full count only
Deep counts
Aggressive
```

## Batter vs Catcher Guidance

Batter guidance should stay simple. Do not overload hitters with count-specific exceptions.

Catcher guidance can carry more detail because count/game-state management is already part of the catching job. If a staff wants a catcher-specific refinement inside Deep Count, prioritize:

```text
Strongest: 3-2, 2-2
Usually strong: 1-2, 3-1
More selective: 0-2, 3-0
```

## Dugout Lookup Book

The exported coach guide should not require live win probability. The v1 app therefore generates a thick lookup book, closer in spirit to a draft-value chart than a single summary grid.

Lookup path:

```text
role -> challenges left -> inning half -> score column -> outs -> runners
```

The score columns are from the team receiving the recommendation:

```text
D4+ = my team down 4 or more
D2-3 = my team down 2-3
D1 = my team down 1
Tie = tied game
U1 = my team up 1
U2-3 = my team up 2-3
U4+ = my team up 4 or more
```

The book covers:

```text
2 roles
2 challenge-inventory states
5 inning bands
2 inning halves
7 score bands
3 out states
8 runner states
```

The output is intentionally substantial. The coach can navigate to the right role/inventory/inning-half page and scan one row, rather than mentally translating score, base-out state, and game clock into a live win probability.

`No PA` appears only in bottom-of-ninth-or-later states where that side would not receive another plate appearance because the game would already be over.

Exact-state app recommendations supersede the book when available.

## Challenge Cost Model

For v1:

```text
C = 5.5 WP points * inventory_factor * remaining_game_factor * current_wp_factor
```

### Inventory Factor

| Challenges Left | Factor |
|---:|---:|
| 2 | 1.35 |
| 1 | 3.00 |

Rationale: losing the last challenge is materially more expensive than losing the first. Future challenge opportunities are right-skewed; the last challenge preserves access to rare monster spots. The first-token factor was raised after a sanity check showed the original value made a first-batter-of-the-game catcher full-count challenge look too permissive.

### Remaining Game Factor

| Game Phase | Factor |
|---|---:|
| Innings 1-3 | 1.25 |
| Innings 4-6 | 1.00 |
| Inning 7 | 0.85 |
| Inning 8 | 0.70 |
| Inning 9+ | 0.50 |

### Current Win Probability Factor

Exactly 50% is the neutral anchor.

| Team Win Probability | Factor |
|---|---:|
| 0-5% | 0.03 |
| 5-10% | 0.08 |
| 10-20% | 0.20 |
| 20-30% | 0.45 |
| 30-40% | 0.75 |
| 40-50% | 0.95 |
| Exactly 50% | 1.00 |
| 50-60% | 0.95 |
| 60-70% | 0.90 |
| 70-80% | 0.75 |
| 80-90% | 0.40 |
| 90-95% | 0.15 |
| 95-100% | 0.05 |

## Success Probability Defaults

Use population defaults unless a team has better player-specific reads.

| Role | Default Challenge Success Probability |
|---|---:|
| Batter | 47% |
| Catcher | 59% |

Override hierarchy:

```text
player-specific model
team-specific batter/catcher rate
population role default
```

Raw historical success rate is not pure skill. Late-game low-probability challenges can drag down observed success rates because teams rationally challenge when unused challenges have little remaining value.

## Level Assignment Thresholds

The model assigns the highest level that clears its threshold.

| Level | Threshold |
|---|---|
| No-Brainers | Fallback if Full Count does not clear. |
| Full Count | Median expected value of full-count opportunities is at least zero. |
| Deep Count | Median expected value of full-count plus deep-count opportunities is at least zero, and at least 55% are positive value. |
| Aggressive | Median expected value of all opportunities is at least zero, and at least 65% are positive value. |

Why median and positive-rate checks are both used:

```text
Median expected value >= 0 means the middle opportunity is at least break-even.
Positive-rate threshold prevents broad levels from clearing on a tiny or fragile majority.
```

## Team-Adjustable Inputs

Teams can plug in their own assumptions without changing the framework.

Adjustable inputs:

```text
Win expectancy model
Challenge success probability by role/player/context
C_base_WP
inventory_factor
remaining_game_factor
current_wp_factor
level assignment thresholds
player-facing level names
```

Higher-fidelity team inputs could include:

```text
lineup position and upcoming hitters
catcher-specific challenge skill
batter-specific challenge skill
pitch location and distance from zone
inside/outside versus high/low challenge type
umpire-specific tendencies
park/run environment
live market-implied win probability
```

## Current Prototype

Decision log:

```text
ABS_CHALLENGE_DECISION_LOG.md
```

Scripts:

```text
scripts/estimate_c_base_wp.mjs
scripts/abs_ev_matrix.mjs
```

Default matrix command:

```bash
node scripts/abs_ev_matrix.mjs --delay-ms=10
```

Example override:

```bash
node scripts/abs_ev_matrix.mjs --p-batter=55 --p-catcher=65 --innings=4,5,6 --wp-min=0.45 --wp-max=0.55
```

## V2 Backlog

Do not include these in the v1 player guide, but keep them in the model backlog:

```text
Dynamic-programming estimate of true challenge-token value
Intra-inning challenge cost nuance
Extra-innings refresh logic
Lineup-aware win expectancy
Inside/outside versus high/low challenge success
Umpire-specific challenge model
Player-specific p model adjusted for opportunity quality
Minimum sample smoothing for published recommendation tables
```
