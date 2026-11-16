/* Officina della scrittura — logica della pagina (JavaScript semplice, nessuna libreria) */
(function () {
  'use strict';

  // ===== CONFIGURAZIONE =====
  // Dopo aver pubblicato il worker su Cloudflare, incolla qui il suo indirizzo (vedi LEGGIMI.md).
  var WORKER_URL = 'https://officina-scrittura.NOME-ACCOUNT.workers.dev';
  // In locale (prove) si usa il worker finto di test/server.js
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) WORKER_URL = '/api';
  var MAX_CARATTERI = 4000;
  var ATTESA_MS = 45000;

  var D = { tip: null, es: [] };
  var S = { modo: 'frasi', richiesta: null, risultato: null, prove: [], esercizi: {}, mostrati: [] };
  var C_ORD = ['correttezza', 'chiarezza', 'coesione', 'coerenza'];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function C(c) { return D.tip.quattro_c[c] || D.tip.quattro_c.coerenza; }
  function colTipo(c, t) { var x = C(c); return (x.tipi[t] && x.tipi[t].colore) || x.colore; }
  function nomeTipo(t) {
    for (var i = 0; i < C_ORD.length; i++) { var x = C(C_ORD[i]).tipi[t]; if (x) return x.nome; }
    return t;
  }
  function cDelTipo(t) {
    for (var i = 0; i < C_ORD.length; i++) if (C(C_ORD[i]).tipi[t]) return C_ORD[i];
    return 'coerenza';
  }
  function etichettaC(c) {
    var x = C(c);
    return '<span class="etichetta" style="background:' + x.colore + '">' + x.icona + ' ' + esc(x.nome) + '</span>';
  }
  function classe() { return document.querySelector('input[name=classe]:checked').value; }
  function tipologiaId() { var t = document.querySelector('input[name=tipologia]:checked'); return t ? t.value : null; }

  // ===== AVVIO =====
  Promise.all([
    fetch('data/tipologie.json').then(function (r) { return r.json(); }),
    fetch('data/esercizi.json').then(function (r) { return r.json(); })
  ]).then(function (v) {
    D.tip = v[0]; D.es = v[1].esercizi;
    avvia();
  }).catch(function () {
    $('esito').textContent = 'Non riesco a caricare i dati del laboratorio. Ricarica la pagina.';
  });

  function avvia() {
    var a = D.tip.avviso;
    $('avvisoTitolo').textContent = a.titolo;
    $('avvisoTesto').textContent = a.testo;
    $('promemoria').textContent = '⚠️ ' + a.promemoria;
    $('hoCapito').onclick = function () { $('avvisoAlunni').hidden = true; $('nome').focus(); };

    $('legenda').innerHTML = C_ORD.map(function (c) {
      var x = C(c); return '<span><i style="background:' + x.colore + '"></i>' + x.icona + ' ' + esc(x.nome) + '</span>';
    }).join('');

    var g = $('grigliaTip');
    Object.keys(D.tip.tipologie).forEach(function (id) {
      var t = D.tip.tipologie[id];
      var l = el('label', { class: 'tip' }, '<input type="radio" name="tipologia" value="' + id + '"><b>' + t.icona + ' ' + esc(t.nome) + '</b><small>' + esc(t.scopo) + '</small>');
      g.appendChild(l);
    });
    g.addEventListener('change', function () { $('erroreTipologia').textContent = ''; });

    guide();
    aggiungiFrase();
    $('aggiungiFrase').onclick = function () { aggiungiFrase(true); };
    $('tabFrasi').onclick = function () { modo('frasi'); };
    $('tabTema').onclick = function () { modo('tema'); };
    $('impostazioni').addEventListener('input', contatore);
    $('impostazioni').addEventListener('submit', function (e) { e.preventDefault(); analizza(); });
    $('allenatiTipologie').onclick = allenatiTipologie;
    $('stampa').onclick = stampa;
    contatore();
  }

  function modo(m) {
    S.modo = m;
    $('tabFrasi').setAttribute('aria-selected', m === 'frasi');
    $('tabTema').setAttribute('aria-selected', m === 'tema');
    $('pannelloFrasi').hidden = m !== 'frasi';
    $('pannelloTema').hidden = m !== 'tema';
    contatore();
  }

  function aggiungiFrase(fuoco) {
    var lista = $('listaFrasi');
    var li = el('li', null,
      '<label class="campo-l">Frase<textarea class="f-frase" rows="2" maxlength="600"></textarea></label>' +
      '<label class="campo-l">Cosa ha segnato l\'insegnante? <small>(facoltativo: la parola sottolineata o la sigla)</small><input type="text" class="f-nota" maxlength="120"></label>' +
      '<details><summary>Frase prima / frase dopo <small>(facoltativo: aiuta a capire il collegamento)</small></summary><div class="doppio">' +
      '<label class="campo-l">Frase prima<input type="text" class="f-prima" maxlength="400"></label>' +
      '<label class="campo-l">Frase dopo<input type="text" class="f-dopo" maxlength="400"></label></div></details>' +
      '<button type="button" class="togli" aria-label="Togli questa frase">✕ togli</button>');
    li.querySelector('.togli').onclick = function () {
      if (lista.children.length > 1) { li.remove(); contatore(); lista.querySelector('textarea').focus(); }
      else { li.querySelectorAll('input,textarea').forEach(function (x) { x.value = ''; }); }
    };
    lista.appendChild(li);
    if (fuoco) li.querySelector('textarea').focus();
  }

  function leggiFrasi() {
    return Array.prototype.map.call(document.querySelectorAll('#listaFrasi > li'), function (li) {
      return {
        frase: li.querySelector('.f-frase').value.trim(),
        nota: li.querySelector('.f-nota').value.trim(),
        prima: li.querySelector('.f-prima').value.trim(),
        dopo: li.querySelector('.f-dopo').value.trim()
      };
    }).filter(function (f) { return f.frase; });
  }
  function lunghezza() {
    if (S.modo === 'tema') return $('tema').value.length + $('traccia').value.length;
    return leggiFrasi().reduce(function (n, f) { return n + f.frase.length + f.nota.length + f.prima.length + f.dopo.length; }, 0);
  }
  function contatore() {
    var n = lunghezza();
    $('contatore').textContent = n + ' / ' + MAX_CARATTERI + ' caratteri' + (n > MAX_CARATTERI ? ' — troppo lungo: togli qualche frase' : '');
  }

  // ===== CHIAMATA AL CORRETTORE =====
  function chiama(payload) {
    function una() {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, ATTESA_MS);
      return fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (!j || !Array.isArray(j.frasi)) throw new Error('json'); return j; });
    }
    return una().catch(function () { return una(); }); // riprova una volta
  }

  function baseRichiesta() {
    var id = tipologiaId(), t = D.tip.tipologie[id];
    return {
      classe: classe(),
      livello: D.tip.classi[classe()],
      tipologia: { id: id, nome: t.nome, criteri: t.criteri, registro_consigliato: t.registro_consigliato, registro_note: t.registro_note }
    };
  }

  function analizza() {
    var esito = $('esito'); esito.className = 'esito';
    if (!tipologiaId()) {
      $('erroreTipologia').textContent = 'Scegli la tipologia del tuo tema prima di analizzare.';
      document.querySelector('input[name=tipologia]').focus(); return;
    }
    var p = baseRichiesta();
    p.modalita = S.modo;
    if (S.modo === 'frasi') {
      p.frasi = leggiFrasi();
      if (!p.frasi.length) { esito.textContent = 'Scrivi almeno una frase.'; document.querySelector('.f-frase').focus(); return; }
    } else {
      p.tema = $('tema').value.trim(); p.traccia = $('traccia').value.trim();
      if (p.tema.length < 20) { esito.textContent = 'Incolla o scrivi il tuo tema.'; $('tema').focus(); return; }
    }
    if (lunghezza() > MAX_CARATTERI) { esito.textContent = 'Il testo è troppo lungo (massimo ' + MAX_CARATTERI + ' caratteri).'; return; }

    var b = $('analizza'); b.disabled = true; b.textContent = 'Sto leggendo…';
    esito.textContent = 'Il correttore sta leggendo le tue frasi: aspetta qualche secondo.';
    chiama(p).then(function (r) {
      S.richiesta = p; S.risultato = r; S.prove = r.frasi.map(function () { return { riscritta: '', esito: '', vista: false }; });
      esito.textContent = '';
      mostraRisultati(r); mostraRiepilogo(r); proponiEsercizi(r);
      $('risultati').scrollIntoView();
      $('titRisultati').setAttribute('tabindex', '-1'); $('titRisultati').focus({ preventScroll: true });
    }).catch(function () {
      esito.className = 'esito errore';
      esito.textContent = 'Il correttore non risponde, riprova tra un minuto. Il tuo testo è ancora qui.';
    }).then(function () { b.disabled = false; b.textContent = 'Analizza 🔍'; });
  }

  // ===== RISULTATI =====
  function evidenzia(frase, errori) {
    var low = frase.toLowerCase(), pezzi = [];
    (errori || []).forEach(function (e) {
      if (!e.parte_errata) return;
      var i = low.indexOf(String(e.parte_errata).toLowerCase());
      while (i >= 0 && pezzi.some(function (p) { return i < p.f && i + e.parte_errata.length > p.i; })) i = low.indexOf(String(e.parte_errata).toLowerCase(), i + 1);
      if (i >= 0) pezzi.push({ i: i, f: i + e.parte_errata.length, e: e });
    });
    pezzi.sort(function (a, b) { return a.i - b.i; });
    var out = '', pos = 0;
    pezzi.forEach(function (p) {
      out += esc(frase.slice(pos, p.i));
      out += '<mark style="background:' + colTipo(p.e.c, p.e.tipo) + '" title="' + esc(C(p.e.c).nome) + '">' + esc(frase.slice(p.i, p.f)) + '</mark>';
      pos = p.f;
    });
    return out + esc(frase.slice(pos));
  }

  function bloccoRegistri(reg) {
    if (!reg || !reg.formale) return '';
    var vb = D.tip.registri.va_bene_in;
    return '<h4>Tre modi di dirla</h4><div class="registri">' + ['formale', 'standard', 'informale'].map(function (k) {
      var ok = reg.adatto === k;
      return '<div class="reg' + (ok ? ' adatto' : '') + '"><h4>' + (ok ? '✅ ' : '') + D.tip.registri[k] + '</h4><p>' + esc(reg[k]) + '</p>' +
        '<p class="nota">' + (ok ? esc(reg.perche || 'È il registro adatto alla tua tipologia.') : esc(vb[k])) + '</p></div>';
    }).join('') + '</div>';
  }

  function mostraRisultati(r) {
    $('risultati').hidden = false;
    $('commento').innerHTML = r.commento_positivo ? '<p class="commento">🌟 ' + esc(r.commento_positivo) + '</p>' : '';
    var box = $('frasiRisultato'); box.innerHTML = '';
    r.frasi.forEach(function (f, i) {
      var card = el('article', { class: 'frase-card', 'aria-label': 'Frase ' + (i + 1) });
      if (!f.errore_trovato || !f.errori || !f.errori.length) {
        card.innerHTML = '<p class="frase-orig">' + esc(f.frase_originale) + '</p><p class="nessun">🤔 ' + esc(D.tip.avviso.nessun_errore) + '</p>';
        box.appendChild(card); return;
      }
      var html = '<p class="frase-orig">' + evidenzia(f.frase_originale, f.errori) + '</p>';
      f.errori.forEach(function (e) {
        html += '<div class="err" style="--cc:' + colTipo(e.c, e.tipo) + '">' + etichettaC(e.c) + '<span class="etichetta tipo">' + esc(nomeTipo(e.tipo)) + '</span>' +
          (e.parte_errata ? ' su «<b>' + esc(e.parte_errata) + '</b>»' : '') +
          '<p class="indizio">🤔 <b>Indizio:</b> ' + esc(e.indizio) + '</p></div>';
      });
      html += '<div class="prova"><label class="campo-l">Riscrivi la frase corretta<textarea rows="2" id="prova' + i + '"></textarea></label>' +
        '<div class="azioni"><button type="button" class="bottone" data-verifica="' + i + '">Verifica la mia frase</button>' +
        '<button type="button" class="bottone secondario" data-soluzione="' + i + '">Mostra la soluzione</button></div>' +
        '<p class="verifica-esito" id="vesito' + i + '" aria-live="polite"></p></div>' +
        '<div class="soluzione" id="sol' + i + '" hidden>' +
        f.errori.map(function (e) {
          return '<p>' + etichettaC(e.c) + ' <b>Perché:</b> ' + esc(e.spiegazione) + '</p>' + (e.proposta_corretta ? '<p>✏️ <b>Proposta:</b> ' + esc(e.proposta_corretta) + '</p>' : '');
        }).join('') + bloccoRegistri(f.registri) + '</div>';
      card.innerHTML = html;
      card.querySelector('textarea').value = f.frase_originale;
      box.appendChild(card);
    });
    box.onclick = function (ev) {
      var v = ev.target.getAttribute('data-verifica'), s = ev.target.getAttribute('data-soluzione');
      if (v != null) verifica(+v, ev.target);
      if (s != null) mostraSoluzione(+s);
    };
    var lx = r.lessico || [];
    $('lessicoBox').innerHTML = lx.length ? '<div class="lessico"><h3>💬 Parole ripetute o generiche</h3><ul>' + lx.map(function (l) {
      return '<li><b>«' + esc(l.parola) + '»</b>' + (l.ripetizioni > 1 ? ' (' + l.ripetizioni + ' volte)' : '') + ': prova con <i>' + esc((l.sinonimi || []).join(', ')) + '</i></li>';
    }).join('') + '</ul></div>' : '';
  }

  function mostraSoluzione(i) {
    $('sol' + i).hidden = false; S.prove[i].vista = true;
    S.prove[i].riscritta = $('prova' + i).value.trim();
  }

  function verifica(i, btn) {
    var f = S.risultato.frasi[i], testo = $('prova' + i).value.trim(), out = $('vesito' + i);
    S.prove[i].riscritta = testo;
    if (!testo || testo === f.frase_originale.trim()) { out.className = 'verifica-esito ko'; out.textContent = 'Prova a cambiare la frase seguendo l\'indizio, poi premi «Verifica».'; return; }
    var p = baseRichiesta();
    p.modalita = 'verifica';
    p.verifica = { frase_originale: f.frase_originale, frase_riscritta: testo, errori_segnalati: f.errori.map(function (e) { return { parte_errata: e.parte_errata, tipo: e.tipo }; }) };
    btn.disabled = true; out.className = 'verifica-esito'; out.textContent = 'Controllo…';
    chiama(p).then(function (r) {
      var v = r.frasi[0] || {};
      if (!v.errore_trovato) { out.className = 'verifica-esito ok'; out.textContent = '✅ Ottimo lavoro! Ora la frase funziona.'; S.prove[i].esito = 'corretta'; }
      else {
        out.className = 'verifica-esito ko';
        out.textContent = '💪 Quasi! C\'è ancora qualcosa da sistemare: ' + (v.errori || []).map(function (e) { return e.indizio; }).join(' ');
        S.prove[i].esito = 'da rivedere';
      }
      mostraSoluzione(i);
    }).catch(function () {
      out.className = 'verifica-esito ko'; out.textContent = 'Il correttore non risponde, riprova tra un minuto. La tua frase è ancora qui.';
    }).then(function () { btn.disabled = false; });
  }

  // ===== RIEPILOGO =====
  function conteggi(r) {
    var n = { correttezza: 0, chiarezza: 0, coesione: 0, coerenza: 0 }, t = {};
    r.frasi.forEach(function (f) { (f.errori || []).forEach(function (e) { if (n[e.c] != null) n[e.c]++; t[e.tipo] = (t[e.tipo] || 0) + 1; }); });
    return { c: n, t: t };
  }
  function mostraRiepilogo(r) {
    $('riepilogo').hidden = false;
    var k = conteggi(r), max = Math.max.apply(null, C_ORD.map(function (c) { return k.c[c]; })) || 1;
    $('barre').innerHTML = C_ORD.map(function (c) {
      var x = C(c);
      return '<div class="barra-c"><span>' + x.icona + ' ' + esc(x.nome) + '</span><div class="tr" role="img" aria-label="' + k.c[c] + ' errori di ' + esc(x.nome) + '"><div class="pi" style="width:' + (k.c[c] / max * 100) + '%;background:' + x.colore + '"></div></div><b>' + k.c[c] + '</b></div>';
    }).join('');
    var top = C_ORD.slice().sort(function (a, b) { return k.c[b] - k.c[a]; })[0];
    $('allenati').innerHTML = k.c[top] ? '<div class="focus-c" style="--cc:' + C(top).colore + '"><h3>🎯 La C su cui allenarti di più: ' + C(top).icona + ' ' + esc(C(top).nome) + '</h3><p>' + esc(C(top).definizione) + '</p></div>' : '<div class="focus-c" style="--cc:var(--ok)"><h3>🎉 Nessun errore trovato!</h3></div>';

    var h = '';
    if (r.scheda_4c) {
      h += '<h3>Le 4 C del tuo tema</h3><div class="griglia-4c">' + C_ORD.map(function (c) {
        var s = r.scheda_4c[c]; if (!s) return '';
        return '<div style="--cc:' + C(c).colore + '"><b>' + C(c).icona + ' ' + esc(C(c).nome) + '</b><p>👍 ' + esc(s.punto_di_forza) + '</p><p>💡 ' + esc(s.consiglio) + '</p></div>';
      }).join('') + '</div>';
    }
    if (r.scheda_tipologia) {
      var st = r.scheda_tipologia, tn = D.tip.tipologie[S.richiesta.tipologia.id].nome;
      h += '<div class="crit"><h3>Il testo ' + esc(tn.toLowerCase()) + ': come sei andato</h3>' +
        '<b>✅ Criteri rispettati</b><ul>' + (st.criteri_rispettati || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<b>🔧 Criteri da migliorare</b><ul>' + (st.criteri_da_migliorare || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }
    $('schede').innerHTML = h;
  }

  // ===== ESERCIZI =====
  function perClasse(lista) {
    var cl = +classe(), f = lista.filter(function (e) { return e.classe.indexOf(cl) >= 0; });
    return f.length ? f : lista;
  }
  function mescola(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  function proponiEsercizi(r) {
    var k = conteggi(r), tipi = Object.keys(k.t).sort(function (a, b) { return k.t[b] - k.t[a]; });
    (r.categorie_da_esercitare || []).forEach(function (t) { if (tipi.indexOf(t) < 0 && nomeTipo(t) !== t) tipi.push(t); });
    var scelti = [], base = D.es.filter(function (e) { return !e.tipologia; });
    tipi.slice(0, 4).forEach(function (t) {
      var c = mescola(perClasse(base.filter(function (e) { return e.tipo === t; })));
      if (c[0]) scelti.push(c[0]);
    });
    if (scelti.length < 2 && tipi[0]) {
      var extra = mescola(perClasse(base.filter(function (e) { return e.tipo === tipi[0] && scelti.indexOf(e) < 0; })));
      if (extra[0]) scelti.push(extra[0]);
    }
    var tp = mescola(perClasse(D.es.filter(function (e) { return e.tipologia === S.richiesta.tipologia.id; })));
    scelti.push(tp[0]);
    if (scelti.length < 3 && tp[1]) scelti.push(tp[1]);
    $('eserciziIntro').textContent = 'Ecco gli esercizi scelti per te: prima quelli sui tipi di errore più frequenti, poi uno sulla tipologia del tuo tema.';
    mostraEsercizi(scelti.slice(0, 5), false);
  }

  function allenatiTipologie() {
    var id = tipologiaId(), lista;
    if (id) {
      lista = perClasse(D.es.filter(function (e) { return e.tipologia === id; }));
      $('eserciziIntro').textContent = 'Esercizi sul testo ' + D.tip.tipologie[id].nome.toLowerCase() + '.';
    } else {
      lista = D.es.filter(function (e) { return e.tipologia && /^Riconosci/.test(e.consegna); });
      $('eserciziIntro').textContent = 'Riconosci le tipologie! (Se scegli una tipologia in alto, ti propongo esercizi solo su quella.)';
    }
    mostraEsercizi(lista, true);
    $('esercizi').scrollIntoView();
  }

  function mostraEsercizi(lista, aggiungi) {
    var box = $('listaEsercizi');
    if (!aggiungi) box.innerHTML = '';
    lista.forEach(function (e) { if (e && !box.querySelector('[data-id="' + e.id + '"]')) box.appendChild(esercizio(e)); });
    var primo = box.querySelector('.es'); if (primo && aggiungi) primo.scrollIntoView();
  }

  function registra(e, punti, nodo, ok, testo) {
    if (S.esercizi[e.id] == null) S.esercizi[e.id] = { e: e, punti: punti };
    var fb = nodo.querySelector('.feedback');
    fb.className = 'feedback ' + (ok ? 'ok' : 'ko');
    fb.innerHTML = (ok ? '✅ Giusto! ' : '💪 Non ancora. ') + esc(testo || '') + ' <br><small>' + esc(e.spiegazione) + '</small>';
    var n = 0, t = 0; Object.keys(S.esercizi).forEach(function (k) { n += S.esercizi[k].punti; t++; });
    $('punteggio').textContent = 'Punteggio: ' + n + ' su ' + t + ' esercizi svolti';
  }

  function norm(s) { return String(s).toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim(); }

  function esercizio(e) {
    var col = C(e.c).colore;
    var tag = e.tipologia ? '🧩 Tipologia: ' + D.tip.tipologie[e.tipologia].nome : C(e.c).icona + ' ' + C(e.c).nome + ' · ' + nomeTipo(e.tipo);
    var n = el('div', { class: 'es', 'data-id': e.id, style: '--cc:' + col }, '<p class="tag">' + esc(tag) + '</p><p class="consegna">' + esc(e.consegna) + '</p>');
    var corpo = el('div'); n.appendChild(corpo); n.appendChild(el('p', { class: 'feedback', 'aria-live': 'polite' }));

    if (e.formato === 'scelta') {
      var op = el('div', { class: 'opzioni', role: 'group', 'aria-label': 'Risposte' });
      e.opzioni.forEach(function (o, i) {
        var b = el('button', { type: 'button' }, esc(o));
        b.onclick = function () {
          op.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          op.children[e.corretta].classList.add('giusta');
          if (i !== e.corretta) b.classList.add('sbagliata');
          registra(e, i === e.corretta ? 1 : 0, n, i === e.corretta, i === e.corretta ? '' : 'La risposta giusta è: «' + e.opzioni[e.corretta] + '».');
        };
        op.appendChild(b);
      });
      corpo.appendChild(op);
    } else if (e.formato === 'completa') {
      var pez = e.testo.split('___');
      corpo.innerHTML = '<p>' + esc(pez[0]) + '<input type="text" aria-label="Completa" style="width:11em;display:inline-block;margin:0 4px">' + esc(pez[1] || '') + '</p>' +
        '<button type="button" class="pillola">Controlla</button>';
      var inp = corpo.querySelector('input');
      corpo.querySelector('button').onclick = function () {
        var v = norm(inp.value).replace(/[.!]+$/, '');
        var ok = e.risposte.some(function (r) { return norm(r) === v || norm(r) === norm(inp.value); });
        registra(e, ok ? 1 : 0, n, ok, ok ? '' : 'Una risposta giusta è: «' + e.risposte[0] + '».');
      };
      inp.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); corpo.querySelector('button').click(); } });
    } else if (e.formato === 'riscrivi') {
      corpo.innerHTML = '<p>«' + esc(e.frase) + '»</p><label class="campo-l">La tua versione<textarea rows="2"></textarea></label>' +
        '<button type="button" class="pillola">Mostra la soluzione</button><div class="soluzione" hidden><p>✏️ <b>Una soluzione possibile:</b> ' + esc(e.soluzione) + '</p>' +
        '<p>Confronta con la tua: com\'è andata?</p><div class="azioni"><button type="button" class="pillola" data-v="1">✅ Ce l\'ho fatta</button><button type="button" class="pillola" data-v="0">🔁 Da rivedere</button></div></div>';
      var sol = corpo.querySelector('.soluzione');
      corpo.querySelector('button').onclick = function () { sol.hidden = false; };
      sol.onclick = function (ev) {
        var v = ev.target.getAttribute('data-v'); if (v == null) return;
        sol.querySelectorAll('[data-v]').forEach(function (x) { x.disabled = true; });
        S.esercizi[e.id] = null; delete S.esercizi[e.id];
        registra(e, +v, n, v === '1', v === '1' ? 'Bravo!' : 'Rileggi la soluzione e riprova.');
      };
    } else if (e.formato === 'riordina') {
      var ordine = mescola(e.elementi);
      if (ordine.join() === e.elementi.join()) ordine.reverse();
      var ul = el('ol', { class: 'ordina' });
      function disegna() {
        ul.innerHTML = '';
        ordine.forEach(function (t, i) {
          var li = el('li', null, '<span>' + esc(t) + '</span><button type="button" aria-label="Sposta su: ' + esc(t) + '"' + (i === 0 ? ' disabled' : '') + '>▲</button><button type="button" aria-label="Sposta giù: ' + esc(t) + '"' + (i === ordine.length - 1 ? ' disabled' : '') + '>▼</button>');
          var bs = li.querySelectorAll('button');
          bs[0].onclick = function () { sposta(i, -1, 0); };
          bs[1].onclick = function () { sposta(i, 1, 1); };
          ul.appendChild(li);
        });
      }
      function sposta(i, d, q) {
        var j = i + d; var x = ordine[i]; ordine[i] = ordine[j]; ordine[j] = x; disegna();
        var b = ul.children[j].querySelectorAll('button')[q]; (b.disabled ? ul.children[j].querySelectorAll('button')[1 - q] : b).focus();
      }
      disegna();
      corpo.appendChild(ul);
      var ctr = el('button', { type: 'button', class: 'pillola', style: 'margin-top:10px' }, 'Controlla l\'ordine');
      ctr.onclick = function () {
        var ok = ordine.join('|') === e.elementi.join('|');
        registra(e, ok ? 1 : 0, n, ok, ok ? '' : 'L\'ordine giusto è: ' + e.elementi.map(function (x, i) { return (i + 1) + ') ' + x; }).join(' '));
      };
      corpo.appendChild(ctr);
    }
    return n;
  }

  // ===== GUIDE =====
  function guide() {
    $('contenuto4c').innerHTML = C_ORD.map(function (c) {
      var x = C(c);
      return '<div class="guida-c" style="--cc:' + x.colore + '"><h3>' + x.icona + ' ' + esc(x.nome) + '</h3><p>' + esc(x.definizione) + '</p>' +
        '<p><small>Cosa controlla: ' + Object.keys(x.tipi).map(function (t) { return esc(x.tipi[t].nome); }).join(', ') + '</small></p>' +
        '<p class="ko-es">❌ ' + esc(x.sbagliato) + '</p><p class="ok-es">✅ ' + esc(x.corretto) + '</p></div>';
    }).join('');
    $('contenutoTip').innerHTML = Object.keys(D.tip.tipologie).map(function (id) {
      var t = D.tip.tipologie[id];
      return '<div class="guida-tip"><h3>' + t.icona + ' ' + esc(t.nome) + '</h3><p>' + esc(t.definizione) + '</p>' +
        '<p><b>Scopo:</b> ' + esc(t.scopo) + '</p><p><b>Struttura:</b> ' + esc(t.struttura) + '</p><p><b>Lingua:</b> ' + esc(t.lingua) + '</p>' +
        '<p><b>Registro:</b> ' + esc(t.registro_note) + '</p><blockquote>' + esc(t.esempio) + '</blockquote></div>';
    }).join('');
  }

  // ===== RESOCONTO STAMPABILE =====
  function stampa() {
    var r = S.risultato, nome = $('nome').value.trim().split(/\s+/)[0] || '—', id = tipologiaId();
    var h = '<h1>Officina della scrittura — Resoconto</h1>' +
      '<p><b>Nome:</b> ' + esc(nome) + ' · <b>Classe:</b> ' + classe() + 'ª · <b>Tipologia:</b> ' + esc(id ? D.tip.tipologie[id].nome : '—') +
      ' · <b>Data:</b> ' + new Date().toLocaleDateString('it-IT') + '</p>' +
      '<div class="avv"><b>' + esc(D.tip.avviso.titolo) + '</b><br>' + esc(D.tip.avviso.testo) + '</div>';
    if (r) {
      h += '<h2>Le mie frasi</h2>';
      r.frasi.forEach(function (f, i) {
        var p = S.prove[i] || {};
        h += '<div class="f"><p><b>Frase originale:</b> ' + esc(f.frase_originale) + '</p>';
        if (!f.errore_trovato) h += '<p><i>' + esc(D.tip.avviso.nessun_errore) + '</i></p>';
        (f.errori || []).forEach(function (e) {
          h += '<p><span class="cc">' + esc(C(e.c).nome) + '</span> ' + esc(nomeTipo(e.tipo)) + (e.parte_errata ? ' («' + esc(e.parte_errata) + '»)' : '') + ': ' + esc(e.spiegazione) + '</p>';
        });
        var risc = ($('prova' + i) && $('prova' + i).value.trim()) || p.riscritta;
        if (f.errore_trovato) h += '<p><b>La mia frase riscritta:</b> ' + (risc && risc !== f.frase_originale ? esc(risc) : '<i>non ancora riscritta</i>') + (p.esito ? ' (' + esc(p.esito) + ')' : '') + '</p>';
        if (f.registri && f.registri.adatto) h += '<p><b>Registro adatto (' + esc(D.tip.registri[f.registri.adatto]) + '):</b> ' + esc(f.registri[f.registri.adatto]) + ' — ' + esc(f.registri.perche || '') + '</p>';
        h += '</div>';
      });
      var k = conteggi(r);
      h += '<h2>Riepilogo delle 4 C</h2><table><tr>' + C_ORD.map(function (c) { return '<th>' + esc(C(c).nome) + '</th>'; }).join('') + '</tr><tr>' +
        C_ORD.map(function (c) { return '<td>' + k.c[c] + ' errori</td>'; }).join('') + '</tr></table>';
      if (r.scheda_4c) h += '<h2>Scheda delle 4 C</h2>' + C_ORD.map(function (c) { var s = r.scheda_4c[c]; return s ? '<p><b>' + esc(C(c).nome) + ':</b> 👍 ' + esc(s.punto_di_forza) + ' — 💡 ' + esc(s.consiglio) + '</p>' : ''; }).join('');
      if (r.scheda_tipologia) h += '<h2>Scheda della tipologia</h2><p><b>Criteri rispettati:</b> ' + esc((r.scheda_tipologia.criteri_rispettati || []).join('; ')) + '</p><p><b>Da migliorare:</b> ' + esc((r.scheda_tipologia.criteri_da_migliorare || []).join('; ')) + '</p>';
      if (r.commento_positivo) h += '<p><b>Commento:</b> ' + esc(r.commento_positivo) + '</p>';
    }
    var ids = Object.keys(S.esercizi);
    if (ids.length) {
      var tot = 0; ids.forEach(function (x) { tot += S.esercizi[x].punti; });
      h += '<h2>Esercizi svolti — punteggio ' + tot + ' su ' + ids.length + '</h2><table>' + ids.map(function (x) {
        var o = S.esercizi[x]; return '<tr><td>' + esc(o.e.consegna) + '</td><td>' + (o.punti ? '✔ giusto' : '✘ da rivedere') + '</td></tr>';
      }).join('') + '</table>';
    }
    h += '<p style="margin-top:12pt"><i>' + esc(D.tip.avviso.promemoria) + '</i></p>';
    $('resoconto').innerHTML = h;
    window.print();
  }
})();
