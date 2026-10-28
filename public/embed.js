/*!
 * Radical Minds Academy — "Your Family, Your Plan" builder (step-by-step)
 * Built by Sagebrush Web Studio
 *
 * Drop into a Squarespace Code Block:
 *   <div id="plan-builder"></div>
 *   <script src="https://YOUR-PROJECT.pages.dev/embed.js" defer></script>
 *
 * Prices, plans and settings live in plans.json next to this file.
 * Renders inside a shadow root so Squarespace styles can't break it, but still uses the
 * page's own fonts (Mokoko + Poppins) because @font-face is document-wide.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var BASE = script && script.src ? new URL('.', script.src).href : './';
  var MOUNT_ID = (script && script.getAttribute('data-mount')) || 'plan-builder';

  /* ---------- the three questions ---------- */
  var QUESTIONS = {
    learning: {
      type: 'radio',
      title: 'Where is your student learning right now?',
      options: [
        ['homeschool', 'Homeschool'],
        ['online', 'Online school'],
        ['traditional', 'Traditional school'],
        ['unsure', 'We’re figuring it out']
      ]
    },
    days: {
      type: 'radio',
      title: 'How many days a week would they be with us?',
      options: [
        ['two', '2 days a week'],
        ['every', 'Every weekday'],
        ['unsure', 'Not sure yet']
      ]
    },
    needs: {
      type: 'checkbox', max: 2,
      title: 'What does your student need most?',
      hint: 'Pick up to two.',
      options: [
        ['structure', 'Structure and accountability'],
        ['subject', 'One-on-one help in a subject'],
        ['ef', 'Executive function coaching'],
        ['community', 'Friends and community'],
        ['travel', 'Freedom to travel']
      ]
    }
  };

  var STEPS = [
    { id: 'learning', label: 'About your student' },
    { id: 'days', label: 'About your student' },
    { id: 'needs', label: 'About your student' },
    { id: 'plan', label: 'Your plan' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'send', label: 'Send it to us' }
  ];

  var START_OPTIONS = ['Immediately', 'This semester', 'Next semester', 'Next school year', 'Just exploring options'];
  var HEARD_OPTIONS = ['Google or another search engine', 'Friend or family', 'Current RadAcad or Teton Tutors family', 'A teacher', 'Social media', 'Community event', 'Local organization', 'Returning family', 'Other'];

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function labelOf(key, val) {
    var opts = QUESTIONS[key].options;
    for (var i = 0; i < opts.length; i++) if (opts[i][0] === val) return opts[i][1];
    return val || '';
  }
  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
      else if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: name }, params || {}));
    } catch (e) { /* analytics never breaks the builder */ }
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function injectFonts() {
    // Squarespace already loads Mokoko + Poppins on the live site; this only helps the standalone preview.
    if (document.querySelector('link[data-rma-fonts]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.setAttribute('data-rma-fonts', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Roboto+Slab:wght@500;600&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- boot ---------- */
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

  /* ---------- app ---------- */
  function init(root, data, mount) {
    var S = data.settings, SC = data.subjectClass;
    var core = data.foundations;
    var partners = data.partnerships.map(function (p) { return Object.assign({ partner: true }, p); });
    var all = core.concat(partners);
    function getF(id) { for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }

    var state = {
      step: 0,
      answers: { learning: null, days: null, needs: [] },
      skipped: false,
      foundationId: null,
      foundationManual: false,
      classes: [], uid: 0, autoSubjectDone: false,
      form: {},
      sent: false, started: false
    };

    var app = root.querySelector('.rma');
    app.innerHTML =
      '<div class="intro">' +
        '<p class="tagline">School differently.</p>' +
        '<p class="lede">Three quick questions, then we’ll suggest a starting plan. Change anything you like and send it to us.</p>' +
        '<details class="how"><summary>How does RadAcad work?</summary><div class="how-body">' +
          '<p>RadAcad isn’t a school. It’s what your student does instead. Students are homeschooled or enrolled in an online school, and RadAcad is where their day happens: the space, the schedule, the coaching, and the community.</p>' +
          '<p>Every plan starts with a membership. Add one-on-one subjects if your student wants them, and we’ll fine-tune the rest together on a call.</p>' +
        '</div></details>' +
      '</div>' +
      '<div class="wizard">' +
        '<div class="progress">' +
          '<p class="step-count" aria-live="polite"></p>' +
          '<ol class="bar" aria-hidden="true">' + STEPS.map(function () { return '<li></li>'; }).join('') + '</ol>' +
        '</div>' +
        '<div class="panel"></div>' +
        '<div class="foot">' +
          '<div class="foot-left"></div>' +
          '<div class="foot-right">' +
            '<button type="button" class="btn-back">Back</button>' +
            '<button type="button" class="btn next">Next</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var $ = function (s) { return app.querySelector(s); };
    var panel = $('.panel');

    /* ----- suggestion logic ----- */
    function suggest() {
      var a = state.answers;
      if (state.skipped && !a.days) return null;
      var has = function (n) { return a.needs.indexOf(n) !== -1; };
      if (has('ef')) return 'full';                       // EF coaching only comes with Full
      if (a.days === 'every') return has('structure') ? 'full' : 'independent';
      if (a.days === 'two') return (has('structure') || has('subject')) ? 'two-day-radacad' : 'two-day-independent';
      if (a.days === 'unsure') return (has('structure') || has('subject')) ? 'two-day-radacad' : 'two-day-independent';
      return null;
    }
    function reasons() {
      var a = state.answers, out = [];
      if (a.days === 'two') out.push('2 days a week');
      if (a.days === 'every') out.push('every weekday');
      a.needs.forEach(function (n) { out.push(labelOf('needs', n).toLowerCase()); });
      return out;
    }
    function notes() {
      var a = state.answers, out = [];
      if (a.learning === 'traditional')
        out.push('Most RadAcad students are homeschooled or enrolled in an online school. If you’re leaving a traditional school, we’ll walk you through your options on the call.');
      if (a.needs.indexOf('travel') !== -1)
        out.push('On the road a lot? Drop-in days are ' + money(S.dropInPrice) + ' each. Ask us about them on your call.');
      if (a.needs.indexOf('ef') !== -1 && a.days === 'two')
        out.push('Weekly executive function coaching comes with the Full membership, so that’s where we’d start.');
      return out;
    }

    /* ----- pricing ----- */
    function isMember() { var f = getF(state.foundationId); return !!(f && f.memberPricing); }
    function classPrice() { return isMember() ? SC.memberPrice : SC.price; }
    function total() { var f = getF(state.foundationId); return f ? f.price + state.classes.length * classPrice() : 0; }

    /* ----- step renderers ----- */
    function renderQuestion(key) {
      var q = QUESTIONS[key];
      var val = state.answers[key];
      return '<h3 class="step-title" tabindex="-1">' + esc(q.title) + '</h3>' +
        (q.hint ? '<p class="sub">' + esc(q.hint) + '</p>' : '') +
        '<fieldset class="choices" data-key="' + key + '"><legend class="sr">' + esc(q.title) + '</legend>' +
        q.options.map(function (o) {
          var on = q.type === 'radio' ? val === o[0] : val.indexOf(o[0]) !== -1;
          var off = q.type === 'checkbox' && !on && val.length >= q.max;
          return '<label class="choice"><input type="' + q.type + '" name="q-' + key + '" value="' + o[0] + '"' +
            (on ? ' checked' : '') + (off ? ' disabled' : '') + '><span>' + esc(o[1]) + '</span></label>';
        }).join('') +
        '</fieldset>';
    }

    function optCard(f, opts) {
      var on = state.foundationId === f.id;
      return '<label class="opt' + (opts.featured ? ' featured' : '') + (on ? ' is-selected' : '') + '">' +
        '<input type="radio" name="foundation" value="' + f.id + '"' + (on ? ' checked' : '') + '>' +
        '<span class="opt-body">' +
          '<span class="opt-top"><span class="opt-name">' + esc(f.name) + '</span>' +
            (opts.featured ? '<span class="badge suggested">Suggested for you</span>' : '') +
            (f.flag && !opts.featured ? '<span class="badge flag">' + esc(f.flag) + '</span>' : '') +
          '</span>' +
          '<span class="opt-desc">' + esc(f.desc) + '</span>' +
          (opts.featured || on ? '<ul class="opt-inc">' + f.includes.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '') +
        '</span>' +
        '<span class="opt-price">' + money(f.price) + '<small>/mo</small></span>' +
      '</label>';
    }

    function renderPlan() {
      var sid = suggest();
      if (sid && !state.foundationManual) state.foundationId = sid;
      var online = state.answers.learning === 'online';
      var ns = notes().map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
      var html;
      if (sid) {
        var why = reasons();
        var others = core.filter(function (f) { return f.id !== sid; });
        html =
          '<h3 class="step-title" tabindex="-1">Here’s where we’d start</h3>' +
          '<p class="sub">' + (why.length ? 'Suggested because you chose ' + esc(joinList(why)) + '. ' : '') + 'You can pick a different membership anytime.</p>' +
          '<div class="opts" role="radiogroup" aria-label="Memberships">' +
            optCard(getF(sid), { featured: true }) +
            (ns ? '<div class="notes">' + ns + '</div>' : '') +
            '<p class="group-h">Other options</p>' +
            '<div class="opt-list">' + others.map(function (f) { return optCard(f, {}); }).join('') + '</div>' +
            partnerBlock(online) +
          '</div>';
      } else {
        html =
          '<h3 class="step-title" tabindex="-1">Choose a membership</h3>' +
          '<p class="sub">Every plan starts with one: a place to learn, with structure and good people around.</p>' +
          '<div class="opts" role="radiogroup" aria-label="Memberships">' +
            (ns ? '<div class="notes">' + ns + '</div>' : '') +
            '<div class="opt-list">' + core.map(function (f) { return optCard(f, {}); }).join('') + '</div>' +
            partnerBlock(online) +
          '</div>';
      }
      return html;
    }
    function partnerBlock(open) {
      var anyPartner = partners.some(function (p) { return p.id === state.foundationId; });
      return '<details class="partners"' + (open || anyPartner ? ' open' : '') + '>' +
        '<summary>Enrolled with AEON, ICL Academy, or Laurel Springs?</summary>' +
        '<p class="sub small">Partnership packages bundle that program’s tuition with a Full RadAcad Membership.</p>' +
        '<div class="opt-list">' + partners.map(function (f) { return optCard(f, {}); }).join('') + '</div>' +
      '</details>';
    }
    function joinList(arr) {
      if (arr.length < 2) return arr.join('');
      return arr.slice(0, -1).join(', ') + (arr.length > 2 ? ',' : '') + ' and ' + arr[arr.length - 1];
    }

    function renderSubjects() {
      if (state.answers.needs.indexOf('subject') !== -1 && !state.autoSubjectDone && !state.classes.length) {
        state.autoSubjectDone = true;
        state.uid += 1;
        state.classes.push({ uid: state.uid, subject: '' });
      }
      var member = isMember();
      return '<h3 class="step-title" tabindex="-1">Add one-on-one subjects</h3>' +
        '<p class="sub">' + esc(SC.detail) + ' ' +
          (member ? money(SC.memberPrice) + ' a month each with your Full membership (normally ' + money(SC.price) + ').'
                  : money(SC.price) + ' a month each, or ' + money(SC.memberPrice) + ' with a Full membership.') +
          ' Optional, so skip this if your student doesn’t need one.</p>' +
        '<div class="class-list">' + state.classes.map(classRow).join('') + '</div>' +
        '<button type="button" class="btn-ghost add-class">' + (state.classes.length ? 'Add another subject' : 'Add a subject') + '</button>';
    }
    function classRow(c, i) {
      var id = 'rma-subj-' + c.uid;
      return '<div class="class-row" data-uid="' + c.uid + '">' +
        '<label class="sr" for="' + id + '">Subject ' + (i + 1) + '</label>' +
        '<select id="' + id + '"><option value="">Choose a subject</option>' +
          data.subjects.map(function (s) { return '<option' + (s === c.subject ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') +
        '</select>' +
        '<span class="row-price">' + money(classPrice()) + '<small>/mo</small></span>' +
        '<button type="button" class="remove" aria-label="Remove subject ' + (i + 1) + '">Remove</button>' +
      '</div>';
    }

    function renderSend() {
      var F = state.form;
      function field(name, label, type, ac, req) {
        return '<div class="f"><label for="rma-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<input id="rma-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '"' + (req ? ' required' : '') +
          ' value="' + esc(F[name] || '') + '"></div>';
      }
      function select(name, label, opts, req) {
        return '<div class="f"><label for="rma-' + name + '">' + label + (req ? '' : ' <span class="opt-tag">(optional)</span>') + '</label>' +
          '<select id="rma-' + name + '" name="' + name + '"' + (req ? ' required' : '') + '><option value="">Choose one</option>' +
          opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (F[name] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
          '</select></div>';
      }
      return '<h3 class="step-title" tabindex="-1">Send us your plan</h3>' +
        '<p class="sub">We’ll email you a copy and follow up ' + esc(S.followUp) + '. You can book your intro call right after.</p>' +
        '<div class="send-grid">' +
          '<form novalidate>' +
            '<div class="grid">' +
              field('parentFirst', 'Your first name', 'text', 'given-name', true) +
              field('parentLast', 'Your last name', 'text', 'family-name', true) +
              field('email', 'Email', 'email', 'email', true) +
              field('phone', 'Mobile phone', 'tel', 'tel', true) +
              field('studentFirst', 'Student’s first name', 'text', 'off', true) +
              select('grade', 'Student’s grade', S.grades.map(function (g) { return [g, 'Grade ' + g]; }), true) +
              select('start', 'When would you like to start?', START_OPTIONS.map(function (o) { return [o, o]; }), false) +
              select('heard', 'How did you hear about us?', HEARD_OPTIONS.map(function (o) { return [o, o]; }), false) +
              '<div class="f wide"><label for="rma-notes">Anything we should know? <span class="opt-tag">(optional)</span></label>' +
                '<textarea id="rma-notes" name="notes" rows="3" placeholder="Learning needs, travel plans, what’s working and what isn’t">' + esc(F.notes || '') + '</textarea></div>' +
            '</div>' +
            '<div class="hp" aria-hidden="true"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +
            '<p class="form-error" role="alert"></p>' +
            '<button type="submit" class="sr-submit" tabindex="-1" aria-hidden="true"></button>' +
          '</form>' +
          recap() +
        '</div>';
    }
    function recap() {
      var f = getF(state.foundationId), p = classPrice();
      var saved = isMember() ? state.classes.length * (SC.price - SC.memberPrice) : 0;
      return '<aside class="recap" aria-label="Your plan">' +
        '<p class="recap-h">Your plan</p>' +
        '<ul>' +
          '<li><span>' + esc(f.name) + '</span><span>' + money(f.price) + '</span></li>' +
          state.classes.map(function (c) {
            return '<li><span>' + (c.subject ? esc(c.subject) : 'Subject to choose together') + '<small>One-on-one, 3 hrs a week</small></span><span>' + money(p) + '</span></li>';
          }).join('') +
        '</ul>' +
        '<p class="recap-total"><span>Estimated monthly total</span><strong>' + money(total()) + '</strong></p>' +
        (saved ? '<p class="recap-save">Includes ' + money(saved) + ' a month in Full-membership savings.</p>' : '') +
        '<button type="button" class="link edit-plan">Change the plan</button>' +
      '</aside>';
    }

    function renderSent() {
      return '<div class="sent">' +
        '<h3 class="step-title" tabindex="-1">Plan sent</h3>' +
        '<p>Check your inbox for a copy. The next step is a ' + esc(S.callLength) + ' intro call, so we can get to know your family and fine-tune the plan together.</p>' +
        '<a class="btn" target="_blank" rel="noopener" href="' + esc(S.bookingUrl) + '">Book your intro call</a>' +
        '<p class="fine">Not ready to book? We’ll reach out ' + esc(S.followUp) + '.</p>' +
      '</div>';
    }

    /* ----- main render ----- */
    var shownTotal = 0, raf = null;
    function render(focus) {
      var step = STEPS[state.step];
      app.classList.toggle('is-sent', state.sent);
      if (state.sent) {
        panel.innerHTML = renderSent();
      } else if (step.id === 'plan') panel.innerHTML = renderPlan();
      else if (step.id === 'subjects') panel.innerHTML = renderSubjects();
      else if (step.id === 'send') panel.innerHTML = renderSend();
      else panel.innerHTML = renderQuestion(step.id);

      // progress
      $('.step-count').textContent = state.sent ? 'Done' : 'Step ' + (state.step + 1) + ' of ' + STEPS.length + ': ' + step.label;
      app.querySelectorAll('.bar li').forEach(function (li, i) {
        li.classList.toggle('done', state.sent || i < state.step);
        li.classList.toggle('current', !state.sent && i === state.step);
      });

      renderFoot();
      $('.btn-back').hidden = state.step === 0;
      var next = $('.next');
      next.textContent = step.id === 'send' ? 'Send my plan' : step.id === 'subjects' && !state.classes.length ? 'Skip subjects' : 'Next';
      updateNext();

      // motion that answers the click
      if (!reduceMotion) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); }
      if (focus) {
        var t = panel.querySelector('.step-title');
        if (t) t.focus({ preventScroll: true });
        var top = mount.getBoundingClientRect().top;
        if (top < 0) window.scrollBy({ top: top - 120, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    function renderFoot() {
      var left = $('.foot-left');
      if (state.step < 3) {
        left.innerHTML = '<button type="button" class="link skip">Skip the questions</button>';
      } else if (state.foundationId) {
        if (!left.querySelector('.ft-num'))
          left.innerHTML = '<span class="ft-label">Estimated total</span><span class="ft-num">' + money(shownTotal) + '</span><span class="ft-per">/mo</span>';
        animateTotal(total());
      } else {
        left.innerHTML = '<span class="ft-label">Pick a membership to see your total</span>';
      }
    }
    function updateNext() {
      var id = STEPS[state.step].id, ok = true;
      if (id === 'learning' || id === 'days') ok = !!state.answers[id];
      if (id === 'plan') ok = !!state.foundationId;
      $('.next').disabled = !ok;
    }
    function animateTotal(to) {
      var el = function () { return app.querySelector('.ft-num'); };
      if (!el()) { shownTotal = to; return; }
      if (reduceMotion || shownTotal === to) { shownTotal = to; el().textContent = money(to); return; }
      var from = shownTotal, t0 = null;
      cancelAnimationFrame(raf);
      el().classList.remove('bump'); void el().offsetWidth; el().classList.add('bump');
      (function step(t) {
        raf = requestAnimationFrame(function (now) {
          if (!t0) t0 = now;
          var p = Math.min(1, (now - t0) / 380), v = from + (to - from) * (1 - Math.pow(1 - p, 3));
          if (el()) el().textContent = money(v);
          if (p < 1) step(); else shownTotal = to;
        });
      })();
    }
    function refreshTotal() { renderFoot(); }

    function go(delta) {
      saveForm();
      state.step = Math.max(0, Math.min(STEPS.length - 1, state.step + delta));
      render(true);
      track('plan_builder_step', { step: STEPS[state.step].id });
    }
    function saveForm() {
      var form = panel.querySelector('form');
      if (!form) return;
      new FormData(form).forEach(function (v, k) { if (k !== 'company') state.form[k] = v; });
    }
    function markStarted() { if (!state.started) { state.started = true; track('plan_builder_start'); } }

    /* ----- events ----- */
    var pointerPick = false;
    panel.addEventListener('pointerdown', function (e) { pointerPick = !!e.target.closest('.choice'); });
    panel.addEventListener('keydown', function () { pointerPick = false; });

    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name && t.name.indexOf('q-') === 0) {
        var key = t.name.slice(2), q = QUESTIONS[key];
        markStarted();
        if (q.type === 'radio') {
          state.answers[key] = t.value;
          state.foundationManual = false;   // new answers → fresh suggestion
          track('plan_builder_answer', { question: key, answer: t.value });
          updateNext();
          if (pointerPick) setTimeout(function () { if (STEPS[state.step].id === key) go(1); }, reduceMotion ? 0 : 260);
        } else {
          var list = state.answers[key];
          state.answers[key] = t.checked ? list.concat(t.value) : list.filter(function (v) { return v !== t.value; });
          state.foundationManual = false;
          var full = state.answers[key].length >= q.max;
          panel.querySelectorAll('input[name="q-' + key + '"]').forEach(function (el) { el.disabled = full && !el.checked; });
          track('plan_builder_answer', { question: key, answer: t.value });
        }
        return;
      }
      if (t.name === 'foundation') {
        state.foundationId = t.value;
        state.foundationManual = true;
        markStarted();
        track('plan_builder_membership', { membership: t.value });
        panel.querySelectorAll('.opt').forEach(function (el) {
          var on = el.querySelector('input').checked;
          el.classList.toggle('is-selected', on);
          // show "what's included" for the chosen one
          var body = el.querySelector('.opt-body');
          var inc = body.querySelector('.opt-inc');
          if (on && !inc) {
            var f = getF(el.querySelector('input').value);
            body.insertAdjacentHTML('beforeend', '<ul class="opt-inc">' + f.includes.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>');
          } else if (!on && inc && !el.classList.contains('featured')) inc.remove();
        });
        updateNext();
        refreshTotal();
        return;
      }
      var row = t.closest('.class-row');
      if (row) {
        var c = state.classes.filter(function (x) { return x.uid === +row.dataset.uid; })[0];
        c.subject = t.value;
      }
    });

    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t.classList.contains('add-class')) {
        state.uid += 1;
        state.classes.push({ uid: state.uid, subject: '' });
        track('plan_builder_add_subject');
        render(false);
        var sels = panel.querySelectorAll('.class-row select');
        sels[sels.length - 1].focus();
      } else if (t.classList.contains('remove')) {
        var uid = +t.closest('.class-row').dataset.uid;
        state.classes = state.classes.filter(function (x) { return x.uid !== uid; });
        render(false);
        panel.querySelector('.add-class').focus();
      } else if (t.classList.contains('edit-plan')) {
        saveForm();
        state.step = 3;
        render(true);
      }
    });

    panel.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

    $('.foot').addEventListener('click', function (e) {
      if (e.target.classList.contains('skip')) {
        state.skipped = true;
        state.step = 3;
        track('plan_builder_skip_quiz');
        render(true);
      }
    });
    $('.btn-back').addEventListener('click', function () { go(-1); });
    $('.next').addEventListener('click', function () {
      if (STEPS[state.step].id === 'send') submit();
      else { if (state.step < 3) state.skipped = false; go(1); }
    });

    /* ----- submit ----- */
    function submit() {
      var form = panel.querySelector('form');
      var err = panel.querySelector('.form-error');
      err.textContent = '';
      panel.querySelectorAll('.f.invalid').forEach(function (el) { el.classList.remove('invalid'); });
      var bad = [];
      form.querySelectorAll('[required]').forEach(function (el) {
        if (!el.value.trim() || !el.checkValidity()) { bad.push(el); el.closest('.f').classList.add('invalid'); }
      });
      if (bad.length) {
        err.textContent = bad.length === 1 ? 'Fill in the highlighted field to send your plan.' : 'Fill in the ' + bad.length + ' highlighted fields to send your plan.';
        bad[0].focus();
        return;
      }
      saveForm();
      var F = state.form, f = getF(state.foundationId), p = classPrice();
      var payload = {
        company: (form.elements.company && form.elements.company.value) || '',
        page: location.href,
        parent: { first: F.parentFirst.trim(), last: F.parentLast.trim(), email: F.email.trim(), phone: F.phone.trim() },
        student: { first: F.studentFirst.trim(), grade: F.grade },
        start: F.start || '', heard: F.heard || '', notes: (F.notes || '').trim(),
        answers: {
          learning: labelOf('learning', state.answers.learning),
          days: labelOf('days', state.answers.days),
          needs: state.answers.needs.map(function (n) { return labelOf('needs', n); }),
          suggested: (getF(suggest()) || {}).name || (state.skipped ? 'Skipped the questions' : '')
        },
        plan: {
          foundation: { name: f.name, price: f.price },
          classes: state.classes.map(function (c) { return { subject: c.subject || 'Subject to be decided', price: p }; }),
          total: total()
        }
      };

      var btn = $('.next');
      btn.disabled = true; btn.textContent = 'Sending…';
      var send = S.endpoint
        ? fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json(); })
            .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'Send failed'); })
        : new Promise(function (resolve) { console.info('[plan builder] Preview mode: no endpoint set in plans.json, so nothing was sent.', payload); setTimeout(resolve, 600); });

      send.then(function () {
        state.sent = true;
        track('plan_builder_submit', { membership: f.id, subjects: state.classes.length, value: payload.plan.total, currency: 'USD' });
        render(true);
      }).catch(function (error) {
        console.error('[plan builder]', error);
        btn.disabled = false; btn.textContent = 'Send my plan';
        err.innerHTML = 'Your plan didn’t send. Check your connection and try again, or email <a href="mailto:' + esc(S.contactEmail) + '">' + esc(S.contactEmail) + '</a>.';
      });
    }

    render(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
