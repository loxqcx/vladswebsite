
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
thanks for wokring loxqcx on dc for this website <3