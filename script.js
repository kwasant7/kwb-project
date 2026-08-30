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

// -- Video player.
//    The player is only built once someone presses play, so pages stay fast and
//    no YouTube cookies are set until a visitor asks for the video.
//    On a page that carries a transcript we mount YouTube's IFrame API player
//    rather than a bare iframe, because the transcript needs to read the
//    playback position and to seek. --
var KWMBVideo = (function () {
  var main = document.querySelector('.video-frame[data-youtube]');
  var synced = !!(window.KWMB_TRANSCRIPT && main);
  var player = null;
  var apiRequested = false;
  var handlers = [];
  var timer = null;

  var ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; ' +
              'gyroscope; picture-in-picture';

  function plainEmbed(frame, id, start) {
    var iframe = document.createElement('iframe');
    var src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    if (start) src += '&start=' + Math.floor(start);
    iframe.src = src;
    iframe.title = 'Video player';
    iframe.allow = ALLOW;
    iframe.allowFullscreen = true;
    frame.innerHTML = '';
    frame.appendChild(iframe);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.video-frame[data-youtube]'), function (frame) {
    var id = frame.getAttribute('data-youtube');
    var button = frame.querySelector('.video-play');
    if (!id || !button) return;

    button.addEventListener('click', function () {
      if (synced && frame === main) mount(0);
      else plainEmbed(frame, id);
    });
  });

  // YouTube calls one global hook when its API finishes loading, so chain onto
  // whatever may already be there rather than overwriting it.
  function loadApi(done) {
    if (window.YT && window.YT.Player) { done(); return; }

    var previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof previous === 'function') previous();
      done();
    };

    if (apiRequested) return;
    apiRequested = true;
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  function mount(start) {
    if (!main) return;

    if (player && player.seekTo) {
      player.seekTo(start || 0, true);
      player.playVideo();
      return;
    }
    if (player) return; // still constructing

    var id = main.getAttribute('data-youtube');
    var host = document.createElement('div');
    main.innerHTML = '';
    main.appendChild(host);

    loadApi(function () {
      player = new YT.Player(host, {
        videoId: id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, rel: 0, start: Math.floor(start || 0) },
        events: { onReady: startTicking }
      });
    });
  }

  function startTicking() {
    if (timer) return;
    timer = setInterval(function () {
      if (!player || !player.getCurrentTime) return;
      var t = player.getCurrentTime();
      if (typeof t !== 'number') return;
      handlers.forEach(function (fn) { fn(t); });
    }, 250);
  }

  return {
    synced: synced,
    seek: function (t) { mount(t); },
    onTime: function (fn) { handlers.push(fn); }
  };
})();

// -- Synced transcript.
//    Renders window.KWMB_TRANSCRIPT, highlights the line being spoken, scrolls
//    to keep up, seeks on click, filters on search, and prints to PDF. --
(function () {
  var data = window.KWMB_TRANSCRIPT;
  var root = document.getElementById('transcript');
  if (!data || !root || !data.cues || !data.cues.length) return;

  var cues = data.cues;
  var follow = document.getElementById('transcript-follow');
  var search = document.getElementById('transcript-search');
  var status = document.getElementById('transcript-status');
  var printButton = document.getElementById('transcript-print');

  function stamp(t) {
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // An uncorrected machine transcript should say so on the page itself.
  if (data.reviewed === false) {
    var notice = document.createElement('p');
    notice.className = 'transcript-notice';
    notice.innerHTML = '<strong>Auto-generated transcript.</strong> Produced by ' +
      'speech recognition and not yet checked against the recording, so it ' +
      'contains errors and should not be quoted as her exact words. The video ' +
      'itself is the record.';
    root.parentNode.insertBefore(notice, root.previousSibling);
  }

  var nodes = cues.map(function (cue) {
    var line = document.createElement('p');
    line.className = 'cue';

    var time = document.createElement('button');
    time.type = 'button';
    time.className = 'cue-time';
    time.textContent = stamp(cue.t);
    time.setAttribute('aria-label', 'Play from ' + stamp(cue.t));
    time.addEventListener('click', function () { KWMBVideo.seek(cue.t); });

    var body = document.createElement('span');
    body.className = 'cue-text';
    body.textContent = cue.text;

    line.appendChild(time);
    line.appendChild(body);
    root.appendChild(line);
    return line;
  });

  // Which cue is playing: the last one that started at or before now.
  function indexAt(t) {
    var lo = 0, hi = cues.length - 1, found = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (cues[mid].t <= t + 0.05) { found = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return found;
  }

  var active = -1;
  KWMBVideo.onTime(function (t) {
    var i = indexAt(t);
    if (i === active) return;
    if (active > -1) nodes[active].classList.remove('is-active');
    active = i;
    if (i < 0) return;
    nodes[i].classList.add('is-active');

    if (follow && follow.checked && !nodes[i].hidden) {
      root.scrollTo({
        top: nodes[i].offsetTop - root.clientHeight / 2 + nodes[i].offsetHeight / 2,
        behavior: 'smooth'
      });
    }
  });

  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      nodes.forEach(function (node, i) {
        var hit = !q || cues[i].text.toLowerCase().indexOf(q) !== -1;
        node.hidden = !hit;
        if (hit) shown += 1;
      });
      if (!status) return;
      status.textContent = !q ? ''
        : shown === 0 ? 'Nothing in the transcript matches \u201C' + search.value.trim() + '\u201D.'
        : shown + (shown === 1 ? ' passage' : ' passages') + ' shown.';
    });
  }

  // The browser's own print dialog offers "Save as PDF"; the print stylesheet
  // lays the page out as a document. That beats shipping a PDF library.
  if (printButton) {
    printButton.addEventListener('click', function () {
      nodes.forEach(function (node) { node.hidden = false; });
      window.print();
    });
  }
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
