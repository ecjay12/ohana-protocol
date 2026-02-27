# POAP Forge - Modern Tropical Tech

POAP Forge dApp with Modern Tropical Tech design, Basic Events (off-chain) with upgrade flow, and comprehensive Event Manager with moderation.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Pinata IPFS Configuration
VITE_PINATA_JWT=your_pinata_jwt_token_here
```

**Get Supabase credentials:**
1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project (or create a new one)
3. Go to Settings → API
4. Copy "Project URL" → `VITE_SUPABASE_URL`
5. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

**Get Pinata credentials:**
1. Go to [pinata.cloud](https://pinata.cloud) and sign in
2. Go to API Keys section
3. Create new API key with "pinFileToIPFS" and "pinJSONToIPFS" permissions
4. Copy JWT token → `VITE_PINATA_JWT`

### 3. Setup Supabase Database

Run the SQL schema in `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-schema.sql`
3. Run the SQL script

### 4. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Features

- **Modern Tropical Tech Design**: Deep teal gradients, glassmorphic cards, neon lime accents
- **Basic Events**: Create events without wallet (Email/Social auth)
- **Upgrade to POAP**: Convert Basic Events to on-chain POAPs
- **Event Manager**: Comprehensive dashboard with moderation, stats, and controls
- **Claim Moderation**: Approve/reject/ban claim requests
- **Direct Airdrop**: Mint POAPs directly to addresses
- **CSV Export**: Download attendee lists

## Project Structure

```
frontend-poaforge/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── AuthModal.tsx
│   │   └── EventManager/
│   │       ├── StatsCard.tsx
│   │       ├── StatusToggle.tsx
│   │       ├── ModerationQueue.tsx
│   │       ├── ClaimRequestCard.tsx
│   │       └── DirectAirdropForm.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── CreateEventPage.tsx
│   │   ├── EventManagerPage.tsx
│   │   ├── EventDetailPage.tsx
│   │   └── ProfilePage.tsx
│   ├── hooks/
│   │   ├── useSupabaseAuth.ts
│   │   └── useInjectedWallet.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── ipfs.ts
│   └── App.tsx
├── supabase-schema.sql
└── package.json
```

## Routes

- `/` - Home (Discovery feed)
- `/create` - Create Event
- `/manage/:eventId` - Event Manager (creator only)
- `/event/:eventId` - Event Detail Page
- `/profile` - User Profile

## Next Steps

- Implement upgrade to POAP flow (smart contract deployment)
- Add signature-based minting for approved claims
- Implement direct POAP minting via smart contracts
- Add collection view for claimed POAPs
- Add views tracking for events
