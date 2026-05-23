# ABS Challenge Strategy Decision Log

## Goal

Create a practical guide for how aggressive batters and catchers should be with ABS challenges.

The player-facing output should be simple enough to use before or during a plate appearance. The coach/model layer can be more nuanced, but players should not be asked to calculate count value, leverage, or success probability in the moment.

## Core Model

Use expected value:

```text
EV_challenge = p * V - (1 - p) * C
```

Challenge is mathematically justified when:

```text
EV_challenge > 0
```

Equivalent threshold:

```text
p > C / (V + C)
```

## Variable Definitions

`p` = expected challenge success probability

The chance the batter or catcher wins the challenge if they fire.

`V` = value of a successful overturn

The value difference between the corrected call and the umpire's call. The count-only values currently under discussion are expressed in runs, not win probability.

`C` = cost of a failed challenge

The opportunity cost of losing one challenge from inventory. This is the marginal value of preserving a challenge for a future opportunity, not a universal fixed penalty.

## Decisions So Far

### Player-Facing Strategy Should Be Preloaded

Players should not evaluate a nuanced table on a pitch-by-pitch basis. The coach/model layer should assign a simple aggression level before an at-bat or situation.

The player then makes a binary decision:

```text
Do I believe this call is wrong enough to challenge?
```

The assigned level controls when the player is allowed to act on that belief.

### Early Candidate Player Levels

The likely player-facing levels are:

1. Closed: do not challenge unless the miss is unmistakable.
2. Full Count: challenge only on 3-2.
3. Deep Count: challenge on any two-strike or three-ball count.
4. Open: challenge any taken pitch the player strongly believes was missed.

Reason for replacing "End PA" with "Full Count": End PA is too broad for batters because called strike three at 0-2 or 1-2 is much less valuable than a full-count call. Full count is both mathematically cleaner and cognitively simple for players.

Important role nuance: batter guidance should stay ultra-simple. Catchers can potentially handle more count-specific rules because game-state/count management is already part of the catching job.

### Cost of a Failed Challenge

Do not treat `C = 0.20 runs` as a universal truth. Since the actual strategy engine now uses win probability for `V`, `C` must also be expressed in win probability.

Updated definition:

```text
C = marginal WP value of preserving one challenge
```

Formal ideal:

```text
C = TeamWP(state, challenges_left) - TeamWP(state, challenges_left - 1)
```

Practical v1 proxy:

```text
C_WP = C_base_WP * inventory_factor * remaining_game_factor * current_wp_factor
```

`C_base_WP` should be estimated from the empirical distribution of future plausible challenge values, using the same Savant WE state-comparison method:

```text
V_pitch = abs(WE(ball_state) - WE(strike_state))
```

Then define a baseline from likely future challenge opportunities, not necessarily from all pitches. Possible candidates include median/mean V among terminal counts, high-value counts, or the top X% of pitch values.

The old `0.17 runs` anchor remains useful as historical intuition only, not as the live model currency.

Latest adjustment: use `current_wp_factor`, not raw score or blowout buckets. Current win probability already captures inning, score, base state, and outs. A 5-run game with bases empty and two outs is not the same as a 5-run game with bases loaded and no outs, so v1 should bucket opportunity cost by current WP rather than score margin alone.

### V1 C_WP Multipliers

Working formula:

```text
C_WP = 5.5 WP points * inventory_factor * remaining_game_factor * current_wp_factor
```

These are first-pass coaching-model multipliers. They are intended to produce sensible behavior before deeper simulation.

#### inventory_factor

| Challenges Remaining | Multiplier | Rationale |
|---|---:|---|
| 2 | 1.35 | Losing the first challenge early can still burn most of a game's challenge optionality. |
| 1 | 3.00 | Losing the last challenge removes all future optionality and access to rare monster spots. |
| 0 | n/a | No challenge available. |

The first version now treats the last challenge as a little more than 2x as expensive as the first challenge, while making the first token meaningfully more expensive than the original draft.

Rationale: challenge opportunities appear right-skewed. Most pitch calls are modest, but rare full-count or game-swinging calls can be very large. The last challenge preserves access to the best future opportunity; the second challenge mostly preserves access to the second-best future opportunity. That supports making the 1-to-0 cost materially larger than the 2-to-1 cost. This is a v1 heuristic, not a solved dynamic program.

Sanity-check recalibration: the original `2 challenges left = 0.60` setting made a top-1, 0-0 score, 0 outs, bases empty, catcher recommendation clear `Full Count`. That was too loose for the first batter of the game. Raising the two-challenge factor to `1.35` makes that state `Closed` while preserving late-game aggressiveness in higher-value states.

#### remaining_game_factor

| Game Phase | Multiplier | Rationale |
|---|---:|---|
| Innings 1-3 | 1.25 | Many future opportunities remain. |
| Innings 4-6 | 1.00 | Neutral baseline. |
| Inning 7 | 0.85 | Future opportunities are starting to shrink. |
| Inning 8 | 0.70 | Fewer future opportunities remain. |
| Inning 9+ | 0.50 | Preserve less; the game is near decision. |

This is intentionally simple for v1. Intra-inning nuance is saved for v2.

#### current_wp_factor

Use the team's current win probability, not raw score margin. Current WP captures inning, score, base state, and outs.

| Team WP Band | Multiplier | Rationale |
|---|---:|---|
| 0-5% | 0.03 | Game is essentially gone; do not hoard. |
| 5-10% | 0.08 | Very low future challenge value. |
| 10-20% | 0.20 | Need to spend resources to get back into the game. |
| 20-30% | 0.45 | Still behind; future high-value chances may never arrive. |
| 30-40% | 0.75 | Behind but meaningfully alive. |
| 40-50% | 0.95 | Close game; preserve challenge value. |
| Exactly 50% | 1.00 | Neutral anchor for `C_base_WP`. |
| 50-60% | 0.95 | Close game; preserve challenge value. |
| 60-70% | 0.90 | Favorable but still losable; preserve meaningfully. |
| 70-80% | 0.75 | Protecting a lead still matters, but game is less balanced. |
| 80-90% | 0.40 | Strong favorite; future challenge value drops. |
| 90-95% | 0.15 | Very low future challenge value. |
| 95-100% | 0.05 | Game is essentially secured. |

Current WP should come from the same `StateValue` source as `V` where possible.

This table is intentionally asymmetric. The working intuition is that preserving a challenge matters somewhat more when protecting a competitive/favorable position than when trying to climb back from a poor position. If a team is behind, the future high-value spot may never arrive, so `C` should fall faster on the low-WP side.

For pitch-level EV, calculate `current_wp_factor` from the team's win probability in the failed-challenge world:

```text
team_wp_after_failed_challenge = TeamWP(ump_call_state)
```

Reasoning: `C` is paid only if the challenge fails, and if the challenge fails the umpire's call stands. For pre-PA coaching levels, using the current pre-PA or pre-pitch game state is an acceptable approximation.

### C_base_WP Prototype Sampling

Added a prototype sampler:

```text
scripts/estimate_c_base_wp.mjs
```

The script queries Savant's count-aware WE endpoint across a representative grid and computes:

```text
V_pitch = abs(WE(ball_state) - WE(strike_state))
```

Smoke test:

```text
node scripts/estimate_c_base_wp.mjs --innings=9 --bases=0 --diffs=0 --delay-ms=0
```

Top/bottom 9, tie game, bases empty:

```text
All pitch states median: 2.85 WP points
Terminal-family median: 4.20 WP points
Non-terminal median: 1.75 WP points
Full-count median: 10.20 WP points
```

Broader default grid:

```text
node scripts/estimate_c_base_wp.mjs --delay-ms=10
```

Sample:

```text
Requests: 171
Pitch-state samples: 8,208
All pitch states median: 2.50 WP points
Terminal-family median: 4.00 WP points
Non-terminal median: 1.60 WP points
All pitch states p75: 4.90 WP points
All pitch states p90: 8.90 WP points
```

By count, broader grid:

| Count | Median V_WP | p75 | p90 |
|---|---:|---:|---:|
| 0-0 | 1.00 pp | 1.90 pp | 2.70 pp |
| 0-1 | 1.50 pp | 2.50 pp | 3.90 pp |
| 0-2 | 3.10 pp | 5.20 pp | 8.00 pp |
| 1-0 | 1.30 pp | 2.60 pp | 4.00 pp |
| 1-1 | 1.70 pp | 3.00 pp | 4.40 pp |
| 1-2 | 3.70 pp | 6.30 pp | 9.77 pp |
| 2-0 | 1.85 pp | 3.80 pp | 5.90 pp |
| 2-1 | 2.20 pp | 4.03 pp | 6.07 pp |
| 2-2 | 5.00 pp | 8.60 pp | 12.84 pp |
| 3-0 | 2.25 pp | 4.53 pp | 7.10 pp |
| 3-1 | 3.15 pp | 6.43 pp | 10.07 pp |
| 3-2 | 8.50 pp | 14.80 pp | 22.14 pp |

Early v1 interpretation:

```text
C_base_WP candidate range: roughly 4-5 WP points
```

Rationale: all-pitch median is too broad because future challenge opportunities are not average pitches. Terminal-family median and all-pitch p75 better approximate a plausible future challenge-worthy spot.

Caution: `V_pitch` is a gross future opportunity value, not the exact marginal value of a challenge token. True `C` should be discounted by the probability of seeing a future challengeable miss and by future success probability. Inventory/time/score factors are the v1 proxy for that discounting.

### C_base_WP Recalibration Under 50/50 Anchor

Decision: redefine `C_base_WP` as the neutral 50/50, middle-game anchor before inventory/time/current-WP multipliers.

Recalibration command:

```text
node scripts/estimate_c_base_wp.mjs --innings=4,5,6 --bases=0,1,2,3,4,5,6,7 --diffs=-5,-4,-3,-2,-1,0,1,2,3,4,5 --wp-min=0.45 --wp-max=0.55 --delay-ms=10
```

45-55% pre-pitch WP sample:

```text
Requests: 145
Pitch-state samples: 1,271
All pitch states median: 3.00 WP points
Terminal-family median: 5.30 WP points
Non-terminal median: 2.00 WP points
All pitch states p75: 5.70 WP points
All pitch states p90: 8.90 WP points
```

Tighter sanity checks:

```text
48-52% pre-pitch WP:
Pitch-state samples: 540
Terminal-family median: 5.80 WP points
All pitch states p75: 5.90 WP points

49-51% pre-pitch WP:
Pitch-state samples: 260
Terminal-family median: 6.15 WP points
All pitch states p75: 6.13 WP points
```

V1 anchor:

```text
C_base_WP = 5.5 WP points
```

Rationale: 5.5 pp sits between the wider 45-55% sample and the tighter 48-52% / 49-51% sanity checks. It avoids overfitting the smallest sample while preserving the new definition that a 50/50 middle-game state has `current_wp_factor = 1.00`.

Why use terminal-family median / all-pitch p75 as the anchor reference:

```text
C_base_WP should represent the value of preserving a challenge for a plausible future challenge-worthy opportunity, not the value of a random pitch.
```

The median of all pitch states is too low because most pitches are not realistic challenge candidates. The terminal-family median is a better proxy because many actual challenge decisions cluster around PA-ending or near-PA-ending stakes. The 75th percentile of all pitch states is used as a cross-check because it captures the upper tail of pitch values without only looking at terminal counts.

In the 50/50 recalibration, these two references lined up closely:

```text
45-55% sample: terminal-family median 5.30 pp, all-pitch p75 5.70 pp
48-52% sample: terminal-family median 5.80 pp, all-pitch p75 5.90 pp
49-51% sample: terminal-family median 6.15 pp, all-pitch p75 6.13 pp
```

This is why `C_base_WP = 5.5 pp` is more defensible than using the all-pitch median.

### C v2 Note: Intra-Inning Nuance

There may be intra-inning nuance in the opportunity cost of using a challenge. Analogy: teams are less aggressive sending runners home with no outs because they expect more chances to score later in the inning. Similarly, preserving a challenge may be more valuable earlier in an inning because more immediate plate appearances remain before the inning ends.

Do not include this in v1. Save for a v2 challenge-inventory model.

## Count-Only V Values

These are context-neutral run values, not win probability values.

They represent the value gap between the pitch being a ball versus a strike at the count before the pitch.

| Count Before Pitch | V of Ball vs Strike (Runs) |
|---|---:|
| 0-0 | 0.071 |
| 0-1 | 0.074 |
| 0-2 | 0.171 |
| 1-0 | 0.110 |
| 1-1 | 0.099 |
| 1-2 | 0.210 |
| 2-0 | 0.207 |
| 2-1 | 0.151 |
| 2-2 | 0.295 |
| 3-0 | 0.168 |
| 3-1 | 0.234 |
| 3-2 | 0.528 |

For batters, this value applies when a called strike is overturned into a ball.

For catchers, this value applies when a called ball is overturned into a strike.

## Current Focus: V

Question under discussion:

```text
Should V remain in run value with leverage multipliers, or should it be converted directly into win probability?
```

Decision: `V` should be defined in win probability for the actual strategy engine.

Rationale: ABS challenge strategy is an in-game decision problem. The goal is to maximize the probability of winning this game, not to maximize expected runs over a season. Inning and score are too important to treat as optional or as coarse leverage multipliers.

Current understanding before further review:

```text
V_count = run value
```

Rejected or likely insufficient first-pass game-state adjustment:

```text
V = V_count * leverage_multiplier
```

Reasoning: a simple leverage multiplier is probably too blunt. It will miss situations where the specific base/out/score/inning context makes an incremental base, walk, or strikeout much more valuable than the count table implies.

Primary version:

```text
V = WE(overturned state) - WE(ump-call state)
```

The win expectancy version would require inning, score, outs, base state, home/away, and count-state handling.

Possible intermediate version:

```text
V = state value(overturned count/outcome) - state value(ump-called count/outcome)
```

Where state value could be expected runs or win probability using the full base/out/count/game state. Expected runs captures base/out context; win probability captures base/out plus inning, score, and home/away.

### Design Direction For V

Use an extensible `StateValue` interface rather than hard-coding one valuation system.

Preferred conceptual formula:

```text
V = StateValue(overturned_state) - StateValue(ump_call_state)
```

`StateValue` should primarily be implemented with:

1. Team win expectancy model.
2. Public win expectancy model.
3. Market-implied live win probability, where available.
4. Run expectancy / base-out-count model only as a demo, sanity check, or fallback.

This keeps the guide pitchable to teams because the strategy layer does not require them to accept an external win expectancy model. They can plug in their own.

Expected bases may be useful as an explanatory intermediate representation because plate appearances ultimately affect base/out states, which then influence run expectancy and win expectancy. However, expected bases alone does not capture inning, score, home/away, or exact run-state urgency. The actual decision engine should therefore use win probability as its primary currency.

Potential prototype fallback, if count-aware WE is unavailable:

```text
Terminal pitch outcomes: value directly with base/out/score/inning win expectancy.
Non-terminal count changes: approximate temporarily with count run value translated into WP, but mark this as inferior to count-aware win expectancy.
```

## Open Questions

1. Should the first guide use run value plus leverage multipliers, or go directly to win probability?
2. Does the math reveal a necessary fourth level, such as Deep Count, or can the player-facing guide stay at three levels?
3. How should expected challenge success probability `p` be estimated for batters versus catchers?
4. Should batter and catcher guidance use the same level names but different permitted call types?
5. Should the guide treat losing the first challenge and losing the last challenge with more sharply different `C` multipliers?

## p: Expected Challenge Success Probability

V1 should use population defaults with a manual override.

Default values from Baseball Savant ABS Dashboard, regular season 2026 as of May 21, 2026:

```text
Batter p_default = 47%
Catcher p_default = 59%
```

Savant dashboard source:

```text
https://baseballsavant.mlb.com/abs
```

Displayed dashboard values:

```text
Overall: 53% overturns, 1,629 overturned / 1,426 confirmed / 3,055 attempts
Batters: 47% overturns, 668 overturned / 751 confirmed / 1,419 attempts
Fielders: 59% overturns, 961 overturned / 675 confirmed / 1,636 attempts
```

For v1, use the fielding-team rate as the catcher default because pitchers are being excluded from the guide and public MLB/Savant writing says fielding challenges are overwhelmingly catcher-initiated.

The model should also allow overrides:

```text
p = team_override_player_success_rate if available
else population_default_by_role
```

Potential override levels:

```text
Role default: batter or catcher population rate
Team default: team's batter/catcher ABS success rate
Player default: individual batter/catcher ABS success rate
Contextual model: team proprietary p model using pitch location, catcher receive, player history, count, and game state
```

Important caution: raw overturn rate is not a perfect skill measure because it ignores opportunity quality. MLB/Savant notes that overturn rate lacks context, while expected challenge metrics include pitch location, remaining challenges, runners, and ball/strike/out situation. For v1, raw population p is acceptable; for team-grade versions, `p` should be modeled or adjusted for opportunity quality.

Additional caveat: historical overturn rates are strategically selected. Teams may challenge clearly low-probability calls late in the 9th because there is little or no reason to preserve unused challenges. The EV model would often recommend that behavior because `C` collapses late, but it means raw historical success rates can be biased downward by rational desperation/free-roll challenges.

V1 implication:

```text
Use population p defaults, but treat them as conservative/behavioral rates rather than pure perception-skill estimates.
```

Potential v2+ p-model features:

```text
Pitch edge direction: inside/outside vs high/low
```

Hypothesis: inside/outside challenges may be more reliable than high/low challenges because vertical zone boundaries depend on player height/stance measurement and may be harder for players to perceive consistently.

```text
Umpire-specific tendencies
```

Hypothesis: umpire error profile and/or player trust in particular umpires may affect challenge probability and success. A richer model could include umpire-specific miss tendencies, zone shape, and challenge response patterns.

## Team-Adjustable Inputs

This should become a central README section. The framework should be pitchable as a decision engine with sensible public defaults and team-specific override hooks.

### StateValue / Win Expectancy

Default:

```text
Public Savant count-aware WE endpoint, where available
```

Team override:

```text
Internal win expectancy model
Market-implied live win probability model
Lineup-aware WE model
Park/run-environment-adjusted WE model
```

### p: Challenge Success Probability

Default:

```text
Batter p_default = 47%
Catcher p_default = 59%
```

Team overrides:

```text
Team-level batter/catcher success rates
Individual player/catcher success rates
Context-adjusted p model
Pitch-location/distance-to-zone model
Inside/outside vs high/low challenge model
Umpire-specific model
Late-game/free-roll adjustment
```

### C_base_WP

Default:

```text
C_base_WP = 5.5 WP points
```

Team overrides:

```text
Estimated marginal value of a challenge token from team simulations
Distribution of future challenge-worthy opportunities
Team appetite for preserving rare high-value challenge spots
```

### inventory_factor

Default:

```text
2 challenges left = 1.35
1 challenge left = 3.00
```

Team overrides:

```text
More aggressive inventory spending
More conservative last-challenge protection
Dynamic-programming estimate of first-token vs last-token value
```

### remaining_game_factor

Default:

```text
Innings 1-3 = 1.25
Innings 4-6 = 1.00
Inning 7 = 0.85
Inning 8 = 0.70
Inning 9+ = 0.50
```

Team overrides:

```text
Intra-inning model
Expected remaining PA model
Extra-innings challenge refresh logic
Bullpen/offense-specific future leverage model
```

### current_wp_factor

Default:

```text
50% WP anchored at 1.00 with asymmetric discounts away from 50%
```

Team overrides:

```text
Symmetric or asymmetric WP curve
More aggressive comeback posture
More conservative lead-protection posture
Leverage-index-informed curve
```

### Player-Facing Level Mapping

Default candidates:

```text
Closed
Full Count
Deep Count
Open
```

Team overrides:

```text
Number of levels
Level names/language
Thresholds for mapping EV-positive spots into levels
Batter-specific vs catcher-specific level rules
```

## EV Matrix Runner

Added:

```text
scripts/abs_ev_matrix.mjs
```

Purpose:

```text
Run the full v1 EV model across representative game states, counts, roles, and challenge inventory levels.
```

Formula:

```text
V = WE(ball_state) - WE(strike_state)
C = 5.5 pp * inventory_factor * remaining_game_factor * current_wp_factor
EV = p * V - (1 - p) * C
required_p = C / (V + C)
```

Default assumptions:

```text
p_batter = 47%
p_catcher = 59%
C_base_WP = 5.5 pp
inventories = 1,2
roles = batter,catcher
```

Default command:

```text
node scripts/abs_ev_matrix.mjs --delay-ms=10
```

Useful overrides:

```text
--p-batter=55
--p-catcher=65
--c-base-pp=5.5
--innings=4,5,6
--bases=0,1,2,3,4,5,6,7
--diffs=-2,-1,0,1,2
--wp-min=0.45
--wp-max=0.55
--roles=batter,catcher
--inventories=1,2
--json
```

Count categories in the runner:

```text
full_count: 3-2
deep_count: any two-strike or three-ball count that is not 3-2
open_only: non-terminal-family counts
```

Examples:

```text
Batter full_count: 3-2 called strike
Catcher full_count: 3-2 called ball
Batter deep_count: 0-2, 1-2, 2-2, 3-0, 3-1 called strike
Catcher deep_count: 0-2, 1-2, 2-2, 3-0, 3-1 called ball
```

Initial default matrix results:

```text
Requests: 171
Rows: 32,788
```

Selected count-level patterns:

```text
Batter, 1 challenge:
0-0 +EV only 14.5% of sampled states
2-2 +EV 49.6%
3-2 +EV 68.1%

Batter, 2 challenges:
2-1 +EV 53.2%
3-1 +EV 63.8%
3-2 +EV 94.4%

Catcher, 1 challenge:
0-2 +EV 53.7%
1-2 +EV 60.1%
2-2 +EV 71.8%
3-2 +EV 88.6%

Catcher, 2 challenges:
0-0 +EV 50.8%
1-1 +EV 66.5%
2-2 +EV 94.4%
3-2 +EV 98.7%
```

Early interpretation: the math may support a real distinction between batter and catcher default guidance. Catchers become EV-positive much earlier because their population `p` is materially higher. Replace "End PA" with "Full Count" as the narrowest actionable level. Full count captures the consistently high-value calls without leaking weaker 0-2/1-2 batter strike-three challenges into the same instruction bucket.

### Level Recommendation Thresholds

Working levels:

```text
Closed
Full Count
Deep Count
Open
```

Thresholds:

```text
Full Count clears if median expected value of full-count opportunities is at least zero.

Deep Count clears if:
  median expected value of full-count + deep-count opportunities is at least zero
  and at least 55% of those opportunities are positive value.

Open clears if:
  median expected value of all opportunities is at least zero
  and at least 65% of all opportunities are positive value.

Closed is the fallback if Full Count does not clear.
```

Reasoning: broader permission levels need more evidence. Full Count is narrow, so break-even median EV is sufficient. Deep Count and Open allow many more challenges, so they require both non-negative median EV and a positive-rate cushion.

### Recommendation Table Implementation

`scripts/abs_ev_matrix.mjs` now prints recommended levels by:

```text
role
challenge inventory
game phase
current team win probability band
```

Current team win probability for grouping is based on pre-pitch team WP. The cost calculation still uses the failed-challenge state because `C` is only paid if the challenge fails.

Output columns:

```text
role
inventory
phase
team_wp_band
sample size
recommendation
full-count median EV
deep-count positive rate
deep-count median EV
open positive rate
open median EV
```

Important implementation note: raw recommendation rows can be noisy in sparse win-probability bands, especially exact 50% rows or unusual state combinations. Final coach-facing tables should apply smoothing, minimum sample thresholds, and/or coarser WP bands before being treated as guidance.

## Next Step

Define the `V` calculation as a state-comparison interface.

For each possible challenge, explicitly construct two post-pitch states:

```text
ump_call_state
overturned_state
```

Then calculate:

```text
V = StateValue(overturned_state) - StateValue(ump_call_state)
```

The next modeling task is to specify:

1. What fields are required in a baseball state.
2. How count-changing non-terminal pitches are represented.
3. How terminal outcomes like walk and strikeout update base/out/score state.
4. What placeholder `StateValue` implementation to use in a prototype.
5. How to map the resulting EV outputs back to player-facing aggression levels.

## Public Count-Aware WE Source Check

Search finding: a public count-aware win probability source exists.

### Baseball Savant Game Strategy Explorer

Baseball Savant launched a Game Strategy Explorer on 2026-04-17. It allows users to find win probability or run expectancy for MLB game situations using the previous 10 seasons of data.

Important for this project: Savant says the win probability tool uses score, inning, outs, and runners, and that the lower table additionally adds ball/strike count context. This is very close to the `StateValue(inning, top/bottom, score, outs, runners, count)` function needed for `V`.

Source:

```text
https://baseballsavant.mlb.com/game-strategy-explorer
https://baseballsavant.mlb.com/changelog/2026-04-17-game-strategy-explorer
```

Open question: whether Savant exposes a stable API/data file for this table, or whether it is only available through the web UI.

### Greg Stoll / Open Source Retrosheet Model

Greg Stoll's Baseball Stats project is an open-source win expectancy calculator based on Retrosheet data. The repository includes count-aware files such as:

```text
probswithballsstrikes.txt
statswithballsstrikes
```

This may be useful as a public/open implementation reference, though it may not be current to the 2026 MLB run environment and rule set without updating the data.

Source:

```text
https://gregstoll.com/~gregstoll/baseball/stats.html
https://github.com/gregstoll/baseballstats
```

### NBER / Academic Reference

An NBER paper on umpire attention computes exactly the type of pitch-level leverage this project needs: the probability a team wins if the pitch is called a ball versus if it is called a strike, conditional on the game situation.

The paper defines a state space including balls, strikes, outs, baserunner positions, inning half, and score differential. It notes 108,864 possible states for score differences from -10 to +10 and uses simulated MLB games to avoid noisy sparse empirical estimates.

Source:

```text
https://www.nber.org/system/files/working_papers/w28922/w28922.pdf
```

Conclusion: do not invent from scratch before checking whether Savant's count-aware WE table can be accessed programmatically. If it cannot, Greg Stoll's open-source approach and the NBER simulation structure are strong references for building a public prototype.

### Savant Endpoint Inspection

Result: Savant's Game Strategy Explorer does call a JSON endpoint that can be queried directly.

Browser bundle:

```text
https://builds.mlbstatic.com/baseballsavant.mlb.com/v1/sections/apps/builds/da10d50bfece5d0f41457658e580ba52d566fef0/scripts/build/game-strategy-explorer.js
```

The bundle calls:

```text
GET https://baseballsavant.mlb.com/game-strategy-explorer
Accept: application/json
```

With query parameters:

```text
type=winexp
params=<JSON-serialized state>
```

For count-aware win probability, include:

```json
{
  "inning": 9,
  "half": "Top",
  "outs": 0,
  "balls": 0,
  "strikes": 0,
  "situation": null,
  "run_diff": 0,
  "runners": {
    "1b": false,
    "2b": false,
    "3b": false
  },
  "perspective": "bat",
  "is_by_count": true
}
```

Response shape:

```text
Array of rows, one per count for the selected inning/half/base/out state.
Each row includes ball_count, strike_count, bases_cd, outs, and batting-team win probability columns:
bat_wins_minus_5 ... bat_wins_0 ... bat_wins_5
```

Score convention:

```text
bat_wins_1 = batting team is up 1
bat_wins_minus_1 = batting team is down 1
```

Verified example:

```text
Top 9, tie game, bases empty, 0 outs
1-2 count: batting team WP = 48.3%
2-1 count: batting team WP = 50.8%
```

Therefore, a batter challenge on a 1-1 called strike in that state has:

```text
V = 50.8% - 48.3% = +2.5 percentage points of WP
```

This is exactly the kind of `V` input the ABS challenge EV model needs.

Important caveat: this appears to be an internal/undocumented endpoint used by the public page. It is suitable for prototyping and source validation, but a production tool should either cache the table, use a licensed/stable data path, or let teams plug in their own WE model.

## State Schema Notes

Current required fields for `StateValue`:

```text
inning
top_or_bottom
score_differential
outs
runners
count
```

Current optional or likely excluded fields:

```text
batter_handedness: optional, probably not needed for v1
pitcher_handedness: optional, probably not needed for v1
run_environment: likely excluded for v1 except potentially extreme parks/environments
```

Challenge side and umpire call probably do not belong inside `StateValue` itself. They matter for constructing the two post-pitch states, but the value function only needs to evaluate the resulting baseball state.

```text
challenge_side: used to construct states, not to value them
umpire_call: used to construct states, not to value them
```

### Lineup Context

Lineup spot and upcoming batters may matter. Example: the No. 9 hitter leading off an inning may have a higher value of reaching base because it turns the lineup over to the top. This is not captured by a generic base/out/count state unless the `StateValue` model includes batting-order context or hitter quality.

Potential fields for richer versions:

```text
lineup_spot
current_batter_quality
next_batters_quality
times_through_order / due-up context
```

Open question: whether lineup context is important enough for the player-level guide, or whether it belongs only in a team-specific `StateValue` plugin.

## State Transition Spec For V

For each challenged pitch, construct two post-pitch states:

```text
ump_call_state
overturned_state
```

Both states are constructed from the same pre-pitch `current_state`. Do not mutate the ump-called state into the overturned state. A challenge swaps the pitch result from ball to strike or strike to ball; it does not add a result on top of the umpire's result.

The value of the challenge is:

```text
V = StateValue(overturned_state) - StateValue(ump_call_state)
```

### Batter Challenge

A batter challenges only an umpire-called strike.

```text
ump_call_state = apply_strike(current_state)
overturned_state = apply_ball(current_state)
```

### Catcher Challenge

A catcher challenges only an umpire-called ball.

```text
ump_call_state = apply_ball(current_state)
overturned_state = apply_strike(current_state)
```

### apply_strike

If the current count has fewer than two strikes:

```text
strikes += 1
base/out/score state unchanged
```

If the current count has two strikes:

```text
strikeout
outs += 1
bases unchanged
score unchanged
if outs become 3, advance to next half-inning
```

### apply_ball

If the current count has fewer than three balls:

```text
balls += 1
base/out/score state unchanged
```

If the current count has three balls:

```text
walk
force runners as required
score any forced-in runners
outs unchanged
count resets for next batter
```

### Notes

This transition spec intentionally ignores pitch-level events other than called ball/strike challenges. It assumes no stolen base, passed ball, wild pitch, pickoff, or other simultaneous change on the challenged pitch.

The state transition layer is separate from the value layer. Teams can keep the transition rules constant while swapping in their preferred `StateValue` model.

## Guide Export Lookup Book

Decision: the coach-facing export should not require a coach to know live win probability in real time.

Instead of a small baseline table plus win-probability adjustments, the app generates a dugout lookup book. The coach looks up:

```text
role
challenges left
inning band
top/bottom half
score band from our team's perspective
outs
runners
```

The returned value is still one of the player-facing levels:

```text
Closed
Full Count
Deep Count
Open
```

Rationale: this preserves the simple player instruction while giving the staff a thick, navigable chart for live dugout decisions. It also avoids asking coaches to infer win probability from score/base-out state under time pressure.

`No PA` is allowed in the guide for bottom-of-ninth-or-later states that cannot exist for the relevant side because the game would already be over.

Open issue: the lookup book is a v1 coaching approximation of exact-state logic. Exact-state app recommendations should supersede the book when available, and teams should eventually be able to regenerate the book from their own win expectancy model.

Update: the guide export now regenerates lookup-book cells from the active model settings. The default chart remains the smoothed v1 coaching guide, but each cell can move up or down when the user changes success rates, base challenge cost, inventory factors, remaining-game factors, current-WP cost curve, or level thresholds.

Implementation note: the guide uses a conservative smoothing layer rather than calling the live Savant model for every printed cell. Settings are converted into an aggressiveness pressure ratio:

```text
success odds ratio / challenge cost ratio
```

Large positive changes can upgrade a cell by one or two levels; large conservative changes can downgrade by one or two levels. This keeps the book stable enough for coaching use while making the exported guide reflect the assumptions selected in Model Settings.
