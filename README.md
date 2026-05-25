# ABS Challenge Desk

Prototype app for turning ABS challenge math into simple at-bat-level guidance for batters and catchers.

## Run

```bash
node app/server.mjs
```

Then open:

```text
http://127.0.0.1:3000
```

The app has six tabs:

1. Intro
2. Guide Export
3. Live Recommendation
4. Model Settings
5. Defaults
6. How To Use

In the Live Recommendation tab, `My Team Score` means the team receiving the recommendation. For batter recommendations, that is the batting team. For catcher recommendations, that is the fielding team.

The Guide Export tab generates a dugout lookup book for coaches who do not have live win probability available. It can be labeled for a player or group, scoped to Batter or Catcher, and exported by printing/saving PDF or downloading CSV for Excel review. It is organized by challenges left, inning half, score column, outs, and runners, then returns the same player-facing modes used by the live model. The lookup cells regenerate from the active Model Settings plus the guide-specific batter/catcher success inputs.

The app ships with precomputed Baseball Savant win-expectancy tables for the guide's representative inning/base-out states in `app/data/guide-winexp.json`. That lets the printed guide use exact state math for its buckets without making hundreds of live Savant requests every time the guide is refreshed.

## Model

```text
Expected Value = p * V - (1 - p) * C
```

`p` is expected challenge success probability.

`V` is the win probability swing from overturning the call.

`C` is the win probability opportunity cost of losing a challenge.

For future opportunity supply inside `C`, the v1 pitch-quality default is the Statcast Shadow Zone: a taken ball or strike roughly one baseball's width from the strike-zone edge, with the call going against the team.

The app also includes a side-by-side `depletionV15` challenge-cost model for testing. It can be selected in Model Settings as `Shadow Zone v1.5`; the current public default remains `Conservative v1`.

```text
C = expected future Shadow Zone candidates lost
    x blended future success rate
    x average future win-probability value
    x inventory premium
```

The v1.5 future-success blend weights broad hitter success and catcher-side success by their expected Shadow Zone opportunity supply. A specific batter override affects the current plate appearance, not the entire future lineup.

Run `node scripts/compare_depletion_c.mjs` to compare the current v1 multiplier cost against v1.5.

Run `node scripts/compare_oyster.mjs` to compare v1 and v1.5 break-even thresholds against Oyster's public Challenge Break-Evens table.

## Player Levels

| Level | Instruction |
|---|---|
| No-Brainers | Only challenge unmistakable misses. |
| Full Count | Only challenge on 3-2. |
| Deep Count | Challenge on any two-strike or three-ball count. |
| Aggressive | Challenge any close pitch. |

## Adjustable Inputs

Teams can adjust these in the Model Settings tab:

```text
Batter success probability
Catcher success probability
Challenge cost model
C_base_WP
Inventory factors
Remaining game factors
Current win probability cost curve
Full Count threshold
Deep Count threshold
Aggressive threshold
```

Current public defaults:

```text
Batter success probability: 47%
Catcher success probability: 59%
C_base_WP: 5.5 win probability points
Inventory factor, 2 challenges left: 1.35
Inventory factor, 1 challenge left: 3.00
```

Future team-grade inputs can include:

```text
Internal win expectancy model
Player-specific challenge success
Pitch-location challenge model
Inside/outside vs high/low model
Umpire-specific tendencies
Umpire-specific challenge success rates
Shadow Zone / edge-distance candidate filter
Lineup-aware win expectancy
Extra-innings challenge refresh logic
```

## Caveat

The prototype uses Baseball Savant's count-aware Game Strategy Explorer endpoint as a public win expectancy source. It is good enough for v1 exploration, but a production version should cache state values and allow teams to plug in their own win expectancy model.

## Developer Notes: Custom Win Expectancy

The model is intentionally built around a small client interface: anything that can return a count table for a game state can replace the public Savant source.

The live recommendation path calls `evaluateRecommendation(client, payload)` in `app/model.mjs`. The `client` only needs a `fetchTable(state)` method that returns a `Map` keyed by count strings such as `0-0`, `1-1`, and `3-2`. Each row should expose `ball_count`, `strike_count`, and the score-differential win-probability columns used by `scoreColumn()` such as `bat_wins_minus_1`, `bat_wins_0`, and `bat_wins_1`.

For the guide export, use the same interface through `generateGuideArtifacts(client, config, options, formats)`. The current app uses `PrecomputedGuideClient` plus `app/data/guide-winexp.json` so the guide can price representative states quickly without live network calls. A team model can either replace that JSON with internal precomputed tables or provide a client that resolves those representative states from a private service.

## Deploy

This is a plain Node web service. It reads `PORT` from the host platform and binds to `0.0.0.0` when deployed.

Fastest public deploy path:

1. Push this project to a GitHub repository.
2. Create a new Render Web Service from that repo.
3. Use:

```text
Build Command: npm install
Start Command: npm start
```

The included `render.yaml` can also be used as a Render Blueprint. Render and Railway both require deployed web services to listen on `0.0.0.0:$PORT`.

## Regression Checks

```bash
npm test
```

These checks guard against the stale live success-override bug, accidental inventory-factor backslides, and conservative early-game guide rows changing without intent.
