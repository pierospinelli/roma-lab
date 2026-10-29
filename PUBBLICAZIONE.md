# Pubblicazione Roma Lab su GitHub Pages o GitLab Pages

Roma Lab è un sito statico: non richiede Node.js né backend **durante la navigazione**.
Node.js è usato soltanto per generare i file di distribuzione, eventualmente in CI.

## Struttura

- `index.html`, `css/`, `js/`, `vendor/cesium/`: risorse dell'applicazione.
- `prepare-pages.mjs`: prepara una cartella `public/` con le sole risorse necessarie.
- `.github/workflows/pages.yml`: pubblicazione GitHub Pages a ogni push su `main`.
- `.gitlab-ci.yml`: pubblicazione GitLab Pages sul branch predefinito.
- `server.mjs`, `avvia.bat`, `avvia.sh`: modalità locale di sviluppo.
- `build-*.py`, `build-*.mjs`, `*-source.geojson`: strumenti e input GIS usati in fase di preparazione, **non pubblicati**.

## Verifica locale della distribuzione

Da questa directory esegui:

```bash
node prepare-pages.mjs
```

Si crea `public/`; apri questa cartella con un semplice server statico HTTPS/HTTP.
Le librerie CesiumJS e tutti i dati geografici sono già all'interno.
Puoi ancora avviare l'applicazione di sviluppo con `avvia.bat`/`avvia.sh`.

## Pubblicazione GitHub Pages

1. Crea un repository `roma-lab` su GitHub.
2. Nella **radice del repository**, carica il contenuto della directory `roma-lab/` di questo archivio, **non** la directory contenitrice.
3. Controlla che `.github/workflows/pages.yml` sia stato caricato: alcune operazioni di copia nascondono le directory che iniziano con un punto.
4. Imposta il branch predefinito `main` (oppure adatta la voce `branches` nel workflow).
5. Apri **Settings → Pages**, scegli come origine **GitHub Actions**.
6. Esegui il push su `main` o avvia il workflow dalla scheda **Actions**.

Il sito sarà disponibile all'indirizzo `https://NOMEUTENTE.github.io/roma-lab/` (se il repository si chiama `roma-lab`).
Il percorso `/roma-lab/` funziona senza cambiare i riferimenti: Cesium e GeoJSON usano URL relativi.

**Nota:** GitHub Pages è pubblicamente raggiungibile su Internet anche con alcune configurazioni di repository privato. Non pubblicare dati sensibili.

## Pubblicazione GitLab Pages

1. Crea un progetto GitLab `roma-lab`.
2. Carica nella radice del repository il contenuto della directory `roma-lab/`.
3. Verifica la presenza di `.gitlab-ci.yml` e che i runner GitLab siano abilitati.
4. Esegui un push sul branch predefinito.
5. La pipeline genera `public/` e pubblica il sito con `pages: true`.

Il collegamento esatto compare nel progetto sotto **Deploy → Pages**.
Su GitLab.com è normalmente `https://NOMEUTENTE.gitlab.io/roma-lab/`, salvo opzioni di dominio personalizzato o dominio univoco.

## Come aggiornare il sito

Per una nuova versione modifica i sorgenti e fai commit/push sul branch predefinito:
la pipeline rigenera automaticamente `public/`. Non serve caricare manualmente la cartella.

Per distribuire manualmente i file su un qualsiasi server statico usa invece `node prepare-pages.mjs` e copia **il contenuto** di `public/` nella directory servita dal web server.

## Limiti e licenze

- I dati geografici sono una fotografia della data di generazione: non si aggiornano automaticamente.
- Attribuzione OpenStreetMap: mantenere il riferimento `© OpenStreetMap contributors` presente nell'interfaccia.
- Verifica eventuali ulteriori obblighi di attribuzione dei dataset geografici originali prima di una pubblicazione pubblica.
- La pubblicazione su Pages richiede normalmente HTTPS e connessione Internet per i visitatori; il bundle non chiama servizi esterni in esecuzione.
