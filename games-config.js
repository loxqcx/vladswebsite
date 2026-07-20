/*
  ============================================================
  EDIT THIS FILE TO CUSTOMIZE YOUR GAMES
  ============================================================
  This is the only file you need to touch to add, remove, or
  change a game on the site. Live stats (players + visits) are
  fetched automatically from Roblox using each game's api DONT MESS NOTING UP

  For each game, fill in:

    name        -> The display name of the game
    description -> A short one/two sentence description
    image       -> A thumbnail. Paste a Roblox thumbnail URL, or
                   put a file in the /images folder and use
                   "images/my-game.png"
    placeId     -> The number in the game's Roblox URL:
                   roblox.com/games/119068914321553/My-Game
                                    ^^^^^^^^^^^^^^ that's it
    link        -> Full URL to the game on Roblox
    ctaText     -> Button text (e.g. "Play Now")
    badge       -> Small tag shown on the card (e.g. "Featured",
                   "Acquired", "Partner") — set to "" to hide it

  
  ============================================================
*/

const GAMES = [
  {
    name: "🍪 Roll Your Cookie",
    description: "Try to roll your cookie in the milk! avoid posion",
    image: "https://tr.rbxcdn.com/180DAY-d68646eecac23213e0be3101bcac2242/768/432/Image/Webp/noFilter",
    placeId: 108632069675268, // ⚠️ CUSTOMIZE: put your real Roblox placeId here
    link: "https://www.roblox.com/games/108632069675268/Roll-Your-Cookie",
    ctaText: "Roll Now",
    badge: "Featured"
  },
  {
    name: "☢️ +1 Nuke Per Click",
    description: "Every click makes your explosion stronger!",
    image: "https://tr.rbxcdn.com/180DAY-396fb6d6bae3f9248d76c91b8a739480/768/432/Image/Webp/noFilter",
    placeId: 116067010855801,
    link: "https://www.roblox.com/games/116067010855801/1-Nuke-Per-Click",
    ctaText: "Nuke Now",
    badge: "Featured"
  },
  {
    name: "🦅 +1 Fly Evolve",
    description: " You train your power to fly! Become the best one there is.",
    image: "https://tr.rbxcdn.com/180DAY-70155b59c27edabbe377e5ef3610788b/768/432/Image/Webp/noFilter",
    placeId: 118651055528548,
    link: "https://www.roblox.com/games/118651055528548/1-Fly-Evolve",
    ctaText: "Fly Now",
    badge: "Featured"
  },
  {
    name: "Secure the Supermarket",
    description: "Secure your supermarket. Make sure no theifes get away.",
    image: "https://tr.rbxcdn.com/180DAY-780104ba23f04ab2c3fdaf3fde2dd425/768/432/Image/Webp/noFilter",
    placeId: 107573271137575,
    link: "https://www.roblox.com/games/107573271137575/Secure-the-Supermarket",
    ctaText: "Secure Now",
    badge: "Featured"
  },
  {
    name: "💣 100 Players Bomb Tag",
    description: "Try to avoid getting the bomb.",
    image: "https://tr.rbxcdn.com/180DAY-a36e3eaafbb55505fe2776618f7a92a5/768/432/Image/Webp/noFilter",
    placeId: 120534052146421,
    link: "https://www.roblox.com/games/120534052146421/100-Players-Bomb-Tag",
    ctaText: "Play Now",
    badge: "Featured"
  }
];
