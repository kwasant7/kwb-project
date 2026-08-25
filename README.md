# Korean War Brides Project

An oral history and archival site. Plain HTML, CSS, and JavaScript — no build step,
no dependencies, no framework.

**Live site:** https://kwasant7.github.io/kwb-project/

## Pages

| File | Page | What goes here |
| --- | --- | --- |
| `index.html` | Home | The landing page and your space to describe the project |
| `oral-histories.html` | Oral Histories | The index grid — one card per interview |
| `interviews/*.html` | Interview pages | One page per interview; copy `interviews/template.html` |
| `archive.html` | Archive | Photographs, secondary footage, documents |
| `about.html` | About | Origins, method, credits, contact details |

Shared across all four: `styles.css`, `script.js`, and the header/footer markup
inside each page.

## Adding an oral history

Each interview gets its own page, and a card on the index that links to it.

**1. Make the page.** Copy `interviews/template.html` to `interviews/her-name.html` and
work through the spots marked `EDIT`: the headline quote, the narrator/date/place line,
the summary, `data-youtube="VIDEO_ID"`, background, and selected passages. Delete any
section you do not need.

**2. Add the card.** In `oral-histories.html`, copy an `<a class="interview-card">` block
and set its `href` to the page you just made, its `data-youtube` to the same video ID,
the `<h2 class="quote">` to the line you want to lead with, and the `meta` line.

The video ID is the part of the YouTube URL after `v=` — `youtu.be/dQw4w9WgXcQ` →
`dQw4w9WgXcQ`. Card thumbnails are pulled from the video automatically, so there is no
separate image to upload, and the player only loads when a visitor presses play. The
search box filters on everything written in a card.

## Adding an archive item

1. Drop the image into `images/`
2. In `archive.html`, copy a `<figure class="item">` block
3. Point `src` at your file, write a real `alt` description, edit the caption and credit

Secondary videos use the same `data-youtube="VIDEO_ID"` pattern as the interviews.

## Changing the look

All colors are CSS variables in the `:root` block at the top of `styles.css`. Edit
those and the whole site follows. The site is light-only.

Body text uses Google Sans, self-hosted from `fonts/` (`fonts/OFL.txt` has the
license). Headings use a serif system font stack — see `--serif` in `styles.css`
if you want to change that too.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying

GitHub Pages serves the `main` branch from the repository root. Push to `main` and the
live site updates within a minute.
