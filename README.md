# QA Portfolio — Arjun Singh

A static, animated portfolio page for an SDET/QA automation profile. No build step, no framework — just `index.html`, `styles.css`, and `script.js`.

## Preview locally

Open `index.html` directly in a browser, or serve it so relative paths behave exactly like production:

```
npx serve QA_Portfolio
```

## Customize content

- **Text/sections** — edit `index.html` directly. Each section is commented (`<!-- HERO -->`, `<!-- SKILLS -->`, etc.).
- **Contact links** — in the Contact section, replace the placeholder buttons:
  ```html
  <a class="btn btn--ghost btn--placeholder" href="#" title="Add your email address here">+ Add email</a>
  <a class="btn btn--ghost btn--placeholder" href="#" title="Add your GitHub profile here">+ Add GitHub</a>
  ```
  Swap `href="#"` for a real `mailto:` / GitHub URL and remove the `btn--placeholder` class so it matches the other buttons.
- **Projects** — each `<article class="card card--tilt">` in the Projects section is one project card; copy/edit/remove as needed.
- **Colors/fonts** — all theme colors are CSS variables at the top of `styles.css` (`:root` for dark, `:root[data-theme="light"]` for light).

## Light / dark mode

A toggle button in the nav (`#themeToggle`) switches themes by setting `data-theme="light"|"dark"` on `<html>`. The choice is saved in the visitor's browser (`localStorage`) and defaults to their OS preference (`prefers-color-scheme`) on first visit.

## Deploy to GitHub Pages

1. Push this folder's contents to a repo (or a `docs/` folder / dedicated branch).
2. In the repo on GitHub: **Settings → Pages → Source**, pick the branch/folder containing `index.html`.
3. GitHub gives you a `https://<username>.github.io/<repo>/` URL within a minute or two.

No environment variables, API keys, or server needed — it's a fully static page.
