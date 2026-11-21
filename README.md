# District 231 Website Content, Pages, and Widgets

This repository holds editable content, static pages, assets, and JavaScript widgets for the District 231 website and Google Sites. GitHub Pages serves the published files over HTTPS; it does not run server-side code.

## Architecture Overview

- **Content management:** Pages CMS edits JSON data and uploads images and documents to this repository.
- **Static page hosting:** GitHub Actions publishes the website files to GitHub Pages when changes are pushed to `main`.
- **Multiple pages and widgets:** Each standalone page can have its own URL, and shared or page-specific scripts and styles can power features such as team, events, maps, resources, and awards.
- **Google Sites embedding:** A complete hosted page can be embedded in an iframe, or a smaller widget can be embedded with its own HTML container and script snippet.
- **Browser runtime:** Pages and widgets load public JSON and assets from this site. No application server or database is required.

Pages CMS currently defines team, awards, resources, newsletters, and map-pin data. The preview shell has Team, Team 2, News, Awards, and Resources tabs; Events and Map remain placeholders until their pages are migrated.

## Folder Structure

```text
├── .github/
│   └── workflows/
│       └── pages.yml          # Publishes site files to GitHub Pages
├── .pages.yml                 # Pages CMS content forms and media configuration
├── index.html                 # Google Sites-like preview shell with page tabs
├── pages/                     # Additional standalone pages (add as needed)
│   ├── events/index.html      # Example route: /pages/events/
│   ├── map/index.html         # Example route: /pages/map/
├── widgets/                   # Reusable widget HTML, CSS, and JavaScript (add as needed)
├── embed_snippet/
│   ├── team.html              # Team page loaded inside the preview shell
│   ├── news.html              # Newsletters page
│   ├── awards.html            # Awards page loaded inside the preview shell
│   ├── resources.html         # Resources page
│   └── team_snippet.html      # Google Sites iframe snippet for the team page
├── assets/
│   ├── files/                 # Documents and downloadable files
│   └── images/                # Page and widget images
│       ├── awards/
│       └── team/
├── css/                       # Shared and page-specific stylesheets
│   ├── awards.css             # Awards page styles
│   ├── common.css             # Shared embed foundation and hero styles
│   ├── news.css               # Newsletter carousel styles
│   ├── resources.css          # Resources page styles
│   └── team.css               # Team page styles
├── data/
│   ├── awards.json            # Awards data
│   ├── newsletters.json      # Newsletter list data
│   ├── resources.json         # Resource list data
│   ├── map-pins.json          # Configured for future map data (not yet created)
│   └── team.json              # Team directory data
└── js/                        # Shared and page-specific scripts
    ├── awards-loader.js       # Awards cards, details modal, and period status
    ├── markdown.js            # Shared Markdown renderer
    ├── news-loader.js         # Newsletter carousel
    ├── resources-loader.js    # Resources search, categories and dialog
    ├── team-loader.js         # Team directory renderer
    └── utils.js               # Shared URL, fetch, cache, escaping and embed resize helpers
```

The root `index.html` is a test host that imitates a Google Sites page: the top tabs select page content displayed in an iframe. Team, News, Awards, and Resources load their respective files in `embed_snippet/`; Events and Map remain placeholders until their pages are migrated. Add each page under `embed_snippet/` or `pages/`, then register its URL in the tab list. The deployment workflow publishes `embed_snippet/` as well as future `pages/` and `widgets/` folders. Use URLs that work under the project site base path (`/d231-site-content/`).

## Deploying Pages to GitHub Pages

1. In the repository's **Settings > Pages**, set the source to **GitHub Actions**.
2. Commit or merge changes to `main`. The workflow at `.github/workflows/pages.yml` publishes `index.html`, `embed_snippet/`, and the shared `assets/`, `css/`, `data/`, and `js/` folders. It also publishes `pages/` and `widgets/` if those folders exist.
3. After the workflow succeeds, pages are available at the corresponding paths:

   - Preview shell: `https://manlip.github.io/d231-site-content/`
   - Team page: `https://manlip.github.io/d231-site-content/embed_snippet/team.html`
   - News page: `https://manlip.github.io/d231-site-content/embed_snippet/news.html`
   - Awards page: `https://manlip.github.io/d231-site-content/embed_snippet/awards.html`
   - Resources page: `https://manlip.github.io/d231-site-content/embed_snippet/resources.html`
   - Example events page: `https://manlip.github.io/d231-site-content/pages/events/`
   - Example map page: `https://manlip.github.io/d231-site-content/pages/map/`

A page and its required data, styles, scripts, and images must all be included in the published files. Pages CMS changes saved to the repository are published by the same workflow. Public GitHub Pages sites expose their content publicly.

## Using Pages and Widgets in Google Sites

Choose the embed method that matches what you are adding:

### Embed a complete page

In Google Sites, choose **Insert > Embed > By URL** and enter the GitHub Pages URL for the page (for example, the team page URL or the `/pages/events/` URL for an events page). Or choose **By embed code** and use an iframe snippet like [`embed_snippet/team_snippet.html`](embed_snippet/team_snippet.html). Set the frame height to fit the page content.

Each standalone page has its own URL and can be embedded wherever it is needed. The iframe keeps that page's markup, styles, and scripts isolated from the Google Sites document.

### Embed a focused widget

For a compact widget that should sit within a Google Sites embed, provide a snippet containing its HTML container and load its CSS/JavaScript from GitHub Pages. Keep each widget's snippet in `embed_snippet/` and its reusable implementation in `widgets/` (or in the shared `css/` and `js/` folders). Load shared utilities and third-party libraries before the widget script. The widget should initialize only when its container exists.

The current [`team_snippet.html`](embed_snippet/team_snippet.html) uses an iframe to the complete team page. The root preview shell uses the same page-in-an-iframe approach to imitate Google Sites. A direct-script snippet is a different integration: it inserts widget markup into the host embed and loads only the code needed for that widget. Create page- or widget-specific snippets for events, maps, resources, awards, or other features as they are implemented.

The separate [`team2.html`](embed_snippet/team2.html) page and [`team2_snippet.html`](embed_snippet/team2_snippet.html) offer an animated alternative using the same team data. Configure the pause before flipping with `TEAM2_FLIP_DELAY_MS` in `js/team2_interactions.js`.

## Editing Content with Pages CMS

1. Sign in to [Pages CMS](https://app.pagescms.org) and select this repository.
2. Edit **District Team**, **Awards**, or **Resources** using their structured forms. Resource entries include visibility, category, subcategory, title, image, Markdown descriptions, related links, and optional resource type and category icon. Resources are grouped by category and subcategory for display. Award entries support visibility, category, subcategory, period, image, Markdown descriptions, related links, and a PDF attachment. Map pins are configured for future use.
3. Save the changes to the repository. GitHub Actions deploys the updated files from `main`.

Use **Newsletters** in Pages CMS to add issues in newest-first order. Provide a title, optional date, PDF and cover image; hidden issues are not shown. PDF and image files can be uploaded through the form, or their public HTTP(S) URLs can be entered in `data/newsletters.json` as `url` and `image`. Without a PDF, a card is not clickable.

During GitHub Pages deployment, newsletters without a cover get a thumbnail generated from the first page of their repository PDF under `assets/files/`. An explicitly supplied image always takes precedence. Generated images and their references are written only to the deployed site, not back to the repository; local previews show a placeholder unless a cover is supplied. External PDF URLs are not downloaded, and missing, invalid, or unsupported PDFs leave a placeholder with a warning in the deployment logs.

Team photos belong in `assets/images/team/`; award images belong in `assets/images/awards/`. Do not add credentials or private information: this repository and its public Pages site are publicly accessible.

Team, awards, and resources read their own JSON files and use repository-relative paths for uploaded images. Some existing records still include external image URLs; replace them with appropriately sized repository images when available and permitted. The embedded pages also load Montserrat from Google Fonts.

For awards, `period` can contain a date range, a single deadline, or multiple deadlines separated by semicolons. The card is shaded after the latest deadline's local calendar day ends. English month names, ISO dates, and day/month/year dates are supported. If an award has `periodEnd` or `endDate`, that field takes precedence over `period` for the deadline; the displayed period remains unchanged.

The JSON files are snapshots managed in the repository; changes in the legacy spreadsheet do not automatically update them. Each page loads only its own data and styles, plus shared assets. Cached data is shown while the page refreshes; a warning appears if refreshing fails. Browser storage may be unavailable in embedded contexts, in which case pages still fetch normally. Test iframe sizing in Google Sites and set a suitable height if automatic sizing is not supported.
