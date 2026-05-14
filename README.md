# BlockVault

Personal credential manager built with Next.js and Supabase. Stores passwords, API keys, and sensitive information with client-side AES-256 encryption.

## Features

- Supabase authentication + master password (two-layer security)
- Client-side AES-256 encryption: database only ever stores ciphertext
- Dark mode UI
- Instant search
- Password generator

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth)
- TypeScript

## How It Works

BlockVault uses a two-layer security model. First, Supabase Auth handles account creation and login: this keeps your data private to your account using PostgreSQL Row Level Security. Second, a personal master password adds an extra layer: all passwords are encrypted in the browser with AES-256 before being sent to the database. The database never sees plaintext: it only ever stores encrypted ciphertext. When you want to view a password, it's decrypted locally in your browser using your master password.

In short: Supabase Auth locks the door, your master password is the only key, and the encryption ensures that even if someone accesses the database, the data is unreadable.

## Setup

```bash
npm install
npm run dev
```