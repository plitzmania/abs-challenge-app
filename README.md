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

The app has five tabs:

1. Live Recommendation
2. Guide Export
3. Model Settings
4. Method
5. How To Use

In the Live Recommendation tab, `My Team Score` means the team receiving the recommendation. For batter recommendations, that is the batting team. For catcher recommendations, that is the fielding team.

The Guide Export tab generates a dugout lookup book for coaches who do not have live win probability available. It is organized by role, challenges left, inning half, score column, outs, and runners, then returns the same player-facing levels used by the live model. The lookup cells regenerate from the active Model Settings, so team assumptions move the exported guide.

## Model

```text
Expected Value = p * V - (1 - p) * C
```

`p` is expected challenge success probability.

`V` is the win probability swing from overturning the call.

`C` is the win probability opportunity cost of losing a challenge.

## Player Levels

| Level | Instruction |
|---|---|
| Closed | Only challenge unmistakable misses. |
| Full Count | Only challenge on 3-2. |
| Deep Count | Challenge on any two-strike or three-ball count. |
| Open | Challenge any taken pitch the player strongly believes was missed. |

## Adjustable Inputs

Teams can adjust these in the Model Settings tab:

```text
Batter success probability
Catcher success probability
C_base_WP
Inventory factors
Remaining game factors
Current win probability cost curve
Full Count threshold
Deep Count threshold
Open threshold
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
Lineup-aware win expectancy
Extra-innings challenge refresh logic
```

## Caveat

The prototype uses Baseball Savant's count-aware Game Strategy Explorer endpoint as a public win expectancy source. It is good enough for v1 exploration, but a production version should cache state values and allow teams to plug in their own win expectancy model.

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
