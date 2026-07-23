// Renders the page from data.json. To update the site, edit data.json — not this file.
(function () {
  const app = document.getElementById("app");
  const nav = document.getElementById("nav");

  fetch("data.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Could not load data.json (HTTP " + res.status + ")");
      return res.json();
    })
    .then(render)
    .catch((err) => {
      app.innerHTML =
        '<p class="error">Failed to load <code>data.json</code>: ' +
        escapeHtml(err.message) +
        "<br><br>If you are opening this file directly (file://), run a local server instead, e.g. <code>python3 -m http.server</code>, then visit <code>http://localhost:8000</code>.</p>";
    });

  function render(data) {
    if (data.name) document.title = data.name;
    document.getElementById("year").textContent = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Let data.json's "icons" map override / extend the built-in icon library.
    ICONS = mergeIcons(ICON_PATHS, data.icons);

    renderNav(data);

    const parts = [];

    // ---- Header: photo + intro ----
    parts.push('<header class="intro" id="about">');
    if (data.photo) {
      parts.push(
        '<img class="avatar" src="' +
          attr(data.photo) +
          '" alt="' +
          attr(data.name || "") +
          '" onerror="this.style.display=\'none\'" />'
      );
    }
    parts.push('<div class="intro-text">');
    if (data.name) parts.push("<h1>" + text(data.name) + "</h1>");
    if (data.title) parts.push('<p class="subtitle">' + html(data.title) + "</p>");

    if (Array.isArray(data.links) && data.links.length) {
      parts.push('<p class="links">');
      parts.push(
        data.links
          .filter((l) => l && l.url && l.label)
          .map(
            (l) =>
              '<a href="' +
              attr(l.url) +
              '"' +
              externalAttrs(l.url) +
              ">" +
              iconFor(l.label, l.icon) +
              "<span>" +
              text(l.label) +
              "</span></a>"
          )
          .join('<span class="sep">/</span>')
      );
      parts.push("</p>");
    }
    parts.push("</div></header>");

    // ---- Bio ----
    const bio = toArray(data.bio);
    if (bio.length) {
      parts.push('<section class="bio">');
      bio.forEach((p) => parts.push("<p>" + html(p) + "</p>"));
      parts.push("</section>");
    }

    // ---- Affiliation logos ----
    if (Array.isArray(data.affiliations) && data.affiliations.length) {
      parts.push('<div class="affiliations">');
      data.affiliations
        .filter((a) => a && a.logo)
        .forEach((a) => {
          const inner =
            '<span class="affil-logo"><img src="' +
            attr(a.logo) +
            '" alt="' +
            attr(a.name || "") +
            '" loading="lazy" onerror="this.parentNode.parentNode.style.display=\'none\'" /></span>' +
            (a.name ? '<span class="affil-name">' + text(a.name) + "</span>" : "") +
            (a.role ? '<span class="affil-role">' + html(a.role) + "</span>" : "") +
            (a.dates ? '<span class="affil-dates">' + text(a.dates) + "</span>" : "");
          parts.push(
            a.url
              ? '<a class="affil" href="' +
                  attr(a.url) +
                  '"' +
                  externalAttrs(a.url) +
                  ' title="' +
                  attr(a.name || "") +
                  '">' +
                  inner +
                  "</a>"
              : '<span class="affil" title="' + attr(a.name || "") + '">' + inner + "</span>"
          );
        });
      parts.push("</div>");
    }

    // ---- News ----
    if (Array.isArray(data.news) && data.news.length) {
      parts.push('<section id="news"><h2>News</h2>');

      // Category filter buttons (from newsCategories, falling back to the
      // distinct categories actually used in the news items).
      let cats = Array.isArray(data.newsCategories) ? data.newsCategories.slice() : [];
      if (!cats.length) {
        data.news.forEach((n) => {
          if (n.category && cats.indexOf(n.category) === -1) cats.push(n.category);
        });
      }
      if (cats.length) {
        parts.push('<div class="news-filters">');
        parts.push('<button type="button" class="news-filter is-active" data-filter="all">All</button>');
        cats.forEach((c) => {
          parts.push(
            '<button type="button" class="news-filter" data-filter="' +
              attr(c) +
              '">' +
              text(c) +
              "</button>"
          );
        });
        parts.push("</div>");
      }

      parts.push('<ul class="news">');
      data.news.forEach((n) => {
        const d = parseNewsDate(n.date || "");
        parts.push(
          '<li data-category="' +
            attr(n.category || "") +
            '"><span class="news-date">' +
            '<span class="news-month">' +
            text(d.month) +
            '</span><span class="news-year">' +
            text(d.year) +
            "</span></span><span class=\"news-text\">" +
            html(n.text || "") +
            "</span></li>"
        );
      });
      parts.push("</ul></section>");
    }

    // ---- Publications ----
    if (Array.isArray(data.publications) && data.publications.length) {
      parts.push('<section id="publications"><h2>Publications</h2><div class="cards">');
      data.publications.forEach((p) => parts.push(card(p, p.venue, data)));
      parts.push("</div></section>");
    }

    // ---- Projects ----
    if (Array.isArray(data.projects) && data.projects.length) {
      parts.push('<section id="projects"><h2>Projects</h2><div class="cards">');
      data.projects.forEach((p) => parts.push(card(p, p.role, data)));
      parts.push("</div></section>");
    }

    // ---- Other Projects ----
    if (Array.isArray(data.otherProjects) && data.otherProjects.length) {
      parts.push('<section id="other-projects"><h2>Other Projects</h2><p class="section-note">🚧 Under construction — more coming soon! 🚧</p><div class="cards">');
      data.otherProjects.forEach((p) => parts.push(card(p, p.role, data)));
      parts.push("</div></section>");
    }

    app.innerHTML = parts.join("");
    setupNewsFilters();
  }

  // A publication/project card. `subline` is the italic line (venue or role).
  function card(p, subline, data) {
    const out = [];
    out.push('<div class="card' + (p.highlight ? " card-highlight" : "") + '">');
    out.push('<div class="card-thumb">');
    if (p.video) {
      out.push(
        '<video src="' +
          attr(p.video) +
          '" autoplay muted loop playsinline ' +
          'onerror="this.parentNode.classList.add(\'noimg\');this.remove()"></video>'
      );
    } else if (p.image) {
      out.push(
        '<img src="' +
          attr(p.image) +
          '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'noimg\');this.remove()" />'
      );
    }
    out.push("</div>");
    out.push('<div class="card-info">');
    out.push('<div class="card-title">' + html(p.title || "") + "</div>");
    if (p.authors) out.push('<div class="card-authors">' + formatAuthors(p.authors, data) + "</div>");
    if (subline) out.push('<div class="card-venue">' + html(subline) + "</div>");
    if (p.description) out.push('<div class="card-desc">' + html(p.description) + "</div>");
    if (Array.isArray(p.links) && p.links.length) {
      out.push('<div class="card-links">');
      out.push(
        p.links
          .filter((l) => l && l.url && l.label)
          .map(
            (l) =>
              "<a href=\"" +
              attr(l.url) +
              '"' +
              externalAttrs(l.url) +
              ">" +
              iconFor(l.label, l.icon) +
              text(l.label) +
              "</a>"
          )
          .join("")
      );
      out.push("</div>");
    }
    out.push("</div></div>");
    return out.join("");
  }

  function renderNav(data) {
    if (!nav || !Array.isArray(data.nav) || !data.nav.length) return;
    nav.innerHTML =
      '<div class="nav-inner">' +
      (data.name ? '<a class="nav-brand" href="#about">' + text(data.name) + "</a>" : "") +
      '<div class="nav-links">' +
      data.nav
        .filter((n) => n && n.label && (n.href || n.url))
        .map((n) => {
          const target = n.href || n.url;
          return '<a href="' + attr(target) + '"' + externalAttrs(target) + ">" + text(n.label) + "</a>";
        })
        .join("") +
      "</div></div>";
    nav.hidden = false;
  }

  // Inline SVG icons for social/header links, matched by label (case-insensitive).
  const ICON_PATHS = {
    email:
      "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    cv: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    scholar:
      "M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",
    github:
      "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    linkedin:
      "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
    twitter:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    youtube:
      "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    threads:
      "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L9.086 8.976c.977-1.45 2.568-2.25 4.483-2.25h.043c3.196.02 5.1 1.978 5.29 5.4.108.046.216.094.324.145 1.52.715 2.633 1.798 3.22 3.13.82 1.86.895 4.888-1.572 7.294-1.888 1.843-4.181 2.673-7.417 2.702z",
    // Card-link icons (paper / code / project page / demo …)
    paper:
      "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    pdf: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    report:
      "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 12H7v-2h8v2zm2-4H7v-2h10v2zm0-4H7V7h10v2z",
    // "code" links are almost always GitHub, so it reuses the GitHub octocat
    // (set below, after this object, to avoid duplicating the long path).
    weights: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    "project page":
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    website:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    demo: "M8 5v14l11-7z",
    video:
      "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z",
    slides:
      "M2 3h20v14H2V3zm2 2v10h16V5H4zm7 13h2v2h4v2H7v-2h4v-2z",
    poster:
      "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7zm0 4h7v2H7z",
    brackets:
      "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    database:
      "M12 3C7.58 3 4 4.34 4 6s3.58 3 8 3 8-1.34 8-3-3.58-3-8-3zM4 8v3c0 1.66 3.58 3 8 3s8-1.34 8-3V8c0 1.66-3.58 3-8 3s-8-1.34-8-3zm0 5v3c0 1.66 3.58 3 8 3s8-1.34 8-3v-3c0 1.66-3.58 3-8 3s-8-1.34-8-3z",
    chart:
      "M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z",
  };
  // "code" links point at repositories, so default to the GitHub logo (matches
  // the header GitHub icon) rather than the generic code-brackets glyph.
  ICON_PATHS.code = ICON_PATHS.github;

  // The active icon map: the built-in library above, with any overrides from
  // data.json's "icons" section merged on top (set in render()).
  let ICONS = ICON_PATHS;

  // Merge a user "icons" map (from data.json) over the built-in library.
  // Keys are lower-cased so they match labels case-insensitively.
  function mergeIcons(base, extra) {
    const out = Object.assign({}, base);
    if (extra && typeof extra === "object") {
      Object.keys(extra).forEach((k) => {
        if (extra[k]) out[String(k).toLowerCase()] = extra[k];
      });
    }
    return out;
  }

  // Pick an icon for a link. A custom `icon` on the link wins; otherwise the
  // label chooses the icon via the (merged) icon map. If nothing matches, no
  // icon is shown.
  function iconFor(label, custom) {
    if (custom) return renderIcon(custom);
    const key = String(label).toLowerCase().replace(/google\s+/, "").trim();
    return ICONS[key] ? renderIcon(ICONS[key]) : "";
  }

  // Turn an icon value into markup. A value can be:
  //   - an image path/URL  ("assets/logos/foo.svg", "https://…/x.png")  -> <img>
  //   - the name of another icon in the map ("github", "pdf", …)        -> that glyph
  //   - raw SVG path data  ("M12 2C…")                                  -> inline <svg>
  function renderIcon(value) {
    const c = String(value).trim();
    if (!c) return "";
    if (/\.(svg|png|jpe?g|gif|webp|ico)$/i.test(c) || /^(https?:)?\/\//.test(c) || c.indexOf("/") !== -1) {
      return (
        '<img class="icon" src="' +
        attr(c) +
        '" alt="" aria-hidden="true" onerror="this.style.display=\'none\'" />'
      );
    }
    // A name refers to a glyph in the built-in library (ICON_PATHS), whose
    // values are always raw SVG paths. We resolve against ICON_PATHS rather
    // than the merged ICONS so that an entry mapping a label to a built-in of
    // the same name (e.g. "report": "report") still finds the real path.
    const named = ICON_PATHS[c.toLowerCase()];
    return svgIcon(named || c);
  }
  function svgIcon(path) {
    return (
      '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="' +
      path +
      '"/></svg>'
    );
  }

  // Format an authors string: bold the site owner's name (data.me) and turn any
  // name listed in data.authorLinks into a link to that person's page. Authors
  // are written as plain text in data.json — no HTML needed. Markers like "*"
  // next to a name are preserved because we only replace the name itself.
  function formatAuthors(str, data) {
    let s = html(str);
    const me = data && data.me ? String(data.me) : "";
    const links = (data && data.authorLinks) || {};

    // Wrap the longest names first so a name that is a substring of another
    // (rare) doesn't get replaced inside the longer one.
    const names = Object.keys(links);
    if (me && names.indexOf(me) === -1) names.push(me);
    names.sort((a, b) => b.length - a.length);

    names.forEach((name) => {
      if (!name) return;
      let piece = text(name);
      const url = links[name];
      if (url) {
        piece = '<a href="' + attr(url) + '"' + externalAttrs(url) + ">" + piece + "</a>";
      }
      if (me && name === me) piece = "<b>" + piece + "</b>";
      s = s.split(name).join(piece);
    });
    return s;
  }

  // Split a date like "Jul 2026" into its month part and 4-digit year so they
  // can be shown in separate columns. Falls back gracefully if there's no year.
  function parseNewsDate(s) {
    const str = String(s);
    const m = str.match(/^(.*?)\s*(\d{4})\s*(.*)$/);
    if (!m) return { month: str, year: "" };
    return { month: (m[1] + " " + m[3]).trim(), year: m[2] };
  }

  // Wire up the News category buttons to show/hide items by category.
  function setupNewsFilters() {
    const filters = Array.prototype.slice.call(app.querySelectorAll(".news-filter"));
    if (!filters.length) return;
    const items = Array.prototype.slice.call(app.querySelectorAll("ul.news li"));
    filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        const f = btn.getAttribute("data-filter");
        filters.forEach((b) => b.classList.toggle("is-active", b === btn));
        items.forEach((li) => {
          const c = li.getAttribute("data-category");
          li.style.display = f === "all" || c === f ? "" : "none";
        });
      });
    });
  }

  // --- helpers ---
  function toArray(v) {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }
  // Escape everything (for plain text like names/labels).
  function text(s) {
    return escapeHtml(String(s));
  }
  // Allow inline HTML authored in data.json (bio, venue, etc.).
  function html(s) {
    return String(s);
  }
  function attr(s) {
    return escapeHtml(String(s)).replace(/"/g, "&quot;");
  }
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function externalAttrs(url) {
    return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : "";
  }
})();
