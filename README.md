# Livin' Like Kenny Virtual Tiki Hut

Bolt-ready responsive web app/PWA for the Livin' Like Kenny radio show.

This version is designed to upload cleanly into Bolt.new and run immediately in preview mode, even before Supabase or GIPHY keys are connected. When environment variables are added, it becomes a realtime Supabase-powered app.

## What is included

- Mobile + desktop responsive PWA
- No listener login and no email requirement
- Always-open Messenger-style chat
- Replies and emoji reactions
- GIPHY integration with demo fallback
- Photo sharing in preview mode using local browser storage
- Video links inside chat messages
- Song request form with listener name, song title, artist, dedication/message, and timestamp
- Admin dashboard for Kenny and Nell
- Browser sound alert for new song requests while admin dashboard is unlocked
- Live Show Mode toggle
- Announcements for Trop Rock events, Kenny and Nell appearances, and upcoming show themes
- Tropical virtual tiki hut visual system based on the provided Livin' Like Kenny artwork

## Bolt.new upload

1. Upload this ZIP directly to Bolt.new, or unzip and import the folder.
2. Run the default install/start flow:

```bash
npm install
npm run dev
```

3. The app will work immediately in Bolt preview mode using local browser storage.
4. Admin dashboard preview passcode defaults to:

```text
kenny
```

Change `ADMIN_PASSCODE` before launch.

## Environment variables

Copy `.env.example` to `.env.local` locally, or add these in Bolt's environment settings.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GIPHY_API_KEY=
ADMIN_PASSCODE=kenny
NEXT_PUBLIC_RADIO_TROP_ROCK_URL=https://radiotroprock.com/
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase setup for real multi-user persistence

The app runs without Supabase for preview. For launch:

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Enable Realtime for these tables:
   - `chat_messages`
   - `song_requests`
   - `announcements`
   - `show_settings`
5. Add these variables to Bolt:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## GIF setup

Add a GIPHY API key as:

```bash
GIPHY_API_KEY=
```

If no key is present, the app uses a small tropical demo GIF set so preview still works.

## Production note

This project intentionally supports no-login listener chat. The included Supabase policies are open enough to match that friction-free requirement. Before a bigger public launch, the next smart step is moving dashboard-only actions behind authenticated server routes or Supabase Edge Functions while keeping listener chat account-free.
