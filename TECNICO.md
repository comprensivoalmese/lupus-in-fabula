# Officina della scrittura — note tecniche (per chi gestisce il sito)

## Come è fatto
- **Pagina:** HTML/CSS/JS senza librerie (`index.html`, `stile.css`, `app.js`), pubblicata con GitHub Pages dal branch `main`.
- **Correttore:** un Cloudflare Worker (`worker/worker.js`) all'indirizzo `https://officina-scrittura.icalmese-wolf.workers.dev`. Riceve il testo, chiama l'IA e restituisce JSON. Accetta richieste solo da `https://comprensivoalmese.github.io` e testi fino a 4000 caratteri. Non salva niente.
- **Chiave dell'IA:** salvata su Cloudflare come secret `API_KEY`. Non va MAI scritta nei file del sito.
- **Dati dei docenti:** il worker legge `data/casi.json` e `data/tipologie.json` dal sito pubblicato, con un aggiornamento ogni 5 minuti.

## Aggiornare il worker
Dalla cartella `worker`, con Node.js installato:
```
npx.cmd --yes wrangler@4 deploy
```
La prima volta si apre il browser per l'accesso a Cloudflare. Per cambiare la chiave:
```
npx.cmd --yes wrangler@4 secret put API_KEY
```
e incollare la chiave quando la chiede.
In alternativa: Cloudflare → Workers & Pages → `officina-scrittura` → **Edit code**, incollare `worker.js` → **Deploy**; la chiave sta in **Settings → Variables and Secrets**.

## Cambiare IA
In cima a `worker.js`:
- `PROVIDER`: `"gemini"` oppure `"claude"`;
- `GEMINI_MODEL` e `GEMINI_RISERVA`: il modello principale e quello usato quando il primo è sovraccarico o lento;
- `CLAUDE_MODEL`.

Per passare a Claude: `PROVIDER = "claude"`, poi ripubblicare il worker e sostituire `API_KEY` con una chiave Anthropic (<https://console.anthropic.com>).

## Aggiornare la pagina
Dopo una modifica a `app.js` o `stile.css`, aumentare il numero `?v=` in `index.html`: così i browser caricano subito la versione nuova.

## Provare in locale
```
node test/server.js
```
Poi aprire <http://localhost:8787>. Risponde un correttore finto (`test/finto.json`), senza IA e senza chiave.

## Formato degli esercizi (`data/esercizi.json`)
- `c`: correttezza, chiarezza, coesione, coerenza · `tipo`: uno dei 10 tipi · `classe`: es. `[1,2,3]` · `tipologia`: solo per gli esercizi sulle tipologie.
- `formato`:
  - `scelta`: `opzioni` + `corretta`, cioè la posizione della risposta giusta (la prima è 0);
  - `completa`: `testo` con `___` + `risposte` accettate;
  - `riscrivi`: `frase` + `soluzione`;
  - `riordina`: `elementi` già nell'ordine giusto (la pagina li mescola).
