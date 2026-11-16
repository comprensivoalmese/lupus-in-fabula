# Officina della scrittura

Laboratorio di autocorrezione per la scuola media, basato sulle 4 C (Correttezza, Chiarezza, Coesione, Coerenza).

**Indirizzo per gli alunni:** <https://comprensivoalmese.github.io/lupus-in-fabula/>

## Come si usa in classe
1. L'alunno sceglie la classe e la tipologia del tema.
2. Riporta le frasi che avete segnato, una per riquadro. Nel campo «Cosa ha segnato l'insegnante?» scrive la parola sottolineata e il tipo di errore (ortografia, punteggiatura, morfologia, sintassi, lessico…).
3. Il correttore evidenzia l'errore e dà un indizio. L'alunno riscrive la frase e la fa verificare; poi vede la spiegazione e la frase nei tre registri.
4. Alla fine trova un riepilogo, degli esercizi mirati e un resoconto da stampare o salvare in PDF.

Non serve nessun account. I testi non vengono salvati. L'avviso iniziale ricorda agli alunni che la correzione è automatica e che **ha sempre ragione l'insegnante**.

## Cosa potete modificare voi
Tutto si cambia su GitHub, senza toccare il programma: aprite il file → ✏️ **Edit** → modificate → **Commit changes**. Le modifiche sono attive dopo pochi minuti. Per modificare dovete avere accesso al repository dell'Istituto.

| Cosa | File | Come |
|---|---|---|
| **Errori veri trovati nei temi**, per rendere il correttore più preciso | `data/casi.json` | Copiate un blocco `{ … }`, mettetelo dopo l'ultimo (separato da una virgola) e scrivete frase, tipo, sottotipo, spiegazione e correzione. Niente nomi degli alunni. |
| **Le vostre sigle** di correzione (es. «rip.», «anac.») | `data/tipologie.json`, voce `sigle_insegnante` | Aggiungete `"sigla": "tipo di errore"`. |
| **Dettagli degli errori** (es. ortografia → apostrofo, doppie…) | `data/tipologie.json`, voce `particolari` | Aggiungete una voce all'elenco. |
| **Criteri delle tipologie**, definizioni ed esempi | `data/tipologie.json`, voce `tipologie` | I criteri vengono usati dal correttore per giudicare la coerenza. |
| **Testo dell'avviso** per gli alunni | `data/tipologie.json`, voce `avviso` | |
| **Esercizi** | `data/esercizi.json` | Copiate un esercizio dello stesso tipo e cambiate `id` (deve essere unico) e i testi. |

**Attenzione a virgole e virgolette:** un errore di scrittura in un file blocca la pagina. Prima di salvare potete incollare il testo su <https://jsonlint.com> per controllarlo. Se qualcosa si rompe, su GitHub il pulsante **History** del file permette di tornare alla versione precedente.

## Se il correttore non risponde
Di solito è un sovraccarico momentaneo di Google: basta riprovare dopo un minuto, il testo scritto non si perde. Se il problema continua, avvisate chi gestisce il sito (le istruzioni tecniche sono in `TECNICO.md`).
