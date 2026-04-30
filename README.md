# Shield Lite

**Reliable Automatic Portfolio Protection on Solana**

Shield Lite is a smart and flexible automation tool that monitors asset prices in real time and automatically protects your funds during sharp drawdowns.

It analyzes price movements, confirms dangerous levels, and executes protective swaps via Jupiter — calmly, in chunks, and with a well-thought-out safety system.

### 🎯 Who is Shield Lite For?

**Perfect for:**

- Long-term Solana holders and investors
- DeFi farmers and yield hunters
- LP position and staking holders
- DAOs and project teams managing treasury
- Traders who want to add automated risk management

**Best suited for** users who already have experience with Solana and are comfortable configuring tools themselves.

**Not recommended** for complete beginners without understanding of wallets and on-chain operations.

---

### ✨ Key Features

- Real-time price monitoring via Pyth Network
- Smart trigger system with time-based confirmation
- Automatic protective swaps through Jupiter
- Chunked execution (TWAP-style) to reduce slippage
- Flexible settings: trigger, critical, target, confirmation, and cooldown
- Full dry-run mode for safe testing
- Completely config-driven — no code changes required

---

### Tech Stack

- Node.js (runtime)
- TypeScript
- Solana Web3.js
- Jupiter API (swap execution)
- Pyth Network (price feeds)

---

### Prerequisites

- Node.js (v18+ recommended)
- Yarn
- Git

---

### 🚀 Quick Start

```bash
git clone https://github.com/linik-labs/shield-lite.git
cd shield-lite

yarn install
cp .env.example .env
```

Configure the required files before running the system:

- `.env` — environment variables, wallet path, execution mode
- `src/config/user-config.ts` — tokens, price feed, strategy parameters

Then run:

```bash
yarn dev
```

Detailed setup instructions are available in [`ENV.md`](ENV.md) and [`CONFIG.md`](CONFIG.md).

---

### ⚠️ Important Disclaimer

Shield Lite executes **automatic on-chain transactions**.  
While powerful, it carries risks of financial loss due to misconfiguration, network issues, or unexpected market conditions.

**Use only funds you are willing to lose.**  
Always start with `dry-run` mode and thoroughly test your settings before enabling real swaps.

The authors are not responsible for any financial losses.

---

### How It Works

1. **Monitoring** — tracks the price of your chosen asset via Pyth
2. **Analysis** — evaluates drawdown with time-based confirmation
3. **Protection** — executes swaps in chunks with pauses when conditions are met
4. **Safety** — cooldown logic, balance checks, and controlled execution flow

Everything is easily configurable through a single config file.

For a deeper technical overview, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

### Modes

**Dry-run mode**

Runs the full monitoring and trigger logic without executing real transactions or changing wallet balances.

**Real mode**

Executes real swaps via Jupiter, uses wallet balance, and pays network fees. Monitoring continues during cooldowns and resource limitations.

---

### 📣 Feedback & Contributions

Shield Lite is currently in the MVP stage and actively evolving.

I’d greatly appreciate your feedback!

You can help by:

- Reporting bugs or unexpected behavior
- Suggesting new features or improvements
- Sharing your use cases
- Giving ideas on how to make the tool safer and more convenient

Feel free to open [Issues](https://github.com/linik-labs/shield-lite/issues) or submit Pull Requests.

Every comment and suggestion is highly valuable.

---

### ❤️ Support the Project

If you find Shield Lite useful and would like to support its continued development, I’d be sincerely grateful.

**Solana (SOL):**  
`FuzjiD4hgUHyAcXcYq9TSqT2mPj8H2WNxcmFjqvC89NM`

Your donations help improve functionality, security, and usability.

---

**Thank you for checking out the project!** ❤️
