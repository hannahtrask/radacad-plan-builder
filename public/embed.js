/*!
 * Radical Minds Academy — "Build your RadAcad week"
 * Left: families build the plan. Right: the student's week (timed) and price, live.
 * Built by Sagebrush Web Studio.
 *
 * Squarespace Code Block:
 *   <div id="plan-builder"></div>
 *   <script src="https://radacad-plan-builder.garrett-austen.workers.dev/embed.js" defer></script>
 *
 * All prices, classes, times and the ICL catalog live in plans.json next to this file.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var BASE = script && script.src ? new URL('.', script.src).href : './';
  var MOUNT_ID = (script && script.getAttribute('data-mount')) || 'plan-builder';
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
  var DAY_WORD = { 1: 'One day', 2: 'Two days', 3: 'Three days', 4: 'Four days', 5: 'Full week' };
  var FILL_ORDER = ['Mon', 'Wed', 'Tue', 'Thu', 'Fri'];
  var HEARD = ['Google or another search engine', 'Friend or family', 'Current RadAcad or Teton Tutors family', 'A teacher', 'Social media', 'Community event', 'Local organization', 'Returning family', 'Other'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function clock(m) { var h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + (mm < 10 ? '0' : '') + mm; }
  function sortDays(a) { return DAYS.filter(function (d) { return a.indexOf(d) !== -1; }); }
  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
      else if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: name }, params || {}));
    } catch (e) { /* never break the builder */ }
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function injectFonts() {
    if (document.querySelector('link[data-rma-fonts]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.setAttribute('data-rma-fonts', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Roboto+Slab:wght@500;600&display=swap';
    document.head.appendChild(l);
  }

  function boot() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) {
      mount = document.createElement('div');
      mount.id = MOUNT_ID;
      if (script && script.parentNode) script.parentNode.insertBefore(mount, script);
      else document.body.appendChild(mount);
    }
    if (mount.shadowRoot) return;
    injectFonts();
    var root = mount.attachShadow({ mode: 'open' });
    root.innerHTML = '<link rel="stylesheet" href="' + BASE + 'builder.css"><div class="rma"><p class="loading">Loading the plan builder…</p></div>';
    fetch(BASE + 'plans.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('plans.json ' + r.status); return r.json(); })
      .then(function (data) { init(root, data, mount); })
      .catch(function (err) {
        console.error('[plan builder]', err);
        root.querySelector('.rma').innerHTML = '<p class="loading">The plan builder didn’t load. Refresh the page, or <a href="/getstarted">tell us about your family here</a>.</p>';
      });
  }

  /* ======================================================================= */
  function init(root, data, mount) {
    var S = data.settings, M = data.membership, A = data.addOns, G = data.smallGroup, IC = data.iclAlaCarte;
    var SCH = data.scholarships, DAY = data.day, EX = data.explain;
    var schools = data.schools.filter(function (s) { return !s.hidden; });
    function school(id) { return data.schools.filter(function (s) { return s.id === id; })[0]; }
    function cls(id) { return G.classes.filter(function (c) { return c.id === id; })[0]; }
    function startOf(id) { return data.starts.filter(function (s) { return s.id === id; })[0]; }

    var BLANK = { school: 'own', days: ['Mon', 'Wed'], checkin: false, close: false, coach: 0, single: 0, classes: [], icl: [] };
    var st = Object.assign(JSON.parse(JSON.stringify(BLANK)), {
      grade: null, start: 'fall', esa: true, aid: 0, merit: 0, need: 0,
      preset: null, notice: '', dept: 'All', q: '', form: {}, sent: false, sheet: false, started: false
    });

    /* ---------- rules ---------- */
    function isPkg() { return st.school !== 'own'; }
    function isMS() { return st.grade === null || st.grade <= 8; }
    function groupsOK() { return st.grade === null || (st.grade >= G.minGrade && st.grade <= G.maxGrade); }
    function closeOK() { return st.grade !== null && st.grade >= A.close.minGrade; }
    function classDays(list) {
      var set = {};
      (list || st.classes).forEach(function (id) { cls(id).days.forEach(function (d) { set[d] = true; }); });
      return DAYS.filter(function (d) { return set[d]; });
    }
    function dropClassesOutside(days) {
      var gone = st.classes.filter(function (id) { return cls(id).days.some(function (d) { return days.indexOf(d) === -1; }); });
      st.classes = st.classes.filter(function (id) { return gone.indexOf(id) === -1; });
      return gone.map(function (id) { return cls(id).name; });
    }
    function setDayCount(n) {
      var pool = classDays().concat(st.days, FILL_ORDER), out = [];
      pool.forEach(function (d) { if (out.indexOf(d) === -1 && out.length < n && !(n <= 2 && d === 'Fri')) out.push(d); });
      st.days = sortDays(out);
      var gone = dropClassesOutside(st.days);
      st.notice = gone.length ? 'We took ' + gone.join(' and ') + ' off the plan, since ' + (gone.length > 1 ? 'they meet' : 'it meets') + ' on a day not in your membership.' : '';
    }
    function toggleDay(d) {
      var on = st.days.indexOf(d) !== -1;
      st.notice = '';
      if (on) {
        if (st.days.length === 1) { st.notice = 'Every plan needs at least one day.'; return; }
        st.days = st.days.filter(function (x) { return x !== d; });
        var gone = dropClassesOutside(st.days);
        if (gone.length) st.notice = 'We took ' + gone.join(' and ') + ' off the plan, since ' + (gone.length > 1 ? 'they meet' : 'it meets') + ' on ' + DAY_FULL[d] + '.';
        if (st.days.length <= 2 && st.days.indexOf('Fri') !== -1) {
          st.days = st.days.filter(function (x) { return x !== 'Fri'; });
          if (!st.days.length) st.days = ['Mon'];
          st.notice = 'Two-day memberships meet Monday through Thursday, so we took Friday off.';
        }
      } else {
        if (d === 'Fri' && st.days.length < 2) { st.notice = 'Two-day memberships meet Monday through Thursday. Pick two other days first to add Friday.'; return; }
        st.days = sortDays(st.days.concat(d));
      }
    }
    function normalize() {
      if (isPkg()) { st.days = DAYS.slice(); st.icl = []; }
      if (!groupsOK()) st.classes = [];
      if (!closeOK()) st.close = false;
      st.days = sortDays(st.days.concat(classDays()));
    }
    function membershipPrice(n) { return n <= 2 ? M.prices['2'] : M.prices[String(n)]; }
    function membershipName(n) { return n >= 5 ? 'Full-week membership' : n <= 2 ? 'Two-day membership' : DAY_WORD[n].replace(' days', '-day') + ' membership'; }

    /* ---------- pricing ---------- */
    function compute() {
      var sc = school(st.school), start = startOf(st.start), pkg = isPkg(), n = st.days.length;
      var lines = [], monthly = 0;
      function add(label, amount, k) { lines.push({ label: label, amount: amount, cls: k || '' }); monthly += amount; }

      var memBase = pkg ? sc.membershipPart : membershipPrice(n);
      if (pkg) add(st.school === 'aeon' ? 'Full-week membership (with Aeon)' : sc.name.replace(', through RadAcad', '').replace('ICL Academy, ', 'Full week + ICL Academy, '), sc.monthly);
      else add(membershipName(n) + ' (' + st.days.join(', ') + ')', memBase);
      if (st.aid) add('Income-based discount on membership (' + st.aid + '%)', -memBase * st.aid / 100, 'sub');
      if (st.merit) add('JHSC merit scholarship, if awarded (' + st.merit + '%)', -memBase * Math.min(st.merit, 100 - st.aid) / 100, 'sub');
      if (st.checkin) add(A.checkin.name, A.checkin.price);
      if (st.close) add(A.close.name, A.close.price);
      if (st.coach) add(st.coach + ' hr/week of 1:1 coaching', A.coaching.price * st.coach);
      if (st.single) add(st.single + ' single-subject class' + (st.single > 1 ? 'es' : ''), A.single.price * st.single);
      st.icl.forEach(function (c) { add('ICL ' + c.n + (c.live ? ' (live)' : ' (self-paced)'), c.live ? IC.live : IC.async); });

      var sem = [], semPer = 0, yearFees = 0, fall = st.start === 'fall';
      if (st.classes.length) {
        var per = fall ? G.fallFee : G.springFee;
        st.classes.forEach(function (id) { sem.push({ label: cls(id).name + (fall ? ' (fall)' : ' (spring)'), text: money(per) + ' per semester' }); });
        semPer += per * st.classes.length;
        yearFees += st.classes.length * (fall ? G.fallFee + G.springFee : G.springFee);
      }
      if (st.school === 'aeon') {
        sem.push({ label: 'Aeon School tuition, paid in advance', text: money(sc.semesterFee) + ' per semester' });
        semPer += sc.semesterFee;
        yearFees += sc.semesterFee * (fall ? 2 : 1);
      }
      var yearly = monthly * start.payments + yearFees;
      var credits = (st.esa ? S.esaAnnual : 0) + st.need;
      var creditTotal = Math.min(credits, yearly);
      var monthlyAfter = Math.max(0, monthly - credits / start.payments);
      var leftover = creditTotal - (monthly - monthlyAfter) * start.payments;
      var feesAfter = Math.max(0, yearFees - leftover);
      return { lines: lines, sem: sem, semPer: semPer, monthly: monthly, monthlyAfter: monthlyAfter, yearFees: yearFees, feesAfter: feesAfter,
        yearly: yearly, credits: credits, creditTotal: creditTotal, after: Math.max(0, yearly - creditTotal), payments: start.payments, memBase: memBase };
    }

    /* ---------- the week: timed schedule ---------- */
    var D0 = toMin(DAY.start), D1 = toMin(DAY.end);
    var G0 = toMin(DAY.goals[0]), G1 = toMin(DAY.goals[1]), F0 = toMin(DAY.final[0]), F1 = toMin(DAY.final[1]);
    var LUNCH = [toMin('12:00'), toMin('12:30')];
    var PREF = ['09:00', '13:00', '10:15', '14:15', '08:30', '11:00', '12:30', '09:45', '13:45', '10:45', '14:30', '11:15'].map(toMin);

    function schedule() {
      var on = st.days, pkg = isPkg(), sc = school(st.school), cal = {}, extra = [];
      DAYS.forEach(function (d) { cal[d] = []; });
      function put(d, s, e, label, k, est) { cal[d].push({ s: s, e: e, label: label, k: k, est: !!est }); }
      function free(d, s, e) {
        if (s < G1 || e > F0) return false;
        return cal[d].every(function (b) { return e <= b.s || s >= b.e; });
      }
      on.forEach(function (d) {
        put(d, G0, G1, 'Goals', 'coach');
        put(d, F0, F1, 'Final check-in', 'coach');
        put(d, LUNCH[0], LUNCH[1], 'Lunch', 'lunch');
      });
      st.classes.forEach(function (id) {
        var c = cls(id);
        c.sessions.forEach(function (x) { if (on.indexOf(x[0]) !== -1) put(x[0], toMin(x[1]), toMin(x[2]), c.short, 'cls'); });
      });
      if (pkg) {
        var name = st.school === 'aeon' ? 'Aeon' : 'ICL';
        var live = st.school !== 'icl-async';
        on.forEach(function (d) {
          [[toMin('08:30'), LUNCH[0]], [LUNCH[1], F0]].forEach(function (span, i) {
            put(d, span[0], span[1], i === 0 && live ? name + ' classes' : name + ' coursework', 'icl', true);
          });
        });
      }
      /* flexible items, spread through the week and the day */
      var items = [];
      for (var i = 0; i < st.single; i++) for (var j = 0; j < A.single.sessions; j++) items.push({ dur: A.single.sessionMin, label: 'Single-subject class', k: 'one', group: 's' + i });
      for (var c2 = 0; c2 < st.coach; c2++) items.push({ dur: 60, label: '1:1 coaching', k: 'one', group: 'c' });
      st.icl.forEach(function (c, i) {
        if (c.live) items.push({ dur: IC.liveMin, label: 'ICL ' + c.n + ' live', k: 'icl', group: 'i' + i });
        [60, 60, 45, 45].forEach(function (m) { items.push({ dur: m, label: 'ICL ' + c.n, k: 'icl', group: 'i' + i }); });
      });
      if (st.checkin) items.push({ dur: 30, label: 'Weekly plan', k: 'coach', group: 'w' });
      var dayPtr = 0, prefPtr = 0, lastDay = {};
      items.forEach(function (it) {
        var placed = false;
        for (var t = 0; t < on.length && !placed; t++) {
          var di = (dayPtr + t) % on.length, d = on[di];
          if (on.length > 1 && lastDay[it.group] === d && t < on.length - 1) continue;
          for (var p = 0; p < PREF.length && !placed; p++) {
            var s = PREF[(prefPtr + p) % PREF.length];
            if (free(d, s, s + it.dur)) { put(d, s, s + it.dur, it.label, it.k, true); placed = true; lastDay[it.group] = d; dayPtr = di + 1; }
          }
        }
        prefPtr++;
        if (!placed) extra.push(it);
      });
      /* coach check-ins */
      var marks = {};
      on.forEach(function (d) {
        var m = [];
        if (st.close) for (var h = toMin('09:30'); h < F0; h += 60) m.push(h);
        else if (isMS()) {
          cal[d].forEach(function (b) { if (b.k !== 'coach' && b.e > G1 && b.e < F0) m.push(b.e); });
          if (!m.length) m.push(toMin(DAY.hsCheckin));
        } else m.push(toMin(DAY.hsCheckin));
        marks[d] = m.filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
      });
      DAYS.forEach(function (d) { cal[d].sort(function (a, b) { return a.s - b.s; }); });
      var overflow = {};
      extra.forEach(function (it) { overflow[it.label] = (overflow[it.label] || 0) + it.dur; });
      return { cal: cal, marks: marks, overflow: overflow };
    }

    /* ---------- skeleton ---------- */
    var app = root.querySelector('.rma');
    app.innerHTML =
      '<header class="intro">' +
        '<p class="tagline">Build your RadAcad week</p>' +
        '<p class="lede">Every student starts with a membership. Start from an example plan or build your own, and watch the week and the price fill in.</p>' +
      '</header>' +
      '<div class="layout">' +
        '<div class="builder">' +
          '<section class="step" aria-labelledby="h-grade"><h3 id="h-grade"><span class="num">1</span>What grade is your student in?</h3>' +
            '<p class="hint">RadAcad serves grades 5–12. Your student’s grade shapes their day and which classes they can join.</p><div id="sec-grade"></div></section>' +
          '<div id="rest">' +
          '<section class="step" aria-labelledby="h-presets"><h3 id="h-presets"><span class="num">2</span>Start from an example plan</h3>' +
            '<p class="hint">Pick the one closest to your family, then change anything below. Prices include Wyoming ESA.</p>' +
            '<div class="presets" id="sec-presets"></div></section>' +
          '<section class="step" aria-labelledby="h-school"><h3 id="h-school"><span class="num">3</span>Where does school happen?</h3>' +
            '<p class="hint">RadAcad is the place your student does school, with a coach, goals every morning, and a note home every afternoon. The school itself can be one you already have or one of our partner schools.</p>' +
            '<div class="choices" id="sec-school"></div>' +
            '<div class="explain">' +
              '<details><summary>' + esc(EX.icl.title) + '</summary><p>' + esc(EX.icl.body) + '</p></details>' +
              (school('aeon').hidden ? '' : '<details><summary>' + esc(EX.aeon.title) + '</summary><p>' + esc(EX.aeon.body) + '</p></details>') +
            '</div>' +
            '<p class="note">Already enrolled somewhere? Keep your enrollment and pick “our own school.”</p></section>' +
          '<section class="step" aria-labelledby="h-days"><h3 id="h-days"><span class="num">4</span>Which days?</h3>' +
            '<p class="hint">' + esc(M.dayNote) + '</p><div id="sec-days"></div></section>' +
          '<section class="step" aria-labelledby="h-add"><h3 id="h-add"><span class="num">5</span>Add what your student needs</h3>' +
            '<p class="hint">Everything below is month to month except classes, which run by the semester. ' + esc(G.scheduleNote) + '</p>' +
            '<div id="sec-addons"></div>' +
            '<div class="addon block" id="sec-classes-wrap"><p class="addon-title">Small group classes</p><p class="addon-desc">' + esc(G.desc) + '</p><div class="classes" id="sec-classes"></div></div>' +
            '<div class="addon block" id="sec-icl-wrap"><p class="addon-title">ICL Academy courses, à la carte</p><p class="addon-desc">' + esc(IC.desc) + '</p>' +
              '<details class="explain-inline"><summary>' + esc(EX.icl.title) + '</summary><p>' + esc(EX.icl.body) + '</p></details>' +
              '<label class="sr" for="rma-icl-q">Search ICL courses</label>' +
              '<input class="search" id="rma-icl-q" type="search" placeholder="Search ICL courses (Algebra, English 9, AP Biology, Spanish…)" autocomplete="off">' +
              '<div class="pills" id="sec-depts"></div><div class="icl-list" id="sec-icl-list"></div><div class="picked" id="sec-icl-picked"></div></div>' +
          '</section>' +
          '<section class="step" aria-labelledby="h-start"><h3 id="h-start"><span class="num">6</span>When would you start?</h3><div id="sec-start"></div></section>' +
          '<section class="step" id="rma-send" aria-labelledby="h-send"><h3 id="h-send" tabindex="-1"><span class="num">7</span>Send this plan and book a call</h3>' +
            '<div id="sec-form"></div></section>' +
          '</div>' +
        '</div>' +
        '<aside class="summary" aria-label="Your student’s week and price">' +
          '<div class="sum-head"><h3>Your student’s week</h3><button type="button" class="sheet-close">Close</button></div>' +
          '<div class="cal" id="sum-cal"></div>' +
          '<div id="sum-legend"></div>' +
          '<div class="disc" id="sum-disc">' +
            '<p class="disc-h">Before you look at the price, check what applies to you</p>' +
            '<label class="toggle"><input type="checkbox" id="rma-esa"><span><b>Wyoming ESA</b>: $7,000 a year for any student not in public school. Every family who has applied has been approved.</span></label>' +
            '<label class="toggle"><input type="checkbox" id="rma-aid10" data-aid="10"><span><b>10% off membership</b>: household income is 80–120% of the Teton County median.</span></label>' +
            '<label class="toggle"><input type="checkbox" id="rma-aid20" data-aid="20"><span><b>20% off membership</b>: household income is below 80% of the county median.</span></label>' +
            '<div class="disc-group"><p class="dg-h"><b>' + esc(SCH.merit.title) + '</b>: ' + esc(SCH.merit.desc) + '</p>' +
              SCH.merit.options.map(function (o) { return '<label class="toggle"><input type="checkbox" id="rma-merit' + o + '" data-merit="' + o + '"><span>' + o + '% off membership' + (o === 50 ? ' (first place)' : ' (second place)') + '</span></label>'; }).join('') + '</div>' +
            '<div class="disc-group"><p class="dg-h"><b>' + esc(SCH.need.title) + '</b>: ' + esc(SCH.need.desc) + '</p>' +
              '<label class="slider-row" for="rma-need"><span class="sr">Need-based scholarship amount per year</span>' +
              '<input type="range" id="rma-need" min="' + (SCH.need.min - SCH.need.step) + '" max="' + SCH.need.max + '" step="' + SCH.need.step + '" value="' + (SCH.need.min - SCH.need.step) + '">' +
              '<output id="rma-need-out">None</output></label>' +
              '<p class="range-ends"><span>None</span><span>' + money(SCH.need.max) + ' a year</span></p></div>' +
            '<p class="note" id="sum-apply"></p>' +
          '</div>' +
          '<ul class="lines" id="sum-lines"></ul>' +
          '<div class="total"><p class="lbl" id="sum-lbl"></p><p class="big" id="sum-big"></p><p class="esa" id="sum-esa"></p></div>' +
          '<ul class="fine" id="sum-fine"></ul>' +
          '<button type="button" class="cta" id="sum-cta">Send this plan and book a call</button>' +
        '</aside>' +
      '</div>' +
      '<div class="mbar"><span class="mb-total"><span class="mb-num"></span><span class="mb-per">/mo</span></span>' +
        '<button type="button" class="mb-week">See the week</button></div>';

    var $ = function (s) { return app.querySelector(s); };

    /* ---------- left renderers ---------- */
    function renderGrade() {
      $('#sec-grade').innerHTML = '<div class="choices grades">' + S.grades.map(function (g) {
        return '<button type="button" class="choice" data-grade="' + g + '" aria-pressed="' + (st.grade === +g) + '"><strong>' + g + '</strong></button>';
      }).join('') + '</div>' +
        (st.grade !== null ? '<p class="note">' + (isMS()
          ? 'Middle schoolers set goals with a coach each morning, get a check-in at every transition, and finish with a final check-in.'
          : 'High schoolers set goals with a coach each morning, get a midday check-in, and finish with a final check-in. Close support adds hourly check-ins.') +
          (groupsOK() ? ' Small group classes are open to grades 6–8.' : '') + '</p>' : '');
    }
    function presetOK(p) { return !p.grades || st.grade === null || (st.grade >= p.grades[0] && st.grade <= p.grades[1]); }
    function applyPreset(id, quiet) {
      var p = data.presets.filter(function (x) { return x.id === id; })[0], set = JSON.parse(JSON.stringify(p.set));
      Object.assign(st, JSON.parse(JSON.stringify(BLANK)));
      var n = set.days || 2; delete set.days;
      Object.assign(st, set);
      setDayCount(n); st.days = sortDays(st.days.concat(classDays()));
      st.preset = id; st.notice = '';
      if (!quiet) track('plan_builder_preset', { preset: id });
    }
    function priceFor(id) {
      var keep = JSON.parse(JSON.stringify(st));
      applyPreset(id, true); normalize(); var r = compute();
      Object.keys(keep).forEach(function (k) { st[k] = keep[k]; });
      return r;
    }
    function renderPresets() {
      $('#sec-presets').innerHTML = data.presets.filter(function (p) { return (!p.set.school || !school(p.set.school).hidden) && presetOK(p); }).map(function (p) {
        var r = priceFor(p.id), on = st.preset === p.id;
        var fees = r.yearFees ? (r.feesAfter === 0 ? '' : ' + ' + money(r.feesAfter) + ' fees') : '';
        return '<button type="button" class="preset" data-preset="' + p.id + '" aria-pressed="' + on + '">' +
          '<strong>' + esc(p.name) + '</strong><small>' + esc(p.built) + '</small>' +
          '<span class="pp">' + (r.monthlyAfter === 0 && !r.feesAfter && r.credits ? 'Fully covered' : money(r.monthlyAfter) + '/mo' + fees) + '</span></button>';
      }).join('');
    }
    function renderSchool() {
      $('#sec-school').innerHTML = schools.map(function (s) {
        var on = st.school === s.id;
        return '<button type="button" class="choice" data-school="' + s.id + '" aria-pressed="' + on + '">' +
          '<span class="price">' + esc(s.priceLabel || money(s.monthly) + '/mo') + '</span>' +
          '<strong>' + esc(s.name) + '</strong><small>' + esc(s.desc) + '</small></button>';
      }).join('');
    }
    function renderDays() {
      var pkg = isPkg(), n = st.days.length, locked = classDays();
      var pct = Math.min(100, st.aid + st.merit) / 100, pay = startOf(st.start).payments, credit = (st.esa ? S.esaAnnual : 0) + st.need;
      $('#sec-days').innerHTML =
        '<div class="daypick" role="group" aria-label="Membership days">' + DAYS.map(function (d) {
          var on = st.days.indexOf(d) !== -1, lock = on && locked.indexOf(d) !== -1;
          return '<button type="button" class="dayb" data-day="' + d + '" aria-pressed="' + on + '"' + (pkg ? ' disabled' : '') + (lock ? ' title="One of your classes meets on ' + DAY_FULL[d] + '"' : '') + '>' +
            '<span>' + d + '</span>' + (lock ? '<small>class</small>' : '') + '</button>';
        }).join('') + '</div>' +
        '<div class="choices cols-4 tiers">' + [2, 3, 4, 5].map(function (k) {
          var base = M.prices[k], disc = Math.round(base * (1 - pct));
          var txt = money(disc) + '/mo' + (pct ? ' <s>' + money(base) + '</s>' : '');
          if (credit) txt += '<em>' + (disc * pay <= credit ? 'Covered by ESA' + (st.need ? ' + scholarship' : '') : money(Math.max(0, disc - credit / pay)) + '/mo with ' + (st.esa ? 'ESA' : 'scholarship')) + '</em>';
          var active = k === 2 ? n <= 2 : n === k;
          return '<button type="button" class="choice" data-tier="' + k + '" aria-pressed="' + active + '"' + (pkg && k !== 5 ? ' disabled' : '') + '><strong>' + DAY_WORD[k] + '</strong><small>' + txt + '</small></button>';
        }).join('') + '</div>' +
        (pkg ? '<p class="note"><strong>' + esc(school(st.school).name.replace(', through RadAcad', '')) + ' includes the full-week membership, Monday through Friday.</strong> To pick fewer days, choose “our own school” above.</p>'
          : '<p class="note">Your membership: <strong>' + membershipName(n) + ', ' + st.days.map(function (d) { return DAY_FULL[d]; }).join(', ') + '</strong>. Tap a day to add or remove it. Two-day memberships meet Monday through Thursday.</p>') +
        (st.notice ? '<p class="rule" role="status">' + esc(st.notice) + '</p>' : '') +
        (pkg ? '' : '<p class="note">Just want to try it? Drop-in days are $230, and a new family’s first drop-in day is free.</p>');
    }
    function toggle(id, on, a) {
      return '<div class="addon"><div><p class="addon-title">' + esc(a.name) + '</p><p class="addon-desc">' + esc(a.desc) + (a.desc.indexOf('$') === -1 ? ' ' + money(a.price) + '/mo.' : '') + '</p></div>' +
        '<label class="toggle"><input type="checkbox" id="rma-' + id + '" data-toggle="' + id + '"' + (on ? ' checked' : '') + '><span>Add</span></label></div>';
    }
    function stepper(id, value, max, a, label) {
      return '<div class="addon"><div><p class="addon-title">' + esc(a.name) + '</p><p class="addon-desc">' + esc(a.desc) + '</p></div>' +
        '<div class="stepper" role="group" aria-label="' + esc(label) + '">' +
          '<button type="button" data-dec="' + id + '" aria-label="Fewer"' + (value <= 0 ? ' disabled' : '') + '>−</button>' +
          '<output aria-live="polite">' + value + '</output>' +
          '<button type="button" data-inc="' + id + '" aria-label="More"' + (value >= max ? ' disabled' : '') + '>+</button></div></div>';
    }
    function renderAddons() {
      $('#sec-addons').innerHTML =
        toggle('checkin', st.checkin, A.checkin) +
        (closeOK() ? toggle('close', st.close, A.close) : '') +
        stepper('coach', st.coach, A.coaching.max, A.coaching, 'Weekly hours of 1:1 coaching') +
        stepper('single', st.single, A.single.max, A.single, 'Single-subject classes');
      $('#sec-classes-wrap').hidden = !groupsOK();
      $('#sec-classes').innerHTML = G.classes.map(function (c) {
        var on = st.classes.indexOf(c.id) !== -1;
        return '<label class="cls"><input type="checkbox" id="rma-cls-' + c.id + '" data-cls="' + c.id + '"' + (on ? ' checked' : '') + '>' +
          '<span><strong>' + esc(c.name) + '</strong><small>' + esc(c.when) + ', with ' + esc(c.who) + '</small></span></label>';
      }).join('');
    }
    function renderIcl() {
      var wrap = $('#sec-icl-wrap');
      wrap.hidden = isPkg();
      if (isPkg()) return;
      $('#sec-depts').innerHTML = IC.departments.map(function (d) {
        return '<button type="button" class="pill" data-dept="' + esc(d) + '" aria-pressed="' + (d === st.dept) + '">' + esc(d) + '</button>';
      }).join('');
      var q = st.q.trim().toLowerCase(), full = st.icl.length >= IC.max;
      var rows = data.iclCourses.filter(function (c) { return (st.dept === 'All' || c.d === st.dept) && (!q || c.n.toLowerCase().indexOf(q) !== -1); });
      $('#sec-icl-list').innerHTML = rows.length ? rows.map(function (c) {
        var on = st.icl.some(function (x) { return x.n === c.n; });
        return '<div class="icl-row"><span>' + esc(c.n) + '<small>' + (c.ms ? 'middle school' : 'high school') + '</small></span>' +
          '<button type="button" data-add-icl="' + esc(c.n) + '"' + (on || full ? ' disabled' : '') + '>' + (on ? 'Added' : 'Add') + '</button></div>';
      }).join('') : '<div class="icl-row"><span>No courses match. Try a shorter search.</span></div>';
      $('#sec-icl-picked').innerHTML = (full ? '<p class="note">That’s the limit of three courses.</p>' : '') + st.icl.map(function (c, i) {
        return '<div class="picked-row"><span>' + esc(c.n) + '</span><span class="fmt">' +
          '<button type="button" data-fmt="' + i + '" data-live="1" aria-pressed="' + c.live + '">Live ' + money(IC.live) + '</button>' +
          '<button type="button" data-fmt="' + i + '" data-live="0" aria-pressed="' + !c.live + '">Self-paced ' + money(IC.async) + '</button>' +
          '<button type="button" class="rm" data-rm-icl="' + i + '" aria-label="Remove ' + esc(c.n) + '">×</button></span></div>';
      }).join('') + (st.icl.length ? '<p class="note">Each ICL course is about 45 minutes of live class a week (live courses) plus 3 to 4 hours of independent work, shown as estimates in the week.</p>' : '');
    }
    function renderStart() {
      $('#sec-start').innerHTML = '<div class="choices cols-2">' + data.starts.map(function (s) {
        return '<button type="button" class="choice" data-start="' + s.id + '" aria-pressed="' + (st.start === s.id) + '"><strong>' + esc(s.label) + '</strong><small>' + esc(s.desc) + '</small></button>';
      }).join('') + '</div>' +
        '<p class="note">Wyoming ESA, discounts, and scholarships are in the price panel' + (window.innerWidth < 960 ? ' (tap “See the week”)' : '') + '.</p>' +
        (st.start === 'jan' ? '<p class="note">' + esc(st.esa ? data.esaJanYes : data.esaJanNo) + '</p>' : '');
    }
    function renderForm() {
      var F = st.form;
      if (st.sent) {
        $('#sec-form').innerHTML = '<div class="sent"><p class="sent-h">Plan sent</p>' +
          '<p>Check your inbox for a copy. The next step is a ' + esc(S.callLength) + ' intro call, so we can get to know your family and fine-tune the plan together.</p>' +
          '<a class="btn" target="_blank" rel="noopener" href="' + esc(S.bookingUrl) + '">Book your intro call</a>' +
          '<p class="note">Not ready to book? We’ll reach out ' + esc(S.followUp) + '.</p></div>';
        return;
      }
      function field(name, label, type, ac, req) {
        return '<div class="f"><label for="rma-f-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<input id="rma-f-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + (req ? ' required' : '') + ' value="' + esc(F[name] || '') + '"></div>';
      }
      $('#sec-form').innerHTML = '<p class="hint">We’ll email you a copy of this plan and follow up ' + esc(S.followUp) + '. You can book your intro call right after.</p>' +
        '<form novalidate><div class="grid">' +
          field('parentFirst', 'Your first name', 'text', 'given-name', true) +
          field('parentLast', 'Your last name', 'text', 'family-name', true) +
          field('email', 'Email', 'email', 'email', true) +
          field('phone', 'Mobile phone', 'tel', 'tel', true) +
          field('studentFirst', 'Student’s first name', 'text', 'off', true) +
          field('current', 'Current school', 'text', 'off', false) +
          '<div class="f wide"><label for="rma-f-heard">How did you hear about us? <span class="opt-tag">(optional)</span></label><select id="rma-f-heard" name="heard"><option value="">Choose one</option>' +
            HEARD.map(function (h) { return '<option' + (F.heard === h ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') + '</select></div>' +
          '<div class="f wide"><label for="rma-f-notes">Anything we should know? <span class="opt-tag">(optional)</span></label>' +
            '<textarea id="rma-f-notes" name="notes" rows="3" placeholder="Learning needs, travel plans, best time to call">' + esc(F.notes || '') + '</textarea></div>' +
        '</div>' +
        '<div class="hp" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="form-error" role="alert"></p>' +
        '<button type="submit" class="btn submit">Send my plan</button></form>';
    }

    /* ---------- right side ---------- */
    var PX = 0.62; // px per minute
    function renderCal() {
      var sc = schedule(), H = (D1 - D0) * PX;
      var hours = []; for (var h = 9 * 60; h < D1; h += 60) hours.push(h);
      var axis = '<div class="axis" style="height:' + H + 'px">' + hours.map(function (m) {
        return '<span style="top:' + ((m - D0) * PX) + 'px">' + clock(m) + '</span>';
      }).join('') + '</div>';
      var cols = DAYS.map(function (d) {
        var on = st.days.indexOf(d) !== -1;
        var blocks = sc.cal[d].map(function (b) {
          var top = (b.s - D0) * PX, ht = Math.max(10, (b.e - b.s) * PX - 1);
          return '<div class="blk ' + b.k + (b.est ? ' est' : '') + (ht < 22 ? ' tiny' : '') + '" style="top:' + top + 'px;height:' + ht + 'px" title="' +
            esc(b.label + ', ' + clock(b.s) + '–' + clock(b.e) + (b.est ? ' (estimated)' : '')) + '"><span>' + esc(b.label) + '</span></div>';
        }).join('');
        var marks = (sc.marks[d] || []).map(function (m) {
          return '<i class="mk" style="top:' + ((m - D0) * PX) + 'px" title="Coach check-in, ' + clock(m) + '"></i>';
        }).join('');
        return '<div class="col' + (on ? ' on' : '') + '"><p class="dh">' + d + '</p><div class="track" style="height:' + H + 'px">' +
          hours.map(function (m) { return '<b class="hl" style="top:' + ((m - D0) * PX) + 'px"></b>'; }).join('') +
          (on ? blocks + marks : '<span class="home">At home</span>') + '</div></div>';
      }).join('');
      $('#sum-cal').innerHTML = '<div class="cal-grid">' + axis + cols + '</div>';

      var over = Object.keys(sc.overflow).map(function (k) { return k + ' (' + Math.round(sc.overflow[k] / 15) / 4 + ' hrs)'; });
      $('#sum-legend').innerHTML =
        '<ul class="legend">' +
          '<li><i class="sw coach"></i>Coach</li>' +
          (groupsOK() && st.classes.length ? '<li><i class="sw cls"></i>RadAcad class</li>' : '') +
          (st.coach || st.single ? '<li><i class="sw one"></i>1:1</li>' : '') +
          (st.icl.length || isPkg() ? '<li><i class="sw icl"></i>' + (st.school === 'aeon' ? 'Aeon' : 'ICL') + '</li>' : '') +
          '<li><i class="mk-sw"></i>' + (st.close ? 'Hourly check-in' : isMS() ? 'Check-in at each transition' : 'Midday check-in') + '</li>' +
          '<li><i class="sw est"></i>Estimated time</li>' +
        '</ul>' +
        '<p class="cal-note">' + esc(DAY.note) + '</p>' +
        (over.length ? '<p class="cal-note">Doesn’t fit on membership days, so done at home or on another day: ' + esc(over.join(', ')) + '.</p>' : '');
    }
    function syncDisc() {
      $('#rma-esa').checked = st.esa;
      $('#rma-aid10').checked = st.aid === 10; $('#rma-aid20').checked = st.aid === 20;
      SCH.merit.options.forEach(function (o) { $('#rma-merit' + o).checked = st.merit === o; });
      var slider = $('#rma-need');
      if (root.activeElement !== slider) slider.value = st.need || (SCH.need.min - SCH.need.step);
      $('#rma-need-out').textContent = st.need ? money(st.need) + ' a year' : 'None';
      slider.setAttribute('aria-valuetext', st.need ? money(st.need) + ' a year' : 'None');
      $('#sum-apply').innerHTML = st.aid || st.need || st.merit
        ? 'Discounts and scholarships go through the RadAcad Foundation: <a href="' + esc(S.foundationUrl) + '" target="_blank" rel="noopener">radacadfoundation.org/apply</a>' : '';
      $('#sum-apply').hidden = !(st.aid || st.need || st.merit);
    }
    function renderSummary() {
      var r = compute(), pkg = isPkg(), sc = school(st.school);
      renderCal(); syncDisc();
      var lines = r.lines.slice();
      $('#sum-lines').innerHTML = lines.map(function (l) {
        return '<li' + (l.cls ? ' class="' + l.cls + '"' : '') + '><span>' + esc(l.label) + '</span><span>' + money(l.amount) + '/mo</span></li>';
      }).join('') + r.sem.map(function (l) { return '<li class="semline"><span>' + esc(l.label) + '</span><span>' + esc(l.text) + '</span></li>'; }).join('') +
        (st.esa ? '<li class="sub"><span>Wyoming ESA</span><span>−' + money(S.esaAnnual) + '/yr</span></li>' : '') +
        (st.need ? '<li class="sub"><span>Need-based scholarship, if awarded</span><span>−' + money(st.need) + '/yr</span></li>' : '');

      var fall = st.start === 'fall', period = fall ? 'school year' : 'spring';
      var credName = st.esa && st.need ? 'ESA and scholarship' : st.esa ? 'Wyoming ESA' : 'scholarship';
      $('#sum-lbl').textContent = 'Per month' + (r.credits ? ' with ' + credName : '') + ', ' + (fall ? 'nine payments' : 'five payments');
      $('#sum-big').textContent = money(r.monthlyAfter);
      $('.mb-num').textContent = money(r.monthlyAfter);
      var txt = r.credits
        ? (r.after === 0 ? 'Fully covered. ' : '') + money(r.monthly) + '/mo before ' + (st.esa && st.need ? 'ESA and scholarship' : st.esa ? 'ESA' : 'scholarship') + '. ' + money(r.creditTotal) + ' of your ' + money(r.yearly) + ' ' + period + ' is covered.'
        : money(r.yearly) + ' for the ' + period + '.';
      var feeName = st.school === 'aeon' ? (st.classes.length ? 'Class fees and Aeon tuition' : 'Aeon tuition') : 'Class fees';
      if (r.yearFees) txt += ' ' + feeName + ': ' + (r.credits && r.feesAfter === 0 ? 'covered too.' : r.credits && r.feesAfter < r.yearFees ? money(r.feesAfter) + ' for the ' + period + ' after credits.' : money(r.semPer) + ' per semester.');
      $('#sum-esa').textContent = txt;

      var fine = ['Membership is month to month with 30 days’ notice.'];
      if (pkg) fine.push(st.school === 'aeon' ? 'Aeon tuition is billed by semester and paid before the semester starts.'
        : 'ICL enrollment is a full-' + (fall ? 'year' : 'semester') + ' commitment.' + (!fall ? ' January 2027 families can withdraw by January 31 for a full refund minus a ' + money(sc.deposit) + ' deposit.' : ''));
      else fine.push('New families: your first drop-in day is free, and your first month of membership is refundable if it isn’t a fit.');
      if (st.classes.length) fine.push('Classes on the same days share a membership day, so two Monday/Wednesday classes still fit a two-day membership.');
      if (st.merit) fine.push('The JHSC award is 50% off membership for first place and 25% for second, awarded annually by committee.');
      if (st.need) fine.push('Need-based awards are set by the Foundation committee and can go toward membership, classes, 1:1, or an online school package.');
      fine.push('Prepay by the semester or the year for 5% off.');
      $('#sum-fine').innerHTML = '<li class="confirm">' + esc(S.finePrint) + '</li>' + fine.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      $('#sum-cta').hidden = st.sent;
    }

    /* ---------- render all, keep focus ---------- */
    function focusKey(el) {
      if (!el || !el.tagName) return '';
      if (el.id) return '#' + el.id;
      var d = el.dataset || {};
      var keys = ['preset', 'grade', 'school', 'day', 'tier', 'dec', 'inc', 'dept', 'start', 'addIcl', 'fmt'];
      for (var i = 0; i < keys.length; i++) if (d[keys[i]] !== undefined) return keys[i] + ':' + d[keys[i]] + (d.live || '');
      return '';
    }
    function render() {
      var key = focusKey(root.activeElement);
      normalize();
      renderGrade(); renderPresets(); renderSchool(); renderDays(); renderAddons(); renderIcl(); renderStart(); renderSummary();
      app.classList.toggle('sheet-open', st.sheet);
      app.classList.toggle('is-sent', st.sent);
      if (key) {
        var els = root.querySelectorAll('button, input, select, textarea');
        for (var k = 0; k < els.length; k++) if (focusKey(els[k]) === key) {
          var el = els[k];
          if (el.disabled) { var alt = el.parentNode.querySelector('button:not([disabled])'); if (alt) el = alt; }
          if (root.activeElement !== el) el.focus({ preventScroll: true });
          break;
        }
      }
    }
    function started() { if (!st.started) { st.started = true; track('plan_builder_start'); } }

    /* ---------- events ---------- */
    var builder = $('.builder');
    builder.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled || b.type === 'submit') return;
      var d = b.dataset;
      if (d.grade) {
        st.grade = +d.grade; track('plan_builder_grade', { grade: st.grade });
        started(); render(); return;
      }
      if (d.preset) { applyPreset(d.preset); started(); render(); return; }
      st.preset = null;
      if (d.school) { var wasPkg = isPkg(); st.school = d.school; if (wasPkg && st.school === 'own') setDayCount(2); track('plan_builder_school', { school: d.school }); }
      else if (d.tier) setDayCount(+d.tier);
      else if (d.day) toggleDay(d.day);
      else if (d.inc) { var mx = d.inc === 'coach' ? A.coaching.max : A.single.max; if (st[d.inc] < mx) st[d.inc]++; }
      else if (d.dec) { if (st[d.dec] > 0) st[d.dec]--; }
      else if (d.dept) st.dept = d.dept;
      else if (d.addIcl) { if (st.icl.length < IC.max) st.icl.push({ n: d.addIcl, live: true }); }
      else if (d.fmt !== undefined) st.icl[+d.fmt].live = d.live === '1';
      else if (d.rmIcl !== undefined) st.icl.splice(+d.rmIcl, 1);
      else if (d.start) st.start = d.start;
      else return;
      started(); render();
    });
    builder.addEventListener('change', function (e) {
      var t = e.target, d = t.dataset;
      if (d.toggle) { st.preset = null; st[d.toggle] = t.checked; }
      else if (d.cls) { st.preset = null; st.notice = ''; st.classes = t.checked ? st.classes.concat(d.cls) : st.classes.filter(function (x) { return x !== d.cls; }); }
      else return;
      started(); render();
    });
    $('#rma-icl-q').addEventListener('input', function (e) { st.q = e.target.value; renderIcl(); });

    var disc = $('#sum-disc');
    disc.addEventListener('change', function (e) {
      var t = e.target, d = t.dataset;
      if (t.id === 'rma-esa') st.esa = t.checked;
      else if (d.aid) st.aid = t.checked ? +d.aid : 0;
      else if (d.merit) st.merit = t.checked ? +d.merit : 0;
      else return;
      started(); render();
    });
    $('#rma-need').addEventListener('input', function (e) {
      var v = +e.target.value;
      st.need = v < SCH.need.min ? 0 : v;
      started(); render();
    });

    function goSend() {
      st.sheet = false; render();
      $('#rma-send').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      var first = root.getElementById ? root.getElementById('rma-f-parentFirst') : null;
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
    }
    $('#sum-cta').addEventListener('click', goSend);
    $('.mb-week').addEventListener('click', function () { st.sheet = true; render(); $('.sheet-close').focus(); });
    $('.sheet-close').addEventListener('click', function () { st.sheet = false; render(); });

    /* ---------- submit ---------- */
    $('#sec-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, err = form.querySelector('.form-error');
      err.textContent = '';
      form.querySelectorAll('.f.invalid').forEach(function (el) { el.classList.remove('invalid'); });
      if (st.grade === null) {
        err.textContent = 'Pick your student’s grade at the top of the builder.';
        $('#h-grade').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        return;
      }
      var bad = [];
      form.querySelectorAll('[required]').forEach(function (el) {
        if (!el.value.trim() || !el.checkValidity()) { bad.push(el); el.closest('.f').classList.add('invalid'); }
      });
      if (bad.length) {
        err.textContent = bad.length === 1 ? 'Fill in the highlighted field to send your plan.' : 'Fill in the ' + bad.length + ' highlighted fields to send your plan.';
        bad[0].focus(); return;
      }
      var fd = new FormData(form), F = {};
      fd.forEach(function (v, k) { F[k] = String(v).trim(); });
      st.form = F;
      var r = compute(), sc = school(st.school), fall = st.start === 'fall';
      var preset = st.preset && data.presets.filter(function (p) { return p.id === st.preset; })[0];
      var payload = {
        company: F.company || '',
        page: location.href,
        parent: { first: F.parentFirst, last: F.parentLast, email: F.email, phone: F.phone },
        student: { first: F.studentFirst, grade: String(st.grade) },
        start: startOf(st.start).label,
        heard: F.heard || '',
        notes: (F.current ? 'Current school: ' + F.current + '\n' : '') + (F.notes || ''),
        answers: {
          coursework: sc.name,
          days: isPkg() ? 'Full week' : st.days.join(', '),
          needs: [st.esa ? 'Has Wyoming ESA' : 'No ESA', st.aid ? st.aid + '% income-based discount' : '', st.merit ? 'JHSC merit ' + st.merit + '%' : '',
            st.need ? 'Need-based scholarship request ' + money(st.need) + '/yr' : ''].filter(Boolean),
          suggested: preset ? 'Started from: ' + preset.name : ''
        },
        plan: {
          name: preset ? preset.name : isPkg() ? sc.name.replace(', through RadAcad', '') : membershipName(st.days.length) + ' plan',
          days: st.days,
          lines: r.lines.map(function (l) { return { label: l.label, amount: Math.round(l.amount) }; }),
          monthly: Math.round(r.monthly),
          classFees: r.sem.map(function (s) { return s.label + ': ' + s.text; }).join('; '),
          esa: r.credits ? money(Math.round(r.monthlyAfter)) + '/mo with ' + (st.esa ? 'ESA' : '') + (st.esa && st.need ? ' and ' : '') + (st.need ? 'scholarship' : '') + ' (' + money(r.after) + ' for the ' + (fall ? 'school year' : 'spring') + ')' : 'No ESA: ' + money(r.yearly) + ' for the ' + (fall ? 'school year' : 'spring')
        }
      };
      var btn = form.querySelector('.submit');
      btn.disabled = true; btn.textContent = 'Sending…';
      var send = S.endpoint
        ? fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(function (res) { return res.json(); })
            .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'Send failed'); })
        : new Promise(function (resolve) { console.info('[plan builder] Preview mode: no endpoint set, so nothing was sent.', payload); setTimeout(resolve, 600); });
      send.then(function () {
        st.sent = true;
        track('plan_builder_submit', { plan: payload.plan.name, value: payload.plan.monthly, currency: 'USD' });
        renderForm(); render();
        var h = $('#h-send'); if (h) h.focus({ preventScroll: true });
      }).catch(function (error) {
        console.error('[plan builder]', error);
        btn.disabled = false; btn.textContent = 'Send my plan';
        err.innerHTML = 'Your plan didn’t send. Check your connection and try again, or email <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a>.';
      });
    });

    mount.__rmaTest = {
      set: function (o) { Object.assign(st, o); render(); return compute(); },
      preset: function (id) { applyPreset(id); render(); return compute(); },
      schedule: function () { return schedule(); },
      state: function () { return JSON.parse(JSON.stringify(st)); }
    };

    renderForm();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
