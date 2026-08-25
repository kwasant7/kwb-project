/* Korean War Brides Project — shared behavior for every page.
   Each block skips itself if the elements it needs are not on the page. */

// -- Mobile menu. --
(function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
})();

// -- YouTube thumbnails.
//    Anything with data-youtube="VIDEO_ID" gets that video's still image as its
//    background, so interview cards need no separate photo uploaded. --
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-youtube]'), function (el) {
    var id = el.getAttribute('data-youtube');
    if (!id || id === 'VIDEO_ID') return;
    el.style.backgroundImage = "url('https://i.ytimg.com/vi/" + id + "/hqdefault.jpg')";
  });
})();

// -- Video players.
//    The player is only loaded once someone presses play, so pages stay fast
//    and no YouTube cookies are set until a visitor asks for the video. --
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.video-frame[data-youtube]'), function (frame) {
    var id = frame.getAttribute('data-youtube');
    var button = frame.querySelector('.video-play');
    if (!id || !button) return;

    button.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = 'Video player';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      frame.innerHTML = '';
      frame.appendChild(iframe);
    });
  });
})();

// -- Oral history search: hides cards whose text does not match. --
(function () {
  var input = document.getElementById('filter');
  var list = document.getElementById('interviews');
  var status = document.getElementById('filter-status');
  if (!input || !list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll('.interview-card'));

  function apply() {
    var query = input.value.trim().toLowerCase();
    var shown = 0;

    cards.forEach(function (card) {
      var match = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
      card.hidden = !match;
      if (match) shown += 1;
    });

    if (!status) return;
    if (!query) {
      status.textContent = '';
    } else if (shown === 0) {
      status.textContent = 'No interviews match \u201C' + input.value.trim() + '\u201D.';
    } else {
      status.textContent = shown + (shown === 1 ? ' interview' : ' interviews') + ' shown.';
    }
  }

  input.addEventListener('input', apply);
  apply();
})();

// -- Footer year. --
(function () {
  var year = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = year;
  });
})();
