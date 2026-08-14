# The School of Athens — Interactive

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL + anon key
3. `npm run dev`

## Database

Uses a single `hotspots` table:

```sql
create table hotspots (
  id integer primary key,
  label text not null,
  video_id text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Enable RLS with an open read/write policy for now (single-admin, no auth):

```sql
alter table hotspots enable row level security;
create policy "public read" on hotspots for select using (true);
create policy "public update" on hotspots for update using (true);
```

## Admin

Visit `/admin` to paste YouTube video IDs or links per tablet.

## Deploy

Push to GitHub, import into Vercel, add the two env vars in Vercel project settings.
