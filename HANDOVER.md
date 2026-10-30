# HANDOVER PROGETTO — ROMA LAB

## 1. Ruolo e obiettivo

Sei un senior software engineer incaricato di prendere in carico, mantenere ed evolvere **Roma Lab**, un'applicazione cartografica interattiva dedicata alla conoscenza dei quartieri, delle strade e dei luoghi d'interesse di Roma.

Il progetto è stato sviluppato iterativamente con ChatGPT. Da questo momento devi considerare **i sorgenti presenti nella directory locale come fonte primaria della verità**, utilizzando le informazioni seguenti come specifiche funzionali e architetturali.

Non riscrivere inutilmente il progetto e non perdere funzionalità esistenti.

Prima di apportare modifiche:
1. Esamina la struttura completa del repository.
2. Identifica entry point, moduli, dataset, dipendenze e script.
3. Ricostruisci il funzionamento dell'applicazione.
4. Verifica le funzionalità effettivamente implementate.
5. Individua eventuali discrepanze rispetto alle specifiche riportate di seguito.

## 2. Architettura tecnica

Roma Lab è una Single Page Application statica basata su:

- HTML5
- CSS3
- JavaScript
- CesiumJS in modalità SCENE2D
- GeoJSON e dataset JSON locali
- OpenStreetMap come origine di parte dei dati geografici
- Nessun backend applicativo
- Nessun database

L'applicazione deve funzionare:

**In locale**
- URL: http://localhost:6060
- Server HTTP statico.
- Nessuna connessione Internet obbligatoria durante l'uso, salvo l'apertura volontaria di link esterni.

**Online**
- GitHub Pages.
- Repository: https://github.com/pierospinelli/roma-lab
- Sito: https://pierospinelli.github.io/roma-lab/
- Pubblicazione tramite GitHub Actions.

Il progetto deve rimanere compatibile anche con GitLab Pages.

ATTENZIONE: CesiumJS deve utilizzare URL relativi alla posizione effettiva dell'applicazione. Evitare percorsi assoluti incompatibili con la sottodirectory `/roma-lab/`.

Esempio:

```javascript
window.CESIUM_BASE_URL =
  new URL("vendor/cesium/", document.baseURI).href;
```

Verifica il comportamento effettivo dei Web Worker e degli asset Cesium.

## 3. Cartografia territoriale

La mappa utilizza la nuova classificazione territoriale di Roma Capitale.

Nel dataset attualmente disponibile risultano:

- 332 quartieri urbani
- 22 rioni
- 100 zone funzionali

Totale: **454 territori**.

I territori sono rappresentati tramite poligoni geografici reali.

Le aree funzionali hanno una colorazione distinta dai quartieri e dai rioni, ma sono considerate territori a tutti gli effetti, anche nei quiz.

La classificazione definitiva prevede 334 quartieri urbani. Verificare periodicamente se Roma Capitale abbia pubblicato i due ulteriori perimetri, senza inventare geometrie mancanti.

### Livelli didattici

Sono previsti tre livelli cumulativi:

1. Forestiero Informato
2. Romano de Roma
3. Manco 'n tassinaro

Il livello superiore comprende tutti i territori dei livelli precedenti.

### Modalità applicative

Il menu di sinistra deve contenere esclusivamente tre modalità, numerate consecutivamente:

01 — Quartieri  
02 — Test quartieri · dove  
03 — Test quartieri · nomi

Non reintrodurre:
- Learn spostamenti
- Test movimenti

Queste due modalità sono state eliminate intenzionalmente.

### Interazioni

In modalità Quartieri:

- Cliccando un territorio, evidenziarlo in giallo.
- Aprire un fumetto informativo geograficamente ancorato.
- Mostrare denominazioni, Municipio, codice, superficie e altre informazioni disponibili.
- Permettere la chiusura del fumetto.

Le etichette dei quartieri devono:
- Utilizzare più righe per denominazioni composte.
- Essere centrate orizzontalmente e verticalmente.
- Essere collocate in una posizione rappresentativa del poligono.
- Ridurre le sovrapposizioni.
- Adattare visibilità e dimensione allo zoom.

### Ricerca territoriale

Nella barra superiore della mappa è presente una combo con tutti i territori.

Selezionando una voce:
- Eseguire zoom sul territorio.
- Evidenziarlo in giallo.
- Aprire il fumetto.
- Adeguare il livello didattico, se necessario.

La combo si trova a sinistra del pulsante Layer.

## 4. Denominazioni multiple

Ogni territorio o punto d'interesse può avere:

- Nome comune
- Denominazione ufficiale
- Denominazioni alternative
- Eventuali denominazioni storiche

Esempio:

```javascript
{
  id: "Q_XXXII",
  nomeComune: "EUR",
  nomeUfficiale: "Europa",
  alias: ["E.U.R."]
}
```

Usare i nomi effettivamente presenti nel dataset e verificare le denominazioni ufficiali.

Regole applicative:

- Sulla mappa privilegiare il nome comune.
- Nei quiz scegliere casualmente tra le denominazioni valide.
- Considerare equivalenti tutti i sinonimi della stessa area.
- Nella risposta mostrare `Nome comune (Nome ufficiale)`, soltanto se diversi.
- Non confondere un sinonimo con un quartiere geograficamente distinto.

La stessa logica si applica a ospedali, monumenti e luoghi d'interesse.

Esempio: l'ospedale sull'Isola Tiberina deve essere visualizzato come **Fatebenefratelli**, con denominazione ufficiale *Ospedale Isola Tiberina – Gemelli Isola* e nome storico *San Giovanni Calibita*.

## 5. Pannello Layer

La mappa dispone di un pulsante Layer, allineato al titolo «Roma e i suoi quartieri».

Il pulsante apre un pannello con checkbox indipendenti.

Layer esistenti o previsti:

**Viabilità e trasporti**
- Strade principali
- Tracciati Metro A, B/B1, C
- Stazioni Metro
- Stazioni ferroviarie

**Amministrazione**
- Sedi dei Municipi, comprese le sedi distaccate

**Sanità**
- Ospedali
- Cliniche
- Centri di cura

**Verde**
- Ville storiche
- Parchi
- Giardini

**Cultura e turismo**
- Monumenti
- Luoghi da visitare

Ogni layer deve poter essere attivato/disattivato indipendentemente dalla modalità didattica.

I layer disattivati non devono intercettare gli eventi di picking.

## 6. Strade

Il layer delle strade principali utilizza geometrie OpenStreetMap.

Nelle ultime versioni è stata aggiunta una scheda informativa che, cliccando una strada, presenta:

- Nome
- Lunghezza
- Territori attraversati
- Possibilità di selezionare un territorio dall'elenco

Il tracciato selezionato viene evidenziato in arancione.

Sono stati costruiti circa 832 gruppi stradali e un indice statico delle intersezioni con i territori.

Questi numeri sono indicativi: verifica i dati effettivi.

ATTENZIONE:
- Non raggruppare indiscriminatamente strade omonime.
- Considerare la continuità geografica.
- Gestire la possibile presenza di carreggiate parallele.
- Non confondere lunghezza cumulata dei segmenti con distanza percorribile.
- Garantire il picking delle strade anche quando si sovrappongono ai poligoni territoriali.

## 7. Metro e ferrovie

Sono presenti layer distinti per:

- Tracciati delle linee Metro A, B/B1 e C
- Stazioni della metropolitana
- Stazioni ferroviarie

I tracciati sono ricavati da OpenStreetMap.

Ogni stazione può avere un fumetto con nome e tipologia.

Regolare la densità delle etichette in funzione dello zoom.

## 8. Strutture sanitarie

È disponibile un catalogo delle principali strutture sanitarie di Roma.

Comprende ospedali pubblici, policlinici, cliniche e centri di cura.

Ogni punto deve avere una scheda contenente:

- Nome comune
- Nome ufficiale
- Eventuali nomi storici
- Tipologia
- Descrizione
- Indirizzo
- Link al sito ufficiale
- Link Google Maps

I link esterni devono aprirsi in un'altra scheda, con adeguati attributi di sicurezza.

Il catalogo deve essere progressivamente ampliato utilizzando fonti verificabili.

Non presentare le coordinate indicative come georeferenziazioni precise.

## 9. Sedi municipali

Roma è divisa in 15 Municipi.

Un Municipio può avere più sedi fisiche.

Il modello dati deve distinguere:
- Municipio amministrativo
- Sede principale
- Sede distaccata
- Ufficio anagrafico
- URP
- Altri servizi municipali

Ogni sede deve avere un proprio identificativo e punto geografico.

Ogni scheda deve mostrare:
- Municipio
- Nome della sede
- Funzione
- Indirizzo
- Sito istituzionale
- Link Google Maps
- Eventuali altre sedi dello stesso Municipio

Nella versione precedente erano censite circa 20 sedi.

Non considerare l'elenco completo: verificarlo ed estenderlo dalle fonti istituzionali.

## 10. Ville, parchi e giardini

È presente un primo catalogo di circa 30 luoghi.

Tra questi:
- Villa Borghese
- Villa Doria Pamphilj
- Villa Ada
- Villa Torlonia
- Villa Celimontana
- Villa Sciarra
- Parco degli Acquedotti
- Caffarella
- Giardino degli Aranci
- Orto Botanico

Attualmente molti elementi sono rappresentati da punti.

Una futura evoluzione consiste nell'aggiungere i perimetri reali dei parchi e dei giardini, quando disponibili.

## 11. Monumenti

È stato introdotto un layer Monumenti con circa 30 elementi principali.

Esempi:
- Colosseo
- Pantheon
- Fontana di Trevi
- Castel Sant'Angelo
- Vittoriano
- Piramide Cestia
- Arco di Costantino
- Colonna Traiana

La rappresentazione sulla mappa utilizza miniature fotografiche o illustrative con dimensioni e visibilità dipendenti dallo zoom.

Cliccando un monumento compare una scheda con:
- Nome
- Immagine
- Descrizione
- Link Google Maps
- Eventuali crediti fotografici

### Attività aperta: fotografie reali

La versione v0.25 ha predisposto un importatore di fotografie da Wikimedia Commons.

Dovrebbe essere presente lo script:

`importa-foto-commons.mjs`

L'obiettivo è sostituire le miniature SVG illustrative con fotografie reali.

**Questa è una delle prime attività che devi completare.**

Per ciascun monumento:

1. Cercare una fotografia rappresentativa, preferibilmente frontale.
2. Verificare che il soggetto corrisponda al monumento.
3. Verificare la licenza di riutilizzo.
4. Scaricare una versione di dimensioni contenute.
5. Salvare l'immagine localmente.
6. Aggiornare il dataset.
7. Registrare autore, fonte e licenza.
8. Aggiornare `CREDITI_IMMAGINI.md`.
9. Mostrare il credito fotografico nel popup.

Preferire Wikimedia Commons e contenuti CC0, pubblico dominio oppure Creative Commons compatibili con la distribuzione. Rispettare attribuzione e altre condizioni della licenza.

Non usare immagini Google o fotografie prive di autorizzazione verificabile.

Le immagini devono funzionare anche offline.

## 12. Luoghi da visitare

È presente un layer separato dai Monumenti, con circa 52 punti.

Comprende:
- Musei
- Chiese e basiliche
- Piazze storiche
- Luoghi panoramici
- Altri luoghi d'interesse

Sono rappresentati da simboli puntuali, non da miniature monumentali.

Ogni scheda deve contenere:
- Nome
- Categoria
- Descrizione
- Link Google Maps

Evitare duplicazioni fra Monumenti e Luoghi da visitare, definendo una categoria prevalente per ogni luogo.

## 13. Requisiti tecnici generali

### Navigazione

- CesiumJS SCENE2D.
- Zoom e pan fluidi.
- Limiti geografici alla navigazione, indicativamente circoscritti al Lazio.
- Limiti ragionevoli allo zoom minimo e massimo.
- Centramento e zoom sui territori selezionati.

### Rendering

- Ridurre la densità delle etichette.
- Evitare sovrapposizioni tra icone e nomi.
- Dimensionare simboli e miniature in base alla scala.
- Dare priorità alle etichette territoriali.
- Ridurre il carico grafico durante il movimento della camera.
- Evitare ricaricamenti inutili dei dataset.

### Picking

Quando più layer si sovrappongono, definire una priorità di selezione coerente.

Una strada, un monumento o un ospedale deve poter essere selezionato senza che il poligono territoriale sottostante intercetti sempre il clic.

### Sicurezza

- Non inserire credenziali o token nei sorgenti.
- Non caricare contenuti HTML non attendibili senza sanitizzazione.
- Utilizzare `noopener noreferrer` nei link esterni.
- Evitare dipendenze CDN necessarie per il funzionamento ordinario.

## 14. Pubblicazione

Il repository deve consentire:

### Sviluppo locale

Avvio tramite server statico su:

`http://localhost:6060`

### GitHub Pages

Pubblicazione automatica tramite workflow GitHub Actions.

La directory `public/` deve contenere esclusivamente i file necessari all'esecuzione del sito.

Verificare:
- URL relativi
- Cesium Workers
- Cesium Assets
- Cesium Widgets
- GeoJSON
- JSON dei layer
- Immagini locali
- CSS e JavaScript

Non modificare direttamente i file generati senza aggiornare anche i sorgenti e il processo di build.

In caso di modifica, eseguire la rigenerazione della distribuzione attraverso lo script esistente, presumibilmente:

```bash
node prepare-pages.mjs
```

Verificare il nome reale dello script prima di eseguirlo.

## 15. Modalità di lavoro

Lavora in maniera incrementale.

Per ogni intervento:

1. Analizza il codice interessato.
2. Descrivi brevemente le modifiche previste.
3. Modifica i sorgenti.
4. Esegui controlli sintattici.
5. Esegui eventuali test automatici.
6. Rigenera la distribuzione.
7. Verifica che non ci siano regressioni.
8. Aggiorna il README e la documentazione quando necessario.
9. Riporta file modificati, verifiche eseguite e problemi residui.

Se disponibile, utilizza Playwright per testare automaticamente l'applicazione in un browser reale.

Non dichiarare verificata una funzionalità se hai eseguito soltanto un controllo sintattico.

Evita refactoring estesi non richiesti.

Non introdurre framework, database o backend senza una necessità tecnica motivata.

Mantieni i dataset separati dalla logica applicativa e privilegiarne una struttura facilmente estendibile.

## 16. Primo incarico

Dopo aver analizzato il repository, procedi con le seguenti attività:

**Fase A — Ricognizione**
- Identifica la versione effettivamente presente.
- Verifica che tutte le funzionalità descritte siano disponibili.
- Individua eventuali bug evidenti o file obsoleti.
- Controlla il processo GitHub Pages.

**Fase B — Fotografie monumenti**
- Completa l'importazione delle fotografie reali da Wikimedia Commons.
- Verifica soggetti e licenze.
- Inserisci immagini e attribuzioni.
- Assicurati che le miniature funzionino sulla mappa e nelle schede, offline e online.

**Fase C — Test**
- Avvia l'applicazione su localhost:6060.
- Verifica caricamento Cesium e dei dataset.
- Verifica i layer Monumenti e Luoghi da visitare.
- Verifica il clic sulle miniature e i popup.
- Verifica la selezione dei quartieri.
- Verifica la generazione della distribuzione GitHub Pages.

**Fase D — Consegna**
- Riassumi le modifiche.
- Elenca le fotografie aggiunte e quelle mancanti.
- Indica i test eseguiti.
- Segnala eventuali problemi.
- Lascia il repository pronto per commit e push.

Non eseguire il push senza una mia richiesta esplicita.

**Inizia esaminando il repository locale e proponendo un piano sintetico, poi implementa le attività senza richiedere conferme non necessarie.**
