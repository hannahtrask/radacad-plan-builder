/*!
 * Radical Minds Academy \u2014 "Build your RadAcad week"
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
  function money(n) { return (n < 0 ? '\u2212' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); }
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
    root.innerHTML = '<link rel="stylesheet" href="' + BASE + 'builder.css"><div class="rma"><p class="loading">Loading the plan builder\u2026</p></div>';
    fetch(BASE + 'plans.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('plans.json ' + r.status); return r.json(); })
      .then(function (data) { init(root, data, mount); })
      .catch(function (err) {
        console.error('[plan builder]', err);
        root.querySelector('.rma').innerHTML = '<p class="loading">The plan builder didn\u2019t load. Refresh the page, or <a href="/getstarted">tell us about your family here</a>.</p>';
      });
  }

  /* ======================================================================= */
  function init(root, data, mount) {
    var S = data.settings, M = data.membership, A = data.addOns, G = data.smallGroup, IC = data.iclAlaCarte;
    var SCH = data.scholarships, DAY = data.day, EX = data.explain;
    var schools = data.schools.filter(function (s) { return !s.hidden; });
    function school(id) { return data.schools.filter(function (s) { return s.id === id; })[0]; }
    function cls(id) { return G.classes.filter(function (c) { return c.id === id; })[0]; }
    function linked(x) {
      var body = esc(x.body), name = esc(x.link || ''), i = name ? body.indexOf(name) : -1;
      if (i < 0 || !x.url) return body;
      return body.slice(0, i) + '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + name + '</a>' + body.slice(i + name.length);
    }
    function startOf(id) { return data.starts.filter(function (s) { return s.id === id; })[0]; }

    var BLANK = { school: 'own', days: ['Mon', 'Wed'], close: false, coach: 0, single: 0, classes: [], icl: [], clubs: [], clubTerms: {} };
    var CLUBS = data.clubs || [];
    function club(id) { return CLUBS.filter(function (c) { return c.id === id; })[0]; }
    var st = Object.assign(JSON.parse(JSON.stringify(BLANK)), {
      grade: null, start: 'fall', esa: true, aid: 0, merit: 0, need: 0,
      path: 'example', preset: null, notice: '', dept: 'All', q: '', form: {}, sent: false, sheet: false, started: false
    });

    /* ---------- rules ---------- */
    function isPkg() { return st.school !== 'own'; }
    function isMS() { return st.grade === null || st.grade <= 8; }
    function groupsOK() { return st.grade === null || (st.grade >= G.minGrade && st.grade <= G.maxGrade); }
    function closeOK() { return st.grade !== null && st.grade >= A.close.minGrade; }
    function classDays(list) {
      var set = {};
      (list || st.classes).forEach(function (id) { cls(id).days.forEach(function (d) { set[d] = true; }); });
      if (!list) st.clubs.forEach(function (id) { club(id).days.forEach(function (d) { set[d] = true; }); });
      return DAYS.filter(function (d) { return set[d]; });
    }
    function clubOK(c) { return st.grade === null || (st.grade >= c.minGrade && st.grade <= c.maxGrade); }
    function dropClassesOutside(days) {
      var gone = st.classes.filter(function (id) { return cls(id).days.some(function (d) { return days.indexOf(d) === -1; }); });
      st.classes = st.classes.filter(function (id) { return gone.indexOf(id) === -1; });
      var goneC = st.clubs.filter(function (id) { return club(id).days.some(function (d) { return days.indexOf(d) === -1; }); });
      st.clubs = st.clubs.filter(function (id) { return goneC.indexOf(id) === -1; });
      return gone.map(function (id) { return cls(id).name; }).concat(goneC.map(function (id) { return club(id).name; }));
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
      st.clubs = st.clubs.filter(function (id) { return clubOK(club(id)); });
      if (!closeOK()) st.close = false;
      var keepIcl = st.icl.filter(function (c) { return courseOK(c.n); });
      if (keepIcl.length < st.icl.length) { st.iclDropped = st.icl.filter(function (c) { return !courseOK(c.n); }).map(function (c) { return c.n; }); st.icl = keepIcl; }
      st.days = sortDays(st.days.concat(classDays()));
    }
    function levelOK(c) { return st.grade === null || (st.grade <= 8 ? c.ms : !c.ms); }
    function courseOK(n) { var c = data.iclCourses.filter(function (x) { return x.n === n; })[0]; return !c || levelOK(c); }
    function membershipPrice(n) { return n <= 2 ? M.prices['2'] : M.prices[String(n)]; }
    function membershipName(n) { return n >= 5 ? 'Full-week membership' : n <= 2 ? 'Two-day membership' : DAY_WORD[n].replace(' days', '-day') + ' membership'; }

    /* ---------- pricing ---------- */
    // Plans with ICL or Aeon (a package, or any \u00e0 la carte ICL course) are one yearly price, paid up front.
    // Everything else is monthly, with small group classes billed by the semester.
    function isUpfront() { return isPkg() || st.icl.length > 0; }
    function schoolWord() { return st.school === 'aeon' ? 'Aeon' : 'ICL'; }
    function iclPrice(c, jan) { return c.live ? (jan ? IC.liveJan : IC.live) : (jan ? IC.asyncJan : IC.async); }
    function coachText(n) {
      var m = n * A.coaching.blockMin, h = Math.floor(m / 60), r = m % 60;
      return (h ? h + ' hr' : '') + (h && r ? ' ' : '') + (r ? r + ' min' : '') + ' a week';
    }
    function coachLabel(n) { return n === 1 ? 'Weekly check-in session (30 min a week)' : '1:1 time with a coach (' + coachText(n) + ')'; }
    function clubLines() {
      return st.clubs.map(function (id) {
        var c = club(id), terms = (st.clubTerms[id] || []).map(function (t) { return c.terms.filter(function (x) { return x.id === t; })[0].label.replace(' session', ''); });
        return { label: c.name + (terms.length ? ' (' + terms.join(' and ').toLowerCase() + ')' : ''), amount: 0, cls: '', unit: '', text: c.priceNote };
      });
    }
    function compute() {
      var sc = school(st.school), start = startOf(st.start), pkg = isPkg(), n = st.days.length;
      var P = start.payments, jan = st.start === 'jan', fall = !jan, up = isUpfront();
      var period = jan ? 'spring' : 'school year';
      var memMonthly = pkg ? sc.membershipMonthly : membershipPrice(n);
      var pct = Math.min(st.aid + st.merit, 100);
      var credits = (st.esa ? S.esaAnnual : 0) + st.need;
      var groupYear = st.classes.length * (fall ? G.fallFee + G.springFee : G.springFee);
      var groupSem = st.classes.length * (fall ? G.fallFee : G.springFee);

      if (up) {
        var lines = [], sum = 0;
        function addY(label, amount, k) { lines.push({ label: label, amount: amount, cls: k || '', unit: '' }); sum += amount; }
        if (pkg) addY(sc.name + (jan ? ', spring semester' : ', full year') + ' (includes full-week membership)', jan ? sc.janPrice : sc.yearly);
        else addY(membershipName(n) + ' for the ' + period + ' (' + st.days.join(', ') + ')', memMonthly * P);
        st.icl.forEach(function (c) { addY('ICL ' + c.n + (c.live ? ', live' : ', self-paced') + (jan ? ' (spring)' : ' (full year)'), iclPrice(c, jan)); });
        if (st.close) addY(A.close.name + ' for the ' + period, A.close.price * P);
        if (st.coach) addY(coachLabel(st.coach) + ' for the ' + period, A.coaching.blockPrice * st.coach * P);
        if (st.single) addY(st.single + ' single-subject class' + (st.single > 1 ? 'es' : '') + ' for the ' + period, A.single.price * st.single * P);
        st.classes.forEach(function (id) { addY(cls(id).name + (fall ? ' (fall and spring)' : ' (spring)'), fall ? G.fallFee + G.springFee : G.springFee); });
        clubLines().forEach(function (l) { lines.push(l); });
        var gross = sum;
        if (st.aid) addY('Income-based discount on membership (' + st.aid + '%)', -memMonthly * P * st.aid / 100, 'sub');
        if (st.merit) addY('JHSC merit scholarship, if awarded (' + st.merit + '%)', -memMonthly * P * Math.min(st.merit, 100 - st.aid) / 100, 'sub');
        var afterDisc = sum;
        var esaAmt = st.esa ? Math.min(S.esaAnnual, Math.max(0, afterDisc)) : 0;
        if (esaAmt) addY('Wyoming ESA', -esaAmt, 'sub');
        var needAmt = st.need ? Math.min(st.need, Math.max(0, afterDisc - esaAmt)) : 0;
        if (st.need) addY('Need-based scholarship, if awarded', -needAmt, 'sub');
        return { up: true, lines: lines, total: Math.max(0, sum), gross: gross, beforeCredits: afterDisc, credits: credits, period: period, jan: jan, payments: P, memMonthly: memMonthly };
      }

      var mlines = [], monthly = 0;
      function add(label, amount, k) { mlines.push({ label: label, amount: amount, cls: k || '', unit: '/mo' }); monthly += amount; }
      add(membershipName(n) + ' (' + st.days.join(', ') + ')', memMonthly);
      if (st.aid) add('Income-based discount on membership (' + st.aid + '%)', -memMonthly * st.aid / 100, 'sub');
      if (st.merit) add('JHSC merit scholarship, if awarded (' + st.merit + '%)', -memMonthly * Math.min(st.merit, 100 - st.aid) / 100, 'sub');
      if (st.close) add(A.close.name, A.close.price);
      if (st.coach) add(coachLabel(st.coach), A.coaching.blockPrice * st.coach);
      if (st.single) add(st.single + ' single-subject class' + (st.single > 1 ? 'es' : ''), A.single.price * st.single);
      // small group tuition spread evenly over the payments, so the monthly number stays flat
      st.classes.forEach(function (id) { add(cls(id).name + (fall ? ' (fall and spring)' : ' (spring)'), (fall ? G.fallFee + G.springFee : G.springFee) / P); });
      clubLines().forEach(function (l) { mlines.push(l); });
      var yearly = monthly * P;
      var creditTotal = Math.min(credits, yearly);
      var monthlyAfter = Math.max(0, monthly - credits / P);
      return { up: false, lines: mlines, monthly: monthly, monthlyAfter: monthlyAfter, groupYear: groupYear,
        yearly: yearly, credits: credits, creditTotal: creditTotal, after: Math.max(0, yearly - creditTotal), payments: P, period: period, jan: jan, memMonthly: memMonthly };
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
        c.sessions.forEach(function (x) { if (on.indexOf(x[0]) !== -1) put(x[0], toMin(x[1]), toMin(x[2]), c.short, c.type === 'club' ? 'club' : 'cls'); });
      });
      st.clubs.forEach(function (id) {
        var c = club(id);
        c.sessionsTime.forEach(function (x) { if (on.indexOf(x[0]) !== -1) put(x[0], toMin(x[1]), toMin(x[2]), c.short, 'club'); });
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
      for (var i = 0; i < st.single; i++) for (var j = 0; j < A.single.sessions; j++) items.push({ dur: A.single.sessionMin, label: 'Single-subject class', k: 'cls', group: 's' + i });
      if (st.coach === 1) items.push({ dur: 30, label: 'Weekly check-in', k: 'coach', group: 'w' });
      else for (var c2 = 0; c2 < st.coach; c2 += 2) items.push({ dur: st.coach - c2 >= 2 ? 60 : 30, label: '1:1 coaching', k: 'one', group: 'c' });
      st.icl.forEach(function (c, i) {
        if (c.live) items.push({ dur: IC.liveMin, label: 'ICL ' + c.n + ' live', k: 'icl', group: 'i' + i });
        [60, 60, 45, 45].forEach(function (m) { items.push({ dur: m, label: 'ICL ' + c.n, k: 'icl', group: 'i' + i }); });
      });
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
        '<p class="tagline">Build Your RadAcad Week</p>' +
      '</header>' +
      '<div class="layout">' +
        '<div class="builder">' +
          '<section class="step" aria-labelledby="h-grade"><h3 id="h-grade"><span class="num">1</span>What Grade Is Your Student In, and When Would They Start?</h3>' +
            '<div id="sec-grade"></div>' +
            '<p class="sub-q">When would they start?</p><div id="sec-start"></div></section>' +
          '<section class="step" aria-labelledby="h-path"><h3 id="h-path"><span class="num">2</span>Start From an Example, or Build Your Own</h3>' +
            '<div class="path" role="group" aria-label="How to start">' +
              '<button type="button" class="path-b" data-path="example"><strong>Start From an Example or Online School Partner Package</strong><small>Our example plans, plus ICL Academy and Aeon School packages</small></button>' +
              '<button type="button" class="path-b" data-path="own"><strong>Build Your Own</strong><small>Pick days and add what your student needs</small></button>' +
            '</div>' +
            '<div id="sec-path"></div></section>' +
          '<section class="step" aria-labelledby="h-days"><h3 id="h-days"><span class="num">3</span>Which Days?</h3>' +
            '<div id="sec-days"></div></section>' +
          '<section class="step" aria-labelledby="h-add"><h3 id="h-add"><span class="num">4</span>Add What Your Student Needs</h3>' +
            '<p class="hint">' + esc(data.addHint) + ' ' + esc(G.scheduleNote) + '</p>' +
            '<div id="sec-addons"></div>' +
            '<div class="addon block" id="sec-classes-wrap"><p class="addon-title">Small Group Classes</p><div id="sec-classes-body"></div></div>' +
            '<div class="addon block" id="sec-clubs-wrap"><p class="addon-title">Clubs</p><div id="sec-clubs-body"></div></div>' +
            '<div class="addon block" id="sec-icl-wrap"><p class="addon-title">ICL Academy Courses, \u00e0 la Carte</p><p class="addon-desc">' + esc(IC.desc) + '</p>' +
              '<details class="explain-inline"><summary>' + esc(EX.icl.title) + '</summary><p>' + linked(EX.icl) + '</p></details>' +
              '<label class="sr" for="rma-icl-q">Search ICL courses</label>' +
              '<input class="search" id="rma-icl-q" type="search" placeholder="Search ICL courses (Algebra, English 9, AP Biology, Spanish\u2026)" autocomplete="off">' +
              '<div class="pills" id="sec-depts"></div><div class="icl-list" id="sec-icl-list"></div><div class="picked" id="sec-icl-picked"></div></div>' +
          '</section>' +
          '<section class="step" id="rma-send" aria-labelledby="h-send"><h3 id="h-send" tabindex="-1"><span class="num">5</span>Send This Plan and Book a Call</h3>' +
            '<div id="sec-form"></div></section>' +
        '</div>' +
        '<aside class="summary" aria-label="Your student\u2019s week and price">' +
          '<div class="sum-head"><h3>Your Student\u2019s Week</h3><button type="button" class="sheet-close">Close</button></div>' +
          '<div class="cal" id="sum-cal"></div>' +
          '<div id="sum-legend"></div>' +
          '<div class="disc" id="sum-disc">' +
            '<p class="disc-h">Before You Look at the Price, Check What Applies to You</p>' +
            '<label class="toggle"><input type="checkbox" id="rma-esa"><span><b>Wyoming ESA</b>: $7,000 a year for any student not in public school. Every family who has applied has been approved. ' + esc(data.esaQuarterly) + '</span></label>' +
            '<label class="toggle"><input type="checkbox" id="rma-aid10" data-aid="10"><span><b>10% off membership</b>: household income is 80\u2013120% of the Teton County median.</span></label>' +
            '<label class="toggle"><input type="checkbox" id="rma-aid20" data-aid="20"><span><b>20% off membership</b>: household income is below 80% of the county median.</span></label>' +
            '<div class="disc-group"><p class="dg-h"><a class="dg-link" href="' + esc(S.foundationUrl) + '" target="_blank" rel="noopener"><b>' + esc(SCH.merit.title) + '</b></a>: ' + esc(SCH.merit.desc) + '</p>' +
              SCH.merit.options.map(function (o) { return '<label class="toggle"><input type="checkbox" id="rma-merit' + o + '" data-merit="' + o + '"><span>' + o + '% off membership' + (o === 50 ? ' (first place)' : ' (second place)') + '</span></label>'; }).join('') + '</div>' +
            '<div class="disc-group"><p class="dg-h"><b>' + esc(SCH.need.title) + '</b>: ' + esc(SCH.need.desc) + '</p>' +
              '<label class="slider-row" for="rma-need"><span class="sr">Need-based scholarship amount per year</span>' +
              '<input type="range" id="rma-need" min="' + (SCH.need.min - SCH.need.step) + '" max="' + SCH.need.max + '" step="' + SCH.need.step + '" value="' + (SCH.need.min - SCH.need.step) + '">' +
              '<output id="rma-need-out">None</output></label>' +
              '<p class="range-ends"><span>None</span><span>' + money(SCH.need.max) + ' a year</span></p></div>' +
            '<p class="note foundation">Discounts and scholarships go through the RadAcad Foundation: <a href="' + esc(S.foundationUrl) + '" target="_blank" rel="noopener">radacadfoundation.org/apply</a></p>' +
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
    function priceText(r) {
      if (r.up) return money(r.total) + ' for the ' + r.period;
      if (r.monthlyAfter === 0 && r.credits) return 'Fully covered';
      return money(r.monthlyAfter) + '/mo';
    }

    /* ---------- left renderers ---------- */
    function renderGrade() {
      var Y = data.youngerNote;
      $('#sec-grade').innerHTML = '<div class="choices grades">' + S.grades.map(function (g) {
        return '<button type="button" class="choice" data-grade="' + g + '" aria-pressed="' + (st.grade === +g) + '"><strong>' + g + '</strong></button>';
      }).join('') + '</div>' +
        '<p class="note">' + esc(Y.text) + ' <button type="button" class="link inline-link" data-younger aria-expanded="' + !!st.younger + '">' + esc(Y.link) + '</button>.</p>' +
        (st.younger ? renderYounger() : '') +
        (st.grade !== null ? '<p class="note">' + (isMS()
          ? 'Middle schoolers set goals with a coach each morning, get a check-in at every transition, and finish with a final check-in.'
          : 'High schoolers set goals with a coach each morning, get a midday check-in, and finish with a final check-in. Close support adds hourly check-ins.') +
          (groupsOK() ? ' Small group classes are open to grades ' + G.minGrade + '\u2013' + G.maxGrade + '.' : '') + '</p>' : '');
    }
    function renderYounger() {
      var F = st.yform || {};
      if (st.youngerSent) return '<div class="younger sent-y"><p class="sent-h">Thanks! We Got It</p><p>We\u2019ll email you a copy and reach out ' + esc(S.followUp) + ' to talk about a custom 1:1 plan.</p></div>';
      function f(name, label, type, req, ac) {
        return '<div class="f"><label for="rma-y-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<input id="rma-y-' + name + '" name="' + name + '" type="' + type + '"' + (ac ? ' autocomplete="' + ac + '"' : '') + (req ? ' required' : '') + ' value="' + esc(F[name] || '') + '"></div>';
      }
      return '<form class="younger" novalidate data-younger-form><p class="younger-h">Tell Us About Your Younger Student</p>' +
        '<p class="hint">We build custom 1:1 plans for students below 5th grade. Share a little about your family and we\u2019ll be in touch.</p>' +
        '<div class="grid">' + f('parentFirst', 'Your first name', 'text', true, 'given-name') + f('parentLast', 'Your last name', 'text', true, 'family-name') +
          f('email', 'Email', 'email', true, 'email') + f('phone', 'Mobile phone', 'tel', true, 'tel') +
          f('studentFirst', 'Student\u2019s first name', 'text', true, 'off') + f('age', 'Student\u2019s age or grade', 'text', true, 'off') +
          '<div class="f wide"><label for="rma-y-notes">What are you looking for? <span class="opt-tag">(optional)</span></label><textarea id="rma-y-notes" name="notes" rows="3" placeholder="Days, subjects, learning needs, how your student is doing now">' + esc(F.notes || '') + '</textarea></div>' +
        '</div><div class="hp" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="form-error" role="alert"></p><button type="submit" class="btn">Send to RadAcad</button></form>';
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
    function presetCard(p) {
      var r = priceFor(p.id), on = st.preset === p.id, sc = p.set.school && school(p.set.school);
      var jan = st.start === 'jan';
      return '<button type="button" class="preset' + (sc ? ' pkg' : '') + '" data-preset="' + p.id + '" aria-pressed="' + on + '">' +
        '<strong>' + esc(p.name) + '</strong><small>' + esc(p.built) + '</small>' +
        '<span class="pp">' + (sc ? (r.total === 0 ? 'Fully covered' : money(r.total) + (jan ? ' for the spring, paid before the student starts' : ', paid yearly')) : priceText(r)) + '</span></button>';
    }
    function renderPath() {
      app.querySelectorAll('[data-path]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.path === st.path)); });
      if (st.path !== 'example') {
        $('#sec-path').innerHTML = '<p class="note">Pick your days below, then add classes, 1:1 time, or ICL courses. You can switch to an example any time.</p>';
        return;
      }
      var list = data.presets.filter(function (p) { return (!p.set.school || !school(p.set.school).hidden) && presetOK(p); });
      var plans = list.filter(function (p) { return !p.set.school; }), pkgs = list.filter(function (p) { return p.set.school; });
      $('#sec-path').innerHTML =
        '<p class="hint">Pick the one closest to your family, then change anything below.</p>' +
        '<div class="presets">' + plans.map(presetCard).join('') + '</div>' +
        (pkgs.length ? '<p class="group-h">Partner School Packages</p>' +
          '<p class="hint">Full-time online school with a full-week RadAcad membership, one price for the year.</p>' +
          '<div class="presets">' + pkgs.map(presetCard).join('') + '</div>' +
          '<div class="explain">' +
            '<details><summary>' + esc(EX.icl.title) + '</summary><p>' + linked(EX.icl) + '</p></details>' +
            (school('aeon').hidden ? '' : '<details><summary>' + esc(EX.aeon.title) + '</summary><p>' + linked(EX.aeon) + '</p></details>') +
          '</div>' : '');
    }
    function renderDays() {
      var pkg = isPkg(), n = st.days.length, locked = classDays();
      var pct = Math.min(100, st.aid + st.merit) / 100, pay = startOf(st.start).payments, credit = (st.esa ? S.esaAnnual : 0) + st.need;
      function card(k, label, tag) {
        var base = M.prices[k], disc = Math.round(base * (1 - pct));
        var txt = money(disc) + '/mo' + (pct ? ' <s>' + money(base) + '</s>' : '');
        if (credit && !isUpfront()) txt += '<em>' + (disc * pay <= credit ? 'Covered by ESA' + (st.need ? ' + scholarship' : '') : money(Math.max(0, disc - credit / pay)) + '/mo with ' + (st.esa ? 'ESA' : 'scholarship')) + '</em>';
        var active = k === 2 ? n <= 2 : n === k;
        return '<button type="button" class="choice tier' + (pkg ? ' locked' : '') + '" data-tier="' + k + '" aria-pressed="' + active + '">' +
          (tag ? '<span class="tag-std">' + tag + '</span>' : '') + '<strong>' + label + '</strong><small>' + txt + '</small></button>';
      }
      $('#sec-days').innerHTML =
        '<div class="daypick' + (pkg ? ' locked' : '') + '" role="group" aria-label="Membership days">' + DAYS.map(function (d) {
          var on = st.days.indexOf(d) !== -1, lock = on && locked.indexOf(d) !== -1;
          return '<button type="button" class="dayb" data-day="' + d + '" aria-pressed="' + on + '"' + (lock ? ' title="One of your classes meets on ' + DAY_FULL[d] + '"' : '') + '>' +
            '<span>' + d + '</span>' + (lock ? '<small>class</small>' : '') + '</button>';
        }).join('') + '</div>' +
        '<div class="choices cols-2 tiers">' + card(5, 'Full-Week Membership', 'Standard plan') + card(2, 'Two-Day Membership', '') + '</div>' +
        '<p class="extra-days">Need a third or fourth day? Add ' + money(M.prices[3] - M.prices[2]) + ' a day.' +
          (!pkg && (n === 3 || n === 4) ? ' <strong>Your plan: ' + membershipName(n).toLowerCase() + ', ' + money(membershipPrice(n)) + '/mo.</strong>' : '') + '</p>' +
        (pkg ? '<p class="note"><strong>' + esc(school(st.school).name) + ' includes the full-week membership, Monday through Friday.</strong></p>'
          : '<p class="note">Your days: <strong>' + st.days.map(function (d) { return DAY_FULL[d]; }).join(', ') + '</strong>. Tap a day to add or remove it. Two-day memberships meet Monday through Thursday.</p>') +
        (st.notice ? '<p class="rule" role="status">' + esc(st.notice) + '</p>' : '') +
        (pkg ? '' : '<p class="note">Just want to try it? Drop-in days are $230, and a new family\u2019s first drop-in day is free.</p>');
    }
    function toggle(id, on, a) {
      return '<div class="addon"><div><p class="addon-title">' + esc(a.name) + '</p><p class="addon-desc">' + esc(a.desc) + (a.desc.indexOf('$') === -1 ? ' ' + money(a.price) + '/mo.' : '') + '</p></div>' +
        '<label class="toggle"><input type="checkbox" id="rma-' + id + '" data-toggle="' + id + '"' + (on ? ' checked' : '') + '><span>Add</span></label></div>';
    }
    function stepper(id, value, max, a, label, meta) {
      return '<div class="addon"><div><p class="addon-title">' + esc(a.name) + '</p><p class="addon-desc">' + esc(a.desc) + '</p>' + (meta ? '<p class="addon-meta">' + esc(meta) + '</p>' : '') + '</div>' +
        '<div class="stepper" role="group" aria-label="' + esc(label) + '">' +
          '<button type="button" data-dec="' + id + '" aria-label="Fewer"' + (value <= 0 ? ' disabled' : '') + '>\u2212</button>' +
          '<output aria-live="polite">' + value + '</output>' +
          '<button type="button" data-inc="' + id + '" aria-label="More"' + (value >= max ? ' disabled' : '') + '>+</button></div></div>';
    }
    function clash(c) {
      // a selected class that meets at the same time on the same day
      for (var i = 0; i < st.classes.length; i++) {
        var o = cls(st.classes[i]); if (o.id === c.id) continue;
        var hit = c.sessions.some(function (x) { return o.sessions.some(function (y) { return x[0] === y[0] && toMin(x[1]) < toMin(y[2]) && toMin(y[1]) < toMin(x[2]); }); });
        if (hit) return o;
      }
      return null;
    }
    function renderAddons() {
      $('#sec-addons').innerHTML =
        (closeOK() ? toggle('close', st.close, A.close) : '') +
        stepper('coach', st.coach, A.coaching.maxBlocks, A.coaching, 'Weekly 30-minute blocks with a coach',
          st.coach ? coachText(st.coach) + ', ' + money(A.coaching.blockPrice * st.coach) + '/mo' : 'None yet') +
        stepper('single', st.single, A.single.max, A.single, 'Single-subject classes', money(A.single.price) + '/mo each');
      renderClubs();
      var body = $('#sec-classes-body');
      if (!groupsOK()) {
        body.innerHTML = '<p class="addon-desc">Small group classes are for grades ' + G.minGrade + '\u2013' + G.maxGrade + '.' +
          (st.grade > G.maxGrade ? ' High schoolers can add ICL courses or 1:1 time below.' : '') + '</p>';
        return;
      }
      var cur = st.days.length, curPrice = membershipPrice(cur);
      body.innerHTML = '<p class="addon-desc">Grades ' + G.minGrade + '\u2013' + G.maxGrade + '. ' + esc(G.desc) + '</p><div class="classes">' + G.classes.map(function (c) {
        var on = st.classes.indexOf(c.id) !== -1, hit = on ? null : clash(c);
        var missing = c.days.filter(function (d) { return st.days.indexOf(d) === -1; });
        var flag = '';
        if (on) flag = '<em class="fits">On your plan</em>';
        else if (hit) flag = '<em class="clash">Meets at the same time as ' + esc(hit.short) + '</em>';
        else if (!missing.length) flag = '<em class="fits">Fits your days</em>';
        else {
          var bump = membershipPrice(Math.min(5, cur + missing.length)) - curPrice;
          flag = '<em class="adds">Adds ' + missing.map(function (d) { return DAY_FULL[d]; }).join(' and ') + ' to your membership' +
            (bump > 0 && !isPkg() ? ' (+' + money(bump) + '/mo)' : '') + '</em>';
        }
        return '<label class="cls' + (hit ? ' off' : !on && missing.length ? ' needs' : '') + '"><input type="checkbox" id="rma-cls-' + c.id + '" data-cls="' + c.id + '"' + (on ? ' checked' : '') + (hit ? ' disabled' : '') + '>' +
          '<span><strong>' + esc(c.name) + '</strong><small>' + esc(c.when) + ', with ' + esc(c.who) + '</small>' + flag + '</span></label>';
      }).join('') + '</div>' + (st.clsNotice && st.notice ? '<p class="rule cls-note" role="status">' + esc(st.notice) + '</p>' : '');
    }
    function dayFlag(days, on) {
      var missing = days.filter(function (d) { return st.days.indexOf(d) === -1; }), cur = st.days.length;
      if (on) return '<em class="fits">On your plan</em>';
      if (!missing.length) return '<em class="fits">Fits your days</em>';
      var bump = membershipPrice(Math.min(5, cur + missing.length)) - membershipPrice(cur);
      return '<em class="adds">Adds ' + missing.map(function (d) { return DAY_FULL[d]; }).join(' and ') + ' to your membership' + (bump > 0 && !isPkg() ? ' (+' + money(bump) + '/mo)' : '') + '</em>';
    }
    function renderClubs() {
      var list = CLUBS.filter(clubOK), wrap = $('#sec-clubs-wrap');
      wrap.hidden = !CLUBS.length;
      if (!list.length) { $('#sec-clubs-body').innerHTML = '<p class="addon-desc">Our daytime clubs are for grades K\u20138.</p>'; return; }
      $('#sec-clubs-body').innerHTML = list.map(function (c) {
        var on = st.clubs.indexOf(c.id) !== -1, terms = st.clubTerms[c.id] || [];
        return '<div class="club-card' + (on ? ' on' : '') + '">' +
          '<label class="cls club"><input type="checkbox" id="rma-club-' + c.id + '" data-club="' + c.id + '"' + (on ? ' checked' : '') + '>' +
          '<span><strong>' + esc(c.name) + '</strong><small>' + esc(c.when) + '. ' + esc(c.desc) + '</small>' +
          '<em class="incl">' + money(c.price) + ' for members. ' + esc(c.priceNote) + '.</em>' + dayFlag(c.days, on) + '</span></label>' +
          (on ? '<div class="terms" role="group" aria-label="' + esc(c.name) + ' sessions">' + c.terms.map(function (t) {
            return '<label class="toggle"><input type="checkbox" id="rma-term-' + c.id + '-' + t.id + '" data-term="' + t.id + '" data-term-club="' + c.id + '"' + (terms.indexOf(t.id) !== -1 ? ' checked' : '') + '><span><b>' + esc(t.label) + '</b>: ' + esc(t.dates) + '</span></label>';
          }).join('') + '</div>' : '') + '</div>';
      }).join('');
    }
    function renderIcl() {
      var wrap = $('#sec-icl-wrap'), jan = st.start === 'jan';
      wrap.hidden = isPkg();
      if (isPkg()) return;
      var pool = data.iclCourses.filter(levelOK);
      if (st.dept !== 'All' && !pool.some(function (c) { return c.d === st.dept; })) st.dept = 'All';
      $('#sec-depts').innerHTML = IC.departments.filter(function (d) { return d === 'All' || pool.some(function (c) { return c.d === d; }); }).map(function (d) {
        return '<button type="button" class="pill" data-dept="' + esc(d) + '" aria-pressed="' + (d === st.dept) + '">' + esc(d) + '</button>';
      }).join('');
      var q = st.q.trim().toLowerCase(), full = st.icl.length >= IC.max;
      var rows = pool.filter(function (c) { return (st.dept === 'All' || c.d === st.dept) && (!q || c.n.toLowerCase().indexOf(q) !== -1); });
      $('#sec-icl-list').innerHTML = rows.length ? rows.map(function (c) {
        var on = st.icl.some(function (x) { return x.n === c.n; });
        return '<div class="icl-row"><span>' + esc(c.n) + '<small>' + (c.ms ? 'middle school' : 'high school') + '</small></span>' +
          '<button type="button" data-add-icl="' + esc(c.n) + '"' + (on || full ? ' disabled' : '') + '>' + (on ? 'Added' : 'Add') + '</button></div>';
      }).join('') : '<div class="icl-row"><span>No courses match. Try a shorter search.</span></div>';
      var unit = jan ? ' for spring' : '/year';
      $('#sec-icl-picked').innerHTML =
        (st.grade !== null ? '<p class="note level-note">Showing ' + (st.grade <= 8 ? 'middle school' : 'high school') + ' courses for grade ' + st.grade + '.</p>' : '') +
        (st.iclDropped && st.iclDropped.length ? '<p class="rule" role="status">We took ' + esc(st.iclDropped.join(' and ')) + ' off the plan, since ' + (st.iclDropped.length > 1 ? 'they\u2019re ' : 'it\u2019s a ') + (st.grade <= 8 ? 'high school' : 'middle school') + (st.iclDropped.length > 1 ? ' courses.' : ' course.') + '</p>' : '') +
        (full ? '<p class="note">That\u2019s the limit of three courses.</p>' : '') + st.icl.map(function (c, i) {
        return '<div class="picked-row"><span>' + esc(c.n) + '</span><span class="fmt">' +
          '<button type="button" data-fmt="' + i + '" data-live="1" aria-pressed="' + c.live + '">Live ' + money(jan ? IC.liveJan : IC.live) + unit + '</button>' +
          '<button type="button" data-fmt="' + i + '" data-live="0" aria-pressed="' + !c.live + '">Self-paced ' + money(jan ? IC.asyncJan : IC.async) + unit + '</button>' +
          '<button type="button" class="rm" data-rm-icl="' + i + '" aria-label="Remove ' + esc(c.n) + '">\u00d7</button></span></div>';
      }).join('') + (st.icl.length ? '<p class="note">ICL courses are paid in full before the student starts, together with the ' + (jan ? 'spring' : 'year') + '\u2019s membership. ' +
        esc(st.icl.some(function (c) { return c.live; }) ? IC.liveText : IC.asyncText) + '</p>' : '');
    }
    function renderStart() {
      $('#sec-start').innerHTML = '<div class="choices cols-2">' + data.starts.map(function (s) {
        return '<button type="button" class="choice" data-start="' + s.id + '" aria-pressed="' + (st.start === s.id) + '"><strong>' + esc(s.label) + '</strong><small>' + esc(s.desc) + '</small></button>';
      }).join('') + '</div>' +
        (isUpfront() ? '<p class="note">Plans with ICL or Aeon are paid in full before the student starts' + (st.start === 'jan' ? ', for the spring semester' : '') + '.</p>' : '') +

        (st.start === 'jan' && !st.esa ? '<p class="note">' + esc(data.esaJanNo) + '</p>' : '');
    }
    function renderForm() {
      var F = st.form;
      if (st.sent) {
        $('#sec-form').innerHTML = '<div class="sent"><p class="sent-h">Plan Sent</p>' +
          '<p>Check your inbox for a copy. The next step is a ' + esc(S.callLength) + ' intro call, so we can get to know your family and fine-tune the plan together.</p>' +
          '<a class="btn" target="_blank" rel="noopener" href="' + esc(S.bookingUrl) + '">Book your intro call</a>' +
          '<p class="note">Not ready to book? We\u2019ll reach out ' + esc(S.followUp) + '.</p></div>';
        return;
      }
      function field(name, label, type, ac, req) {
        return '<div class="f"><label for="rma-f-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<input id="rma-f-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + (req ? ' required' : '') + ' value="' + esc(F[name] || '') + '"></div>';
      }
      $('#sec-form').innerHTML = '<p class="hint">We\u2019ll email you a copy of this plan and follow up ' + esc(S.followUp) + '. You can book your intro call right after.</p>' +
        '<form novalidate><div class="grid">' +
          field('parentFirst', 'Your first name', 'text', 'given-name', true) +
          field('parentLast', 'Your last name', 'text', 'family-name', true) +
          field('email', 'Email', 'email', 'email', true) +
          field('phone', 'Mobile phone', 'tel', 'tel', true) +
          field('studentFirst', 'Student\u2019s first name', 'text', 'off', true) +
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
            esc(b.label + ', ' + clock(b.s) + '\u2013' + clock(b.e) + (b.est ? ' (estimated)' : '')) + '"><span>' + esc(b.label) + '</span></div>';
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
          '<li><i class="sw sw-class"></i>Class</li>' +
          '<li><i class="sw club"></i>Club</li>' +
          '<li><i class="sw icl"></i>ICL/Aeon</li>' +
          '<li><i class="sw est"></i>Estimated time</li>' +
        '</ul>' +
        '<p class="cal-note">Dots are coach check-ins: ' + (st.close ? 'every hour with close support' : isMS() ? 'one at every transition for middle schoolers' : 'one midday for high schoolers') + '. ' + esc(DAY.note) + '</p>' +
        (over.length ? '<p class="cal-note">Doesn\u2019t fit on membership days, so done at home or on another day: ' + esc(over.join(', ')) + '.</p>' : '');
    }
    function syncDisc() {
      $('#rma-esa').checked = st.esa;
      $('#rma-aid10').checked = st.aid === 10; $('#rma-aid20').checked = st.aid === 20;
      SCH.merit.options.forEach(function (o) { $('#rma-merit' + o).checked = st.merit === o; });
      var slider = $('#rma-need');
      if (root.activeElement !== slider) slider.value = st.need || (SCH.need.min - SCH.need.step);
      $('#rma-need-out').textContent = st.need ? money(st.need) + ' a year' : 'None';
      slider.setAttribute('aria-valuetext', st.need ? money(st.need) + ' a year' : 'None');
    }
    function fineLines(r) {
      var pkg = isPkg(), sc = school(st.school), F2 = data.fine, hasIcl = st.school.indexOf('icl') === 0 || st.icl.length, aeon = st.school === 'aeon';
      var out = [];
      out.push(r.up ? F2.fullYearMember.replace('{school}', aeon ? 'Aeon' : 'ICL') : F2.monthToMonth);
      if (hasIcl) {
        out.push(F2.icl);
        if (r.jan) out.push(F2.iclJan.replace('{deposit}', pkg && !aeon ? money(sc.deposit) : 'ICL'));
      }
      if (aeon) out.push(F2.aeon);
      if (!r.up) out.push('New families: your first drop-in day is free, and your first month of membership is refundable if it isn\u2019t a fit.');
      if (st.classes.length) { out.push(F2.groupSemester); out.push('Classes on the same days share a membership day, so two Monday/Wednesday classes still fit a two-day membership.'); }
      if (st.merit) out.push('The JHSC award is 50% off membership for first place and 25% for second, awarded annually by committee.');
      if (st.need) out.push('Need-based awards are set by the Foundation committee and can go toward membership, classes, 1:1, or an online school package.');
      if (!r.up) out.push('Prepay by the semester or the year for 5% off.');
      return out;
    }
    function renderSummary() {
      var r = compute();
      renderCal(); syncDisc();
      $('#sum-lines').innerHTML = r.lines.map(function (l) {
        return '<li' + (l.cls ? ' class="' + l.cls + '"' : '') + '><span>' + esc(l.label) + '</span><span>' + (l.text ? esc(l.text) : money(l.amount) + l.unit) + '</span></li>';
      }).join('') +
        (r.up ? '' :
          (st.esa ? '<li class="sub"><span>Wyoming ESA, ' + money(S.esaAnnual) + ' a year over ' + r.payments + ' payments</span><span>\u2212' + money(Math.min(S.esaAnnual, r.yearly) / r.payments) + '/mo</span></li>' : '') +
          (st.need ? '<li class="sub"><span>Need-based scholarship, if awarded (' + money(st.need) + ' a year)</span><span>\u2212' + money(Math.min(st.need, Math.max(0, r.yearly - (st.esa ? S.esaAnnual : 0))) / r.payments) + '/mo</span></li>' : ''));

      if (r.up) {
        $('#sum-lbl').textContent = 'Total for the ' + r.period + ', paid before the student starts';
        $('#sum-big').textContent = money(r.total);
        $('.mb-num').textContent = money(r.total); $('.mb-per').textContent = r.jan ? ' spring' : '/yr';
        $('#sum-esa').textContent = r.total === 0 ? 'Nothing out of pocket.' : 'Your part: ' + money(r.total) + ', paid before the student starts.';
      } else {
        var credName = st.esa && st.need ? 'ESA and scholarship' : st.esa ? 'Wyoming ESA' : 'scholarship';
        $('#sum-lbl').textContent = 'Per month' + (r.credits ? ' with ' + credName : '') + ', ' + (r.jan ? 'five payments' : 'nine payments');
        $('#sum-big').textContent = money(r.monthlyAfter);
        $('.mb-num').textContent = money(r.monthlyAfter); $('.mb-per').textContent = '/mo';
        $('#sum-esa').textContent = r.monthlyAfter === 0 ? 'Nothing out of pocket.' : 'Your part: ' + money(r.monthlyAfter) + ' a month, ' + (r.jan ? 'five' : 'nine') + ' payments.';
      }
      $('#sum-fine').innerHTML = '<li class="confirm">' + esc(S.finePrint) + '</li>' + fineLines(r).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      $('#sum-cta').hidden = st.sent;
    }

    /* ---------- render all, keep focus ---------- */
    function focusKey(el) {
      if (!el || !el.tagName) return '';
      if (el.id) return '#' + el.id;
      var d = el.dataset || {};
      var keys = ['preset', 'path', 'grade', 'day', 'tier', 'dec', 'inc', 'dept', 'start', 'addIcl', 'fmt'];
      for (var i = 0; i < keys.length; i++) if (d[keys[i]] !== undefined) return keys[i] + ':' + d[keys[i]] + (d.live || '');
      return '';
    }
    function render() {
      var key = focusKey(root.activeElement);
      normalize();
      renderGrade(); renderPath(); renderDays(); renderAddons(); renderIcl(); renderStart(); renderSummary();
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
    builder.addEventListener('input', function (e) {
      var f = e.target.closest('[data-younger-form]');
      if (f && e.target.name) { st.yform = st.yform || {}; st.yform[e.target.name] = e.target.value; }
    });
    builder.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-younger-form]'); if (!form) return;
      e.preventDefault();
      var err = form.querySelector('.form-error'), bad = [];
      err.textContent = '';
      form.querySelectorAll('.f.invalid').forEach(function (el) { el.classList.remove('invalid'); });
      form.querySelectorAll('[required]').forEach(function (el) { if (!el.value.trim() || !el.checkValidity()) { bad.push(el); el.closest('.f').classList.add('invalid'); } });
      if (bad.length) { err.textContent = bad.length === 1 ? 'Fill in the highlighted field to send.' : 'Fill in the ' + bad.length + ' highlighted fields to send.'; bad[0].focus(); return; }
      var F = {}; new FormData(form).forEach(function (v, k) { F[k] = String(v).trim(); });
      var payload = {
        company: F.company || '', page: location.href, type: 'younger',
        parent: { first: F.parentFirst, last: F.parentLast, email: F.email, phone: F.phone },
        student: { first: F.studentFirst, grade: F.age },
        start: startOf(st.start).label, heard: '', notes: F.notes || '',
        answers: { coursework: 'Younger student (below 5th grade)', days: '', needs: [], suggested: '' },
        plan: { name: 'Custom 1:1 plan request (below 5th grade)', days: [], billing: 'request',
          lines: [{ label: 'Custom 1:1 plan for a younger student, age/grade: ' + F.age, amount: 0, unit: ' (to be quoted)' }],
          monthly: 0, total: 0, totalLabel: 'Pricing to be set together', classFees: '', esa: '' }
      };
      var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Sending\u2026';
      var send = S.endpoint
        ? fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(function (res) { return res.json(); }).then(function (res) { if (!res || !res.ok) throw new Error('Send failed'); })
        : new Promise(function (resolve) { console.info('[plan builder] Preview mode: younger-student request not sent.', payload); setTimeout(resolve, 500); });
      send.then(function () { st.youngerSent = true; track('plan_builder_younger_submit'); render(); })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send to RadAcad'; err.innerHTML = 'That didn\u2019t send. Try again, or email <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a>.'; });
    });
    builder.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled || b.type === 'submit') return;
      var d = b.dataset;
      if (b.hasAttribute('data-younger')) { st.younger = !st.younger; render(); if (st.younger) { var y = root.getElementById ? root.getElementById('rma-y-parentFirst') : null; if (y) y.focus(); } return; }
      if (d.grade) {
        st.grade = +d.grade; st.iclDropped = null; track('plan_builder_grade', { grade: st.grade });
        started(); render(); return;
      }
      st.clsNotice = false; if (!d.grade) st.iclDropped = null;
      if (d.preset) { applyPreset(d.preset); started(); render(); return; }
      if (d.path) {
        st.path = d.path;
        if (d.path === 'own' && isPkg()) { Object.assign(st, JSON.parse(JSON.stringify(BLANK))); st.preset = null; st.notice = ''; }
        track('plan_builder_path', { path: d.path }); started(); render(); return;
      }
      if ((d.tier || d.day) && isPkg()) {
        st.notice = school(st.school).name + ' includes the full week, Monday through Friday. To pick different days, choose \u201cBuild your own\u201d in step 2.';
        render(); return;
      }
      st.preset = null;
      if (d.tier) setDayCount(+d.tier);
      else if (d.day) toggleDay(d.day);
      else if (d.inc) { var mx = d.inc === 'coach' ? A.coaching.maxBlocks : A.single.max; if (st[d.inc] < mx) st[d.inc]++; }
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
      else if (d.club) {
        st.preset = null; st.notice = ''; st.clsNotice = false;
        var cb = club(d.club);
        if (t.checked) {
          var addD = cb.days.filter(function (x) { return st.days.indexOf(x) === -1; });
          if (addD.length && !isPkg()) { st.notice = 'We added ' + addD.map(function (x) { return DAY_FULL[x]; }).join(' and ') + ' to your membership for ' + cb.name + '.'; }
          st.clubs = st.clubs.concat(d.club);
          st.clubTerms[d.club] = cb.terms.map(function (x) { return x.id; }).filter(function (x) { return st.start !== 'jan' || true; });
        } else { st.clubs = st.clubs.filter(function (x) { return x !== d.club; }); delete st.clubTerms[d.club]; }
      }
      else if (d.term) {
        var tl = st.clubTerms[d.termClub] || [];
        st.clubTerms[d.termClub] = t.checked ? tl.concat(d.term) : tl.filter(function (x) { return x !== d.term; });
        if (!st.clubTerms[d.termClub].length) { st.clubs = st.clubs.filter(function (x) { return x !== d.termClub; }); delete st.clubTerms[d.termClub]; }
      }
      else if (d.cls) {
        st.preset = null; st.notice = ''; st.clsNotice = false;
        if (t.checked) {
          var add = cls(d.cls).days.filter(function (x) { return st.days.indexOf(x) === -1; });
          if (add.length) { st.notice = 'We added ' + add.map(function (x) { return DAY_FULL[x]; }).join(' and ') + ' to your membership for ' + cls(d.cls).name + '.'; st.clsNotice = true; }
          st.classes = st.classes.concat(d.cls);
        } else st.classes = st.classes.filter(function (x) { return x !== d.cls; });
      }
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
        err.textContent = 'Pick your student\u2019s grade at the top of the builder.';
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
          coursework: isPkg() ? sc.name : 'Build your own',
          days: isPkg() ? 'Full week' : st.days.join(', '),
          needs: [st.esa ? 'Has Wyoming ESA' : 'No ESA', st.aid ? st.aid + '% income-based discount' : '', st.merit ? 'JHSC merit ' + st.merit + '%' : '',
            st.need ? 'Need-based scholarship request ' + money(st.need) + '/yr' : ''].filter(Boolean),
          suggested: preset ? 'Started from: ' + preset.name : ''
        },
        plan: {
          name: preset ? preset.name : isPkg() ? sc.name : membershipName(st.days.length) + ' plan',
          days: st.days,
          billing: r.up ? 'upfront' : 'monthly',
          lines: r.lines.map(function (l) { return { label: l.label, amount: Math.round(l.amount), unit: l.text ? ' (' + l.text.toLowerCase() + ')' : l.unit }; }).concat(
            st.clubs.map(function (id) { var c = club(id); return { label: c.name + ', ' + c.when + ': ' + (st.clubTerms[id] || []).map(function (t) { var x = c.terms.filter(function (y) { return y.id === t; })[0]; return x.label + ' (' + x.dates + ')'; }).join('; '), amount: 0, unit: ' (sessions)' }; })),
          monthly: r.up ? 0 : Math.round(r.monthly),
          total: r.up ? Math.round(r.total) : Math.round(r.monthlyAfter),
          totalLabel: r.up ? 'Total for the ' + r.period + ', paid before the student starts' : 'Per month' + (r.credits ? ' after ESA and scholarships' : '') + ', ' + (r.jan ? 'five' : 'nine') + ' payments',
          classFees: '',
          esa: st.esa ? 'Wyoming ESA applied' : 'No ESA'
        }
      };
      var btn = form.querySelector('.submit');
      btn.disabled = true; btn.textContent = 'Sending\u2026';
      var send = S.endpoint
        ? fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(function (res) { return res.json(); })
            .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'Send failed'); })
        : new Promise(function (resolve) { console.info('[plan builder] Preview mode: no endpoint set, so nothing was sent.', payload); setTimeout(resolve, 600); });
      send.then(function () {
        st.sent = true;
        track('plan_builder_submit', { plan: payload.plan.name, value: payload.plan.total, billing: payload.plan.billing, currency: 'USD' });
        renderForm(); render();
        var h = $('#h-send'); if (h) h.focus({ preventScroll: true });
      }).catch(function (error) {
        console.error('[plan builder]', error);
        btn.disabled = false; btn.textContent = 'Send my plan';
        err.innerHTML = 'Your plan didn\u2019t send. Check your connection and try again, or email <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a>.';
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
