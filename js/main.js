// Thrive Outdoor Solutions: quote form -> sent to the business inbox via FormSubmit
(function () {
  var EMAIL = 'thriveoutdoorsolutions@gmail.com';
  var PHONE = '0492300404';

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Always open at the top: drop any #section left in the URL and don't restore old scroll position
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', function (e) { if (!e.persisted) window.scrollTo(0, 0); });

  // In-page links scroll smoothly without adding #section to the URL
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var t = id ? document.getElementById(id) : null;
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });

  var form = document.getElementById('quote-form');
  if (!form) return;

  var ENDPOINT = 'https://formsubmit.co/ajax/' + EMAIL;
  var note = document.getElementById('form-note');
  var btn = form.querySelector('button[type="submit"], button:not([type])');
  function show(msg, kind) {
    if (!note) return;
    note.innerHTML = msg;
    note.className = 'fine form-note' + (kind ? ' is-' + kind : '');
    note.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    note.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  var fallback = 'Email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> or call/text <a href="tel:' + PHONE + '">0492 300 404</a>.';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var v = function (n) { return (form.elements[n] && form.elements[n].value || '').trim(); };
    if (v('_honey')) return; // bot trap
    if (!v('phone') && !v('email')) {
      show('Please add a phone number or email so I can get back to you.', 'error');
      return;
    }
    var service = v('service');
    var suburb = v('suburb');
    var data = {
      _subject: 'Website quote request: ' + service + (suburb ? ' (' + suburb + ')' : ''),
      _template: 'table',
      _captcha: 'false',
      _replyto: v('email'),
      Name: v('name'),
      Phone: v('phone'),
      Email: v('email'),
      Suburb: suburb,
      Service: service,
      Message: v('message')
    };
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.j.success) !== 'true') throw new Error(res.j.message || 'failed');
        form.reset();
        show('<strong>✓ Thanks, your request has been sent!</strong> I\'ll be in touch soon. Need me sooner? Call or text <a href="tel:' + PHONE + '">0492 300 404</a>.', 'success');
        if (btn) { btn.dataset.label = 'Sent ✓'; btn.classList.add('is-sent'); }
      })
      .catch(function () {
        show('Sorry, that didn\'t send. ' + fallback, 'error');
      })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Send quote request'; }
      });
  });

  // Prefill an SMS with a short greeting
  var sms = document.getElementById('sms-link');
  if (sms) {
    var sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
    sms.href = 'sms:' + PHONE + sep + 'body=' + encodeURIComponent("Hi, I'd like a quote for some gardening.");
  }
})();

// Hero slideshow: slow crossfade + gentle zoom. Extra slides load after the page has loaded.
(function () {
  var root = document.querySelector('.slideshow');
  if (!root) return;
  var slides = [].slice.call(root.querySelectorAll('.slide'));
  var caption = root.querySelector('figcaption');
  if (slides.length < 2) return;

  var INTERVAL = 5500, FADE = 1400;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 0, timer = null, leaveTimer = null, capTimer = null;
  var paused = reduce, inView = true, revealed = false;

  // Dots (built here so the no-JS page just shows the first photo)
  var nav = document.createElement('div');
  nav.className = 'slide-dots';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Choose a photo');
  var dots = slides.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Show photo ' + (i + 1) + ' of ' + slides.length + ': ' + s.getAttribute('data-caption'));
    if (i === 0) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', function () { reveal(); go(i); schedule(); });
    nav.appendChild(b);
    return b;
  });
  var pauseBtn = null;
  if (!reduce) {
    pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'slide-pause';
    nav.insertBefore(pauseBtn, nav.firstChild);
    pauseBtn.addEventListener('click', function () { paused = !paused; setPauseIcon(); schedule(); });
    setPauseIcon();
  }
  function setPauseIcon() {
    pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    pauseBtn.innerHTML = paused
      ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z"/></svg>'
      : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1h2v8H2zM6 1h2v8H6z"/></svg>';
  }
  root.appendChild(nav);

  function loaded(i) {
    var img = slides[i].querySelector('img');
    return !slides[i].hidden && img && img.complete && img.naturalWidth > 0;
  }

  function go(n) {
    if (n === cur) return;
    var prev = cur;
    slides.forEach(function (s) { s.classList.remove('is-leaving'); });
    slides[prev].classList.remove('is-active');
    slides[prev].classList.add('is-leaving'); // stays opaque underneath while the next fades in
    slides[n].classList.add('is-active');
    dots[prev].removeAttribute('aria-current');
    dots[n].setAttribute('aria-current', 'true');
    cur = n;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(function () { slides[prev].classList.remove('is-leaving'); }, FADE + 100);
    if (caption) {
      var text = slides[n].getAttribute('data-caption');
      clearTimeout(capTimer);
      caption.classList.add('is-fading');
      capTimer = setTimeout(function () { caption.textContent = text; caption.classList.remove('is-fading'); }, reduce ? 0 : 350);
    }
  }

  function next() {
    for (var k = 1; k < slides.length; k++) {
      var n = (cur + k) % slides.length;
      if (loaded(n)) { go(n); break; } // skip photos that haven't arrived yet
    }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (paused || reduce || document.hidden || !inView) return;
    timer = setTimeout(next, INTERVAL);
  }

  // Un-hide the extra slides only after the page (and hero photo) has loaded,
  // so their lazy images never compete with first paint.
  function reveal() {
    if (revealed) return;
    revealed = true;
    slides.forEach(function (s) { s.hidden = false; });
  }
  if (document.readyState === 'complete') reveal();
  else window.addEventListener('load', reveal);

  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      schedule();
    }).observe(root);
  }

  // Start the slow zoom on the first photo, then the timer
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-live'); });
  });
  schedule();
})();
