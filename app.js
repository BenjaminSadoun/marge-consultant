(function () {
  var STORAGE_KEY = 'margeConsultant_v1';
  var GAUGE_R = 58;
  var CIRC = 2 * Math.PI * GAUGE_R;
  var K2_INTERNAL_FACTOR = 2;
  var K2_PORTAGE_FACTOR = 1.2;
  var K2_PORTAGE_THRESHOLD = 500;
  var K2_EXTRA_COST = 100;

  var COUNTRY_LANG = { fr: 'fr', es: 'es', it: 'it', ch: 'en', be: 'fr' };

  var COUNTRY_NAMES = {
    fr: { fr: 'France', es: 'Espagne', it: 'Italie', ch: 'Suisse', be: 'Belgique et Lux' },
    en: { fr: 'France', es: 'Spain', it: 'Italy', ch: 'Switzerland', be: 'Belgium and Lux' },
    it: { fr: 'Francia', es: 'Spagna', it: 'Italia', ch: 'Svizzera', be: 'Belgio e Lux' },
    es: { fr: 'Francia', es: 'España', it: 'Italia', ch: 'Suiza', be: 'Bélgica y Lux' }
  };

  var T = {
    fr: { internal: 'Interne', external: 'Externe', portage: 'Portage salarial', freelance: 'Freelance', sales: 'TJM vente', dly: 'Frais quotidiens', salary: 'Salaire brut annuel', purchase: 'TJM achat', perDay: '€ / jour', title: 'Marge consultant', op: 'Marge opérationnelle', k2: 'Marge K2' },
    en: { internal: 'Internal', external: 'External', portage: 'Umbrella contract', freelance: 'Freelance', sales: 'Sales daily rate', dly: 'Daily cost', salary: 'Gross annual salary', purchase: 'Purchase daily rate', perDay: '€ / day', title: 'Consultant margin', op: 'Operating margin', k2: 'K2 margin' },
    it: { internal: 'Interno', external: 'Esterno', portage: 'Portage salariale', freelance: 'Freelance', sales: 'TGM vendita', dly: 'Costo giornaliero', salary: 'Stipendio annuo lordo', purchase: 'TGM acquisto', perDay: '€ / giorno', title: 'Margine consulente', op: 'Margine operativo', k2: 'Margine K2' },
    es: { internal: 'Interno', external: 'Externo', portage: 'Portage salarial', freelance: 'Freelance', sales: 'Tarifa diaria venta', dly: 'Coste diario', salary: 'Salario bruto anual', purchase: 'Tarifa diaria compra', perDay: '€ / día', title: 'Margen consultor', op: 'Margen operativo', k2: 'Margen K2' }
  };

  var COLORS = {
    green: { stroke: 'var(--green-stroke)', text: 'var(--green-text)' },
    yellow: { stroke: 'var(--yellow-stroke)', text: 'var(--yellow-text)' },
    orange: { stroke: 'var(--orange-stroke)', text: 'var(--orange-text)' },
    red: { stroke: 'var(--red-stroke)', text: 'var(--red-text)' }
  };

  var els = {
    country: document.getElementById('country'),
    lang: document.getElementById('lang'),
    seg: document.getElementById('seg'),
    segExtMode: document.getElementById('seg-ext-mode'),
    sales: document.getElementById('sales'),
    dly: document.getElementById('dlycost'),
    salary: document.getElementById('salary'),
    purchase: document.getElementById('purchase'),
    fieldInternal: document.querySelector('.field-internal'),
    fieldExternal: document.querySelector('.field-external'),
    gaugeBlockK2: document.getElementById('gauge-block-k2'),
    ringOp: document.getElementById('ring-op'),
    pctOp: document.getElementById('pct-op'),
    valOp: document.getElementById('val-op'),
    ringK2: document.getElementById('ring-k2'),
    pctK2: document.getElementById('pct-k2'),
    valK2: document.getElementById('val-k2'),
    pageTitle: document.getElementById('page-title'),
    brandTitle: document.getElementById('brand-title')
  };
  var segBtns = els.seg.querySelectorAll('button');
  var segExtBtns = els.segExtMode.querySelectorAll('button');

  var state = loadState();

  function loadState() {
    var defaults = { type: 'internal', externalMode: 'portage', lang: 'fr', country: 'fr', sales: 650, dly: 50, salary: 45000, purchase: 400 };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      var saved = JSON.parse(raw);
      return Object.assign(defaults, saved);
    } catch (e) {
      return defaults;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function currentCountryOption() {
    return els.country.querySelector('option[value="' + state.country + '"]');
  }

  function paintSeg() {
    segBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-value') === state.type);
    });
    segExtBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-value') === state.externalMode);
    });
    els.fieldInternal.style.display = state.type === 'internal' ? 'block' : 'none';
    els.fieldExternal.style.display = state.type === 'external' ? 'block' : 'none';
    els.segExtMode.hidden = !(state.type === 'external' && state.country === 'fr');
  }

  function paintLang() {
    var t = T[state.lang];
    segBtns[0].textContent = t.internal;
    segBtns[1].textContent = t.external;
    segExtBtns[0].textContent = t.portage;
    segExtBtns[1].textContent = t.freelance;
    document.getElementById('lbl-sales').textContent = t.sales;
    document.getElementById('lbl-dly').textContent = t.dly;
    document.getElementById('lbl-salary').textContent = t.salary;
    document.getElementById('lbl-purchase').textContent = t.purchase;
    document.getElementById('lbl-margin-op').textContent = t.op;
    document.getElementById('lbl-margin-k2').textContent = t.k2;
    els.pageTitle.textContent = t.title;
    els.brandTitle.textContent = t.title;
    document.documentElement.lang = state.lang;

    var names = COUNTRY_NAMES[state.lang];
    Array.prototype.forEach.call(els.country.options, function (opt) {
      opt.textContent = names[opt.value];
    });
  }

  function colorForInternal(p) {
    if (p > 47) return COLORS.green;
    if (p >= 40) return COLORS.yellow;
    if (p >= 35) return COLORS.orange;
    return COLORS.red;
  }

  function colorForExternal(p) {
    if (p > 35) return COLORS.green;
    if (p >= 30) return COLORS.yellow;
    if (p >= 25) return COLORS.orange;
    return COLORS.red;
  }

  function paintGauge(ring, pctEl, marginPct, color) {
    var clamped = Math.max(0, Math.min(100, marginPct));
    var offset = CIRC - (CIRC * clamped) / 100;
    ring.setAttribute('stroke-dasharray', CIRC.toFixed(1));
    ring.setAttribute('stroke-dashoffset', offset.toFixed(1));
    ring.style.stroke = color.stroke;
    pctEl.style.fill = color.text;
    pctEl.textContent = Math.round(marginPct) + '%';
  }

  function compute() {
    var opt = currentCountryOption();
    var cm = parseFloat(opt.getAttribute('data-cm'));
    var awd = parseFloat(opt.getAttribute('data-awd'));

    var s = parseFloat(els.sales.value) || 0;
    var dly = parseFloat(els.dly.value) || 0;
    var sal = parseFloat(els.salary.value) || 0;
    var pur = parseFloat(els.purchase.value) || 0;
    var cost;
    if (state.type === 'internal') {
      cost = (sal * cm) / awd + dly;
    } else {
      cost = pur + dly;
    }

    var marginValue = s - cost;
    var marginPct = s > 0 ? (marginValue / s) * 100 : 0;
    var color = state.type === 'internal' ? colorForInternal(marginPct) : colorForExternal(marginPct);

    paintGauge(els.ringOp, els.pctOp, marginPct, color);
    els.valOp.textContent = Math.round(marginValue).toLocaleString('fr-FR') + ' ' + T[state.lang].perDay;

    var showK2 = state.country === 'fr';
    els.gaugeBlockK2.hidden = !showK2;
    if (showK2) {
      var marginValueK2, marginPctK2;
      if (state.type === 'internal') {
        var costK2 = (sal * K2_INTERNAL_FACTOR) / awd + dly;
        marginValueK2 = s - costK2;
        marginPctK2 = s > 0 ? (marginValueK2 / s) * 100 : 0;
        paintGauge(els.ringK2, els.pctK2, marginPctK2, colorForInternal(marginPctK2));
      } else {
        if (state.externalMode === 'portage') {
          marginValueK2 = pur >= K2_PORTAGE_THRESHOLD
            ? s - (pur + K2_EXTRA_COST) - dly
            : s - pur * K2_PORTAGE_FACTOR - dly;
        } else {
          marginValueK2 = s - (pur + K2_EXTRA_COST) - dly;
        }
        marginPctK2 = s > 0 ? (marginValueK2 / s) * 100 : 0;
        paintGauge(els.ringK2, els.pctK2, marginPctK2, colorForExternal(marginPctK2));
      }
      els.valK2.textContent = Math.round(marginValueK2).toLocaleString('fr-FR') + ' ' + T[state.lang].perDay;
    }
  }

  function applyInputsFromState() {
    els.country.value = state.country;
    els.lang.value = state.lang;
    els.sales.value = state.sales;
    els.dly.value = state.dly;
    els.salary.value = state.salary;
    els.purchase.value = state.purchase;
  }

  segBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.type = b.getAttribute('data-value');
      paintSeg();
      compute();
      saveState();
    });
  });

  segExtBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.externalMode = b.getAttribute('data-value');
      paintSeg();
      compute();
      saveState();
    });
  });

  els.sales.addEventListener('input', function () {
    state.sales = els.sales.value;
    compute();
    saveState();
  });
  els.dly.addEventListener('input', function () {
    state.dly = els.dly.value;
    compute();
    saveState();
  });
  els.salary.addEventListener('input', function () {
    state.salary = els.salary.value;
    compute();
    saveState();
  });
  els.purchase.addEventListener('input', function () {
    state.purchase = els.purchase.value;
    compute();
    saveState();
  });

  els.lang.addEventListener('change', function () {
    state.lang = els.lang.value;
    paintLang();
    compute();
    saveState();
  });

  els.country.addEventListener('change', function () {
    state.country = els.country.value;
    state.lang = COUNTRY_LANG[state.country] || 'en';
    els.lang.value = state.lang;
    paintSeg();
    paintLang();
    compute();
    saveState();
  });

  applyInputsFromState();
  paintSeg();
  paintLang();
  compute();
})();
