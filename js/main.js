// Thrive Outdoor Solutions: quote form -> sent to the business inbox via FormSubmit
(function () {
  var EMAIL = 'thriveoutdoorsolutions@gmail.com';
  var PHONE = '0492300404';

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  var form = document.getElementById('quote-form');
  if (!form) return;

  var ENDPOINT = 'https://formsubmit.co/ajax/' + EMAIL;
  var note = document.getElementById('form-note');
  var btn = form.querySelector('button[type="submit"], button:not([type])');
  var fallback = 'Email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> or call/text <a href="tel:' + PHONE + '">0492 300 404</a>.';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var v = function (n) { return (form.elements[n] && form.elements[n].value || '').trim(); };
    if (v('_honey')) return; // bot trap
    if (!v('phone') && !v('email')) {
      if (note) note.innerHTML = 'Please add a phone number or email so I can get back to you.';
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
        if (note) note.innerHTML = '<strong>Thanks, your request has been sent!</strong> I\'ll be in touch soon. Need me sooner? Call or text <a href="tel:' + PHONE + '">0492 300 404</a>.';
      })
      .catch(function () {
        if (note) note.innerHTML = 'Sorry, that didn\'t send. ' + fallback;
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
