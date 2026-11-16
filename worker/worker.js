// Officina della scrittura — Cloudflare Worker
// Riceve il testo dalla pagina, chiama l'IA con la chiave segreta e restituisce JSON.
// Non salva nulla. La chiave NON è qui: va salvata su Cloudflare come secret "API_KEY".

// ===== IMPOSTAZIONI (per cambiare IA basta modificare queste righe) =====
const PROVIDER = "gemini";                    // "gemini" oppure "claude"
const GEMINI_MODEL = "gemini-flash-latest";   // modello Flash più recente di Google
const GEMINI_RISERVA = "gemini-flash-lite-latest"; // usato da solo se il primo è sovraccarico
const CLAUDE_MODEL = "claude-haiku-5-5";      // modello Claude da usare se PROVIDER = "claude"
const ORIGINE_PERMESSA = "https://comprensivoalmese.github.io";
const MAX_CARATTERI = 4000;

const SCHEMA = `{"frasi":[{"frase_originale":"","errore_trovato":true,"errori":[{"parte_errata":"","c":"correttezza|chiarezza|coesione|coerenza","tipo":"ortografia|morfosintassi|tempi_verbali|punteggiatura|sintassi|lessico|connettivi|riferimenti|coerenza|registro","indizio":"","spiegazione":"","proposta_corretta":""}],"registri":{"formale":"","standard":"","informale":"","adatto":"formale|standard|informale","perche":""}}],"lessico":[{"parola":"","ripetizioni":2,"sinonimi":[""]}],"scheda_4c":{"correttezza":{"punto_di_forza":"","consiglio":""},"chiarezza":{"punto_di_forza":"","consiglio":""},"coesione":{"punto_di_forza":"","consiglio":""},"coerenza":{"punto_di_forza":"","consiglio":""}},"scheda_tipologia":{"criteri_rispettati":[""],"criteri_da_migliorare":[""]},"categorie_da_esercitare":[""],"commento_positivo":""}`;

function promptDiSistema(d) {
  const t = d.tipologia || {};
  return `Sei un insegnante di italiano della scuola secondaria di primo grado che aiuta un alunno di ${d.classe}ª media (11-14 anni) ad AUTOCORREGGERE il proprio testo.
Livello: ${d.livello || ""}
Tipologia del testo: ${t.nome}. Criteri di coerenza di questa tipologia:
- ${(t.criteri || []).join("\n- ")}
Registro consigliato: ${t.registro_consigliato}. ${t.registro_note || ""}

Classifica ogni errore in una delle 4 C e in un tipo:
- correttezza: ortografia, morfosintassi, tempi_verbali, punteggiatura
- chiarezza: sintassi (frasi contorte o troppo lunghe, soggetto/verbo mancante, "che" polivalente, ANACOLUTO cioè frase che inizia con una costruzione e prosegue con un'altra lasciando in sospeso il soggetto iniziale — es. "Io, se ho un'idea, niente me la fa cambiare" o "sono una persona che se ha un'idea nessuno me la cambia" —, cambio di persona o di soggetto a metà frase, concordanze sbagliate a distanza, frasi incomplete), lessico (ripetizioni, parole generiche)
- coesione: connettivi (mancanti, ripetuti, sbagliati), riferimenti (pronomi ambigui, ripetizioni al posto di pronomi)
- coerenza: coerenza (contraddizioni, salti logici, ordine delle idee, fuori traccia, violazione dei criteri della tipologia), registro (troppo colloquiale o troppo ricercato per la tipologia)

REGOLE
- Rispondi SOLO con JSON valido, senza testo prima o dopo, con questo schema: ${SCHEMA}
- Nella modalità "frasi" l'errore C'È: lo ha indicato l'insegnante. Usa la nota dell'insegnante e la frase prima/dopo se presenti. Analizza la frase con la grammatica della lingua SCRITTA, non del parlato: costruzioni tollerate nel parlato (anacoluto, "che" polivalente, cambio di soggetto, dislocazioni) sono errori di sintassi in un tema. Prima di rispondere "errore_trovato": false, controlla soggetto e verbo di ogni proposizione e se la costruzione iniziale viene portata a termine.
- Se non trovi un errore certo NON inventarlo: metti "errore_trovato": false ed "errori": [].
- Valuta coesione e coerenza solo se c'è contesto sufficiente.
- Correggi solo dove serve. "parte_errata" deve essere copiata ESATTAMENTE dalla frase.
- "indizio" è una domanda-guida che fa ragionare SENZA dare la soluzione.
- "spiegazione" è breve e per ragazzi e spiega il PERCHÉ (es. "manca il soggetto"); per la coerenza cita il criterio della tipologia.
- "registri": tre versioni corrette della frase (formale, standard, informale) con lo STESSO significato; "adatto" è quella giusta per la tipologia, "perche" una riga (es. "In un testo informativo si usa il registro standard").
- "lessico": segnala ripetizioni e parole generiche (cosa, fare, bello, roba…) con 2-4 sinonimi adatti al contesto.
- "scheda_4c" e "scheda_tipologia" solo nella modalità "tema"; nelle altre modalità omettile.
- "categorie_da_esercitare": i tipi di errore più frequenti.
- Niente voti. Tono incoraggiante. "commento_positivo": una frase che valorizza qualcosa di buono.
- Nella modalità "verifica" restituisci "frasi" con UN solo elemento che valuta la frase riscritta: "errore_trovato": false se gli errori segnalati sono stati corretti e non ci sono errori nuovi, altrimenti gli errori rimasti con il solo indizio.`;
}

function promptSinonimi(d) {
  const t = d.tipologia || {};
  return `Sei un insegnante di italiano della scuola secondaria di primo grado. Un alunno di ${d.classe}ª media (11-14 anni) chiede sinonimi per una parola del suo tema.
Livello: ${d.livello || ""}
Tipologia del testo: ${t.nome || "non indicata"}. Registro consigliato: ${t.registro_consigliato || "standard"}.
Rispondi SOLO con JSON valido con questo schema: {"sinonimi":[{"parola":"","significato":"","esempio":"","registro":"formale|standard|informale"}],"nota":""}
Esempio per la parola "bello" nella frase "La gita è stata bella": {"sinonimi":[{"parola":"divertente","significato":"che fa divertire","esempio":"La gita è stata divertente.","registro":"standard"}],"nota":"«Bello» è generico: scegli la parola che dice com'era davvero."}
- In "parola" scrivi il SINONIMO proposto (mai la parola dell'alunno). Ogni sinonimo deve essere diverso dagli altri.
- Usa solo parole italiane reali e comuni: non inventare parole. Se un sinonimo non è sicuro, non metterlo.
- Se la parola è un verbo generico (fare, mettere, prendere, dire…), proponi verbi precisi che sostituiscono l'intera espressione (es. "fare una passeggiata" → "passeggiare").
- Proponi da 4 a 6 sinonimi o espressioni alternative, adatti al SIGNIFICATO che la parola ha nella frase (se c'è la frase).
- Metti per primi quelli adatti alla tipologia e al registro consigliato; parole comprensibili per l'età.
- "significato": pochissime parole che spiegano la sfumatura. "esempio": la frase dell'alunno (o una frase breve) riscritta con il sinonimo, con lo stesso significato.
- "nota": una riga se la parola è generica (cosa, fare, bello…) o se è meglio cambiare costruzione; altrimenti "".
- Se la parola non esiste o non è italiana, restituisci "sinonimi": [] e spiegalo in "nota". Tono incoraggiante.`;
}

function messaggioUtente(d) {
  if (d.modalita === "sinonimi") {
    const s = d.sinonimi || {};
    return `MODALITÀ: sinonimi\nParola: ${s.parola}\nFrase: ${s.frase || "(non indicata)"}`;
  }
  if (d.modalita === "verifica") {
    const v = d.verifica || {};
    return `MODALITÀ: verifica\nFrase originale: ${v.frase_originale}\nErrori segnalati: ${JSON.stringify(v.errori_segnalati || [])}\nFrase riscritta dall'alunno: ${v.frase_riscritta}`;
  }
  if (d.modalita === "tema") {
    return `MODALITÀ: tema\nTraccia: ${d.traccia || "(non indicata)"}\nTema:\n${d.tema}\n\nIndividua le frasi con errori (una voce in "frasi" per ciascuna) e compila anche scheda_4c e scheda_tipologia.`;
  }
  return "MODALITÀ: frasi\n" + (d.frasi || []).map((f, i) =>
    `Frase ${i + 1}: ${f.frase}\nSegnato dall'insegnante: ${f.nota || "(nulla)"}\nFrase prima: ${f.prima || "(nessuna)"}\nFrase dopo: ${f.dopo || "(nessuna)"}`
  ).join("\n\n") + "\n\nRestituisci una voce in \"frasi\" per ogni frase, nello stesso ordine.";
}

function lunghezzaTesto(d) {
  let n = (d.tema || "").length + (d.traccia || "").length;
  (d.frasi || []).forEach(f => { n += (f.frase || "").length + (f.nota || "").length + (f.prima || "").length + (f.dopo || "").length; });
  if (d.verifica) n += (d.verifica.frase_originale || "").length + (d.verifica.frase_riscritta || "").length;
  if (d.sinonimi) n += (d.sinonimi.parola || "").length + (d.sinonimi.frase || "").length;
  return n;
}

async function chiamaGemini(sistema, utente, chiave) {
  try { return await chiamaGeminiModello(GEMINI_MODEL, sistema, utente, chiave); }
  catch (e) {
    if (!/gemini (429|5\d\d)|abort|timeout/i.test(e.message)) throw e; // sovraccarico o troppo lento → riserva
    return await chiamaGeminiModello(GEMINI_RISERVA, sistema, utente, chiave);
  }
}

async function chiamaGeminiModello(modello, sistema, utente, chiave) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent`, {
    signal: AbortSignal.timeout(40000),
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chiave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: "user", parts: [{ text: utente }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    })
  });
  if (!r.ok) throw new Error("gemini " + r.status + " " + (await r.text()).slice(0, 300));
  const j = await r.json();
  return j.candidates[0].content.parts.map(p => p.text || "").join("");
}

async function chiamaClaude(sistema, utente, chiave) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": chiave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 4096, system: sistema, messages: [{ role: "user", content: utente }] })
  });
  if (!r.ok) throw new Error("claude " + r.status + " " + (await r.text()).slice(0, 300));
  const j = await r.json();
  return j.content.filter(b => b.type === "text").map(b => b.text).join("");
}

function estraiJSON(testo) {
  const t = testo.replace(/^```(json)?/i, "").replace(/```\s*$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  return JSON.parse(t.slice(a, b + 1));
}

function cors(origine) {
  return {
    "Access-Control-Allow-Origin": origine === ORIGINE_PERMESSA ? ORIGINE_PERMESSA : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function risposta(corpo, stato, origine) {
  return new Response(JSON.stringify(corpo), { status: stato, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origine) } });
}

export default {
  async fetch(request, env) {
    const origine = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origine) });
    if (origine !== ORIGINE_PERMESSA) return risposta({ errore: "Origine non permessa" }, 403, origine);
    if (request.method !== "POST") return risposta({ errore: "Usa POST" }, 405, origine);

    let d;
    try { d = await request.json(); } catch (e) { return risposta({ errore: "Richiesta non valida" }, 400, origine); }
    if (!d || !d.tipologia || !["frasi", "tema", "verifica", "sinonimi"].includes(d.modalita)) return risposta({ errore: "Dati mancanti" }, 400, origine);
    if (lunghezzaTesto(d) > MAX_CARATTERI) return risposta({ errore: "Testo troppo lungo" }, 413, origine);

    try {
      const sistema = d.modalita === "sinonimi" ? promptSinonimi(d) : promptDiSistema(d), utente = messaggioUtente(d);
      const testo = PROVIDER === "claude"
        ? await chiamaClaude(sistema, utente, env.API_KEY)
        : await chiamaGemini(sistema, utente, env.API_KEY);
      const json = estraiJSON(testo);
      if (!Array.isArray(d.modalita === "sinonimi" ? json.sinonimi : json.frasi)) throw new Error("schema");
      return risposta(json, 200, origine);
    } catch (e) {
      console.log("Errore IA:", e.message); // visibile su Cloudflare in Workers → Logs
      return risposta({ errore: "Il correttore non ha risposto correttamente", dettaglio: String(e.message).slice(0, 300) }, 502, origine);
    }
  }
};
