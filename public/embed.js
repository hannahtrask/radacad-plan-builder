/*!
 * Radical Minds Academy — "Build your RadAcad week"
 * Left: families build the plan. Right: the student's week and price, live.
 * Layout follows Garrett's mockup. Built by Sagebrush Web Studio.
 *
 * Squarespace Code Block:
 *   <div id="plan-builder"></div>
 *   <script src="https://radacad-plan-builder.garrett-austen.workers.dev/embed.js" defer></script>
 *
 * All prices, classes and the ICL catalog live in plans.json next to this file.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var BASE = script && script.src ? new URL('.', script.src).href : './';
  var MOUNT_ID = (script && script.getAttribute('data-mount')) || 'plan-builder';
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var PATTERN = { 2: ['Mon', 'Wed'], 3: ['Mon', 'Wed', 'Fri'], 4: ['Mon', 'Tue', 'Wed', 'Thu'], 5: DAYS };
  var DAY_WORD = { 2: 'Two days', 3: 'Three days', 4: 'Four days', 5: 'Full week' };
  var HEARD = ['Google or another search engine', 'Friend or family', 'Current RadAcad or Teton Tutors family', 'A teacher', 'Social media', 'Community event', 'Local organization', 'Returning family', 'Other'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); }
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
    var schools = data.schools.filter(function (s) { return !s.hidden; });
    function school(id) { return data.schools.filter(function (s) { return s.id === id; })[0]; }
    function cls(id) { return G.classes.filter(function (c) { return c.id === id; })[0]; }
    function startOf(id) { return data.starts.filter(function (s) { return s.id === id; })[0]; }

    var st = {
      school: 'own', days: 2, checkin: false, close: false, coach: 0, single: 0,
      classes: [], icl: [], start: 'fall', esa: false, aid: 0,
      dept: 'All', q: '', form: {}, sent: false, sheet: false, started: false
    };

    /* ---------- the model ---------- */
    function isPkg() { return st.school !== 'own'; }
    function classDays() {
      var set = {};
      st.classes.forEach(function (id) { cls(id).days.forEach(function (d) { set[d] = true; }); });
      return DAYS.filter(function (d) { return set[d]; });
    }
    function normalize() {
      if (isPkg()) { st.days = 5; st.icl = []; }
      var need = classDays().length;
      if (!isPkg() && need > st.days) st.days = Math.max(2, need);
    }
    function onDays() {
      if (isPkg() || st.days === 5) return DAYS.slice();
      var on = classDays();
      PATTERN[st.days].concat(DAYS).forEach(function (d) { if (on.length < st.days && on.indexOf(d) === -1) on.push(d); });
      return DAYS.filter(function (d) { return on.indexOf(d) !== -1; });
    }
    function membershipName(n) { return n === 5 ? 'Full-week membership' : DAY_WORD[n].replace(' days', '-day') + ' membership'; }

    function compute() {
      var sc = school(st.school), start = startOf(st.start), pkg = isPkg();
      var lines = [], monthly = 0;
      function add(label, amount, cls) { lines.push({ label: label, amount: amount, cls: cls || '' }); monthly += amount; }

      var memBase = pkg ? sc.membershipPart : M.prices[st.days];
      if (pkg) add(st.school === 'aeon' ? 'Full-week membership (with Aeon)' : sc.name.replace(', through RadAcad', '').replace('ICL Academy, ', 'Full week + ICL Academy, '), sc.monthly);
      else add(membershipName(st.days), memBase);
      if (st.aid) add('Need-based discount on membership (' + st.aid + '%)', -memBase * st.aid / 100, 'sub');
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
      var esaOn = st.esa && fall;
      var after = esaOn ? Math.max(0, yearly - S.esaAnnual) : yearly;
      return { lines: lines, sem: sem, semPer: semPer, monthly: monthly, yearly: yearly, esaOn: esaOn, after: after, payments: start.payments, days: onDays(), memBase: memBase };
    }

    /* ---------- skeleton ---------- */
    var app = root.querySelector('.rma');
    app.innerHTML =
      '<header class="intro">' +
        '<p class="tagline">Build your RadAcad week</p>' +
        '<p class="lede">Every student starts with a membership. Pick the days, add what your student needs, and watch the week fill in. Nothing here is final; it’s a starting point for a conversation.</p>' +
      '</header>' +
      '<div class="layout">' +
        '<div class="builder">' +
          '<section class="step" aria-labelledby="h-school"><h3 id="h-school"><span class="num">1</span>Where does school happen?</h3>' +
            '<p class="hint">RadAcad is the place your student does school, with a coach, goals every morning, and a note home every afternoon. The school itself can be one you already have or one we provide.</p>' +
            '<div class="choices" id="sec-school"></div>' +
            '<p class="note">Already enrolled somewhere? Keep your enrollment and pick “our own school.”</p></section>' +
          '<section class="step" aria-labelledby="h-days"><h3 id="h-days"><span class="num">2</span>How many days a week?</h3>' +
            '<p class="hint">' + esc(M.dayNote) + '</p><div id="sec-days"></div></section>' +
          '<section class="step" aria-labelledby="h-add"><h3 id="h-add"><span class="num">3</span>Add what your student needs</h3>' +
            '<p class="hint">Everything below is month to month except classes, which run by the semester. ' + esc(G.scheduleNote) + '</p>' +
            '<div id="sec-addons"></div>' +
            '<div class="addon block"><p class="addon-title">Small group classes</p><p class="addon-desc">' + esc(G.desc) + '</p><div class="classes" id="sec-classes"></div></div>' +
            '<div class="addon block" id="sec-icl-wrap"><p class="addon-title">ICL Academy courses, à la carte</p><p class="addon-desc">' + esc(IC.desc) + '</p>' +
              '<label class="sr" for="rma-icl-q">Search ICL courses</label>' +
              '<input class="search" id="rma-icl-q" type="search" placeholder="Search ICL courses (Algebra, English 9, AP Biology, Spanish…)" autocomplete="off">' +
              '<div class="pills" id="sec-depts"></div><div class="icl-list" id="sec-icl-list"></div><div class="picked" id="sec-icl-picked"></div></div>' +
          '</section>' +
          '<section class="step" aria-labelledby="h-start"><h3 id="h-start"><span class="num">4</span>When would you start, and how will you pay?</h3><div id="sec-start"></div></section>' +
          '<section class="step" id="rma-send" aria-labelledby="h-send"><h3 id="h-send" tabindex="-1"><span class="num">5</span>Send this plan and book a call</h3>' +
            '<div id="sec-form"></div></section>' +
        '</div>' +
        '<aside class="summary" aria-label="Your student’s week and price">' +
          '<div class="sum-head"><h3>Your student’s week</h3><button type="button" class="sheet-close">Close</button></div>' +
          '<div class="week" id="sum-week"></div>' +
          '<div id="sum-extra"></div>' +
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
    function renderSchool() {
      $('#sec-school').innerHTML = schools.map(function (s) {
        var on = st.school === s.id;
        return '<button type="button" class="choice" data-school="' + s.id + '" aria-pressed="' + on + '">' +
          '<span class="price">' + esc(s.priceLabel || money(s.monthly) + '/mo') + '</span>' +
          '<strong>' + esc(s.name) + '</strong><small>' + esc(s.desc) + '</small></button>';
      }).join('');
    }
    function renderDays() {
      var need = classDays().length, pkg = isPkg();
      $('#sec-days').innerHTML = '<div class="choices cols-4">' + [2, 3, 4, 5].map(function (n) {
        var off = (pkg && n !== 5) || (!pkg && n < need);
        return '<button type="button" class="choice" data-days="' + n + '" aria-pressed="' + (st.days === n) + '"' + (off ? ' disabled' : '') + '>' +
          '<strong>' + DAY_WORD[n] + '</strong><small>' + money(M.prices[n]) + '/mo</small></button>';
      }).join('') + '</div>' +
        (pkg ? '<p class="rule">' + esc(M.packageRule) + '</p>' : '') +
        (!pkg && need > 2 ? '<p class="note">Your classes meet on ' + need + ' different days, so the membership covers ' + need + ' days.</p>' : '') +
        (!pkg ? '<p class="note">Just want to try it? Drop-in days are $230, and a new family’s first drop-in day is free.</p>' : '');
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
        toggle('close', st.close, A.close) +
        stepper('coach', st.coach, A.coaching.max, A.coaching, 'Weekly hours of 1:1 coaching') +
        stepper('single', st.single, A.single.max, A.single, 'Single-subject classes');
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
      }).join('');
    }
    function renderStart() {
      $('#sec-start').innerHTML = '<div class="choices cols-2">' + data.starts.map(function (s) {
        return '<button type="button" class="choice" data-start="' + s.id + '" aria-pressed="' + (st.start === s.id) + '"><strong>' + esc(s.label) + '</strong><small>' + esc(s.desc) + '</small></button>';
      }).join('') + '</div>' +
        '<div class="checks">' +
          '<label class="toggle"><input type="checkbox" id="rma-esa" data-esa' + (st.esa ? ' checked' : '') + '><span>' + esc(data.esaLabel) + '</span></label>' +
          data.aid.map(function (a) {
            return '<label class="toggle"><input type="checkbox" id="rma-aid' + a.pct + '" data-aid="' + a.pct + '"' + (st.aid === a.pct ? ' checked' : '') + '><span>' + esc(a.label) + '</span></label>';
          }).join('') +
        '</div>' +
        (st.esa && st.start === 'jan' ? '<p class="note">' + esc(data.esaJanNote) + '</p>' : '') +
        (st.aid ? '<p class="note">Need-based discounts come through the RadAcad Foundation. It’s a quick verification, not a committee review: <a href="' + esc(S.foundationUrl) + '" target="_blank" rel="noopener">apply here</a>.</p>' : '');
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
      function select(name, label, opts, req) {
        return '<div class="f"><label for="rma-f-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<select id="rma-f-' + name + '" name="' + name + '"' + (req ? ' required' : '') + '><option value="">Choose one</option>' +
          opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (F[name] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
      }
      $('#sec-form').innerHTML = '<p class="hint">We’ll email you a copy of this plan and follow up ' + esc(S.followUp) + '. You can book your intro call right after.</p>' +
        '<form novalidate><div class="grid">' +
          field('parentFirst', 'Your first name', 'text', 'given-name', true) +
          field('parentLast', 'Your last name', 'text', 'family-name', true) +
          field('email', 'Email', 'email', 'email', true) +
          field('phone', 'Mobile phone', 'tel', 'tel', true) +
          field('studentFirst', 'Student’s first name', 'text', 'off', true) +
          select('grade', 'Student’s grade', S.grades.map(function (g) { return [g, 'Grade ' + g]; }), true) +
          field('current', 'Current school', 'text', 'off', false) +
          select('heard', 'How did you hear about us?', HEARD.map(function (h) { return [h, h]; }), false) +
          '<div class="f wide"><label for="rma-f-notes">Anything we should know? <span class="opt-tag">(optional)</span></label>' +
            '<textarea id="rma-f-notes" name="notes" rows="3" placeholder="Learning needs, travel plans, best time to call">' + esc(F.notes || '') + '</textarea></div>' +
        '</div>' +
        '<div class="hp" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="form-error" role="alert"></p>' +
        '<button type="submit" class="btn submit">Send my plan</button></form>';
    }

    /* ---------- right side ---------- */
    function renderSummary() {
      var r = compute(), pkg = isPkg(), sc = school(st.school), on = r.days;
      var firstOn = on[0], secondOn = on[1] || on[0];
      $('#sum-week').innerHTML = DAYS.map(function (d) {
        var isOn = on.indexOf(d) !== -1, chips = [];
        if (isOn) {
          chips.push(st.close ? 'Hourly check-ins' : 'Check-ins');
          chips.push('Note home');
          if (pkg) chips.push(sc.chip);
          st.classes.forEach(function (id) { var c = cls(id); if (c.days.indexOf(d) !== -1) chips.push({ t: c.short, k: 'cls' }); });
          if (st.icl.length) chips.push({ t: 'ICL', k: 'icl' });
          if (st.checkin && d === firstOn) chips.push({ t: 'Weekly plan', k: 'add' });
          if (st.coach && d === secondOn) chips.push({ t: '1:1 coaching', k: 'add' });
        }
        return '<div class="day' + (isOn ? ' on' : '') + '"><b>' + d + '</b>' +
          (isOn ? chips.map(function (c) { return typeof c === 'string' ? '<span class="chip">' + esc(c) + '</span>' : '<span class="chip ' + c.k + '">' + esc(c.t) + '</span>'; }).join('') : '<span class="home">At home</span>') + '</div>';
      }).join('');

      var weekly = [];
      if (st.single) weekly.push(st.single + ' single-subject class' + (st.single > 1 ? 'es' : '') + ', 3 hours a week each');
      if (st.coach > 1) weekly.push(st.coach + ' hours of 1:1 coaching a week');
      $('#sum-extra').innerHTML = weekly.length ? '<ul class="weekly">' + weekly.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '';

      $('#sum-lines').innerHTML = r.lines.map(function (l) {
        return '<li' + (l.cls ? ' class="' + l.cls + '"' : '') + '><span>' + esc(l.label) + '</span><span>' + money(l.amount) + '/mo</span></li>';
      }).join('') + r.sem.map(function (l) { return '<li class="semline"><span>' + esc(l.label) + '</span><span>' + esc(l.text) + '</span></li>'; }).join('');

      var fall = st.start === 'fall';
      $('#sum-lbl').textContent = 'Per month, ' + (fall ? 'nine payments' : 'five payments') + (r.semPer ? ', plus ' + money(r.semPer) + ' per semester' : '');
      $('#sum-big').textContent = money(r.monthly);
      $('.mb-num').textContent = money(r.monthly);
      $('#sum-esa').textContent = money(r.yearly) + (fall ? ' for the school year' : ' for the spring') +
        (r.esaOn ? (r.after === 0 ? '. Fully covered by Wyoming ESA.' : '. After ESA: ' + money(r.after) + ', about ' + money(r.after / r.payments) + '/mo.') : '.');

      var fine = ['Membership is month to month with 30 days’ notice.'];
      if (pkg) fine.push(st.school === 'aeon' ? 'Aeon tuition is billed by semester and paid before the semester starts.'
        : 'ICL enrollment is a full-' + (fall ? 'year' : 'semester') + ' commitment.' + (!fall ? ' January 2027 families can withdraw by January 31 for a full refund minus a ' + money(sc.deposit) + ' deposit.' : ''));
      else fine.push('New families: your first drop-in day is free, and your first month of membership is refundable if it isn’t a fit.');
      if (st.classes.length) fine.push('Classes on the same days share a membership day, so two Monday/Wednesday classes still fit a two-day membership.');
      fine.push('Prepay by the semester or the year for 5% off.');
      $('#sum-fine').innerHTML = fine.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
        '<li>Scholarships from the RadAcad Foundation stack with ESA. <a href="' + esc(S.foundationUrl) + '" target="_blank" rel="noopener">See scholarships</a></li>';
      $('#sum-cta').hidden = st.sent;
    }

    /* ---------- render all, keep focus ---------- */
    function focusKey(el) {
      if (!el || !el.tagName) return '';
      if (el.id) return '#' + el.id;
      var d = el.dataset || {};
      var keys = ['school', 'days', 'dec', 'inc', 'dept', 'start', 'addIcl', 'fmt'];
      for (var i = 0; i < keys.length; i++) if (d[keys[i]] !== undefined) return keys[i] + ':' + d[keys[i]] + (d.live || '');
      return '';
    }
    function render() {
      var key = focusKey(root.activeElement);
      normalize();
      renderSchool(); renderDays(); renderAddons(); renderIcl(); renderStart(); renderSummary();
      app.classList.toggle('sheet-open', st.sheet);
      app.classList.toggle('is-sent', st.sent);
      if (key) {
        var els = root.querySelectorAll('button, input, select, textarea');
        for (var k = 0; k < els.length; k++) if (focusKey(els[k]) === key) {
          var el = els[k];
          if (el.disabled) { var alt = el.parentNode.querySelector('button:not([disabled])'); if (alt) el = alt; }
          el.focus({ preventScroll: true }); break;
        }
      }
    }
    function started() { if (!st.started) { st.started = true; track('plan_builder_start'); } }

    /* ---------- events ---------- */
    var builder = $('.builder');
    builder.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled || b.type === 'submit') return;
      var d = b.dataset;
      if (d.school) { st.school = d.school; track('plan_builder_school', { school: d.school }); }
      else if (d.days) st.days = +d.days;
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
      if (d.toggle) st[d.toggle] = t.checked;
      else if (d.cls) st.classes = t.checked ? st.classes.concat(d.cls) : st.classes.filter(function (x) { return x !== d.cls; });
      else if (t.hasAttribute('data-esa')) st.esa = t.checked;
      else if (d.aid) st.aid = t.checked ? +d.aid : 0;
      else return;
      started(); render();
    });
    $('#rma-icl-q').addEventListener('input', function (e) { st.q = e.target.value; renderIcl(); });

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
      var payload = {
        company: F.company || '',
        page: location.href,
        parent: { first: F.parentFirst, last: F.parentLast, email: F.email, phone: F.phone },
        student: { first: F.studentFirst, grade: F.grade },
        start: startOf(st.start).label,
        heard: F.heard || '',
        notes: (F.current ? 'Current school: ' + F.current + '\n' : '') + (F.notes || ''),
        answers: {
          coursework: sc.name,
          days: isPkg() ? 'Full week' : DAY_WORD[st.days],
          needs: [st.esa ? 'Has Wyoming ESA' : '', st.aid ? st.aid + '% need-based discount' : ''].filter(Boolean),
          suggested: ''
        },
        plan: {
          name: isPkg() ? sc.name.replace(', through RadAcad', '') : membershipName(st.days) + ' plan',
          days: r.days,
          lines: r.lines.map(function (l) { return { label: l.label, amount: Math.round(l.amount) }; }),
          monthly: Math.round(r.monthly),
          classFees: r.sem.map(function (s) { return s.label + ': ' + s.text; }).join('; '),
          esa: money(r.yearly) + (fall ? ' for the school year' : ' for the spring') + (r.esaOn ? '; after ESA ' + money(r.after) : '')
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

    mount.__rmaTest = { set: function (o) { Object.assign(st, o); render(); return compute(); } };

    renderForm();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
