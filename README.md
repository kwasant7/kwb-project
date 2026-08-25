# Korean War Brides Project

An oral history and archival site. Plain HTML, CSS, and JavaScript — no build step,
no dependencies, no framework.

**Live site:** https://kwasant7.github.io/kwb-project/

## Pages

| File | Page | What goes here |
| --- | --- | --- |
| `index.html` | Home | The landing page and your space to describe the project |
| `oral-histories.html` | Oral Histories | YouTube interviews, one block per narrator |
| `archive.html` | Archive | Photographs, secondary footage, documents |
| `about.html` | About | Origins, method, credits, contact details |

Shared across all four: `styles.css`, `script.js`, and the header/footer markup
inside each page.

## Adding an oral history

In `oral-histories.html`, copy an `<article class="video">` block and change:

1. `data-youtube="VIDEO_ID"` — the ID from the YouTube URL
   (`youtu.be/dQw4w9WgXcQ` → `dQw4w9WgXcQ`)
2. the `<h2>` narrator name
3. the `<p class="meta">` line — date, place, running time
4. the summary paragraph and the tags

Thumbnails load automatically from the video ID, and the player only loads when a
visitor presses play. The search box on that page filters on all the text in each block.

## Adding an archive item

1. Drop the image into `images/`
2. In `archive.html`, copy a `<figure class="item">` block
3. Point `src` at your file, write a real `alt` description, edit the caption and credit

Secondary videos use the same `data-youtube="VIDEO_ID"` pattern as the interviews.

## Changing the look

All colors are CSS variables at the top of `styles.css`, in two blocks — one for the
light theme, one for dark. Edit those and the whole site follows.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying

GitHub Pages serves the `main` branch from the repository root. Push to `main` and the
live site updates within a minute.
