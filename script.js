/* Korean War Brides Project — shared behavior for every page.
   Each block skips itself if the elements it needs are not on the page. */

// -- Theme toggle: follows the system setting until the visitor picks one. --
(function () {
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  var stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch (e) {
    // Storage blocked (private browsing) — fall back to the system theme.
  }

  if (stored === 'light' || stored === 'dark') {
    root.setAttribute('data-theme', stored);
  }

  function current() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function render() {
    toggle.textContent = current() === 'dark' ? '☀️' : '🌙';
  }

  toggle.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {
      // Ignore — the toggle still works for this page view.
    }
    render();
  });

  render();
})();

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

// -- YouTube embeds.
//    Each .video-frame carries data-youtube="VIDEO_ID". The thumbnail is shown
//    first and the player is only loaded once someone presses play, so pages
//    with many videos stay fast and set no cookies until asked. --
(function () {
  var frames = document.querySelectorAll('.video-frame[data-youtube]');
  if (!frames.length) return;

  Array.prototype.forEach.call(frames, function (frame) {
    var id = frame.getAttribute('data-youtube');
    if (!id) return;

    frame.style.backgroundImage = "url('https://i.ytimg.com/vi/" + id + "/hqdefault.jpg')";

    var button = frame.querySelector('.video-play');
    if (!button) return;

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

// -- Oral history search: hides entries whose text does not match. --
(function () {
  var input = document.getElementById('filter');
  var list = document.getElementById('videos');
  var status = document.getElementById('filter-status');
  if (!input || !list) return;

  var entries = Array.prototype.slice.call(list.querySelectorAll('.video'));

  function apply() {
    var query = input.value.trim().toLowerCase();
    var shown = 0;

    entries.forEach(function (entry) {
      var match = !query || entry.textContent.toLowerCase().indexOf(query) !== -1;
      entry.hidden = !match;
      if (match) shown += 1;
    });

    if (!status) return;
    if (!query) {
      status.textContent = '';
    } else if (shown === 0) {
      status.textContent = 'No interviews match “' + input.value.trim() + '”.';
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
