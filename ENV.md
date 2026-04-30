# Environment Configuration

Shield Lite uses environment variables for runtime configuration.

Environment variables should be stored in a local `.env` file.

Use `.env.example` as a template.

---

## Required Variables

### SOLANA_RPC_URL

Solana RPC endpoint used for network interaction.

Example:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

---

### SOLANA_KEYPAIR_PATH

Path to the wallet keypair file used for signing transactions.

Example:

```env
SOLANA_KEYPAIR_PATH=/home/username/.config/shield-lite/shield-mainnet.json
```

Important:

- keep this file secure
- do not commit it to Git
- store the keypair outside the project directory
- restrict file permissions

Example:

```bash
chmod 600 /home/username/.config/shield-lite/shield-mainnet.json
```

---

### JUPITER_API_KEY

API key used for accessing Jupiter quote and swap endpoints.

Example:

```env
JUPITER_API_KEY=your_jupiter_api_key_here
```

API keys can be managed here:

<https://developers.jup.ag/portal/api-keys>

Important:

- this variable is required
- Shield Lite will not start without a valid Jupiter API key
- do not commit API keys to Git

---

### ENABLE_REAL_SWAP

Controls execution mode.

Example:

```env
ENABLE_REAL_SWAP=false
```

Modes:

- `false` → dry-run mode, no real transactions are executed
- `true` → real swap execution is enabled

Important:

Keep this value set to `false` until the configuration, wallet, token mints, price feed, and strategy are fully verified.

---

### Example `.env`

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_KEYPAIR_PATH=/home/username/.config/shield-lite/shield-mainnet.json
JUPITER_API_KEY=your_jupiter_api_key_here
ENABLE_REAL_SWAP=false
```

---

### Security Notes

- `.env` must not be committed to version control
- wallet keypair files must not be stored inside the repository
- API keys and private keys must never be shared publicly
- before enabling real swaps, run the system in dry-run mode first
