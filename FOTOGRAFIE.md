# Fotografie reali dei monumenti

Roma Lab v0.25 include un importatore per fotografie di Wikimedia Commons.

Le miniature illustrative restano attive finché non viene eseguita l'importazione.
Da una macchina con accesso Internet, all'interno della directory `roma-lab`, eseguire:

```bash
node importa-foto-commons.mjs
node prepare-pages.mjs
```

L'importatore usa la API Commons, controlla informazioni essenziali di licenza e autore, scarica miniature locali e registra `CREDITI_IMMAGINI.md`. Se una foto non presenta metadata compatibili o non è scaricabile, mantiene l'illustrazione esistente.

Il catalogo iniziale punta a 11 monumenti celebri. La selezione automatica attraverso una ricerca testuale **non garantisce** che l'inquadratura sia frontale o che rappresenti esattamente il monumento: prima della pubblicazione controllare visivamente ogni immagine e verificarne pagina, autore e termini di riuso. Il sito rimane offline dopo l'importazione.
