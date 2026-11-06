# Seterraline

A full-screen geography game built with Vite, strict TypeScript, and WebGL. A high-definition pixel atlas provides the terrain artwork; accurate vector country geometry handles picking and answer highlights. Country and SVG flag quizzes share the same rules.

## Run

Requires Node.js 22.12+ (developed with Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use the menu next to the game name to choose a map tile (World, Europe, Africa, Asia, Americas, or Oceania), quiz mode, and round length. Americas includes North and South America and the Caribbean. Each map limits questions to its countries, starts with the camera focused on that region, and keeps separate personal bests.

```sh
npm test          # Rules, data integrity, and geographic triangulation
npm run build    # Type checking and production build
npm run preview  # Serve the production build
npm run data     # Regenerate bundled country geometry and flags
```

Deploy `dist/` on any static host with HTTPS and compression enabled. All game assets, including the pixel font, are bundled locally. The header compass and favicon make one 2.4-second turn when the map loads. Clicking the brand (or activating it with the keyboard) replays the turn without navigating or resetting the match; the favicon keeps its original static SVG link as a fallback, restores it afterward, and skips animation for reduced motion or a hidden tab. No external font, audio, analytics, or map service is used.

## Share with GitHub Pages

The game is published under the alias **PizzaBiceps** at https://pizzabiceps.github.io/seterraline/ once deployment is enabled.

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push the game files and `.github/workflows/pages.yml` to `main`.
3. Wait for **Deploy game to GitHub Pages** to finish in the Actions tab.

Future pushes to `main` test, build, and deploy the game automatically. Only `dist/` is uploaded to Pages. Vite's base path and runtime asset URLs support the `/seterraline/` project URL.

Use the alias and GitHub noreply email for commit authorship. Keep the GitHub profile, avatar, bio, and linked accounts consistent with that alias if you want visitors to see only that identity. Third-party asset license credits remain included.

## Controls and rules

- Click or tap countries; drag to pan; pinch, scroll, or use the buttons to zoom. Pinching never submits an answer, even when one finger lifts before the other. Touch taps tolerate small finger movement; deliberate drags begin without a camera jump.
- Phone layouts support portrait and landscape, safe-area insets, 44px controls and scrollable setup/results.
- Focus the map to use arrow keys, + / −, and 0 (world view).
- Small countries have bright diamond markers with a dark outline, growing slightly with zoom so they remain visible against land and sea. Small and narrow countries get a 12 CSS-pixel mouse tolerance and a 20 CSS-pixel touch tolerance based on their shortest screen-space dimension. Tapping an ambiguous area zooms into the tapped location without submitting an answer or showing country names. Tap again to select the country; selection never favors the quiz target. At maximum zoom, exact geometry takes priority so repeated zooms cannot trap the player. Keyboard answering is available in the menu.
- **Flag → Map:** identify the flag by clicking its country on the full-screen atlas. Hints highlight the country; the keyboard answer menu keeps its name hidden until you choose.
- Both flag modes use the locally bundled 16×12 pixel SVG set by Tony Gines (tgines/pixel-flags, MIT; license in public/licenses/pixel-flags-MIT.txt). Original detailed SVGs remain available as a fallback. No runtime rasterization or remote flag requests are needed.
- Flag choices support number keys 1–4.
- The menu contains map, mode, and round length. Pixel rendering and borders use fixed defaults.
- Country taps have a short synthesized pixel click, including taps that zoom into crowded areas. Click sounds have a separate rate limit so they cannot suppress correct/wrong answer cues; dragging and ordinary UI controls add no click sound.
- The menu’s sound control mutes all audio. The sound preference is saved locally. Audio starts only after a user gesture.
- Each new round randomly chooses between two locally generated soundtracks: **Neon Drive** (retrowave) and **Vector Run** (arcade electro, with a broken beat and pulse-wave hook). The selected track stays with that round and starts its buildup from the opening. Restarts and replays make a fresh random choice too; both tracks can still be auditioned in the music showcase. Both use the same five flow levels, answer-based energy rules, master mute, and voice limit.
- The generated soundtrack blends pixel synths with dark retrowave synth chords at a steady 112 BPM. Five flow levels build from synth brass and a restrained drum machine to pulsing octave bass, a recurring lead hook, stereo arpeggios, and drum fills. Fast clean answers add energy; failed countries (three misses), hints, skips, and long pauses soften the arrangement. Changes land on bar boundaries; music fades out on completion, mute, or a hidden tab. A shared stereo echo/reverb rack and kick-driven ducking give the mix space without per-note effects chains.
- The HUD shows only the target, round, score, hint, and skip. Sound, help, restart, and keyboard answering are in the menu. Pixel point gains float into a counting score display; consecutive unassisted correct countries show a brief streak callout. These effects never change scoring, and motion is disabled by the reduced-motion preference.
- Two consecutive unassisted correct countries heat the country name, round counter, and score with stepped color bands inside the letters. Clean answers pulse through those displays in sequence; higher streaks release small embers from letter edges. At ten clean answers the lettering turns blue-hot with small blue edge flickers, becoming more active at fifteen. The first two misses preserve the streak and musical energy; a correct second or third attempt extends the streak while retaining its normal points penalty. Three misses, a hint, a skip, or a new round resets the heat. Embers use a separate low-resolution layer at about 12 frames per second, stop while hidden, and are disabled with reduced motion (static heat colors remain).
- Pixel click bursts, answer rings, and a brief miss shake run only while visible, stop when idle, and respect the operating system’s reduced-motion preference. The particle count is capped at 120.
- A correct answer earns 100 points, minus 25 per wrong guess and 50 for a hint, with a 25-point minimum before the third miss. Three wrong guesses automatically advance to the next country for zero points, keeping the current camera view. Failed countries remain in the end-of-round review. Skips also earn zero.
- The session timer is visible beside the score, counts through menus and background tabs, and stops at the final answer. Personal bests are saved locally for each mode, region, and selected round length: higher points win, with faster completion breaking ties. Records include a rules version so future scoring changes can use separate records. Storage failures do not block results.
- Accuracy is earned points divided by the maximum points for completed countries.
- Round settings: 10, 20, or all available countries. Finishing a round shows results, a review list, replay, and a new-round option.

## Structure

- `src/game/engine.ts`: pure, immutable match reducer, deterministic seeded shuffle, serializable configuration/state, commands, and transport contracts. No DOM, WebGL, storage, or wall-clock dependency. The caller supplies elapsed time.
- `src/game/modes.ts`: mode registry for prompts and map/choice presentation. All modes use stable country IDs and the same scoring rules. New answer formats can add a mode here while sharing the match lifecycle.
- `src/game/protocol.ts`: reserved challenge and WebSocket message contracts (invite rooms use `src/party/types.ts`), dataset version, command sequencing, expected revisions, snapshots, lobbies, and standings.
- `src/map/renderer.ts`: texture rendering, vector projection/triangulation, batched highlights, country picking, small-country markers, camera, and input. It reports IDs and does not own quiz rules.
- `src/map/terrain.ts`: deterministic pixel-terrain generator, brought over from the approved pixel-atlas exploration. Open `/bake.html` in development to regenerate `public/data/pixel-terrain.png`. The terrain is stylized artwork, not measured elevation or vegetation data.
- `src/effects/`: lazy Web Audio effects, a bar-synchronized generative synth sequencer, pure seeded composition/flow functions, an independent Canvas 2D pixel-particle layer, and bounded score animations. These do not change match state or map picking. The music schedules just 180 ms ahead, runs its scheduler only while enabled and visible, and caps active voices at 64.
- `src/main.ts`: local session orchestration and minimal UI.

## Private invite rooms (Cloudflare)

Choose your map, mode and round length in Setup, then press **PARTY** to create an invite. Share the link, wait for 2–8 players, and let the host start. All three game modes and all regions are supported. Everyone receives the same deck and plays independently. Standings sort by points, finished players first on equal points, then faster completion (or progress while still playing). Open PARTY during a match to see standings; the host can start a rematch once the round ends. Finishing a run leaves everyone else playing, with scores shown directly on the results screen. A server-enforced ten-minute deadline ends unfinished runs while preserving earned points; the host can also end a round explicitly. Leave a room to return to solo play. Party runs do not write personal records.

Players receive randomized 9×9 mirrored pixel avatars and can optionally edit them with a fixed palette; image uploads are not accepted. A vertical avatar rail shows opponents, scores, activity dots and brief guess flashes. Server-side nickname checks reject common profanity and common obfuscations; these checks and symmetric avatars reduce misuse but are not comprehensive content moderation. Vote removal requires a distinct majority of the other room members.

The first two finishers receive gold and silver medals, independent of the point ranking. Their dialogs show gold flames or subtler blue/silver flames, randomized smoke, embers and faint procedural fire crackle; the effect stays with the results and pauses in hidden tabs. The final score winner sees smoldering map borders and an sixteen-bar 160 BPM hardstyle remix of their current soundtrack; effects respect mute, page visibility and reduced motion. The last-place player gets a one-time bonus spin with a server-decided 30% chance of a dunce cap. Refreshing cannot change that result.

The authoritative backend is a Cloudflare Worker with one SQLite-backed Durable Object per room, available on Workers Free within its usage quotas. The frontend can stay on GitHub Pages. No separate database or always-on server is needed. The client polls every three seconds while visible; room state is stored after mutations and presence is checkpointed about every 15 seconds. No guesses for a minute marks a player away; missing heartbeats for about 45 seconds marks them offline. The compact avatar rail shows this through its activity dot. Each player receives only their revealed questions and aggregate opponent standings. Scores, revision checks and elapsed times are calculated on the server. Nicknames are not accounts; private bearer tokens in session storage allow reconnection within the same tab. Treat an invite as access to the room. Invites and room data expire 24 hours after creation. A closed tab reserves its seat until rejoining and leaving or room expiration; the host transfers when explicitly leaving.

Local development (two terminals):

```sh
npm run server:dev
npm run dev
```

The development client uses `http://127.0.0.1:8787`. Open the invite in another browser/tab to test multiple players. Run `npm test`, `npm run server:check`, and `npm run build` before deployment.

Deployment:

1. Sign in to your Cloudflare account with `npx wrangler login`.
2. Set `ALLOWED_ORIGINS` in `wrangler.jsonc` to the frontend origin(s). The GitHub Pages origin and local development origins are included initially.
3. Run `npm run server:deploy` and copy the resulting HTTPS Worker URL.
4. The production client defaults to `https://seterraline-party.seterraline.workers.dev`. Rebuild/deploy the frontend to use it. To use a different server, set the repository Actions variable `VITE_PARTY_API_URL` to its Worker URL (no `/api` suffix). For a manual build use `VITE_PARTY_API_URL=https://your-worker.workers.dev npm run build`.

The room server is deployed at `https://seterraline-party.seterraline.workers.dev`. Cloudflare login and future server deployments use Wrangler; the GitHub Pages workflow publishes only the frontend. The backend bundles country metadata from the same data file as the frontend; deploy both together when updating datasets or rules. Polling uses request quota, so review [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) as usage grows.

## Rendering and performance

Country geometry is projected and triangulated once during loading. Static position/border/marker buffers remain on the GPU. A frame uses four batched draw calls (terrain texture, country highlights, boundary lines, small-country markers), irrespective of country count. Hiding borders removes one draw. The 1800 × 960 pre-baked terrain texture uses nearest-neighbor sampling and is about 344 kB; it is not generated during game loading. Hover and answer changes update color buffers. The map draws on demand rather than running a continuous animation loop. The map uses a fixed fine pixel resolution to preserve the pixel treatment. The particle canvas caps device pixel ratio at 2. Picking first rejects country bounding boxes, then checks exact triangles; small- and narrow-country picking measures screen-space distance to outlines and markers. Exact large-country hits are preserved as a choice when a nearby microstate could be intended.

The production JavaScript is approximately 72 kB minified / 27 kB gzip. The local 1:50m country dataset is about 1.6 MB uncompressed; flags load on demand. Coordinate rounding reduces transfer and parsing size while retaining more detail than the 1:110m atlas. Static-host compression is recommended. Zoom is bounded at 16×; deep zoom reveals the larger pixels of the fixed-resolution artwork. Vector country picking remains precise at every zoom level.

## Data and licensing

`npm run data` merges repeated country IDs, supplies unique IDs for atlas features without ISO identifiers, rounds geometry coordinates, and copies SVG flags into `public/`. The quiz pool contains 193 countries marked independent in the supplied metadata and represented by the atlas; other mapped regions are displayed but excluded from questions. This follows source metadata rather than maintaining a separate recognition policy. Updating either source can change the pool and must produce a new dataset version before multiplayer is introduced.

- Geometry: [world-atlas](https://github.com/topojson/world-atlas), derived from [Natural Earth](https://www.naturalearthdata.com/), whose map data is public domain. World-atlas's ISC notice is in `public/licenses/world-atlas.txt`.
- Names, region, independence, and ISO metadata: [world-countries](https://github.com/mledoze/countries), ODbL. The derived dataset `public/data/countries.json` is provided under that license; see `public/licenses/world-countries.txt`.
- Flags: [flag-icons](https://github.com/lipis/flag-icons), MIT; see `public/licenses/flag-icons.txt`.

Source dependencies remain in the lockfile so data can be regenerated. Runtime dependencies are limited to the projection and triangulation libraries. WebGL is required for the map; the app reports loading/graphics failures instead of presenting a broken blank canvas.

Pixel HUD font: [Silkscreen](https://fonts.google.com/specimen/Silkscreen), SIL Open Font License; see `public/licenses/silkscreen.txt`.

## Hidden sea monsters

Three original block-built SVG sea creatures occupy open-ocean locations. They are completely hidden below 2.8× zoom, and appear only when their location is near the middle of the viewport. They disappear when zooming out or panning away. Idle artwork stays faint; hover and keyboard focus make it clearer.

- The leviathan sings a short melody and sends out water ripples.
- The kraken releases a local ink cloud and purple particles.
- The dragon breathes gold pixel fire.

These interactions do not submit quiz guesses, change scores, or raise musical flow. They have a short cooldown and use the existing master mute, particle preference, and reduced-motion behavior. No background creature animation loop runs. Positions update only when the map view changes.

The theme references historical cartographic creatures, including those on Olaus Magnus’s Carta Marina: [The Mariners’ Museum](https://www.marinersmuseum.org/2021/03/sea-monsters-revisited-the-carta-marina-and-beyond/). Three is a game-design choice, not a historical rule.

## Music showcase

Open `/music-showcase.html` on the development server to audition either soundtrack in a 53-second stereo preview that builds through all five flow levels, with buttons to audition each stage and a downloadable WAV. It renders offline using the same composer, instruments, timing, and effects rack as the live game, at the same playback level. The final stage includes the full eight-bar call-and-response. The showcase and `/bake.html` are development utilities and are not included in the default production build.
