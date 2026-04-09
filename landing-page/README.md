# Project Tracker — Waitlist Landing Page

## Preview

Open `index.html` in any browser — no build step required.

```bash
# macOS
open landing-page/index.html

# Windows
start landing-page/index.html

# or use a local server
npx serve landing-page
```

## Email Collection

The waitlist form currently shows a success message client-side only. To collect emails for real, integrate one of:

- **Mailchimp** — Embed form action URL
- **ConvertKit** — JS snippet or form action
- **Buttondown** — Simple API POST
- **Supabase** — Free Postgres table + edge function
- **Google Forms** — Quick and free

Replace the `submit` event handler in `index.html` with your provider's integration code.
