// Thrive Outdoor Solutions: quote form -> prefilled email (no backend needed)
(function () {
  var EMAIL = 'thriveoutdoorsolutions@gmail.com';
  var PHONE = '0492300404';

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  var form = document.getElementById('quote-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var v = function (n) { return (form.elements[n].value || '').trim(); };
    var service = v('service');
    var suburb = v('suburb');
    var subject = 'Quote request: ' + service + (suburb ? ' (' + suburb + ')' : '');
    var body = [
      'Hi Thrive Outdoor Solutions,',
      '',
      "I'd like a free quote.",
      '',
      'Name: ' + v('name'),
      'Phone: ' + v('phone'),
      'Email: ' + v('email'),
      'Suburb: ' + suburb,
      'Service: ' + service,
      '',
      'Message:',
      v('message'),
    ].join('\r\n');
    window.location.href = 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    var note = document.getElementById('form-note');
    if (note) {
      note.innerHTML = 'Your email app should open with the details filled in. Nothing happened? Email <a href="mailto:' +
        EMAIL + '">' + EMAIL + '</a> or call/text <a href="tel:' + PHONE + '">0492 300 404</a>.';
    }
  });

  // Prefill an SMS with a short greeting
  var sms = document.getElementById('sms-link');
  if (sms) {
    var sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
    sms.href = 'sms:' + PHONE + sep + 'body=' + encodeURIComponent("Hi, I'd like a quote for some gardening.");
  }
})();
