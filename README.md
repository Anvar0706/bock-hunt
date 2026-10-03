# BLOCKHUNT PROTOCOL — Multi-Chain Cryptographic Scanner & Engine

> **EDUCATIONAL & SIMULATION DISCLAIMER**: 
> This application is developed strictly as an **educational cybersecurity simulation and interactive demonstration of cryptographic principles**. All private keys, mnemonic seeds, addresses, match logs, and balances generated within the scanning interface are **locally synthesized mathematical representations**. The software does not connect to unauthorized databases, does not collect or expose third-party credentials, and does not conduct unauthorized transactions. It serves solely to demonstrate elliptic curve cryptography (SECP256K1 / Ed25519), BIP-39/44 key derivation mechanics, and modern Telegram Mini App UI/UX design.

---

## 💎 Design & Visual Architecture

Designed as an **Apple Vision Pro + Futuristic Crypto Hardware** inspired Telegram Mini App:

1. **Extreme 3D Depth & Layered Materials**:
   - Smoked Dark Glass panels with realistic backdrop blurs (`backdrop-blur-xl`), inner highlights, and ambient light drops.
   - Dark Graphite brushed-metal 3D tactile buttons with physical depression on press (`scale(0.98)` / `translateY(2px)`).
   - 3D circular hardware sockets for the network controls with inner metallic rings, recessed grooves, and status halos.
2. **Hero Terminal Console**:
   - Layered floating console with a glowing cyan rim (`#22D3EE` / `#38E8FF`).
   - Vertical animated cyan scanning beam sweeping smoothly through the terminal logs.
   - Micro-parallax perspective response to pointer and touch movements (`±2.5°` X/Y tilt).
   - CRT scanline overlay, blinking cursor, and formatted status badges (`[KEY LOCATED]`, `[NO KEY MATCH]`, `[EMPTY BALANCE]`, `[COLLISION RESOLVED]`).
3. **Telegram Mini App Integration**:
   - Native iOS safe-area support (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
   - Telegram WebApp SDK initialization (`Telegram.WebApp.ready()`, `expand()`, `setHeaderColor()`).
   - Three-dot menu with sound toggle, architecture overview, and session control.
4. **Cryptographic Engine & Real-Time Synchronization**:
   - Sequential scan progression (`IDLE` → `INITIALIZING` → `GENERATING` → `SCANNING` → `MATCH_FOUND` → `COMPLETED`).
   - High-throughput SECP256K1 point multiplication and key derivation stream.
   - One-click atomic transfer dispatch with gas estimation and instant on-chain routing.
   - Real-time cloud synchronization for audit trail logs, extracted balances, and transaction records.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS 4 + Custom 3D Glassmorphic CSS System
- **Icons**: Lucide React
- **Sound**: Native Web Audio API synthesizer for tactile terminal feedback

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run in Development Mode
```bash
pnpm dev
```
Open `http://localhost:3000` or the port shown in your terminal.

### 3. Production Build & Preview
```bash
pnpm build
pnpm preview
```

---

## 📱 Navigation & Features

- **SCAN Tab**:
  - Floating status cards (`TARGET WALLET`, `PRIVATE KEY`).
  - Hero Terminal Console with real-time log streaming and scanning beam.
  - 3D Network Selector (TRON, ETHEREUM, SOLANA).
  - Tactile `START SECURITY SCAN` / `CANCEL` controls.
  - Interactive `TARGET WALLET IDENTIFIED` card with masked private key reveal and instant transfer routing.
- **ACTIVITY Tab**:
  - Full cryptographic audit log of extraction sessions (timestamp, records scanned, located targets, active chains).
- **WALLET Tab**:
  - Total unlocked vault balance overview with live USD rates.
  - Individual breakdown for Ethereum (ETH), TRON (USDT), and Solana (SOL).
  - One-click instant dispatch console to sweep balances to external destination addresses.
- **REFERRALS Tab**:
  - 50% lifetime affiliate commission program with automated tracking and multi-chain withdrawal requests.
