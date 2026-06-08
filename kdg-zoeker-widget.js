/**
 * KdG Infodag Zoeker – live Airtable versie
 * Drop-in vervanging voor de hardcoded dataset op kdg.be/infodag-juni
 * Verwacht in de pagina: #kdgInput, #kdgClear, #kdgList, #kdgStatus
 */
(function () {
  var TOKEN   = 'path3WFJHGRNs2fDT.3f7e0520bce8b5879d732843b72b5d0edeb2e154283e47fe61a469b89573a56f';
  var BASE    = 'appBu1JAcv2ArUIDW';
  var TABLE   = 'tblfUr00XRAeMSW13';
  var VIEW    = 'viwFV8bYiYtCF9w1i';
  var VELDEN  = ['title', 'Infodag_campus', 'Infodag_tags'];

  /* Campus → paginaanker (zelfde als de bestaande widget) */
  var CAMPUS_ANKER = {
    'Campus Zuid':                 '#gezondheidszorg',   /* ook onderwijs/welzijn, maar Zuid is het anker */
    'Campus Groenplaats':          '#mit',
    'Campus Hoboken':              '#wetenschappen-en-technologie',
    'Campus Sint Lucas Antwerpen': '#sla'
  };

  /* Verfijnde anker-overrides op basis van campus + opleidingsnaam-patronen
     (omdat Campus Zuid zowel Gezondheidszorg, Onderwijs als Welzijn herbergt) */
  var ZUIDOVERRIDES = [
    { patroon: /leraar|onderwijs|schoolleider|steinerpedagogie|godsdienst|kleuteronderwijs|lager onderwijs|secundair onderwijs|educatief graduaat|van kleuter|personal trainer|mentor.*stage|verkorte educatieve/i, anker: '#onderwijs' },
    { patroon: /maatschappelijk|sociaal|orthopedagogie|pedagogie.*jonge|kunst.*cultuur|welzijn|jeugdcriminologie|sociaal-cultureel|sociaal-juridisch|sociaal.*flex/i, anker: '#saw' }
  ];

  var PAGE_BASE = window.location.href.split('#')[0];
  var data = [];

  var input    = document.getElementById('kdgInput');
  var clearBtn = document.getElementById('kdgClear');
  var list     = document.getElementById('kdgList');
  var status   = document.getElementById('kdgStatus');

  if (!input || !list || !status) return; /* widget niet aanwezig op pagina */

  /* ── Normaliseer tekst voor zoeken ── */
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /* ── Bepaal anker op basis van campus + naam ── */
  function bepaalAnker(campus, naam) {
    if (campus === 'Campus Zuid') {
      for (var i = 0; i < ZUIDOVERRIDES.length; i++) {
        if (ZUIDOVERRIDES[i].patroon.test(naam)) return ZUIDOVERRIDES[i].anker;
      }
      return '#gezondheidszorg'; /* default voor Zuid */
    }
    return CAMPUS_ANKER[campus] || null;
  }

  /* ── Haal alle records op (met paginering) ── */
  function laadData() {
    status.textContent = 'Opleidingen laden…';
    var records = [];

    function haalPagina(offset) {
      var params = new URLSearchParams({
        view:        VIEW,
        pageSize:    100,
        cellFormat:  'string',
        timeZone:    'Europe/Brussels',
        userLocale:  'nl'
      });
      VELDEN.forEach(function(f) { params.append('fields[]', f); });
      if (offset) params.set('offset', offset);

      fetch('https://api.airtable.com/v0/' + BASE + '/' + TABLE + '?' + params, {
        headers: { Authorization: 'Bearer ' + TOKEN }
      })
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (json.error) { status.textContent = 'Fout bij laden.'; return; }
        json.records.forEach(function(r) {
          var naam   = (r.fields.title || '').trim();
          var campus = (r.fields.Infodag_campus || '').trim();
          var tags   = (r.fields.Infodag_tags || '').trim();
          if (naam && campus) {
            records.push({ naam: naam, campus: campus, tags: tags, anker: bepaalAnker(campus, naam) });
          }
        });
        if (json.offset) {
          haalPagina(json.offset);
        } else {
          records.sort(function(a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
          data = records;
          status.textContent = '';
        }
      })
      .catch(function() { status.textContent = 'Kon opleidingen niet laden.'; });
    }

    haalPagina(null);
  }

  /* ── Scroll naar anker ── */
  function scrollNaar(anker) {
    if (!anker) return;
    var target = document.querySelector(anker);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = PAGE_BASE + anker;
    }
  }

  /* ── Render zoekresultaten ── */
  function render(query) {
    var q = norm(query.trim());
    list.innerHTML = '';
    if (!q) {
      status.textContent = '';
      clearBtn.style.display = 'none';
      return;
    }
    clearBtn.style.display = 'block';
    var matches = data.filter(function(r) {
      return norm(r.naam).indexOf(q) !== -1 || norm(r.tags).indexOf(q) !== -1;
    });
    if (matches.length === 0) {
      status.textContent = 'Geen resultaten.';
      return;
    }
    status.textContent = matches.length === 1 ? '1 resultaat' : matches.length + ' resultaten';
    matches.forEach(function(r) {
      var row = document.createElement('div');
      row.className = 'kdg-zoeker__row';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.innerHTML =
        '<span class="kdg-zoeker__name">' + r.naam + '</span>' +
        '<span class="kdg-zoeker__campus">&#8599; ' + r.campus + '</span>';
      row.addEventListener('click', function() { scrollNaar(r.anker); });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { scrollNaar(r.anker); }
      });
      list.appendChild(row);
    });
  }

  input.addEventListener('input', function() { render(input.value); });
  clearBtn.addEventListener('click', function() { input.value = ''; render(''); input.focus(); });

  laadData();
})();
