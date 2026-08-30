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

// -- Transcript PDF.
//    Builds a real PDF and hands it over as a download, so the button gives you
//    a file instead of a print dialog. It writes the PDF byte structure itself
//    and uses Helvetica, one of the 14 faces every reader ships with, so there
//    is no font to embed and no library to load.
//    Everything it writes is ASCII, so string length equals byte length and the
//    cross-reference offsets below stay correct. --
var KWMBPdf = (function () {
  // Helvetica advance widths, units per 1000, for ASCII 32..126.
  var WIDTHS = [
    278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
    1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
    333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
    556,556,333,500,278,556,500,722,500,500,500,334,260,334,584
  ];

  var PAGE_W = 612, PAGE_H = 792, MARGIN = 56;      // US Letter, 0.78in margins
  var TEXT_W = PAGE_W - MARGIN * 2;

  // WinAnsiEncoding covers ASCII plus the Latin-1 upper range, so those pass
  // through as single bytes. Smart punctuation sits outside it and is folded
  // down; anything else becomes "?" rather than an unmappable byte.
  function ascii(s) {
    return String(s)
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[\u00A0\u2007\u2009\u202F]/g, ' ')
      .replace(/[^\x20-\x7E\xA1-\xFF]/g, '?');
  }

  // Widths for the few Latin-1 characters this site actually uses.
  var UPPER = { 0xB7: 278, 0xA9: 737, 0xE9: 556, 0xE8: 556, 0xF1: 556, 0xF3: 556 };

  function widthOf(str, size) {
    var total = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 32 && c <= 126) total += WIDTHS[c - 32];
      else total += UPPER[c] || 556;
    }
    return total * size / 1000;
  }

  function escape(s) {
    return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function wrap(text, size, maxWidth) {
    var words = ascii(text).split(/\s+/).filter(Boolean);
    var lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (line && widthOf(next, size) > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function build(doc) {
    var pages = [];
    var ops = null;
    var y = 0;

    function newPage() {
      ops = [];
      pages.push(ops);
      y = PAGE_H - MARGIN;
    }

    function room(needed) {
      if (y - needed < MARGIN + 24) newPage();
    }

    function draw(text, opt) {
      var size = opt.size, lead = opt.lead || size * 1.35;
      var indent = opt.indent || 0;
      var lines = wrap(text, size, TEXT_W - indent);
      for (var i = 0; i < lines.length; i++) {
        room(lead);
        y -= lead;
        ops.push({ f: opt.bold ? 'F2' : 'F1', s: size, x: MARGIN + indent,
                   y: y, t: lines[i], g: opt.gray });
      }
    }

    function gap(n) { y -= n; }

    newPage();

    draw(doc.title, { size: 17, bold: true, lead: 22 });
    gap(6);
    if (doc.meta) draw(doc.meta, { size: 9.5, gray: 0.35 });
    if (doc.summary) { gap(8); draw(doc.summary, { size: 10.5 }); }

    if (doc.notice) {
      gap(14);
      draw(doc.notice, { size: 9, gray: 0.3 });
    }

    gap(20);
    draw('Transcript', { size: 13, bold: true });
    gap(8);

    for (var i = 0; i < doc.cues.length; i++) {
      var cue = doc.cues[i];
      // Keep a stamp from being stranded at the foot of a page.
      room(34);
      gap(6);
      draw(cue.stamp, { size: 8.5, bold: true, gray: 0.35, lead: 12 });
      draw(cue.text, { size: 10.5, lead: 14 });
    }

    return serialise(pages, doc.footer);
  }

  function serialise(pages, footer) {
    var objects = [];   // 1-indexed; objects[0] is object 1

    function add(body) { objects.push(body); return objects.length; }

    var pageIds = [];
    var contentIds = [];
    for (var p = 0; p < pages.length; p++) { pageIds.push(0); contentIds.push(0); }

    var catalogId = add('');           // 1, filled in below
    var pagesId = add('');             // 2
    var fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');       // 3
    var boldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');  // 4

    for (var i = 0; i < pages.length; i++) {
      var stream = '';
      var gray = null;
      for (var j = 0; j < pages[i].length; j++) {
        var op = pages[i][j];
        var g = typeof op.g === 'number' ? op.g : 0;
        if (g !== gray) { stream += g.toFixed(2) + ' g\n'; gray = g; }
        stream += 'BT /' + op.f + ' ' + op.s + ' Tf 1 0 0 1 ' +
                  op.x.toFixed(2) + ' ' + op.y.toFixed(2) + ' Tm (' +
                  escape(op.t) + ') Tj ET\n';
      }
      if (footer) {
        stream += '0.45 g\nBT /F1 7.5 Tf 1 0 0 1 ' + MARGIN + ' ' + (MARGIN - 20) +
                  ' Tm (' + escape(ascii(footer + '  |  page ' + (i + 1) + ' of ' + pages.length)) + ') Tj ET\n';
      }
      contentIds[i] = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream');
      pageIds[i] = add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' +
        PAGE_W + ' ' + PAGE_H + '] /Resources << /Font << /F1 ' + fontId +
        ' 0 R /F2 ' + boldId + ' 0 R >> >> /Contents ' + contentIds[i] + ' 0 R >>');
    }

    objects[catalogId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objects[pagesId - 1] = '<< /Type /Pages /Count ' + pageIds.length + ' /Kids [' +
      pageIds.map(function (id) { return id + ' 0 R'; }).join(' ') + '] >>';

    var out = '%PDF-1.4\n';
    var offsets = [];
    for (var k = 0; k < objects.length; k++) {
      offsets.push(out.length);
      out += (k + 1) + ' 0 obj\n' + objects[k] + '\nendobj\n';
    }

    var xref = out.length;
    out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    for (var m = 0; m < offsets.length; m++) {
      out += ('0000000000' + offsets[m]).slice(-10) + ' 00000 n \n';
    }
    out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + 1 + ' 0 R >>\n' +
           'startxref\n' + xref + '\n%%EOF';

    var bytes = new Uint8Array(out.length);
    for (var n = 0; n < out.length; n++) bytes[n] = out.charCodeAt(n) & 0xFF;
    return bytes;
  }

  return { build: build };
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

  // Build the PDF and hand it straight over as a download. A print dialog
  // cannot be told to save rather than print, so we make the file ourselves.
  if (printButton) {
    printButton.addEventListener('click', function () {
      var heading = document.querySelector('h1');
      var metaLine = document.querySelector('.interview-meta');
      var summary = document.querySelector('.interview-summary');

      function stamp(t) {
        var m = Math.floor(t / 60), s = Math.floor(t % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
      }

      var bytes = KWMBPdf.build({
        title: heading ? heading.textContent : document.title,
        meta: metaLine ? metaLine.textContent.trim() : '',
        summary: summary ? summary.textContent.trim() : '',
        // A PDF travels away from the page, so the caveat has to travel with it.
        notice: data.reviewed === false
          ? 'Auto-generated transcript. Produced by speech recognition and not ' +
            'yet checked against the recording, so it contains errors and should ' +
            'not be quoted as her exact words. The video itself is the record.'
          : '',
        footer: location.host + location.pathname,
        // Always the whole transcript, never just what a search left showing.
        cues: cues.map(function (cue) {
          return { stamp: stamp(cue.t), text: cue.text };
        })
      });

      var name = (location.pathname.split('/').pop() || 'transcript')
        .replace(/\.html?$/, '') + '-transcript.pdf';

      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      var link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
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
