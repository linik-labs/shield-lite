# Architecture

Shield Lite is a modular automation engine for Solana.

It monitors price conditions, evaluates protection logic, and executes swaps when configured conditions are met.

---

## High-Level Flow

```text
config → price source → trigger logic → execution decision → swap
```

---

## Project Structure

```text
src/
├── config/
│   ├── types.ts
│   └── user-config.ts
│
├── price-feeds/
│   └── registry.ts
│   └── price_feeds.json
│
├── price-sources/
│   ├── index.ts
│   ├── mock.ts
│   ├── pyth.ts
│   └── scenarios/
│       ├── drawdownCycle.ts
│       ├── index.ts
│       ├── quickConfirmedDrawdown.ts
│       ├── triggerToCriticalRebound.ts
│       └── types.ts
│
├── protection/
│   ├── trigger.ts
│   ├── executor.ts
│   └── swap.ts
│
├── token-info/
│   ├── jupiter.ts
│   ├── metadata.ts
│   └── resolver.ts
│
├── env.ts
├── index.ts
├── jupiter.ts
├── logger.ts
├── resource-monitor.ts
└── solana.ts
```

---

## Core Modules

### 1. Config Module

```
src/config/
```

Defines user-controlled behavior.

Files:

- `user-config.ts` — main runtime configuration
- `types.ts` — TypeScript types for config structure

Responsible for:

- selected tokens
- price feed
- thresholds
- confirmation time
- cooldown
- execution parameters
- price source mode

---

### 2. Price Feed Registry

```text
src/price-feeds/
```

Resolves and validates `priceFeedId` using a local Pyth crypto price feed registry snapshot.

Files:

- `src/price-feeds/registry.ts`
- `src/price-feeds/price_feeds.json`

Responsible for:

- validating `priceFeedId` format
- checking that the configured feed exists in the local registry
- resolving a human-readable symbol, for example `USDT/USD`
- displaying the monitored pair at startup

Startup behavior:

- invalid `priceFeedId` format → system stops
- unknown `priceFeedId` in local snapshot → system stops
- valid `priceFeedId` → symbol is resolved from the local snapshot and logged

Purpose:

- ensure the correct asset is monitored
- prevent misconfiguration
- provide clear visibility in logs

Important:

```
token mint ≠ priceFeedId
```

The observed price feed is independent from the input and output swap tokens.

The system may monitor one asset pair while executing swaps between different tokens, depending on user configuration.

#### Registry snapshot update

The local `price_feeds.json` file must be updated manually when needed.

Source: <https://hermes.pyth.network/v2/price_feeds?asset_type=crypto>

The downloaded JSON should replace:

```
src/price-feeds/price_feeds.json
```

---

### 3. Price Sources

```
src/price-sources/
```

Provides market price input.

Files:

- `pyth.ts` — live price data from Pyth
- `mock.ts` — local simulated price data
- `index.ts` — selects active price source
- `scenarios/` — predefined mock market behavior

Responsible for:

- fetching current price
- supporting live and simulated modes
- decoupling price input from execution logic

---

### 4. Mock Scenarios

```
src/price-sources/scenarios/
```

Contains predefined price movement simulations.

Scenarios:

- `quickConfirmedDrawdown.ts`
- `drawdownCycle.ts`
- `triggerToCriticalRebound.ts`

Responsible for:

- testing trigger logic
- testing confirmation timing
- testing cooldown behavior
- testing recovery conditions
- testing critical-level reactions without real market dependency

---

#### Usage Notes

Calibrated for stablecoin behavior:

```
trigger = 0.99 | critical = 0.98 | target = 0.995 | confirmationSeconds = 240 | cooldownSeconds = 180
```

For non-stable assets:

- adjust config parameters
- adapt scenario values to match volatility

Testing:

- quick → modify existing scenarios
- advanced → define new scenarios

When adding a new scenario, the following files must be updated:

- `src/config/types.ts`
- `src/price-sources/scenarios/index.ts`

---

#### Purpose

Mock scenarios provide a controlled environment to:

- validate system behavior
- test edge cases
- simulate market conditions without risk

---

### 5. Protection Module

```
src/protection/
```

Main logic layer of the system.

Files:

- `trigger.ts`
- `executor.ts`
- `swap.ts`

---

#### trigger.ts

Evaluates market state.

Responsible for:

- comparing current price against `trigger`, `critical`, and `target`
- tracking confirmation time
- resetting trigger timer when needed
- classifying current protection status

Important:

- `warning` is returned when price is below `target` but still above `trigger`
- `trigger` starts a confirmation timer
- `drawdown` is returned only after `confirmationSeconds`
- `critical` is returned immediately when price falls below `critical`

---

#### executor.ts

Coordinates the protection cycle.

Orchestrates the full decision pipeline.

Responsible for:

- running the main monitoring loop
- retrieving current price from the active price source
- evaluating trigger state
- checking resource availability (via Resource Monitor)
- starting execution when conditions are met
- splitting execution into chunks
- controlling execution flow across chunks
- applying TWAP-style pauses between chunks
- enforcing cooldown
- continuing monitoring after execution

---

#### swap.ts

Handles low-level swap execution.

Responsible for:

- calculating execution chunks
- executing a single swap transaction (per chunk)
- requesting quotes and building transactions via Jupiter
- confirming transactions
- retrying failed chunks when protection is still justified
- stopping retry if market recovery reaches `target`
- aborting execution for non-tradable tokens

---

### 6. Jupiter Module

```
src/jupiter.ts
```

Low-level Jupiter integration.

Responsible for:

- requesting swap quotes
- building swap transactions
- sending swap transactions
- applying configured slippage

---

### 7. Token Info Module

```
src/token-info/
```

Resolves token decimals and human-readable labels.

Files:

- `resolver.ts`
- `jupiter.ts`
- `metadata.ts`

Responsible for:

- resolving token decimals
- resolving token labels (symbol or name)
- validating token mint

Key behavior:

- label resolution: metadata → Jupiter → `UNKNOWN_TOKEN`
- decimals: SPL Token → Token-2022 (fallback)
- SOL handled as a special case (decimals = 9)

Purpose:

- ensure correct amount calculations
- improve log readability

---

### 8. Solana Module

```
src/solana.ts
```

Provides Solana connection, wallet loading, and balance utilities.

Responsible for:

- reading `SOLANA_RPC_URL`
- reading `SOLANA_KEYPAIR_PATH`
- creating a confirmed Solana RPC connection
- loading wallet keypair from a local JSON file
- checking token balance by mint
- handling SOL and SPL token balances differently

Important:

When inputMint is SOL, the module does not treat the entire SOL balance as executable.

A reserve defined by `CONFIG.minBalanceLamports` is kept untouched so the wallet can still pay transaction fees.

For SPL tokens, balance is read from the token account by mint.

---

### 9. Environment Module

```
src/env.ts
```

Provides helper functions for reading environment flags.

Currently used to read `ENABLE_REAL_SWAP`.

Responsible for:

- parsing boolean environment values
- applying default values when variables are not set

Usage:

- `index.ts` displays the active mode at startup
- `executor.ts` controls whether real swaps are executed or dry-run mode is used

---

### 10. Logger

```
src/logger.ts
```

Provides timestamped runtime logs for console and file output.

Responsible for:

- formatting log lines with timestamp and scope
- writing logs to console
- writing logs to files in `logs/`
- separating normal logs and error logs
- rotating log files when the date changes

---

### 11. Resource Monitor

```
src/resource-monitor.ts
```

Checks whether the wallet has enough resources to execute protection.

Responsible for:

- checking SOL balance for transaction fees
- checking available input token balance
- switching the system between `active` and `passive` mode
- reporting the reason when execution is not possible
- logging resource state only when it changes

Resource states:

- `active` — execution is allowed
- `passive` — execution is not allowed

Passive reasons:

- `insufficient-sol`
- `insufficient-input-balance`

Purpose:

- prevent execution when wallet resources are insufficient
- keep the system running in observation mode instead of failing

---

### 12. Entry Point

```
src/index.ts
```

Application entry point and startup coordinator.

Responsible for:

- reading environment variables
- validating `priceFeedId`
- validating `inputMint` and `outputMint`
- resolving observed pair and token labels for startup logs
- displaying execution mode (`dry-run` / `real-swap`)
- starting mock scenario when `priceSource = "mock"`
- logging active strategy parameters
- providing a startup delay window before execution begins
- starting the main watcher loop
- repeatedly calling `runDrawdownGuard()`

---

## State Machine

System behavior is driven by two layers:

- price states (trigger logic)
- execution phases (protection flow)

Price states:

```
ok → warning → trigger → drawdown → critical
```

Price state behavior:

- `ok` — price is at or above `target`
- `warning` — price is below `target` but not yet below `trigger`
- `trigger` — price is below `trigger`; confirmation timer is active
- `drawdown` — price stayed below `trigger` for `confirmationSeconds`
- `critical` — price is below `critical`; confirmation is bypassed

Execution phases:

```
execution → cooldown → monitoring
```

Execution behavior:

- `target` stops protection if reached
- `cooldown` starts after a protection cycle
- `cooldown` cannot be interrupted by market conditions

---

## Execution Loop

Simplified execution flow:

```text
while (true):
    price = getActivePrice()
    status = evaluateTrigger(price)

    if status requires protection:
        if resources are sufficient and not in cooldown:
            executeProtection()

    wait before next cycle
```

Notes:

- execution is controlled by the executor
- resource availability is checked before execution
- cooldown is enforced inside the execution flow

---

## Modes

### Dry-run Mode

Simulation mode.

Behavior:

- no real swaps
- no wallet balance changes
- full trigger and execution logic still runs
- useful for testing scenarios

---

### Real Mode

Live execution mode.

Behavior:

- executes real swaps
- uses wallet balance
- sends real transactions through Jupiter
- continues monitoring after execution; cooldown only restricts new execution

---

## Key Design Principles

### 1. Config-Driven Behavior

Runtime behavior is controlled through configuration.

No code changes are required to adjust:

- tokens
- thresholds
- timing
- execution amount
- price source

---

### 2. Modular Design

Each layer has a separate responsibility:

```text
price input → trigger logic → execution → swap
```

This makes the system easier to test, replace, and extend.

---

### 3. Token Independence

Price observation is decoupled from execution assets.

The system treats these values as independent configuration fields:

- `priceFeedId` — asset or pair being monitored
- `inputMint` — token used as swap input
- `outputMint` — token received as swap output

They may match logically, but the system does not enforce any relationship between them.

This allows flexible strategies, including:

- selling the monitored asset during drawdown
- buying the monitored asset on price decline
- executing swaps between other assets based on the observed price signal

---

### 4. Safety-Oriented Execution

Execution is controlled through:

- confirmation time
- critical threshold
- chunked execution
- TWAP pause
- cooldown
- minimum SOL balance check
- input token balance check
- slippage control

---

### 5. Startup Safety

The system performs validation and checks before entering the execution loop.

Includes:

- validation of `priceFeedId`
- validation of `inputMint` and `outputMint`
- resolving token labels and observed pair
- displaying execution mode and configuration in logs
- startup delay window for manual verification

During the startup delay, the user can review logs and abort execution if configuration is incorrect.

---

## Summary

Shield Lite is a modular Solana automation engine.

It monitors market conditions and executes protection logic using a state-driven approach, with separate layers for configuration, market data, trigger evaluation, execution, token resolution, and runtime safety.
