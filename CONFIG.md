# Configuration

All runtime behavior is controlled via:

`src/config/user-config.ts`

---

## Full Configuration Example

```ts
export const CONFIG: UserConfig = {
  inputMint: "...",
  outputMint: "...",
  priceFeedId: "0x...",

  trigger: 0.0,
  critical: 0.0,
  target: 0.0,

  confirmationSeconds: 0,
  cooldownSeconds: 0,
  slippageBps: 0,

  protectionAmountBaseUnits: 0,
  chunkSize: 0.0,
  twapPauseSeconds: 0,

  minBalanceLamports: 0,

  priceSource: "pyth",
  mockScenario: "example-scenario",
};
```

---

## Tokens

### inputMint

Input token (asset to protect).

Common Solana mints:

- USDT → `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- USDC → `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- SOL → `So11111111111111111111111111111111111111112`

---

### outputMint

Target asset (where funds are moved during protection).

Examples:

- SOL → `So11111111111111111111111111111111111111112`
- USDT → `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- USDC → `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

---

## Price Configuration

### priceFeedId

Pyth price feed identifier for the monitored asset.

Source: https://docs.pyth.network/price-feeds/core/price-feeds/price-feed-ids

Notes:

- 32-byte hex string
- not a token mint
- must include `0x` prefix

Examples:

- USDT/USD → `0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b`
- USDC/USD → `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a`
- SOL/USD → `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`

---

### priceSource

Defines price input mode:

- `pyth` → live oracle data
- `mock` → local simulation

---

### mockScenario

Defines predefined price behavior for testing.
Used only when:

```
priceSource = "mock"
```

Available scenarios:

- `quick-confirmed-drawdown`
- `drawdown-cycle`
- `trigger-to-critical-rebound`

---

## Price Reaction Parameters

These parameters define how the system detects and responds to price movements.

---

### trigger

Price level below which a potential drawdown is detected.

```
trigger = ...
```

When price falls below this value, the system **starts tracking a potential event**, but does not act immediately.

To avoid reacting to short-term noise, the condition must be confirmed over time (see `confirmationSeconds`).

---

### confirmationSeconds

Time required to confirm a trigger condition.

```
confirmationSeconds = ...
```

If price remains below `trigger` for this duration, the condition is considered **confirmed**, and the system proceeds to execution.

If price returns above `trigger` before confirmation is complete, the timer is reset.

---

### critical

Price level representing extreme conditions.

```
critical = ...
```

If price falls below this level, the system **bypasses confirmation time** and treats the condition as immediately confirmed.

This allows instant reaction to sharp market dislocations.

---

### target

Recovery threshold.

```
target = ...
```

Defines the level at which the system considers the market stabilized.

Behavior:

- if price rises above `target`, protection stops immediately
- applies both:
  - during execution cycles
  - between cycles

Important:

- price rising above `trigger` but still below `target`  
  → does NOT stop an active protection cycle
- however, it resets trigger confirmation for future cycles

---

### cooldownSeconds

Mandatory pause after each protection cycle.

```
cooldownSeconds = ...
```

After a protection sequence completes, the system enters cooldown mode.

During cooldown:

- no execution is allowed
- only monitoring and state evaluation continues

Important:

- cooldown cannot be interrupted by market conditions
- even if price reaches `critical`, execution will NOT resume until cooldown ends

After cooldown ends:

- system evaluates current state
- next action is taken based on actual conditions at that moment

---

### Parameter Constraints

Parameter relationship must follow:

`critical` < `trigger` < `target`

- This ordering is required for correct system behavior and is not validated automatically.
- Incorrect configuration may lead to broken trigger logic or unintended execution behavior.
- It is the user's responsibility to ensure valid parameter values.

---

## Execution Parameters

### protectionAmountBaseUnits

Amount processed per execution cycle (in base units).
Value depends on token decimals.
Example (6 decimals):

```
1_000_000 → 1 token
```

---

### chunkSize

Defines how execution is split into parts.

```
1.0 → single transaction
0.5 → 2 chunks
0.2 → 5 chunks
```

Used to reduce slippage and market impact.

---

### twapPauseSeconds

Delay between execution chunks (seconds).

Used for time-distributed execution (TWAP-style).

---

### slippageBps

Maximum allowed slippage for swaps (in basis points).

```
slippageBps = ...
```

Example:

```
100 → 1%
```

Defines acceptable deviation between expected and actual execution price.

Used to control execution risk during volatile conditions.

---

## Safety Parameters

### minBalanceLamports

Minimum SOL required to allow execution.

Covers:

- transaction fees
- retries
- multi-transaction execution

Recommended:

```
0.02 – 0.05 SOL
(1 SOL = 1_000_000_000 lamports)
```

---

## Key Concepts

### Token Independence

System components are independent:

- input token
- output token
- price feed

They do not need to match.

---

### Config-Driven Control

All behavior is defined via configuration.

No code changes are required.

---

## Summary

Configuration defines:

- what asset is monitored
- when protection is triggered
- how execution is performed
- how system behaves under load

The configuration acts as the main interface for controlling Shield Lite behavior.
