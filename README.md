# Bitton Studio — website

A Roblox game studio website modeled on locked.dev's layout, with **real,
live stats pulled from Roblox** — total visits, players online right now,
and games live are never typed in by hand, they're fetched automatically
every 60 seconds.

## What's in here

```
index.html          → Home page
games.html           → Full games portfolio page
contact.html         → Contact / partnership form page
style.css            → All the styling (colors, spacing, etc.)
games-config.js       ⭐ EDIT THIS to add/remove/change your games
main.js              → Fetches live stats and builds the game cards (no need to edit)
api/stats.js         → Server-side function that talks to Roblox's API (must stay in an "api" folder — that's a Vercel requirement, not optional)
vercel.json          → Makes URLs show as /games and /contact instead of .html
images/              → Empty folder — drop game thumbnails or a logo file here if you want
```

Everything is flat (no `css/` or `js/` subfolders) so you can drag the
whole thing into a VS Code window and start editing immediately. The
only folder that has to exist is `api/`, because that's where Vercel
looks for server functions.

## The only file you need to edit: `games-config.js`

Every game is currently a **placeholder** — fake `placeId: 0` values, a
generated placeholder thumbnail, and bracketed names like
`[Placeholder] Speed Run Escape`. Live stats will show "—" until you
replace them with real games. Each game looks like this:

```js
{
  name: "Your Game Name",
  description: "A short one/two sentence description.",
  image: "images/your-thumbnail.png", // or a full Roblox thumbnail URL
  placeId: 119068914321553,           // the number in your game's Roblox URL
  link: "https://www.roblox.com/games/119068914321553/Your-Game",
  ctaText: "Play Now",
  badge: "Featured" // or "Acquired", "Partner", or "" to hide it
}
```

Copy/paste a whole `{ ... }` block to add a game, or delete one to remove it.

## Things you'll likely want to customize

| What | Where |
|---|---|
| Accent/brand color, spacing, corner roundness | Top of `style.css`, the `:root { ... }` block |
| Logo | Currently an inline SVG "B" mark repeated in each HTML file (nav, hero, about section, footer) — swap any of them for `<img src="images/logo.png" class="...">` if you have a real logo file |
| Headline, about text, partner-card wording | `index.html` — look for `CUSTOMIZE` comments |
| Social links (Roblox group, X, Discord) | The `<ul class="footer-social">` block near the bottom of every page — replace the `#` hrefs |
| Contact form destination | `contact.html` — see "Contact form setup" below, it will not deliver anywhere until you set this |
| How many games show in the homepage strip | `index.html` → `data-games-marquee="6"` — change the number or remove it to show all |
| Marquee scroll speed | `style.css` → `.games-marquee__track { animation: marqueeScroll 42s ... }` — lower seconds = faster |
| Stats refresh frequency | `main.js` → `const REFRESH_SECONDS = 60;` |

## How the live stats actually work

Roblox blocks websites from calling its API directly from the browser
(a security rule called CORS). `api/stats.js` runs **on the server**
instead, and:

1. Turns each `placeId` into a `universeId` (Roblox's internal game ID)
2. Asks Roblox for that universe's current player count (`playing`) and
   `visits`
3. Adds everything up and sends the totals + per-game numbers back to
   your page

The page then refreshes these numbers every 60 seconds automatically,
with the numbers animating (counting up/down) rather than snapping —
that's handled in `main.js` and needs no setup.

This only works once the site is deployed to Vercel (see below). It
won't fetch real numbers if you just double-click `index.html` on your
computer, since there's no server there to run `api/stats.js` — you'll
just see the placeholder cards with "—" instead of numbers, which is
expected locally.

## Deploy it for free (Vercel — recommended)

Vercel runs `api/stats.js` for you automatically, for free, with no
configuration.

1. Go to **vercel.com** and sign up (GitHub sign-up makes step 2 easier).
2. Put this project in its own GitHub repository:
   - Easiest way: go to **github.com/new**, create a repo, then use the
     "uploading an existing file" link and drag in everything from this
     folder.
   - Terminal version:
     ```
     cd bitton-studio
     git init
     git add .
     git commit -m "first version"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
     git push -u origin main
     ```
3. In Vercel, click **Add New → Project**, pick your repo, and click
   **Deploy**. Leave the framework preset as "Other" — no build settings needed.
4. After ~30 seconds you'll get a live URL like `your-project.vercel.app`,
   with `/`, `/games`, and `/contact` all working with no `.html` anywhere.

Any time you push changes to GitHub, Vercel automatically redeploys.

### Updating the site later (no new repo needed)

1. Go to your repo on GitHub.
2. Click into the file you want to change (e.g. `games-config.js`).
3. Click the **pencil icon** to edit it in the browser.
4. Make your change, scroll down, add a commit message, click **Commit changes**.
5. Vercel redeploys automatically within about a minute.

For images: open the `images` folder, **Add file → Upload files**, and
either add a new file or upload one with the exact same name as one
you're replacing.

## Contact form setup

The form in `contact.html` currently points to a **placeholder**
Formspree endpoint (`YOUR_FORM_ID`) and will not deliver anywhere until
you set it up — this is a fresh form for Bitton Studio, not connected
to anyone's inbox:

1. Go to **formspree.io** and sign up (free plan covers 50 submissions/month).
2. Click **New Form**, name it anything, and set the recipient to your
   real email address.
3. Formspree gives you a form endpoint like `https://formspree.io/f/abcd1234`.
4. Open `contact.html`, find:
   ```html
   <form class="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
   and replace `YOUR_FORM_ID` with the ID Formspree gave you.
5. Commit that change (same "edit file" flow as above).
6. The first submission triggers a confirmation email from Formspree —
   click the link once, and everything after that lands straight in
   your inbox.

## Alternative hosts

- **Netlify** also runs serverless functions for free, but the folder
  needs to be `netlify/functions` instead of `api`, and the frontend
  fetch path becomes `/.netlify/functions/stats` instead of `/api/stats`.
  Ask if you'd like the Netlify-specific version of those two spots.
- **GitHub Pages** is static-only and **cannot run `api/stats.js`** —
  the site will still work, but stats will always show "—" since there's
  nowhere for the API calls to run. Vercel is the better fit here.
