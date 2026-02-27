# Quick Setup Guide

## ✅ What's Been Built

The POAP Forge dApp is now set up with:

- ✅ React Router with 5 pages (Home, Create, Manage, Event Detail, Profile)
- ✅ Modern Tropical Tech design system (Deep Teal gradients, Neon Lime accents)
- ✅ Supabase integration (auth, database)
- ✅ Pinata IPFS integration (for NFT metadata)
- ✅ Event Manager with moderation queue
- ✅ Basic Events (off-chain) with upgrade flow placeholder
- ✅ Claim request system with approval workflow

## 🔧 Setup Steps

### 1. Update Supabase URL

Your `.env` file has the Supabase key, but you need to add the **Supabase Project URL**:

1. Go to your Supabase dashboard
2. Settings → API
3. Copy the "Project URL" (looks like `https://xxxxx.supabase.co`)
4. Update `VITE_SUPABASE_URL` in `frontend-poaforge/.env`

### 2. Run Database Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase-schema.sql`
3. Paste and run it
4. This creates all necessary tables and policies

### 3. (Optional) Add Pinata JWT

If you want to upload images/metadata to IPFS:

1. Go to [pinata.cloud](https://pinata.cloud)
2. Create API key with `pinFileToIPFS` and `pinJSONToIPFS` permissions
3. Copy JWT token
4. Add to `.env` as `VITE_PINATA_JWT`

### 4. Run the App

```bash
cd frontend-poaforge
npm run dev
```

## 🎯 Next Steps to Complete

1. **Upgrade to POAP Flow**: Implement smart contract deployment when clicking "Upgrade to POAP"
2. **Signature Generation**: Implement proper signature generation for approved claims
3. **Direct Minting**: Connect smart contract minting for direct claims and airdrops
4. **Collection View**: Show user's claimed POAPs in Profile page
5. **Views Tracking**: Add views counter for events

## 📝 Notes

- The Supabase key you provided looks like a Google API key format. Make sure it's the correct Supabase anon key.
- Basic Events work without wallet connection (Email/Social auth)
- Event Manager is only accessible to event creators
- CSV export is functional
- Moderation queue updates in real-time via Supabase subscriptions

## 🐛 Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`

**"Pinata JWT not configured" error:**
- This is OK if you're not using IPFS features yet
- Add `VITE_PINATA_JWT` to `.env` when ready

**Database errors:**
- Make sure you ran the SQL schema in Supabase
- Check that RLS policies are enabled
