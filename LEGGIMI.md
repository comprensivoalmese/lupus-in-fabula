# Officina della scrittura — istruzioni per i docenti

Laboratorio di autocorrezione basato sulle 4 C (Correttezza, Chiarezza, Coesione, Coerenza).
La pagina è pubblica su GitHub Pages. L'intelligenza artificiale viene chiamata da un piccolo programma, il **worker**, che sta su Cloudflare e custodisce la chiave segreta. Nessun testo viene salvato.

## 1. Pubblicare il worker su Cloudflare (una volta sola)
1. Crea un account gratuito su <https://dash.cloudflare.com/sign-up>.
2. Nel menu a sinistra: **Compute (Workers)** → **Workers & Pages** → **Create** → **Create Worker** (va bene "Hello World").
3. Dagli un nome, per esempio `officina-scrittura`, e premi **Deploy**.
4. Premi **Edit code**, cancella tutto, incolla il contenuto del file `worker/worker.js` e premi **Deploy**.
5. Copia l'indirizzo del worker (tipo `https://officina-scrittura.NOME.workers.dev`).
6. Apri `app.js`: nella riga `var WORKER_URL = ...` (in alto) metti quell'indirizzo tra gli apici. Poi ricarica `app.js` su GitHub.

## 2. Dove incollare la chiave dell'IA
1. Prendi una chiave Gemini gratuita su <https://aistudio.google.com/apikey>.
2. Su Cloudflare apri il worker → **Settings** → **Variables and Secrets** → **Add**.
3. Tipo **Secret**, nome `API_KEY`, valore: incolla la chiave → **Deploy**.
La chiave non va MAI scritta nei file del sito.

## 3. Cambiare IA (passare a Claude)
Nel worker, in alto, cambia `const PROVIDER = "gemini";` in `const PROVIDER = "claude";`, poi **Deploy**.
Sostituisci il secret `API_KEY` con una chiave Anthropic (<https://console.anthropic.com>).
I nomi dei modelli sono nelle righe `GEMINI_MODEL` e `CLAUDE_MODEL`.

## 4. Aggiungere esercizi
File `data/esercizi.json`. Copia un esercizio simile e cambia `id` (deve essere unico) e i testi.
- `c`: correttezza, chiarezza, coesione, coerenza · `tipo`: uno dei 10 tipi · `classe`: per esempio `[1,2,3]` · `tipologia`: solo per gli esercizi sulle tipologie.
- `formato`:
  - `scelta`: `opzioni` + `corretta`, cioè la posizione della risposta giusta (la prima è 0);
  - `completa`: `testo` con `___` + `risposte` accettate;
  - `riscrivi`: `frase` + `soluzione`;
  - `riordina`: `elementi` già nell'ordine giusto (la pagina li mescola).
- Attenzione alle virgole e alle virgolette: per controllare che il file sia scritto bene puoi incollarlo su <https://jsonlint.com>.

## 5. Modificare criteri, tipologie e avviso
File `data/tipologie.json`:
- `avviso`: testo del riquadro iniziale, promemoria e messaggio "errore non trovato";
- `tipologie`: definizione, struttura, esempio, **criteri** (vengono passati all'IA) e registro consigliato;
- `quattro_c`: definizioni, esempi e colori delle 4 C.

## 6. Provare in locale (facoltativo)
Con Node.js installato: `node test/server.js` e apri <http://localhost:8787>. Risponde un correttore finto (`test/finto.json`), senza IA.

## 7. Pubblicare su GitHub
Carica tutti i file (tranne, se volete, la cartella `test`) con **Add file → Upload files**. Poi vai su **Settings → Pages**, scegli il branch **main** e premi **Save**.
