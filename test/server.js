// Server di prova: serve la pagina e un correttore FINTO su /api (nessuna IA, nessuna chiave).
// Avvio: node test/server.js  poi apri http://localhost:8787
const http = require("http"), fs = require("fs"), path = require("path");
const RADICE = path.join(__dirname, "..");
const TIPI = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
let chiamate = 0;

http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api") {
    let corpo = "";
    req.on("data", c => corpo += c);
    req.on("end", () => {
      chiamate++;
      const d = JSON.parse(corpo || "{}");
      // ogni 7ª chiamata risponde con JSON rotto: serve a provare il "riprova una volta"
      if (chiamate % 7 === 0) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end("{rotto"); }
      let r;
      if (d.modalita === "verifica") {
        const ok = !/ o visto|correvano| dice |che gli|bello\.|e lui| quindi |sole illuminava|roba/.test(" " + d.verifica.frase_riscritta + " ");
        r = { frasi: [ok ? { frase_originale: d.verifica.frase_riscritta, errore_trovato: false, errori: [] }
          : { frase_originale: d.verifica.frase_riscritta, errore_trovato: true, errori: [{ indizio: "Rileggi la parte evidenziata: è cambiata davvero?" }] }] };
      } else {
        r = JSON.parse(fs.readFileSync(path.join(__dirname, "finto.json"), "utf8"));
        if (d.modalita === "frasi") { delete r.scheda_4c; delete r.scheda_tipologia; }
      }
      setTimeout(() => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(r)); }, 600);
    });
    return;
  }
  const f = path.join(RADICE, decodeURIComponent(req.url.split("?")[0]) === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(RADICE)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, dati) => {
    if (e) { res.writeHead(404); return res.end("Non trovato"); }
    res.writeHead(200, { "Content-Type": (TIPI[path.extname(f)] || "application/octet-stream") + "; charset=utf-8" });
    res.end(dati);
  });
}).listen(8787, () => console.log("Prova su http://localhost:8787"));
