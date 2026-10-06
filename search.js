/* Korean Women History Project — site search (search.html only).
   Searches the oral histories, every passage of their transcripts, and each
   photograph, document, video, and reading on Source Material. It reads those
   pages as they are published, so a new interview or archive item is
   searchable as soon as it is on the site, with nothing else to update.
   Needs script.js loaded first (KWMBQuery, KWMBItemId, KWMBThumbs, KWMBVideo). */
(function () {
  var form = document.getElementById('site-search');
  if (!form) return;

  var input = document.getElementById('q');
  var sectionSelect = document.getElementById('section');
  var status = document.getElementById('search-status');
  var out = document.getElementById('results');
  var hints = document.getElementById('search-hints');

  var TYPES = [
    { key: 'interview', one: 'oral history', many: 'oral histories', label: 'Oral histories' },
    { key: 'photo', one: 'photograph', many: 'photographs', label: 'Photographs' },
    { key: 'doc', one: 'document', many: 'documents', label: 'Documents' },
    { key: 'video', one: 'video', many: 'videos', label: 'Video' },
    { key: 'reading', one: 'reading', many: 'readings', label: 'Reading' }
  ];

  // How many matching passages an interview shows before linking onward.
  var PASSAGES_SHOWN = 3;

  var index = null;

  // ---------------------------------------------------------------- Loading

  function getText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' returned ' + r.status);
      return r.text();
    });
  }

  function getDoc(url) {
    return getText(url).then(function (html) {
      return new DOMParser().parseFromString(html, 'text/html');
    });
  }

  function text(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function loadArchive() {
    return getDoc('archive.html').then(function (doc) {
      var sections = [];
      var items = [];

      Array.prototype.forEach.call(doc.querySelectorAll('.archive-section'), function (sec) {
        var section = { id: sec.id, name: text(sec.querySelector('h2')) };
        sections.push(section);

        Array.prototype.forEach.call(sec.querySelectorAll('.item'), function (fig) {
          // Documents are the pages styled as documents or charts, plus anything
          // titled with a headline in quotation marks (newspaper and magazine
          // pieces) and the brochures. The rest are photographs.
          var title = text(fig.querySelector('figcaption strong'));
          var kind = fig.querySelector('[data-youtube]') ? 'video'
            : fig.classList.contains('item-doc') || fig.classList.contains('item-fit') ||
              /^[“"]/.test(title) || /brochure/i.test(title) ? 'doc'
            : 'photo';
          var img = fig.querySelector('img');
          items.push({
            kind: kind,
            section: section,
            node: fig,
            id: KWMBItemId(fig),
            text: text(fig) + ' ' + (img ? img.alt : '') + ' ' + section.name
          });
        });

        Array.prototype.forEach.call(sec.querySelectorAll('.doc-list > li'), function (li) {
          var heading = li.parentNode.previousElementSibling;
          var group = heading && heading.tagName === 'H3' ? text(heading) : '';
          items.push({
            kind: 'reading',
            section: section,
            group: group,
            node: li,
            text: text(li) + ' ' + group
          });
        });
      });

      return { sections: sections, items: items };
    });
  }

  // A transcript file sets window.KWMB_TRANSCRIPT; run it against a stand-in
  // window so loading several does not disturb this page.
  function loadTranscript(url) {
    return getText(url).then(function (js) {
      var sandbox = {};
      new Function('window', js)(sandbox);
      return sandbox.KWMB_TRANSCRIPT || null;
    });
  }

  function loadInterviews() {
    return getDoc('oral-histories.html').then(function (doc) {
      var cards = Array.prototype.slice.call(doc.querySelectorAll('.interview-card'));

      return Promise.all(cards.map(function (card) {
        var href = card.getAttribute('href');
        var media = card.querySelector('.card-media');
        var interview = {
          href: href,
          title: text(card.querySelector('.quote')),
          quote: text(card.querySelector('.card-quote')),
          youtube: media && media.getAttribute('data-youtube'),
          cover: media && media.getAttribute('data-cover'),
          meta: '',
          summary: '',
          about: '',
          cues: [],
          lang: null
        };
        interview.about = interview.title + ' ' + interview.quote;

        return getDoc(href).then(function (page) {
          interview.meta = text(page.querySelector('.interview-meta'));
          interview.summary = text(page.querySelector('.interview-summary'));
          var background = '';
          Array.prototype.forEach.call(page.querySelectorAll('.prose'), function (sec) {
            if (text(sec.querySelector('h2')) === 'Background') background = text(sec);
          });
          interview.about += ' ' + interview.meta + ' ' + interview.summary + ' ' + background;

          var script = page.querySelector('script[src^="data/"]');
          if (!script) return interview;
          var dir = href.replace(/[^\/]*$/, '');
          return loadTranscript(dir + script.getAttribute('src')).then(function (data) {
            if (data && data.cues) {
              interview.cues = data.cues;
              interview.lang = data.lang || null;
            }
            return interview;
          });
        }).catch(function () {
          // One page failing should not take the rest of search down with it.
          return interview;
        });
      }));
    });
  }

  // -------------------------------------------------------------- Rendering

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  function stamp(t) {
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Wrap every match of the pattern inside node's text in <mark>.
  function highlight(node, re) {
    if (!re) return;
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    var found = [];
    while (walker.nextNode()) found.push(walker.currentNode);

    found.forEach(function (textNode) {
      var value = textNode.nodeValue;
      re.lastIndex = 0;
      if (!re.test(value)) return;
      re.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var last = 0;
      value.replace(re, function (match, offset) {
        if (offset > last) frag.appendChild(document.createTextNode(value.slice(last, offset)));
        frag.appendChild(el('mark', null, match));
        last = offset + match.length;
        return match;
      });
      if (last < value.length) frag.appendChild(document.createTextNode(value.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  // A window of the text around its first match, cut at word breaks.
  function excerpt(value, re, size) {
    size = size || 240;
    if (value.length <= size) return value;
    var at = 0;
    if (re) {
      re.lastIndex = 0;
      var m = re.exec(value);
      if (m) at = m.index;
    }
    var start = Math.max(0, at - Math.round(size / 3));
    var end = Math.min(value.length, start + size);
    start = Math.max(0, end - size);
    if (start > 0) {
      var space = value.indexOf(' ', start);
      if (space > -1 && space < at) start = space + 1;
    }
    if (end < value.length) {
      var back = value.lastIndexOf(' ', end);
      if (back > at) end = back;
    }
    return (start > 0 ? '…' : '') + value.slice(start, end) + (end < value.length ? '…' : '');
  }

  function hasMatch(value, re) {
    if (!re || !value) return false;
    re.lastIndex = 0;
    return re.test(value);
  }

  function renderInterviews(list, terms, re, q) {
    var wrap = el('div', 'result-list');

    list.forEach(function (hit) {
      var iv = hit.interview;
      var card = el('article', 'result-interview');

      var cover = el('a', 'result-cover card-media');
      cover.href = iv.href;
      cover.setAttribute('aria-hidden', 'true');
      cover.tabIndex = -1;
      if (iv.cover) cover.setAttribute('data-cover', iv.cover);
      if (iv.youtube) cover.setAttribute('data-youtube', iv.youtube);
      card.appendChild(cover);

      var body = el('div', 'result-body');
      var h = el('h3', 'result-title');
      var link = el('a', null, iv.title);
      link.href = iv.href;
      h.appendChild(link);
      body.appendChild(h);
      if (iv.meta) body.appendChild(el('span', 'meta', iv.meta));

      // Lead with the summary when that is where the words are, otherwise
      // with the card's quote.
      if (!hit.passages.length || hasMatch(iv.summary, re)) {
        var summary = el('p', 'result-summary', excerpt(iv.summary, re, 300));
        highlight(summary, re);
        body.appendChild(summary);
      } else if (iv.quote) {
        body.appendChild(el('p', 'card-quote', iv.quote));
      }

      if (hit.passages.length) {
        var ol = el('ol', 'result-passages');
        hit.passages.slice(0, PASSAGES_SHOWN).forEach(function (cue) {
          var li = el('li');
          var a = el('a');
          a.href = iv.href + '#t=' + cue.t;
          a.appendChild(el('span', 'cue-time', stamp(cue.t)));
          if (cue.speaker) {
            a.appendChild(el('span', 'cue-speaker' + (cue.speaker === 'Interviewer' ? ' is-interviewer' : ''), cue.speaker));
          }
          // Show the language the words were found in; English if both.
          var useOriginal = cue.original && !hasMatch(cue.text, re) && hasMatch(cue.original, re);
          var words = el('span', 'result-words', excerpt(useOriginal ? cue.original : cue.text, re));
          if (useOriginal) words.lang = iv.lang || 'ko';
          highlight(words, re);
          a.appendChild(words);
          li.appendChild(a);
          ol.appendChild(li);
        });
        body.appendChild(ol);

        var more = el('a', 'result-more');
        more.href = iv.href + '?q=' + encodeURIComponent(q) + '#transcript-section';
        more.textContent = hit.passages.length > PASSAGES_SHOWN
          ? 'All ' + hit.passages.length + ' matching passages in the transcript'
          : 'Open the transcript';
        body.appendChild(more);
      }

      card.appendChild(body);
      wrap.appendChild(card);
    });

    KWMBThumbs(wrap);
    return wrap;
  }

  function contextLink(item) {
    var a = el('a', 'result-context', 'See it in Source Material: ' + item.section.name);
    a.href = 'archive.html#' + (item.id || item.section.id);
    return a;
  }

  function renderItems(list, re, wide) {
    var gallery = el('div', 'gallery' + (wide ? ' gallery-wide' : ''));

    list.forEach(function (item) {
      var fig = document.importNode(item.node, true);
      fig.removeAttribute('id');
      fig.classList.remove('is-target');
      var caption = fig.querySelector('figcaption');
      highlight(caption, re);
      if (caption) caption.appendChild(contextLink(item));

      var frame = fig.querySelector('.video-frame');
      var play = frame && frame.querySelector('.video-play');
      if (play) play.addEventListener('click', function () { KWMBVideo.play(frame); });

      gallery.appendChild(fig);
    });

    KWMBThumbs(gallery);
    return gallery;
  }

  function renderReading(list, re) {
    var ul = el('ul', 'doc-list');
    list.forEach(function (item) {
      var li = document.importNode(item.node, true);
      highlight(li, re);
      if (item.group) li.appendChild(el('span', 'result-group-name', item.group));
      ul.appendChild(li);
    });
    return ul;
  }

  // ---------------------------------------------------------------- Search

  function chosenType() {
    var picked = form.querySelector('input[name="type"]:checked');
    return picked ? picked.value : 'all';
  }

  function setCounts(found) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-count]'), function (span) {
      var key = span.getAttribute('data-count');
      if (!found) { span.textContent = ''; return; }
      var n = key === 'all'
        ? TYPES.reduce(function (sum, t) { return sum + found[t.key].length; }, 0)
        : found[key].length;
      span.textContent = String(n);
    });
  }

  function saveToUrl(q, type, section) {
    var params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type !== 'all') params.set('type', type);
    if (section) params.set('section', section);
    var query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
  }

  function search() {
    var q = input.value.trim();
    var type = chosenType();
    var sectionId = sectionSelect.value;
    saveToUrl(q, type, sectionId);
    if (!index) return;

    var terms = KWMBQuery.parse(q);
    var re = KWMBQuery.pattern(terms);
    var browsing = !terms.length;
    var idle = browsing && type === 'all' && !sectionId;

    hints.hidden = !idle;
    out.textContent = '';
    if (idle) {
      status.textContent = '';
      setCounts(null);
      return;
    }

    var found = { interview: [], photo: [], doc: [], video: [], reading: [] };

    // Interviews are not part of any Source Material section.
    if (!sectionId) {
      index.interviews.forEach(function (iv) {
        var passages = browsing ? [] : iv.cues.filter(function (cue) {
          return KWMBQuery.matches(cue.text + ' ' + (cue.original || ''), terms);
        });
        var about = browsing || KWMBQuery.matches(iv.about, terms);
        if (about || passages.length) found.interview.push({ interview: iv, passages: passages, about: about });
      });
      found.interview.sort(function (a, b) {
        return (b.passages.length + (b.about ? 5 : 0)) - (a.passages.length + (a.about ? 5 : 0));
      });
    }

    index.items.forEach(function (item) {
      if (sectionId && item.section.id !== sectionId) return;
      if (!browsing && !KWMBQuery.matches(item.text, terms)) return;
      found[item.kind].push(item);
    });

    setCounts(found);

    var total = 0;
    TYPES.forEach(function (t) {
      if (type !== 'all' && type !== t.key) return;
      var list = found[t.key];
      if (!list.length) return;
      total += list.length;

      var group = el('section', 'result-group');
      var h = el('h2', null, t.label + ' ');
      h.appendChild(el('span', 'result-count', String(list.length)));
      group.appendChild(h);

      if (t.key === 'interview') group.appendChild(renderInterviews(list, terms, re, q));
      else if (t.key === 'reading') group.appendChild(renderReading(list, re));
      else group.appendChild(renderItems(list, re, t.key === 'video'));
      out.appendChild(group);
    });

    var where = sectionId ? ' in ' + sectionSelect.options[sectionSelect.selectedIndex].text : '';
    // Quote the search in the message, unless it already has quotation marks.
    var said = /["\u201c\u201d]/.test(q) ? q : '\u201C' + q + '\u201D';
    var kind = TYPES.filter(function (t) { return t.key === type; })[0];
    if (!total) {
      status.textContent = browsing
        ? 'Nothing here' + where + '.'
        : 'Nothing matches “' + q + '”' + (kind ? ' in ' + kind.many : '') + where +
          '. Try fewer words, another spelling, or All.';
    } else if (browsing) {
      status.textContent = 'Showing ' + total + ' ' + (kind ? (total === 1 ? kind.one : kind.many) : 'items') + where + '.';
    } else {
      status.textContent = total + (total === 1 ? ' result' : ' results') + ' for “' + q + '”' + where + '.';
    }
  }

  // ---------------------------------------------------------------- Wiring

  var params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  var startType = form.querySelector('input[name="type"][value="' + (params.get('type') || 'all') + '"]');
  if (startType) startType.checked = true;

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(search, 120);
  });
  form.addEventListener('change', function (e) {
    if (e.target !== input) search();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    search();
  });

  Array.prototype.forEach.call(hints.querySelectorAll('button'), function (button) {
    button.addEventListener('click', function () {
      input.value = button.textContent;
      search();
      input.focus();
    });
  });

  status.textContent = 'Loading the archive…';

  Promise.all([loadArchive(), loadInterviews()]).then(function (results) {
    index = { sections: results[0].sections, items: results[0].items, interviews: results[1] };

    index.sections.forEach(function (section) {
      var option = el('option', null, section.name);
      option.value = section.id;
      sectionSelect.appendChild(option);
    });
    sectionSelect.value = params.get('section') || '';

    status.textContent = '';
    search();
  }).catch(function () {
    status.textContent = 'Search could not load the site’s pages. Reload to try again.';
  });
})();
