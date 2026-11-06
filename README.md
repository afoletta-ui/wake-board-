# Wake Legends '03 - Online with friends

Your wakeboarding game, now multiplayer: the bots are gone and the riders you see are your friends.

## What's in the folder

- `public/index.html` - the game
- `server.js` - a small server that connects everyone, with no database needed
- `package.json` - tells Render what to install (just `ws`)

## Put it online (free, Render)

1. Make a new GitHub repo and upload `server.js`, `package.json`, `README.md` and the `public` folder (with `index.html` inside it).
2. On render.com go to **New → Web Service** and pick the repo.
3. Leave Build as `yarn` (or `npm install`) and Start as `yarn start` (or `npm start`). Pick **Free**.
4. Click **Deploy**. When the logs say `Wake Legends online on port ...`, open your `https://....onrender.com` link and send it to your friends.

Everyone who opens that link is in the game together, up to 16 players. Each player's progress (cash, XP, gear) is saved in their own browser, the same as before. On the free plan the server sleeps when nobody is playing, so the first person in may wait about 50 seconds.

## The maps

There are only three spots now:

- **Sunset Paradise** (Golden Bay, Fiji): you start here.
- **Australian River** (Murray River): unlock at level 3, or buy it for $2,500.
- **Mountain Lake**: unlock at level 5, or buy it for $4,000.

Home Island is the hub where you walk around with your friends. There are no random villagers or beach crowds any more.

## Multiplayer controls

| Key | What it does |
|---|---|
| **B** | Drive the boat yourself (W/S speed, A/D steer). Press again to go back to riding on auto. |
| **G** | Driver: offer a tow to the nearest friend. Rider: ask a driving friend for a tow, or let go of the rope. |
| **Y / N** | Answer a tow offer or a jump-off challenge |
| **W / S** (while being towed) | Tell your driver to go faster or slower. They see it on screen. |
| **Enter** | Chat |
| **hold Z** | Talk (proximity voice chat). The mic button switches between hold-to-talk, open mic and off. |
| **Tab** | Friends list: join a friend, tow them, ask for a tow, challenge them to a jump-off |

- **Auto mode:** the boat drives itself around the course and you choose your own speed.
- **Friend driving:** the driver picks the speed and can go anywhere, including right up to the shore or past other people. Too shallow and the boat stops. Your rider can still clip the bank, so don't get too cocky.
- **Jump-off:** you have 60 seconds and the best single trick wins $750.
- **Join:** jumps you to the friend's map and drops you just behind them.
- **Voice:** friends are loud when close and fade out with distance. Anyone on the same rope is always full volume.

## Optional: voice on strict networks

Voice chat connects players directly. If some friends can't hear each other (some school or work networks block this), add a TURN relay in Render under **Environment Variables**:
`TURN_URL`, `TURN_USERNAME`, `TURN_PASSWORD`.

## Playing solo

If you open `public/index.html` straight from your computer, the game works as before, just without friends.
