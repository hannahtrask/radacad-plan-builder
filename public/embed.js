/*!
 * Radical Minds Academy — "Your Family, Your Plan" builder
 * Left: step-by-step builder. Right: the student's week and price, live.
 * Built by Sagebrush Web Studio
 *
 * Squarespace Code Block:
 *   <div id="plan-builder"></div>
 *   <script src="https://radacad-plan-builder.garrett-austen.workers.dev/embed.js" defer></script>
 *
 * All prices and options live in plans.json next to this file.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var BASE = script && script.src ? new URL('.', script.src).href : './';
  var MOUNT_ID = (script && script.getAttribute('data-mount')) || 'plan-builder';

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };

  var Q = {
    coursework: {
      title: 'How will your student do their coursework?',
      options: [
        ['homeschool', 'Homeschool or our own curriculum'],
        ['online', 'They’re already in an online school'],
        ['icl', 'Interested in ICL Academy, our partner school'],
        ['unsure', 'Not sure yet']
      ]
    },
    days: {
      title: 'How many days a week would they be here?',
      options: [['two', '2 days'], ['three', '3 days'], ['four', '4 days'], ['every', 'Every weekday'], ['unsure', 'Not sure yet']]
    },
    needs: {
      title: 'What does your student need most?',
      hint: 'Pick up to two.',
      max: 2,
      options: [
        ['structure', 'Daily structure and accountability'],
        ['checkin', 'A weekly planning check-in'],
        ['coaching', 'One-on-one coaching or tutoring'],
        ['classes', 'Classes with other students'],
        ['subject', 'A full class in one subject']
      ]
    }
  };

  var START_OPTIONS = ['As soon as possible', 'January 2027', 'Fall 2027', 'Just exploring options'];
  var HEARD_OPTIONS = ['Google or another search engine', 'Friend or family', 'Current RadAcad or Teton Tutors family', 'A teacher', 'Social media', 'Community event', 'Local organization', 'Returning family', 'Other'];

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function joinList(arr) {
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + (arr.length > 2 ? ',' : '') + ' and ' + arr[arr.length - 1];
  }
  function labelOf(key, val) {
    var o = Q[key].options;
    for (var i = 0; i < o.length; i++) if (o[i][0] === val) return o[i][1];
    return val || '';
  }
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
    root.innerHTML = '<link rel="stylesheet" href="' + BASE + 'builder.css">' +
      '<div class="rma"><p class="loading">Loading your plan builder…</p></div>';
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
    var S = data.settings, M = data.membership, A = data.addOns, G = data.smallGroup, I = data.icl;

    var state = {
      step: 'student',
      answers: { grade: null, start: null, coursework: null, days: null, needs: [] },
      skipped: false,
      cfg: null,             // the plan being built
      source: null,          // 'suggested' | preset id | 'custom'
      uid: 0,
      form: {},
      sheetOpen: false,
      sent: false, started: false
    };

    /* ---------- pricing model ---------- */
    function membershipPrice(n) {
      if (n <= 0) return 0;
      if (n <= 2) return M.twoDayPrice;
      return Math.min(M.twoDayPrice + M.extraDayPrice * (n - 2), M.fullWeekPrice);
    }
    function membershipName(n) {
      if (n >= 5) return 'Full-week membership';
      if (n <= 2) return 'Two-day membership';
      return n + '-day membership';
    }
    function defaultDays(n) {
      return ({ 1: ['Mon'], 2: ['Mon', 'Wed'], 3: ['Mon', 'Tue', 'Wed'], 4: ['Mon', 'Tue', 'Wed', 'Thu'] })[n] || DAYS.slice();
    }
    function blockOf(id) { return G.blocks.filter(function (b) { return b.id === id; })[0]; }
    function sortDays(arr) { return DAYS.filter(function (d) { return arr.indexOf(d) !== -1; }); }
    function isPackage(cfg) { return !!(cfg.icl && cfg.icl.mode === 'package'); }

    function fromConfig(c) {
      var cfg = {
        days: c.icl && c.icl.mode === 'package' ? DAYS.slice() : defaultDays(c.days || 2),
        icl: c.icl ? { mode: c.icl.mode, type: c.icl.type || 'live', courses: c.icl.courses || 1 } : null,
        close: !!c.close,
        checkin: !!c.checkin,
        coaching: c.coaching || 0,
        subjects: [],
        groups: []
      };
      for (var i = 0; i < (c.subjects || 0); i++) cfg.subjects.push({ uid: ++state.uid, subject: '' });
      (c.groups || []).forEach(function (b) { cfg.groups.push({ uid: ++state.uid, block: b, cls: '' }); });
      ensureGroupDays(cfg);
      return cfg;
    }
    function ensureGroupDays(cfg) {
      cfg.groups.forEach(function (g) {
        blockOf(g.block).days.forEach(function (d) { if (cfg.days.indexOf(d) === -1) cfg.days.push(d); });
      });
      cfg.days = sortDays(cfg.days);
    }
    function signature(cfg) {
      return JSON.stringify({
        n: isPackage(cfg) ? 5 : cfg.days.length,
        icl: cfg.icl ? cfg.icl.mode + cfg.icl.type + (cfg.icl.mode === 'alacarte' ? cfg.icl.courses : '') : '',
        close: cfg.close, checkin: cfg.checkin, coaching: cfg.coaching,
        subjects: cfg.subjects.length,
        groups: cfg.groups.map(function (g) { return g.block; }).sort().join()
      });
    }

    function price(cfg) {
      var lines = [], monthly = 0;
      function add(label, amount, detail) { lines.push({ label: label, amount: amount, detail: detail || '' }); monthly += amount; }
      if (isPackage(cfg)) {
        var pk = I.packages[cfg.icl.type];
        add(pk.name, pk.price, 'Membership and ICL Academy in one price');
      } else {
        var n = cfg.days.length;
        add(membershipName(n), membershipPrice(n), joinList(cfg.days.map(function (d) { return DAY_NAMES[d]; })));
        if (cfg.icl && cfg.icl.mode === 'alacarte') {
          var ac = I.alaCarte[cfg.icl.type];
          add(plural(cfg.icl.courses, ac.name, ac.name.replace('course', 'courses')), ac.price * cfg.icl.courses, money(ac.price) + ' a month each');
        }
      }
      if (cfg.close) add(A.close.name, A.close.price, 'Hourly check-ins');
      if (cfg.checkin) add(A.checkin.name, A.checkin.price, '30 minutes a week');
      if (cfg.coaching) add(A.coaching.name, A.coaching.price * cfg.coaching, plural(cfg.coaching, 'session', 'sessions') + ' a week');
      cfg.subjects.forEach(function (s) { add(A.subject.name, A.subject.price, s.subject || 'Subject to choose together'); });

      var count = cfg.groups.length;
      var fees = {
        count: count,
        spring: count * G.springFee,
        fall: count * G.fallFee
      };
      var yearCost = monthly * S.payments + count * (G.fallFee + G.springFee);
      var esaMonthly = Math.max(0, yearCost - S.esaAnnual) / S.payments;
      return { lines: lines, monthly: monthly, fees: fees, esaMonthly: esaMonthly };
    }

    /* ---------- suggestion ---------- */
    function grade() { return state.answers.grade ? +state.answers.grade : null; }
    function groupsAllowed() { var g = grade(); return g === null || (g >= G.minGrade && g <= G.maxGrade); }
    function closeAllowed() { var g = grade(); return g === null || g >= A.close.minGrade; }
    function presetAllowed(p) { var g = grade(); return !p.grades || g === null || (g >= p.grades[0] && g <= p.grades[1]); }

    function suggestConfig() {
      var a = state.answers, g = grade(), has = function (n) { return a.needs.indexOf(n) !== -1; };
      if (state.skipped || !a.coursework) return null;
      var c = {};
      if (a.coursework === 'icl') c.icl = { mode: 'package', type: 'live' };
      else c.days = ({ two: 2, three: 3, four: 4, every: 5, unsure: 2 })[a.days] || 2;
      if (has('structure') && g !== null && g >= A.close.minGrade) c.close = true;
      if (has('checkin')) c.checkin = true;
      if (has('coaching')) c.coaching = 1;
      if (has('subject')) c.subjects = 1;
      if (has('classes') && groupsAllowed()) c.groups = ['mw'];
      if (a.coursework === 'online' && !a.needs.length) c.checkin = true;
      return c;
    }
    function reasons() {
      var a = state.answers, out = [];
      if (a.grade) out.push('grade ' + a.grade);
      if (a.coursework === 'icl') out.push('interest in ICL Academy');
      else if (a.coursework === 'online') out.push('an online school');
      if (a.days && a.days !== 'unsure' && a.coursework !== 'icl') out.push(labelOf('days', a.days).toLowerCase() + (a.days === 'every' ? '' : ' a week'));
      a.needs.forEach(function (n) { out.push(labelOf('needs', n).toLowerCase()); });
      return out;
    }
    function notes() {
      var a = state.answers, g = grade(), out = [];
      if (a.needs.indexOf('structure') !== -1 && g !== null && g <= 8)
        out.push('Middle schoolers get a coach check-in at every transition, every day, so structure is built in.');
      if (a.coursework === 'icl')
        out.push('ICL packages include the full-week membership. Prefer self-paced courses, or just a few courses? You can change that in the next step.');
      if (a.days === 'unsure')
        out.push('Not sure on days? We started with two. Add a third or fourth day for ' + money(M.extraDayPrice) + ' each, and the full week tops out at ' + money(M.fullWeekPrice) + '.');
      return out;
    }

    /* ---------- steps ---------- */
    function steps() {
      var s = ['student', 'coursework', 'days', 'needs', 'plan', 'customize', 'send'];
      if (state.answers.coursework === 'icl') s.splice(s.indexOf('days'), 1);
      return s;
    }
    var STEP_LABEL = { student: 'About your student', coursework: 'About your student', days: 'About your student', needs: 'About your student', plan: 'Choose a plan', customize: 'Make it yours', send: 'Send it to us' };
    function isQuiz(id) { return ['student', 'coursework', 'days', 'needs'].indexOf(id) !== -1; }

    /* ---------- skeleton ---------- */
    var app = root.querySelector('.rma');
    app.innerHTML =
      '<div class="intro">' +
        '<p class="tagline">School differently.</p>' +
        '<p class="lede">Answer a few questions and we’ll suggest a plan. Build it out on the left and watch your student’s week and price take shape on the right.</p>' +
        '<details class="how"><summary>How does RadAcad work?</summary><div class="how-body">' +
          '<p>RadAcad isn’t a school. It’s what your student does instead. Students are homeschooled or enrolled in an online school, and RadAcad is where their day happens: the space, the schedule, the coaching, and the community.</p>' +
          '<p>Every plan starts with a membership. Each membership day, your student sets goals with an academic coach in the morning, gets a check-in during the day, and wraps up with a progress summary that’s emailed to you.</p>' +
        '</div></details>' +
      '</div>' +
      '<div class="layout">' +
        '<div class="wizard">' +
          '<div class="progress"><p class="step-count" aria-live="polite"></p><ol class="bar" aria-hidden="true"></ol></div>' +
          '<div class="panel"></div>' +
          '<div class="foot">' +
            '<div class="foot-left"></div>' +
            '<div class="foot-right">' +
              '<button type="button" class="btn-back">Back</button>' +
              '<button type="button" class="btn next">Next</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<aside class="side" aria-label="Your student’s week and price">' +
          '<div class="side-head"><h3>Your student’s week</h3><button type="button" class="sheet-close" aria-label="Close">Close</button></div>' +
          '<div class="side-body"></div>' +
        '</aside>' +
      '</div>';

    var $ = function (s) { return app.querySelector(s); };
    var panel = $('.panel');

    /* ---------- renderers: quiz ---------- */
    function chips(name, type, options, selected, opts) {
      opts = opts || {};
      return '<div class="choices' + (opts.compact ? ' compact' : '') + '">' + options.map(function (o) {
        var on = type === 'radio' ? selected === o[0] : selected.indexOf(o[0]) !== -1;
        var off = opts.max && type === 'checkbox' && !on && selected.length >= opts.max;
        return '<label class="choice"><input type="' + type + '" name="' + name + '" value="' + esc(o[0]) + '"' +
          (on ? ' checked' : '') + (off ? ' disabled' : '') + '><span>' + esc(o[1]) + (o[2] ? '<small>' + esc(o[2]) + '</small>' : '') + '</span></label>';
      }).join('') + '</div>';
    }
    function renderStudent() {
      var a = state.answers;
      return '<h3 class="step-title" tabindex="-1">Tell us about your student</h3>' +
        '<fieldset class="q"><legend>What grade are they in?</legend>' +
          chips('q-grade', 'radio', S.grades.map(function (g) { return [g, g]; }), a.grade, { compact: true }) + '</fieldset>' +
        '<fieldset class="q"><legend>When would they start?</legend>' +
          chips('q-start', 'radio', S.starts.map(function (s) { return [s.id, s.label, s.detail]; }), a.start) + '</fieldset>';
    }
    function renderQuestion(key) {
      var q = Q[key], a = state.answers, opts = q.options;
      if (key === 'needs' && !groupsAllowed()) opts = opts.filter(function (o) { return o[0] !== 'classes'; });
      return '<h3 class="step-title" tabindex="-1">' + esc(q.title) + '</h3>' +
        (q.hint ? '<p class="sub">' + esc(q.hint) + '</p>' : '') +
        '<fieldset class="q"><legend class="sr">' + esc(q.title) + '</legend>' +
        chips('q-' + key, key === 'needs' ? 'checkbox' : 'radio', opts, a[key], { max: q.max }) + '</fieldset>';
    }

    /* ---------- renderers: plan ---------- */
    function planCard(id, name, built, cfg, featured) {
      var p = price(cfg), on = state.source === id;
      var extra = p.fees.count ? ' + ' + money(G.springFee * p.fees.count) + ' spring class fee' + (p.fees.count > 1 ? 's' : '') : '';
      return '<label class="opt' + (featured ? ' featured' : '') + (on ? ' is-selected' : '') + '">' +
        '<input type="radio" name="plan" value="' + esc(id) + '"' + (on ? ' checked' : '') + '>' +
        '<span class="opt-body">' +
          '<span class="opt-top"><span class="opt-name">' + esc(name) + '</span>' +
            (featured ? '<span class="badge suggested">Suggested for you</span>' : '') + '</span>' +
          '<span class="opt-desc">' + esc(built) + '</span>' +
          '<span class="opt-esa">' + esaText(p) + '</span>' +
        '</span>' +
        '<span class="opt-price"><span>' + money(p.monthly) + '<small>/mo</small></span>' + (extra ? '<small class="opt-extra">' + esc(extra) + '</small>' : '') + '</span>' +
      '</label>';
    }
    function esaText(p) {
      if (p.esaMonthly <= 0.5) return 'Fully covered by Wyoming ESA';
      return 'About ' + money(p.esaMonthly) + '/mo after Wyoming ESA';
    }
    function describeConfig(cfg) {
      return price(cfg).lines.map(function (l) { return l.label; }).join(' + ') +
        (cfg.groups.length ? ' + ' + plural(cfg.groups.length, 'small group class', 'small group classes') : '');
    }
    function renderPlan() {
      var sc = suggestConfig(), html, ns = notes();
      var suggested = sc ? fromConfig(sc) : null;
      if (suggested) {
        state.suggestedCfg = suggested;
        var match = data.presets.filter(function (p) { return presetAllowed(p) && signature(fromConfig(p.config)) === signature(suggested); })[0];
        state.suggestedName = match ? match.name : 'Your suggested plan';
        if (!state.source) { state.source = 'suggested'; state.cfg = cloneCfg(suggested); }
      }
      var why = reasons();
      html = '<h3 class="step-title" tabindex="-1">' + (suggested ? 'Here’s where we’d start' : 'Choose a starting plan') + '</h3>' +
        '<p class="sub">' + (suggested && why.length ? 'Suggested because you chose ' + esc(joinList(why)) + '. ' : '') +
        'Pick any plan, then fine-tune it in the next step.</p>' +
        (state.source === 'custom' ? '<p class="note">You’ve customized your plan. Picking a plan below replaces your changes.</p>' : '') +
        '<div class="opts" role="radiogroup" aria-label="Plans">';
      if (suggested) html += planCard('suggested', state.suggestedName, describeConfig(suggested), suggested, true);
      if (ns.length) html += '<div class="notes">' + ns.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>';
      html += (suggested ? '<p class="group-h">Other options</p>' : '') + '<div class="opt-list">' +
        data.presets.filter(presetAllowed).filter(function (p) {
          return !suggested || signature(fromConfig(p.config)) !== signature(suggested);
        }).map(function (p) { return planCard(p.id, p.name, p.built, fromConfig(p.config), false); }).join('') +
        '</div></div>' +
        '<p class="fine">Just want to try it? Drop-in days are ' + money(M.dropInPrice) + ', and a new family’s first drop-in day is free.</p>';
      return html;
    }
    function cloneCfg(c) { return JSON.parse(JSON.stringify(c)); }

    /* ---------- renderers: customize ---------- */
    function stepper(id, value, min, max, label) {
      return '<span class="stepper" role="group" aria-label="' + esc(label) + '">' +
        '<button type="button" data-step="' + id + '" data-d="-1"' + (value <= min ? ' disabled' : '') + ' aria-label="Fewer">−</button>' +
        '<output aria-live="polite">' + value + '</output>' +
        '<button type="button" data-step="' + id + '" data-d="1"' + (value >= max ? ' disabled' : '') + ' aria-label="More">+</button>' +
      '</span>';
    }
    function toggleRow(id, on, title, priceText, desc) {
      return '<label class="row toggle"><input type="checkbox" id="rma-' + id + '" data-toggle="' + id + '"' + (on ? ' checked' : '') + '>' +
        '<span class="row-body"><span class="row-title">' + esc(title) + '</span><span class="row-desc">' + esc(desc) + '</span></span>' +
        '<span class="row-price">' + priceText + '</span></label>';
    }
    function renderCustomize() {
      var cfg = state.cfg, pkg = isPackage(cfg), n = cfg.days.length, h = '';
      h += '<h3 class="step-title" tabindex="-1">Make it yours</h3>' +
        '<p class="sub">Every change shows up in the week and the price.</p>';

      /* membership */
      h += '<section class="sec"><h4>Membership days</h4>';
      if (pkg) {
        h += '<p class="sub small">ICL packages include the full-week membership, Monday through Friday.</p>';
      } else {
        var locked = {};
        cfg.groups.forEach(function (g) { blockOf(g.block).days.forEach(function (d) { locked[d] = blockOf(g.block).label; }); });
        h += '<div class="days" role="group" aria-label="Membership days">' + DAYS.map(function (d) {
          var on = cfg.days.indexOf(d) !== -1, lock = on && locked[d], only = on && n === 1;
          return '<button type="button" class="day' + (on ? ' on' : '') + '" data-day="' + d + '" aria-pressed="' + on + '"' +
            (lock || only ? ' disabled title="' + (lock ? 'Needed for your ' + esc(lock) + ' class' : 'Every plan needs at least one day') + '"' : '') + '>' +
            '<span>' + d + '</span></button>';
        }).join('') + '</div>' +
        '<p class="day-price"><strong>' + membershipName(n) + ': ' + money(membershipPrice(n)) + '/mo.</strong> ' +
          'Up to two days is ' + money(M.twoDayPrice) + '. Need a third or fourth day? Add ' + money(M.extraDayPrice) + ' a day. The full week is ' + money(M.fullWeekPrice) + '.</p>';
      }
      h += '</section>';

      /* ICL */
      var ic = cfg.icl;
      h += '<section class="sec"><h4>' + esc(I.name) + ' <span class="tag">Partner school</span></h4><p class="sub small">' + esc(I.desc) + '</p>' +
        '<div class="choices compact">' +
          [['none', 'Not right now'], ['package', 'Full-time enrollment'], ['alacarte', 'A few courses']].map(function (o) {
            var on = (ic ? ic.mode : 'none') === o[0];
            return '<label class="choice"><input type="radio" name="icl-mode" value="' + o[0] + '"' + (on ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
          }).join('') + '</div>';
      if (ic) {
        h += '<div class="choices compact">' + [['live', 'Live classes'], ['async', 'Self-paced']].map(function (o) {
          var on = ic.type === o[0];
          var pr = ic.mode === 'package' ? money(I.packages[o[0]].price) + '/mo' : money(I.alaCarte[o[0]].price) + '/mo per course';
          return '<label class="choice"><input type="radio" name="icl-type" value="' + o[0] + '"' + (on ? ' checked' : '') + '><span>' + o[1] + ' <em>' + pr + '</em></span></label>';
        }).join('') + '</div>';
        if (ic.mode === 'alacarte') h += '<div class="row"><span class="row-body"><span class="row-title">How many courses?</span><span class="row-desc">Up to ' + I.alaCarte.max + '. Works with any membership.</span></span>' + stepper('icl', ic.courses, 1, I.alaCarte.max, 'ICL courses') + '</div>';
        if (state.answers.start === 'jan2027') h += '<p class="fine">' + esc(I.janNote) + '</p>';
      }
      h += '</section>';

      /* support */
      h += '<section class="sec"><h4>Coaching and check-ins</h4>';
      if (closeAllowed()) h += toggleRow('close', cfg.close, A.close.name, money(A.close.price) + '/mo', A.close.desc);
      else h += '<p class="sub small">Middle schoolers get a coach check-in at every transition, every day, at no extra cost.</p>';
      h += toggleRow('checkin', cfg.checkin, A.checkin.name, money(A.checkin.price) + '/mo', A.checkin.desc);
      h += '<div class="row"><span class="row-body"><span class="row-title">' + esc(A.coaching.name) + '</span><span class="row-desc">' + esc(A.coaching.desc) + '</span></span>' +
        stepper('coaching', cfg.coaching, 0, A.coaching.max, 'Coaching sessions a week') + '</div>';
      h += '</section>';

      /* classes */
      h += '<section class="sec"><h4>Classes</h4>';
      if (groupsAllowed()) {
        h += '<div class="row-title">Small group classes <span class="tag">Grades ' + G.minGrade + '–' + G.maxGrade + '</span></div>' +
          '<p class="sub small">' + esc(G.desc) + ' ' + money(G.fallFee) + ' for fall, ' + money(G.springFee) + ' for spring.</p>' +
          '<div class="blocks">' + G.blocks.map(function (b) {
            var mine = cfg.groups.filter(function (g) { return g.block === b.id; });
            return '<div class="block"><p class="block-h">' + esc(b.label) + ' block</p>' +
              mine.map(function (g, i) {
                var sid = 'rma-grp-' + g.uid;
                return '<div class="mini-row"><label class="sr" for="' + sid + '">' + esc(b.label) + ' class ' + (i + 1) + '</label>' +
                  (b.classes.length
                    ? '<select id="' + sid + '" data-group="' + g.uid + '"><option value="">Choose a class</option>' + b.classes.map(function (c) { return '<option' + (c === g.cls ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>'
                    : '<span class="mini-name">Class to choose together</span>') +
                  '<button type="button" class="remove" data-remove-group="' + g.uid + '">Remove</button></div>';
              }).join('') +
              '<button type="button" class="btn-ghost small" data-add-group="' + b.id + '"' + (mine.length >= 3 ? ' disabled' : '') + '>Add a ' + esc(b.label) + ' class</button></div>';
          }).join('') + '</div>' +
          '<p class="fine">Classes in the same block keep your student on the two-day membership. A class in the other block adds those days.</p>';
      }
      h += '<div class="row-title sub-h">' + esc(A.subject.name) + 'es</div><p class="sub small">' + esc(A.subject.desc) + ' ' + money(A.subject.price) + '/mo each.</p>' +
        cfg.subjects.map(function (s, i) {
          var sid = 'rma-subj-' + s.uid;
          return '<div class="mini-row"><label class="sr" for="' + sid + '">Subject ' + (i + 1) + '</label><select id="' + sid + '" data-subject="' + s.uid + '"><option value="">Choose a subject</option>' +
            data.subjects.map(function (x) { return '<option' + (x === s.subject ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') +
            '</select><button type="button" class="remove" data-remove-subject="' + s.uid + '">Remove</button></div>';
        }).join('') +
        '<button type="button" class="btn-ghost small" data-add-subject' + (cfg.subjects.length >= A.subject.max ? ' disabled' : '') + '>Add a single subject class</button>';
      h += '</section>';
      return h;
    }

    /* ---------- renderers: send + sent ---------- */
    function renderSend() {
      var F = state.form;
      function field(name, label, type, ac, req) {
        return '<div class="f"><label for="rma-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<input id="rma-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + (req ? ' required' : '') + ' value="' + esc(F[name] || '') + '"></div>';
      }
      function select(name, label, opts, req) {
        return '<div class="f"><label for="rma-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<select id="rma-' + name + '" name="' + name + '"' + (req ? ' required' : '') + '><option value="">Choose one</option>' +
          opts.map(function (o) { return '<option value="' + esc(o) + '"' + (F[name] === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
      }
      return '<h3 class="step-title" tabindex="-1">Send us your plan</h3>' +
        '<p class="sub">We’ll email you a copy and follow up ' + esc(S.followUp) + '. You can book your intro call right after.</p>' +
        '<form novalidate><div class="grid">' +
          field('parentFirst', 'Your first name', 'text', 'given-name', true) +
          field('parentLast', 'Your last name', 'text', 'family-name', true) +
          field('email', 'Email', 'email', 'email', true) +
          field('phone', 'Mobile phone', 'tel', 'tel', true) +
          field('studentFirst', 'Student’s first name', 'text', 'off', true) +
          select('heard', 'How did you hear about us?', HEARD_OPTIONS, false) +
          '<div class="f wide"><label for="rma-notes">Anything we should know? <span class="opt-tag">(optional)</span></label>' +
            '<textarea id="rma-notes" name="notes" rows="3" placeholder="Learning needs, travel plans, what’s working and what isn’t">' + esc(F.notes || '') + '</textarea></div>' +
        '</div>' +
        '<div class="hp" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="form-error" role="alert"></p>' +
        '<button type="submit" class="sr-submit" tabindex="-1" aria-hidden="true"></button></form>';
    }
    function renderSent() {
      return '<div class="sent"><h3 class="step-title" tabindex="-1">Plan sent</h3>' +
        '<p>Check your inbox for a copy. The next step is a ' + esc(S.callLength) + ' intro call, so we can get to know your family and fine-tune the plan together.</p>' +
        '<a class="btn" target="_blank" rel="noopener" href="' + esc(S.bookingUrl) + '">Book your intro call</a>' +
        '<p class="fine">Not ready to book? We’ll reach out ' + esc(S.followUp) + '.</p></div>';
    }

    /* ---------- right side: week + price ---------- */
    function renderSide() {
      var cfg = state.cfg, body = $('.side-body');
      if (!cfg) {
        body.innerHTML = '<div class="week empty">' + DAYS.map(function (d) { return '<div class="day-col"><p class="dh">' + d + '</p><div class="cell"></div></div>'; }).join('') + '</div>' +
          '<p class="empty-msg">Answer the questions or pick a plan, and your student’s week appears here.</p>' + priceFoot(null);
        return;
      }
      var g = grade(), pkg = isPackage(cfg), live = cfg.icl && cfg.icl.type === 'live';
      var week = DAYS.map(function (d) {
        var on = cfg.days.indexOf(d) !== -1, items = [];
        if (on) {
          items.push('<span class="chip base">Co-working</span>');
          if (cfg.icl) items.push('<span class="chip icl">' + (pkg ? (live ? 'ICL live' : 'ICL self-paced') : 'ICL courses') + '</span>');
          cfg.groups.forEach(function (gr) {
            var b = blockOf(gr.block);
            if (b.days.indexOf(d) !== -1) items.push('<span class="chip group">' + esc(gr.cls || 'Small group') + '</span>');
          });
          if (cfg.close) items.push('<span class="chip support">Hourly check-ins</span>');
          else if (g !== null && g <= 8) items.push('<span class="chip support">Extra check-ins</span>');
        }
        return '<div class="day-col' + (on ? ' on' : '') + '"><p class="dh">' + d + '</p><div class="cell">' + (items.join('') || '<span class="off">Off</span>') + '</div></div>';
      }).join('');

      var weekly = [];
      if (cfg.checkin) weekly.push('30-minute planning check-in');
      if (cfg.coaching) weekly.push(plural(cfg.coaching, 'one-on-one coaching session', 'one-on-one coaching sessions'));
      cfg.subjects.forEach(function (s) { weekly.push((s.subject || 'Single subject class') + ', 3 hours'); });
      if (cfg.icl && cfg.icl.mode === 'alacarte') weekly.push(plural(cfg.icl.courses, 'ICL course', 'ICL courses') + (live ? ', live' : ', self-paced'));

      body.innerHTML =
        '<div class="week">' + week + '</div>' +
        '<p class="legend">Every co-working day: morning goals with a coach, a check-in, and an end-of-day summary emailed to you.' + (g !== null && g <= 8 ? ' Middle schoolers also get a check-in at every transition.' : '') + '</p>' +
        (weekly.length ? '<div class="extra"><p class="extra-h">Each week</p><ul>' + weekly.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="extra"><p class="extra-h">Each month</p><ul><li>Field trips and ski days</li><li>Monthly goals review, with a summary for you</li></ul></div>' +
        priceFoot(price(cfg));
    }
    var shownTotal = 0;
    function priceFoot(p) {
      if (!p) return '<div class="price"><p class="price-h">Monthly price</p><p class="empty-msg">Your price shows up here as you build.</p></div>';
      var cfg = state.cfg, jan = state.answers.start === 'jan2027', pkg = isPackage(cfg);
      var fees = '';
      if (p.fees.count) {
        var what = plural(p.fees.count, 'small group class', 'small group classes');
        fees = '<p class="fees">Plus ' + (jan
          ? money(p.fees.spring) + ' for ' + what + ' in the spring semester'
          : money(p.fees.fall) + ' for fall and ' + money(p.fees.spring) + ' for spring, for ' + what) +
          ', billed when you enroll.</p>';
      }
      var guarantee = cfg.icl
        ? (jan && pkg ? I.janGuarantee + ' (' + money(I.packages[cfg.icl.type].deposit) + ')' : '')
        : 'First-month guarantee for new families: ' + M.guarantee;
      return '<div class="price">' +
        '<ul class="lines">' + p.lines.map(function (l) {
          return '<li><span>' + esc(l.label) + (l.detail ? '<small>' + esc(l.detail) + '</small>' : '') + '</span><span>' + money(l.amount) + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="total"><span class="total-label">Monthly total</span><span class="total-num">' + money(p.monthly) + '</span></div>' +
        fees +
        '<p class="esa">' + esaText(p) + '<small>Wyoming ESA gives $7,000 a year to students not in public school. Every RadAcad family that has applied has been approved, and we help with the application.</small></p>' +
        '<ul class="fine-list">' +
          '<li>' + (jan && pkg ? 'Five monthly payments, January through May.' : 'Billed monthly. Memberships are month to month with 30 days’ notice.') + '</li>' +
          '<li>Prepay by the semester or the year for 5% off.</li>' +
          (guarantee ? '<li>' + esc(guarantee) + '</li>' : '') +
          '<li>Scholarships from the RadAcad Foundation stack with ESA. <a href="' + esc(S.foundationUrl) + '" target="_blank" rel="noopener">See scholarships</a></li>' +
        '</ul></div>';
    }

    /* ---------- render ---------- */
    function render(focusTitle) {
      var list = steps(), id = state.step, idx = list.indexOf(id);
      var active = focusKey(root.activeElement);
      app.classList.toggle('is-sent', state.sent);
      app.classList.toggle('sheet-open', state.sheetOpen);

      if (state.sent) panel.innerHTML = renderSent();
      else if (id === 'student') panel.innerHTML = renderStudent();
      else if (id === 'plan') panel.innerHTML = renderPlan();
      else if (id === 'customize') panel.innerHTML = renderCustomize();
      else if (id === 'send') panel.innerHTML = renderSend();
      else panel.innerHTML = renderQuestion(id);

      $('.step-count').textContent = state.sent ? 'Done' : 'Step ' + (idx + 1) + ' of ' + list.length + ': ' + STEP_LABEL[id];
      $('.bar').innerHTML = list.map(function (s, i) {
        return '<li class="' + (state.sent || i < idx ? 'done' : i === idx ? 'current' : '') + '"></li>';
      }).join('');

      renderSide();
      renderFoot();

      if (focusTitle) {
        if (!reduceMotion) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); }
        var t = panel.querySelector('.step-title');
        if (t) t.focus({ preventScroll: true });
        var top = mount.getBoundingClientRect().top;
        if (top < 0) window.scrollBy({ top: top - 120, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else if (active) {
        var els = root.querySelectorAll('button, input, select, textarea');
        for (var k = 0; k < els.length; k++) {
          if (focusKey(els[k]) === active) {
            var el = els[k];
            if (el.disabled) el = el.parentNode.querySelector('button:not([disabled])') || el;
            el.focus({ preventScroll: true });
            break;
          }
        }
      }
    }
    function focusKey(el) {
      if (!el || !el.tagName) return '';
      if (el.id) return '#' + el.id;
      var d = el.dataset || {};
      if (d.day) return 'day:' + d.day;
      if (d.step) return 'step:' + d.step + d.d;
      if (d.addGroup) return 'add-group:' + d.addGroup;
      if (el.hasAttribute('data-add-subject')) return 'add-subject';
      if (el.name && el.value) return 'input:' + el.name + '=' + el.value;
      if (el.classList.contains('next')) return 'next';
      return '';
    }
    function renderFoot() {
      var id = state.step, left = $('.foot-left'), p = state.cfg ? price(state.cfg) : null;
      if (isQuiz(id)) left.innerHTML = '<button type="button" class="link skip">Skip the questions</button>';
      else if (p) left.innerHTML = '<span class="ft-num">' + money(p.monthly) + '</span><span class="ft-per">/mo</span><button type="button" class="link view-plan">See the week</button>';
      else left.innerHTML = '<span class="ft-label">Pick a plan to see the price</span>';
      $('.btn-back').hidden = steps().indexOf(id) === 0;
      var next = $('.next');
      next.textContent = id === 'send' ? 'Send my plan' : 'Next';
      next.disabled = !canAdvance();
    }
    function canAdvance() {
      var a = state.answers;
      switch (state.step) {
        case 'student': return !!(a.grade && a.start);
        case 'coursework': return !!a.coursework;
        case 'days': return !!a.days;
        case 'plan': case 'customize': return !!state.cfg;
        default: return true;
      }
    }
    function go(delta) {
      saveForm();
      var list = steps(), i = list.indexOf(state.step);
      state.step = list[Math.max(0, Math.min(list.length - 1, i + delta))];
      render(true);
      track('plan_builder_step', { step: state.step });
    }
    function saveForm() {
      var form = panel.querySelector('form');
      if (form) new FormData(form).forEach(function (v, k) { if (k !== 'company') state.form[k] = v; });
    }
    function markStarted() { if (!state.started) { state.started = true; track('plan_builder_start'); } }
    function customized() { state.source = 'custom'; render(false); }
    function answersChanged() { if (state.source !== 'custom') { state.source = null; state.cfg = null; } }

    /* ---------- events ---------- */
    var pointerPick = false;
    panel.addEventListener('pointerdown', function (e) { pointerPick = !!e.target.closest('.choice'); });
    panel.addEventListener('keydown', function () { pointerPick = false; });

    panel.addEventListener('change', function (e) {
      var t = e.target, a = state.answers, cfg = state.cfg;
      markStarted();
      if (t.name === 'q-grade' || t.name === 'q-start') {
        a[t.name.slice(2)] = t.value;
        if (t.name === 'q-grade' && !groupsAllowed()) a.needs = a.needs.filter(function (n) { return n !== 'classes'; });
        answersChanged(); render(false); return;
      }
      if (t.name === 'q-coursework' || t.name === 'q-days') {
        var key = t.name.slice(2);
        a[key] = t.value; answersChanged();
        track('plan_builder_answer', { question: key, answer: t.value });
        render(false);
        if (pointerPick) setTimeout(function () { if (state.step === key) go(1); }, reduceMotion ? 0 : 260);
        return;
      }
      if (t.name === 'q-needs') {
        a.needs = t.checked ? a.needs.concat(t.value) : a.needs.filter(function (v) { return v !== t.value; });
        answersChanged(); render(false); return;
      }
      if (t.name === 'plan') {
        state.source = t.value;
        state.cfg = t.value === 'suggested' ? cloneCfg(state.suggestedCfg) : fromConfig(data.presets.filter(function (p) { return p.id === t.value; })[0].config);
        track('plan_builder_plan', { plan: t.value });
        render(false); return;
      }
      if (t.name === 'icl-mode') {
        if (t.value === 'none') cfg.icl = null;
        else {
          var type = cfg.icl ? cfg.icl.type : 'live';
          cfg.icl = { mode: t.value, type: type, courses: cfg.icl && cfg.icl.courses || 1 };
          if (t.value === 'package') cfg.days = DAYS.slice();
        }
        customized(); return;
      }
      if (t.name === 'icl-type') { cfg.icl.type = t.value; customized(); return; }
      if (t.dataset.toggle) { cfg[t.dataset.toggle] = t.checked; customized(); return; }
      if (t.dataset.subject) { cfg.subjects.forEach(function (s) { if (s.uid === +t.dataset.subject) s.subject = t.value; }); customized(); return; }
      if (t.dataset.group) { cfg.groups.forEach(function (g) { if (g.uid === +t.dataset.group) g.cls = t.value; }); customized(); return; }
    });

    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var cfg = state.cfg;
      if (b.dataset.day) {
        var d = b.dataset.day, i = cfg.days.indexOf(d);
        if (i === -1) cfg.days.push(d); else cfg.days.splice(i, 1);
        cfg.days = sortDays(cfg.days); customized(); return;
      }
      if (b.dataset.step) {
        var delta = +b.dataset.d;
        if (b.dataset.step === 'coaching') cfg.coaching = Math.max(0, Math.min(A.coaching.max, cfg.coaching + delta));
        if (b.dataset.step === 'icl') cfg.icl.courses = Math.max(1, Math.min(I.alaCarte.max, cfg.icl.courses + delta));
        customized(); return;
      }
      if (b.hasAttribute('data-add-subject')) { cfg.subjects.push({ uid: ++state.uid, subject: '' }); customized(); return; }
      if (b.dataset.removeSubject) { cfg.subjects = cfg.subjects.filter(function (s) { return s.uid !== +b.dataset.removeSubject; }); customized(); return; }
      if (b.dataset.addGroup) {
        var blk = blockOf(b.dataset.addGroup);
        var added = blk.days.filter(function (d) { return cfg.days.indexOf(d) === -1; });
        cfg.groups.push({ uid: ++state.uid, block: blk.id, cls: '', added: added });
        ensureGroupDays(cfg); customized(); return;
      }
      if (b.dataset.removeGroup) {
        var gone = cfg.groups.filter(function (g) { return g.uid === +b.dataset.removeGroup; })[0];
        cfg.groups = cfg.groups.filter(function (g) { return g !== gone; });
        // take off the days this class added, unless another class still needs them
        var needed = {};
        cfg.groups.forEach(function (g) { blockOf(g.block).days.forEach(function (d) { needed[d] = true; }); });
        (gone.added || []).forEach(function (d) { if (!needed[d] && cfg.days.length > 1) cfg.days = cfg.days.filter(function (x) { return x !== d; }); });
        customized(); return;
      }
    });

    panel.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

    $('.foot').addEventListener('click', function (e) {
      if (e.target.classList.contains('skip')) {
        state.skipped = true; state.source = null; state.cfg = null; state.step = 'plan';
        track('plan_builder_skip_quiz'); render(true);
      }
      if (e.target.classList.contains('view-plan')) { state.sheetOpen = true; render(false); $('.sheet-close').focus(); }
    });
    $('.sheet-close').addEventListener('click', function () { state.sheetOpen = false; render(false); });
    $('.btn-back').addEventListener('click', function () { go(-1); });
    $('.next').addEventListener('click', function () {
      if (state.step === 'send') { submit(); return; }
      if (isQuiz(state.step)) state.skipped = false;
      go(1);
    });

    /* ---------- submit ---------- */
    function submit() {
      var form = panel.querySelector('form'), err = panel.querySelector('.form-error');
      err.textContent = '';
      panel.querySelectorAll('.f.invalid').forEach(function (el) { el.classList.remove('invalid'); });
      var bad = [];
      form.querySelectorAll('[required]').forEach(function (el) {
        if (!el.value.trim() || !el.checkValidity()) { bad.push(el); el.closest('.f').classList.add('invalid'); }
      });
      if (bad.length) {
        err.textContent = bad.length === 1 ? 'Fill in the highlighted field to send your plan.' : 'Fill in the ' + bad.length + ' highlighted fields to send your plan.';
        bad[0].focus(); return;
      }
      saveForm();
      var F = state.form, cfg = state.cfg, p = price(cfg), a = state.answers;
      var startObj = S.starts.filter(function (s) { return s.id === a.start; })[0];
      var planName = state.source === 'suggested' ? state.suggestedName
        : state.source === 'custom' ? 'Custom plan'
        : (data.presets.filter(function (x) { return x.id === state.source; })[0] || {}).name;
      var payload = {
        company: (form.elements.company && form.elements.company.value) || '',
        page: location.href,
        parent: { first: F.parentFirst.trim(), last: F.parentLast.trim(), email: F.email.trim(), phone: F.phone.trim() },
        student: { first: F.studentFirst.trim(), grade: a.grade || '' },
        start: startObj ? startObj.label : '',
        heard: F.heard || '',
        notes: (F.notes || '').trim(),
        answers: {
          coursework: labelOf('coursework', a.coursework),
          days: labelOf('days', a.days),
          needs: a.needs.map(function (n) { return labelOf('needs', n); }),
          suggested: state.suggestedName || (state.skipped ? 'Skipped the questions' : '')
        },
        plan: {
          name: planName || 'Custom plan',
          days: isPackage(cfg) ? DAYS : cfg.days,
          lines: p.lines.map(function (l) { return { label: l.label + (l.detail ? ' (' + l.detail + ')' : ''), amount: l.amount }; }),
          monthly: p.monthly,
          classFees: p.fees.count ? (a.start === 'jan2027' ? money(p.fees.spring) + ' for spring' : money(p.fees.fall) + ' fall, ' + money(p.fees.spring) + ' spring') + ' (' + plural(p.fees.count, 'small group class', 'small group classes') + ')' : '',
          esa: esaText(p)
        }
      };
      var btn = $('.next');
      btn.disabled = true; btn.textContent = 'Sending…';
      var send = S.endpoint
        ? fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json(); })
            .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'Send failed'); })
        : new Promise(function (resolve) { console.info('[plan builder] Preview mode: no endpoint set, so nothing was sent.', payload); setTimeout(resolve, 600); });
      send.then(function () {
        state.sent = true; state.sheetOpen = false;
        track('plan_builder_submit', { plan: payload.plan.name, value: p.monthly, currency: 'USD' });
        render(true);
      }).catch(function (error) {
        console.error('[plan builder]', error);
        btn.disabled = false; btn.textContent = 'Send my plan';
        err.innerHTML = 'Your plan didn’t send. Check your connection and try again, or email <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a>.';
      });
    }

    /* expose pricing for automated tests only */
    mount.__rmaTest = { price: function (c) { return price(fromConfig(c)); }, presets: data.presets };

    render(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
