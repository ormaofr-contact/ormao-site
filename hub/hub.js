// Ormao Hub : recherche instantanée, filtres, copie, et déblocage des contenus pour les membres.
(function () {
  var RACINE = '/hub/';
  var CLE = 'ormaoHubCle';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function echap(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function surligner(t) { return echap(t).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>'); }

  /* ---------- recherche ---------- */
  var index = null, panneau = $('#rech'), champ = $('#rech-champ'), res = $('#rech-res'), actif = 0;
  function charger(cb) {
    if (index) return cb();
    fetch(RACINE + 'recherche.json').then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (x) { x.n = norm([x.t, x.c, x.h, (x.k || []).join(' ')].join(' ')); return x; }); cb();
    });
  }
  function ouvrir(q) {
    if (!panneau) return;
    panneau.classList.add('ouvert'); champ.value = q || ''; champ.focus(); charger(chercher);
  }
  function fermer() { panneau && panneau.classList.remove('ouvert'); }
  function chercher() {
    var q = norm(champ.value).trim(), mots = q.split(/\s+/).filter(Boolean), l;
    if (!mots.length) l = index.filter(function (x) { return x.v; }).slice(0, 12);
    else l = index.map(function (x) {
      var s = 0;
      mots.forEach(function (m) { if (x.n.indexOf(m) > -1) s += 1; if (norm(x.t).indexOf(m) > -1) s += 2; });
      return [s, x];
    }).filter(function (a) { return a[0] >= mots.length; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 40).map(function (a) { return a[1]; });
    actif = 0;
    res.innerHTML = l.length ? l.map(function (x, i) {
      return '<a href="' + x.u + '"' + (i === 0 ? ' class="actif"' : '') + '><b>' + echap(x.t) + '</b><span>' + echap(x.c) + '</span><em class="etiquette' + (x.y === 'Skill' ? ' skill' : '') + '">' + x.y + '</em></a>';
    }).join('') : '<p class="vide">Aucun résultat. Essaie un mot plus simple : « email », « clients », « réviser »…</p>';
  }
  if (panneau) {
    champ.addEventListener('input', function () { charger(chercher); });
    panneau.addEventListener('click', function (e) { if (e.target === panneau) fermer(); });
    champ.addEventListener('keydown', function (e) {
      var liens = $$('a', res);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!liens.length) return;
        liens[actif].classList.remove('actif');
        actif = (actif + (e.key === 'ArrowDown' ? 1 : -1) + liens.length) % liens.length;
        liens[actif].classList.add('actif'); liens[actif].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && liens[actif]) { location.href = liens[actif].href; }
    });
  }
  $$('[data-recherche]').forEach(function (b) { b.addEventListener('click', function () { ouvrir(''); }); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test(e.target.tagName))) { e.preventDefault(); ouvrir(''); }
    if (e.key === 'Escape') fermer();
  });

  /* ---------- filtres des listes ---------- */
  $$('.filtres').forEach(function (f) {
    var liste = document.getElementById(f.getAttribute('data-liste')), compte = $('.compte', f);
    f.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', f).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var v = b.getAttribute('data-filtre'), n = 0;
      $$('[data-type]', liste).forEach(function (l) { var ok = v === 'tout' || l.getAttribute('data-type') === v; l.hidden = !ok; if (ok) n++; });
      if (compte) compte.textContent = n + ' résultat' + (n > 1 ? 's' : '');
    });
  });

  /* ---------- copie ---------- */
  function copier(texte, bouton) {
    var fini = function () { var t = bouton.textContent; bouton.textContent = 'Copié'; setTimeout(function () { bouton.textContent = t; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(texte).then(fini);
    else { var z = document.createElement('textarea'); z.value = texte; document.body.appendChild(z); z.select(); document.execCommand('copy'); z.remove(); fini(); }
  }
  function brancherCopie(r) {
    $$('[data-copier]', r).forEach(function (b) {
      b.addEventListener('click', function () { copier($('#' + b.getAttribute('data-copier')).getAttribute('data-brut'), b); });
    });
  }
  brancherCopie(document);

  /* ---------- accès membre ---------- */
  var m = location.hash.match(/cle=([a-z0-9]+)/);
  var etatMembre = $('#etat-membre');
  if (m && etatMembre) {
    fetch(RACINE + 'c-' + m[1] + '/contenu.json', { method: 'HEAD' }).then(function (r) {
      if (r.ok) { ecrire(CLE, m[1]); etatMembre.innerHTML = '<p class="resume">Tes téléchargements sont débloqués sur cet appareil. Tous les skills du hub se téléchargent maintenant en un clic.</p><p><a class="btn" href="' + RACINE + 'skills/">Voir les skills</a></p>'; }
      else etatMembre.innerHTML = '<p class="resume">Ce lien d\'accès n\'est pas valide. Vérifie que tu as copié le lien complet depuis ton email, ou écris à contact@ormao.fr.</p>';
    });
  }
  var cle = lire(CLE);
  if (cle) {
    $$('[data-membre-cache]').forEach(function (x) { x.hidden = true; });
    $$('[data-membre-visible]').forEach(function (x) { x.hidden = false; });
    var verrous = $$('[data-verrou]');
    if (verrous.length) {
      fetch(RACINE + 'c-' + cle + '/contenu.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d) return;
        verrous.forEach(function (v) {
          var id = v.getAttribute('data-verrou'), x = d[id]; if (!x) return;
          if (v.getAttribute('data-genre') === 'skill') {
            v.outerHTML = '<div class="actions"><a class="btn" href="' + RACINE + 'c-' + cle + '/skills/' + id + '.zip" download>Télécharger le skill en français (.zip)</a></div>';
            $$('[data-telecharger="' + id + '"]').forEach(function (b) { b.href = RACINE + 'c-' + cle + '/skills/' + id + '.zip'; b.setAttribute('download', ''); });
          } else {
            var enc = encodeURIComponent(x);
            var html = '<div class="prompt-texte" id="p-' + id + '" data-brut="' + echap(x).replace(/"/g, '&quot;') + '">' + surligner(x) + '</div>' +
              '<div class="actions"><button class="btn" data-copier="p-' + id + '">Copier le prompt</button>' +
              '<a class="btn clair" href="https://chatgpt.com/?q=' + enc + '" target="_blank" rel="noopener">Ouvrir dans ChatGPT</a>' +
              '<a class="btn clair" href="https://claude.ai/new?q=' + enc + '" target="_blank" rel="noopener">Ouvrir dans Claude</a></div>';
            var tmp = document.createElement('div'); tmp.innerHTML = html; v.replaceWith.apply(v, Array.prototype.slice.call(tmp.childNodes)); brancherCopie(document);
          }
        });
      });
    }
  }
})();
