# ship-builder

Campaign tooling for **Persephone**, a Stars Without Number campaign with enough homebrew rules 
that every existing tool either doesn't support what we're doing or actively breaks it. So 
instead of adapting, I wrote my own thing like a normal and well-adjusted individual.

![relevant gif](https://media1.tenor.com/m/vCqpL7x4sPUAAAAd/thanos-fine-ill-do-it-myself.gif)

Runs on Svelte, TypeScript, and sheer spite. Deployed [here](https://persephone-tools.vercel.app/).

## What it does:

- **Ship builder**: build and track starship loadouts and hull condition using Persephone's 
  homebrew stats and rules. Will not make sense if you're not in this campaign.
- **Navmap**: interactive navigation map for plotting and tracking travel between systems. 
  Originally a Google Apps Script hell that uses spreadsheets instead of jsons.
- A lot of half assed prototypes that just don't work

## Why does this exist?

1. I completely forgot something like Engines of Babylon existed
2. The campaign has homebrew rules that make it virtually incompatible with every existing 
   campaign management tool anyway
3. I'm fucking schizophrenic

## Running locally

```bash
npm install
npm run dev
```

## Updates

**5/25/2026**
- Ported navmap rendering engine to PixiJS. Fixed infinite fuel issue
- There are still so many bugs to iron out oh my fucking god

**5/19/2026**
- Fixed some nav panel bugs

**5/18/2026**
- General bug fixes

**5/17/2026**
- Ported navmap from Google Apps Script to Svelte, added some new functionality