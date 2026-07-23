# sytwu.github.io

A clean, single-page personal website (inspired by [jonbarron.info](https://jonbarron.info/)).
All content lives in **`data.json`** — edit that file to update the site. You should not
need to touch the HTML/CSS/JS for normal updates.

## Files

| File         | What it is                                                            |
| ------------ | -------------------------------------------------------------------- |
| `data.json`  | **Your content** — nav, links, bio, affiliations, news, pubs, projects |
| `index.html` | Page skeleton (rarely needs editing)                                 |
| `main.js`    | Renders `data.json` into the page                                    |
| `style.css`  | Styling                                                              |
| `assets/`    | Your images: profile photo, logos, thumbnails, CV, etc.              |

## Updating your content

Open `data.json` and edit the fields. A few notes:

- **`bio`, `news[].text`, `title`, `venue`, `description`** accept inline HTML,
  so you can use `<b>bold</b>`, `<a href="...">links</a>`, etc.
- **`name` and link/label text** are shown as plain text.
- Add/remove items in the `nav`, `links`, `affiliations`, `news`, `publications`,
  and `projects` arrays freely.
- Set `"highlight": true` on a publication/project to give it a subtle highlighted background.
- External `http(s)` links open in a new tab automatically.

### Top navigation (`nav`)

Each entry is `{ "label": "...", "href": "#news" }` for an on-page anchor, or
`{ "label": "...", "url": "https://..." }` for an external link (opens in a new tab).
Section anchors available: `#about`, `#news`, `#publications`, `#projects`, `#other-projects`.

### Affiliation logos (`affiliations`)

A row of grayscale logos under your bio (e.g. schools/companies you've been at).
Each entry: `{ "name": "...", "logo": "assets/logos/x.png", "url": "https://..." }`
(`url` optional). Logos turn full-color on hover.

### Publications & projects

`publications`, `projects`, and `otherProjects` (smaller/coursework projects,
shown in their own "Other Projects" section) all share the same card fields.
For each item:

- `image` — a thumbnail (jpg/png/gif).
- `video` — an mp4 that autoplays muted/looped in the thumbnail (takes priority over
  `image`; use this for silent demo clips). A `.gif` can go in `image` instead.
- `venue` (publications) / `role` (projects, otherProjects) — the italic line under the authors.
- `links` — an array of `{ "label": "...", "url": "..." }`. See "Link icons" below
  for how each label gets an icon.

### Authors (`me` / `authorLinks`)

- `"me"` — set to your own name exactly as it appears in `authors` strings; it's
  automatically bolded everywhere it appears.
- `"authorLinks"` — maps an author's exact name to their homepage, turning that
  name into a link in the authors line automatically. No HTML needed in `authors`.

### Link icons (`icons`)

The top-level `"icons"` map controls which icon each link `label` uses (matched
case-sensitively against the label text), so you don't have to touch `main.js`.
Each value can be:

1. a built-in glyph name — `pdf`, `paper`, `report`, `slides`, `code`, `github`,
   `website`, `project page`, `video`, `poster`, `demo`, `weights`, `download`,
   `database`, `chart`, `email`, `cv`, `scholar`, `linkedin`, `twitter`, `x`,
   `youtube`, `threads`, etc.
2. your own image path/URL, e.g. `"assets/logos/foo.svg"`.
3. raw SVG path data.

To override a single link instead of the whole label, add an `"icon"` field to
that link object (same three forms) — it wins over the map. A label with no
entry here and no matching built-in glyph shows no icon.

### Images

Put your images in `assets/`:

- Profile photo → referenced by `"photo"` (default `assets/profile.jpg`)
- Affiliation logos → e.g. `assets/logos/university.png`
- Paper/project thumbnails → each item's `"image"` (or `"video"` for mp4)
- CV → e.g. `assets/cv.pdf`

Missing images/videos fail gracefully (photo is hidden; thumbnail shows a grey box).

## Previewing locally

Because the page loads `data.json` via `fetch`, opening `index.html` directly
(`file://`) won't work in most browsers. Run a tiny local server instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying (GitHub Pages)

This repo is named `sytwu.github.io`, so pushing to the default branch publishes
it at `https://sytwu.github.io/` automatically. Just commit and push:

```bash
git add -A && git commit -m "Update site content" && git push
```
