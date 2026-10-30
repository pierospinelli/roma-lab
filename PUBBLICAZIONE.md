# Roma Lab 0.17 — GitHub Pages e GitLab Pages

Questa distribuzione parte **dalla versione 0.15**: menu con 3 modalità, combo 454 territori e pannello Layer.

## GitHub

1. Copiare nella **radice** del repository TUTTI i file e cartelle contenuti in `roma-lab/`, compresa la cartella NASCOSTA `.github/` (importante).
2. Rimuovere eventuali copie obsolete come `docs/` se erano in uso.
3. GitHub → Settings → Pages → Source: **GitHub Actions**.
4. Eseguire `git add -A && git commit -m "Roma Lab 0.17" && git push`.
5. Aprire Actions → workflow **Pubblica Roma Lab** → verificare deployment verde.
6. Aprire `https://pierospinelli.github.io/roma-lab/` con refresh forzato (`Ctrl+F5`).

La pipeline genera `public/`: NON è necessario committarla, poiché viene ricreata ad ogni pubblicazione. Funziona anche per branch `master`.

## Diagnosi mappa

Aprire DevTools (F12), schede Console e Network. Devono risultare HTTP 200:

- `https://pierospinelli.github.io/roma-lab/vendor/cesium/Cesium.js`
- `https://pierospinelli.github.io/roma-lab/js/districts.geojson`
- `https://pierospinelli.github.io/roma-lab/vendor/cesium/Workers/` (singoli script richiesti)

Se il vecchio menu ha 5 voci, è ancora pubblicata la versione precedente o è presente una cache.
La riga `CESIUM_BASE_URL` è ora risolta dall'URL della pagina, per funzionare anche in sottodirectory.

## GitLab

La configurazione `.gitlab-ci.yml` genera `public/` da sorgenti.

## Locale

`avvia.bat` oppure `node server.mjs`; aprire http://localhost:6060.
