# Roma Lab v0.15 — CesiumJS 2D

Gioco didattico completamente locale per conoscere i quartieri di Roma e le strade principali.

## Avvio

Installare Node.js 20 o successivo. Su Windows eseguire `avvia.bat`, su Linux/macOS `sh avvia.sh`. Aprire `http://localhost:6060`. Il server in ascolto su `127.0.0.1:6060` serve solamente file statici; non ci sono backend, database o servizi cloud.

## Dati geografici

Fonte ufficiale: Roma Capitale GeoServer WFS 1.0, layer `DIPAU:nuova_geografia_urbana_localita`, scaricato in WGS84 il 29 ottobre 2026 da `https://geoportale.comune.roma.it/geoserver/ows`.

- **332 quartieri urbani**, inclusi EUR, Spinaceto, Mostacciano, Acilia e Casal Palocco.
- **22 rioni** confermati del centro storico.
- **100 zone funzionali**, ora trattate esattamente come quartieri e rioni: stesse interazioni e presenza in tutti i quiz del livello di difficoltà massimo.
- La delibera finale del 1 ottobre 2026 approva 334 quartieri; il WFS pubblico, alla data dello scaricamento, ne restituisce 332. Non sono inventati i due perimetri mancanti.
- Tre livelli cumulativi di difficoltà: Forestiero Informato (46 aree), Romano de Roma (175), Manco 'n tassinaro (454). L'attribuzione didattica dei livelli è preliminare; per ora tutte le zone funzionali sono nel terzo livello.

Le strade e i dati di trasporto derivano dall'estratto OpenStreetMap Centro Italia di Geofabrik del 28 ottobre 2026. Il test dei movimenti è stato rimosso. Il pulsante «Layer» in alto a destra permette di mostrare o nascondere le strade principali, i tracciati Metro A/B/B1/C, le stazioni Metro e le stazioni ferroviarie durante qualsiasi esercizio. I tracciati Metro sono estratti dalle geometrie OSM che riportano esplicitamente il nome di linea; non equivalgono a una topologia completa e ufficiale dell'infrastruttura. Le stazioni derivano da punti OSM deduplicati per nome e posizione. Cliccando su una stazione si apre un riquadro informativo. Le opzioni «Sedi dei municipi», «Luoghi da visitare», «Ospedali e cliniche» e «Parchi e giardini» sono predisposte ma disabilitate finché non saranno integrati i rispettivi dataset verificati.

Le etichette dei quartieri sono spezzate su più righe quando contengono più parole; il loro centro visivo coincide con il baricentro geografico calcolato dai poligoni, tenendo conto delle diverse parti della stessa area. Per forme molto concave il baricentro matematico può cadere fuori dal perimetro.

Nella versione 0.14 il menu di sinistra non contiene più «Learn spostamenti»: le strade sono disponibili come layer opzionale in tutte le modalità. Il pulsante «Layer» è allineato alla testata «Roma e i suoi quartieri». Le 100 zone funzionali utilizzano una tinta lilla diversa dal verde salvia dei quartieri e rioni; selezione e risposte continuano a usare i colori del gioco.

Nella versione 0.15 il menu contiene «01 Quartieri», «02 Test quartieri · dove» e «03 Test quartieri · nomi». La combo alla sinistra del pulsante «Layer» elenca alfabeticamente tutti i territori (anche quelli del livello massimo): selezionandone uno l'app passa alla modalità Quartieri, adegua il livello se necessario, evidenzia il poligono in giallo, apre il fumetto e ingrandisce la mappa sul suo perimetro geografico.

Il Tevere è ancora rappresentato con una polilinea geografica **indicativa**. Il fondo cartografico è neutro: non occorre scaricare tile da Internet. Asset, Workers e CSS di CesiumJS sono forniti in `vendor/cesium/` (licenza Apache-2.0). Rete stradale © OpenStreetMap contributors (ODbL).

## Denominazioni

La tabella `js/names.js` contiene sinonimi e nomi comuni verificati. Sulla mappa compare il nome comune; le domande dei test selezionano casualmente una delle denominazioni disponibili; i risultati mostrano `nome comune (nome ufficiale)` solo quando i due differiscono. Tutti gli alias della stessa area hanno lo stesso ID, dunque sono equivalenti nelle risposte. EUR è il nome ufficiale **anche nella nuova suddivisione**; `Europa` è qui mantenuto come alias storico.

## Cinque modalità

1. Learn quartieri
2. Learn spostamenti
3. Test quartieri dove
4. Test quartieri nomi

Le etichette delle strade hanno un filtro di priorità, un limite di densità e un controllo anti-sovrapposizione. Vengono nascoste completamente allo zoom molto ravvicinato. Le etichette dei quartieri sono piccole quando ci si avvicina.

Le etichette di tutti i territori sono sottoposte a un controllo anti-sovrapposizione in coordinate schermo, aggiornato al termine del movimento della camera.

### Fumetto informativo

Nelle modalità Learn, cliccando su una qualunque area geografica questa viene evidenziata in giallo e compare un fumetto HTML ancorato alla posizione dell'area. Mostra: denominazione comune, denominazione ufficiale, alias, Municipio, codice, superficie e tipologia. Anche al termine dei quiz geografici viene mostrato il fumetto della risposta corretta. L'oggetto dati prevede un array `pointsOfInterest` per arricchimenti futuri (monumenti, musei, parchi, chiese, sedi municipali): per ora non viene riempito con informazioni non verificate.

## Rigenerazione (solo sviluppo)

`build-new-districts.mjs` converte `new-geography-source.geojson` (sorgente integrale WFS, **non richiesta a runtime**) nei file `js/districts.geojson` e `js/data.js`.

`rebuild-road-links.py` richiede `shapely` in fase di sviluppo e aggiorna `js/roads.js` usando le polilinee OSM già estratte. `build-roads.py` richiede inoltre `osmium` e il file originale `.osm.pbf` per ricostruire tutte le strade. Questi strumenti **non servono per avviare Roma Lab**.

I file `build-map.mjs` e i quattro `*-source.geojson` restano nel pacchetto per riprodurre, se necessario, la versione storica a 115 perimetri.
