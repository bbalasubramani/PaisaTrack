# PaisaTrack

Personal income/expense tracker with Daily/Weekly/Monthly views. Data is stored in your own free Supabase project — survives clearing your browser, works across devices.

## Step 1: Set up Supabase (free, ~2 minutes)

1. Go to https://supabase.com → sign up → "New Project" (pick any name/password/region, free tier is enough)
2. Once created, go to the **SQL Editor** (left sidebar) → New query → paste and run:
   ```sql
   create table entries (
     id text primary key,
     type text, amount numeric,
     category text, date date,
     note text, created_at timestamp default now()
   );
   alter table entries enable row level security;
   create policy "public access" on entries for all using (true);
   ```
3. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public key**.

## Step 2: Deploy to Vercel (free)

1. Go to https://vercel.com and sign up/log in (GitHub login is easiest)
2. Click "Add New" → "Project"
3. Drag-and-drop this whole `paisa-track` folder, or push to a GitHub repo and import it
4. Leave build settings empty — it's a static site, no build command needed
5. Click Deploy — you'll get a live URL like `paisa-track.vercel.app`

## Step 3: Connect the app

Open your deployed URL, paste the Supabase Project URL and anon key into the setup screen, click Connect. Done — your entries now save to your own database and stay there even if you clear your browser or switch devices.

## Note on privacy

The anon key is safe to expose in frontend code by design (that's what "public" means in Supabase) — but the row-level-security policy above allows anyone with your URL to read/write, so don't share your deployed link publicly. This is fine for personal use.
