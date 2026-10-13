# Site tests

Playwright tests for the portfolio site itself — nav, theme toggle, contact links,
responsive layout, reduced-motion handling, and a console-error health check. Runs
automatically on every push via `.github/workflows/playwright.yml`.

## Run locally

```
cd tests
npm install
npx playwright install
npx playwright test
```

Spins up the site with `serve` on `localhost:4173` automatically (see `playwright.config.js`).
