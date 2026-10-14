// Thrive Outdoor Solutions: quote form -> sent to the business inbox via FormSubmit
(function () {
  var EMAIL = 'thriveoutdoorsolutions@gmail.com';
  var PHONE = '0492300404';

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Always open at the top: drop any #section left in the URL and don't restore old scroll position
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // v15: arriving from another page with a #section (e.g. /tldr/ -> /#services) still lands on that section
  var hashT = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  if (hashT) window.addEventListener('load', function () {
    setTimeout(function () {
      var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (window.thriveScrollTo && !rm) window.thriveScrollTo(hashT); else hashT.scrollIntoView({ block: 'start' });
    }, 120);
  });
  window.addEventListener('pageshow', function (e) { if (!e.persisted) window.scrollTo(0, 0); });

  // In-page links scroll smoothly without adding #section to the URL
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var t = id ? document.getElementById(id) : null;
    if (!t) return;
    e.preventDefault();
    var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.thriveScrollTo && !rm) window.thriveScrollTo(t); /* v10 eased scroll */
    else t.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' });
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
    if (window.thriveScrollTo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.thriveScrollTo(note, 'center'); /* v10 */
    else note.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; btn.classList.add('is-loading'); /* v10 spinner hook */ }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.j.success) !== 'true') throw new Error(res.j.message || 'failed');
        if (window.thriveSoftReset) window.thriveSoftReset(form); else form.reset(); /* v10: fade, then reset */
        show('<strong>✓ Thanks, your request has been sent!</strong> I\'ll be in touch soon. Need me sooner? Call or text <a href="tel:' + PHONE + '">0492 300 404</a>.', 'success');
        if (btn) { btn.dataset.label = 'Sent ✓'; btn.classList.add('is-sent'); }
      })
      .catch(function () {
        show('Sorry, that didn\'t send. ' + fallback, 'error');
      })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Send quote request'; btn.classList.remove('is-loading'); /* v10 */ }
      });
  });

  // Prefill an SMS with a short greeting
  var sms = document.getElementById('sms-link');
  if (sms) {
    var sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
    sms.href = 'sms:' + PHONE + sep + 'body=' + encodeURIComponent("Hi, I'd like a quote for some gardening.");
  }
})();

// Variant B living background (v12, perf pass v13). One fixed photo layer sits behind the whole page;
// the six photos dissolve one into the next across the full page scroll (slow scroll = slow dissolve,
// scrolling back reverses). Earlier photos stay opaque underneath, so there is never a dark dip.
// v13: a blurred placeholder covers the first photo until it has decoded, then dissolves (no rough pop-in); the other
// photos are only un-hidden (so their lazy <img> starts loading) after the first is showing, one or two
// ahead of the scroll position; will-change only on the pair being crossfaded; opacity only, no zoom.
(function () {
  var root = document.querySelector('.slideshow');
  if (!root) return;
  var slides = [].slice.call(root.querySelectorAll('.slide')), N = slides.length;
  var imgs = slides.map(function (s) { return s.querySelector('img'); });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var de = document.documentElement;

  // 1. First photo: drop the placeholder once the photo is fully decoded (CSS skips the fade under reduced motion)
  var first = imgs[0], firstShown = false, loaded = document.readyState === 'complete', after = [];
  function shown() { if (firstShown) return; firstShown = true; root.querySelector('.slides').classList.add('is-in'); setTimeout(go, reduce ? 0 : 550); }
  function go() { while (after.length) after.shift()(); }
  function whenReady(fn) { if (firstShown && loaded) fn(); else after.push(fn); }
  if (first) {
    var dec = function () { (first.decode ? first.decode() : Promise.resolve()).then(shown, shown); };
    if (first.complete && first.naturalWidth) dec(); else { first.addEventListener('load', dec); first.addEventListener('error', shown); }
  }
  window.addEventListener('load', function () { loaded = true; if (firstShown) go(); });

  if (reduce || N < 2) return; // static first photo behind the hero

  var max = 1, vh = 1, ticking = false, last = [], wc = [], ready = false;
  function measure() { vh = window.innerHeight; max = Math.max(1, de.scrollHeight - vh); }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function frame() {
    ticking = false;
    var y = window.scrollY, s = clamp(y / max) * (N - 1), top = 0, k = Math.floor(s);
    // un-hide (= start loading) each photo about half a photo-length before its dissolve begins
    if (ready) for (var h = 1; h < N && h <= Math.floor(s + 1.3); h++) if (slides[h].hidden) slides[h].hidden = false;
    for (var i = 1; i < N; i++) {
      var o = clamp((s - (i - 1) - 0.2) / 0.6); // hold each photo a little, then dissolve
      o = o * o * (3 - 2 * o);                  // smoothstep
      if (o !== last[i]) { slides[i].style.opacity = o; last[i] = o; }
      if (o === 1 && imgs[i].complete && imgs[i].naturalWidth) top = i;
    }
    for (var j = 0; j < N; j++) {
      var v = j < top ? 'hidden' : '', w = (j === k || j === k + 1) && j > 0 ? 'opacity' : 'auto';
      if (slides[j].style.visibility !== v) slides[j].style.visibility = v;
      if (wc[j] !== w) { slides[j].style.willChange = w; wc[j] = w; }
    }
    root.style.setProperty('--dim', clamp(y / (vh * 0.9)).toFixed(3));
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  imgs.forEach(function (img) { img.addEventListener('load', onScroll); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  whenReady(function () {
    measure(); ready = true;
    var next = function () { if (slides[1].hidden) slides[1].hidden = false; onScroll(); };
    if (window.requestIdleCallback) requestIdleCallback(next, { timeout: 1500 }); else setTimeout(next, 200);
  });
  measure();
  frame();
})();

/* ==== v10 UI motion & polish (progressive enhancement, no libraries) ====
   Reveals, header frost, nav scrollspy, live field ticks.
   No JS / reduced motion = page exactly as before. Hook above: is-loading. */
(function () {
  var d = document, w = window, de = d.documentElement;
  de.classList.add('js');
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (sel, fn) { [].forEach.call(d.querySelectorAll(sel), fn); };

  // 1. Scroll reveal, once each; only below-the-fold elements are hidden; batches stagger 70ms
  if (!reduce && 'IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; })
        .forEach(function (e, i) {
          var el = e.target, t = Math.min(i, 6) * 70;
          io.unobserve(el);
          el.style.setProperty('--rv-d', t + 'ms');
          el.classList.add('rv-in');
          setTimeout(function () { el.classList.remove('rv', 'rv-in'); el.style.removeProperty('--rv-d'); }, t + 800);
        });
    }, { threshold: 0.12 });
    var vh = w.innerHeight;
    each('.tldr-head > *, .post, .section-head > *, .care > div > *, .service, .review, .reviews-actions, .contact-info > :not(ol):not(ul), .steps li, .direct li, .form, .footer-inner > *', function (el) {
      if (el.getBoundingClientRect().top < vh) return;
      el.classList.add('rv');
      io.observe(el);
    });
  }

  // 2. Header frost + scrollspy: one rAF-throttled passive listener
  var header = d.querySelector('.site-header');
  var nav = d.querySelector('.nav'), links = nav ? [].slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
  var secs = links.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); });
  var ink = null, active = null, headH = 64, ticking = false;
  if (links.length) {
    ink = nav.appendChild(d.createElement('span'));
    ink.className = 'nav-ink';
    ink.setAttribute('aria-hidden', 'true');
  }
  function measure() {
    if (header) headH = header.offsetHeight;
  }
  function spy() {
    var line = headH + w.innerHeight * 0.3, cur = null;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) cur = links[i]; });
    if (w.innerHeight + w.scrollY >= de.scrollHeight - 2) cur = links[links.length - 1];
    if (cur === active) return;
    if (active) { active.classList.remove('is-active'); active.removeAttribute('aria-current'); }
    active = cur;
    nav.classList.toggle('has-active', !!cur);
    if (!cur) return;
    cur.classList.add('is-active');
    cur.setAttribute('aria-current', 'location');
    ink.style.width = cur.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + cur.offsetLeft + 'px)';
  }
  function frame() {
    ticking = false;
    var y = w.scrollY;
    if (header) { header.classList.toggle('is-scrolled', y > 10); header.classList.toggle('is-far', y > w.innerHeight * 0.6); }
    if (ink) spy();
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', function () { measure(); active = null; onScroll(); }, { passive: true });
  w.addEventListener('load', measure);
  measure();
  frame();

  // 3. Live fields: tick when valid; invalid only after blur + non-empty. Visual only.
  var form = d.getElementById('quote-form');
  if (form) {
    var ok = function (el) {
      var v = el.value.trim();
      if (!v) return false;
      if (el.type === 'tel') return v.replace(/\D/g, '').length >= 8;
      return el.validity.valid;
    };
    var check = function (el, blur) {
      var f = el.parentNode, v = ok(el);
      f.classList.toggle('is-valid', v);
      if (blur || f.classList.contains('is-invalid')) f.classList.toggle('is-invalid', !v && !!el.value.trim());
    };
    [].forEach.call(form.querySelectorAll('.field input'), function (el) {
      el.addEventListener('input', function () { check(el); });
      el.addEventListener('blur', function () { check(el, 1); });
    });
    form.addEventListener('reset', function () {
      setTimeout(function () { each('#quote-form .field', function (f) { f.classList.remove('is-valid', 'is-invalid'); }); });
    });
  }

  // 4. Eased in-page scroll (native smooth scroll covers long jumps in ~300ms, which reads as a jump).
  //    Used by the anchor + form-note code above; cancelled by wheel/touch/keys.
  var run = 0;
  ['wheel', 'touchstart', 'keydown'].forEach(function (t) { w.addEventListener(t, function () { run++; }, { passive: true }); });
  w.thriveScrollTo = function (el, block) {
    var r = el.getBoundingClientRect(), from = w.scrollY;
    var to = block === 'center' ? from + r.top - (w.innerHeight - r.height) / 2 : from + r.top - (parseFloat(getComputedStyle(de).scrollPaddingTop) || 0);
    to = Math.max(0, Math.min(to, de.scrollHeight - w.innerHeight));
    var dist = to - from, dur = Math.min(1100, 400 + Math.abs(dist) * 0.2), t0 = 0, id = ++run;
    de.style.scrollBehavior = 'auto';
    requestAnimationFrame(function f(t) {
      if (id !== run) { de.style.scrollBehavior = ''; return; }
      t0 = t0 || t;
      var k = Math.min(1, (t - t0) / dur);
      w.scrollTo(0, from + dist * (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2));
      if (k < 1) requestAnimationFrame(f); else de.style.scrollBehavior = '';
    });
  };

  // 5. Soft reset after a successful send: fade the values out, then reset at the same size
  w.thriveSoftReset = function (f) {
    f.classList.add('is-clearing');
    setTimeout(function () {
      var ta = f.querySelector('textarea');
      if (ta) ta.style.height = ta.offsetHeight + 'px';
      f.reset();
      setTimeout(function () { f.classList.remove('is-clearing'); }, 60);
    }, reduce ? 0 : 1200);
  };

  // 6. Form note grows smoothly (success/error text is taller) instead of jumping the footer
  var note = d.getElementById('form-note');
  if (note && !reduce && w.MutationObserver) {
    var nh = note.offsetHeight;
    new MutationObserver(function () {
      var h1 = note.offsetHeight;
      if (Math.abs(h1 - nh) < 2) return;
      note.style.cssText = 'height:' + nh + 'px;overflow:hidden';
      note.offsetHeight; // reflow
      note.style.transition = 'height .45s cubic-bezier(.2,.8,.2,1)';
      note.style.height = h1 + 'px';
      nh = h1;
      setTimeout(function () { note.style.cssText = ''; }, 500);
    }).observe(note, { childList: true, subtree: true, characterData: true });
  }

  // Lets :active feedback fire on cards for iOS touch
  d.addEventListener('touchstart', function () {}, { passive: true });
})();

/* ==== v15 TLDR; feed: living background ====
   Two fixed <img> layers only. The post nearest the viewport centre picks the photo (its data-bg);
   a post without one falls back to Kewin's job photos, looping. Images are only fetched when a post
   comes near (IntersectionObserver), the layer swaps once decoded, and only opacity animates.
   Reduced motion: one static photo. No JS: no layer at all (plain dark page, cards keep their photos). */
(function () {
  var bg = document.querySelector('.tldr-bg');
  if (!bg) return;
  var w = window, posts = [].slice.call(document.querySelectorAll('.post'));
  if (!posts.length) return;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = Math.min(screen.width, w.innerWidth) * (w.devicePixelRatio || 1) <= 1000 && w.innerWidth < 900;
  var fall = (bg.getAttribute('data-fallback') || '').split(/\s+/).filter(Boolean), fi = 0;
  var srcs = posts.map(function (p) {
    var s = p.getAttribute(small ? 'data-bg-sm' : 'data-bg') || p.getAttribute('data-bg');
    return s || (fall.length ? fall[fi++ % fall.length] : null);
  });
  var layers = [bg.appendChild(new Image()), bg.appendChild(new Image())], cur = 0, shown = null, want = null;
  layers.forEach(function (im) { im.alt = ''; im.decoding = 'async'; im.setAttribute('aria-hidden', 'true'); });
  var cache = {};
  function warm(src) { if (src && !cache[src]) { var i = new Image(); i.decoding = 'async'; i.src = src; cache[src] = i; } return cache[src]; }
  function show(src) {
    if (!src || src === want) return;
    want = src;
    var im = warm(src);
    (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(function () {
      if (want !== src) return;
      var next = layers[1 - cur];
      next.src = src;
      next.classList.add('on'); layers[cur].classList.remove('on');
      cur = 1 - cur; shown = src;
    });
  }
  show(srcs[0]);
  if (reduce) return;
  if ('IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { warm(srcs[posts.indexOf(e.target)]); io.unobserve(e.target); } });
    }, { rootMargin: '100% 0px' });
    posts.forEach(function (p) { io.observe(p); });
  } else srcs.forEach(warm);
  var ticking = false;
  function frame() {
    ticking = false;
    var mid = w.innerHeight / 2, best = 0, bd = Infinity;
    for (var i = 0; i < posts.length; i++) {
      var r = posts[i].getBoundingClientRect();
      var d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
      if (d < bd) { bd = d; best = i; }
      if (r.top > mid) break;
    }
    show(srcs[best]);
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
})();
