// Theme toggle — respects the system setting until the user picks one.
(function () {
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  var stored = null;

  try {
    stored = localStorage.getItem('theme');
  } catch (e) {
    // Storage blocked (private mode, etc.) — fall back to system theme.
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

// Demo counter.
(function () {
  var button = document.getElementById('counter');
  var output = document.getElementById('count');
  var clicks = 0;

  button.addEventListener('click', function () {
    clicks += 1;
    output.textContent = String(clicks);
  });
})();

document.getElementById('year').textContent = new Date().getFullYear();
