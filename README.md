# d231-site-content

# Website Content, Assets & Scripts

This repository stores all editable content, transparent images, PDFs, stylesheets, and custom JavaScript widgets for our **Google Sites** frontend.

## Architecture Overview

To keep the Google Site fast, secure, and easy to edit without database maintenance:
* **Content Editing (Pages CMS):** Non-technical editors update text (in Markdown), team bios, awards, and images via [Pages CMS](https://pagescms.org).
* **Live JSON Data (`://githubusercontent.com`):** Frequently edited JSON files in `/data/` are loaded directly from GitHub Raw so updates appear on the site within seconds.
* **Static Assets & Code (`cdn.jsdelivr.net`):** Transparent PNGs, PDFs, CSS, and JS files are served through the jsDelivr global CDN for instant loading and preserved image transparency.
* **Google Calendar Proxy:** Calendar events are fetched via a cached Google Apps Script endpoint to keep API keys hidden.

---

## Folder Structure

```text
├── .pages.yml               # Pages CMS form & media configuration
├── README.md                # Setup guide and Google Sites embed snippets
├── data/                    # Editable JSON data (loaded via ://githubusercontent.com)
│   ├── content.json         # Main site text, Markdown blocks, team, and awards
│   └── map-pins.json        # Coordinates and labels for Leaflet.js maps
├── assets/                  # Static media (loaded via cdn.jsdelivr.net)
│   ├── images/              # General PNGs, SVGs, logos, and map markers
│   │   ├── team/            # Team member photos
│   │   └── awards/          # Award badges and transparent logos
│   └── files/               # Downloadable PDFs and brochures (max 20 MB per file)
├── css/                     # Global stylesheets (loaded via cdn.jsdelivr.net)
│   └── main.css
└── js/                      # Modular frontend scripts (loaded via cdn.jsdelivr.net)
    ├── utils.js             # Shared fetch + localStorage caching helper
    ├── content-loader.js    # Renders Markdown content, team, and awards
    ├── map-loader.js        # Initializes OpenStreetMap + Leaflet.js
    └── calendar-loader.js   # Renders events from Google Apps Script feed
```

---

## Editing Content with Pages CMS

1. Go to [app.pagescms.org](https://pagescms.org) and log in with your GitHub account.
2. Select this repository (`YOUR_USERNAME/YOUR_REPO`).
3. Click **Website Content** in the left sidebar to add, edit, or reorder entries.
   * **Markdown Formatting:** Use the rich-text toolbar for bold text, bullet lists, and links. Pages CMS automatically saves clean Markdown inside `data/content.json`.
   * **Image Uploads:** Upload transparent PNGs or WebP files directly in the form fields. Files automatically route to `assets/images/team/` or `assets/images/awards/`.
4. Click **Save** to commit changes. Updates go live on the website within seconds.

---

## Google Sites Embed Snippets

In Google Sites, go to **Insert > Embed > Embed code** and paste the corresponding snippet below.

### 1. Main Content, Team & Awards Page
```html
<link rel="stylesheet" href="https://jsdelivr.net">

<div id="site-app">Loading content...</div>

<script src="https://jsdelivr.net"></script>
<script src="https://jsdelivr.net"></script>
<script src="https://jsdelivr.net"></script>
```

### 2. Interactive Map Page (OpenStreetMap + Leaflet.js)
```html
<link rel="stylesheet" href="https://unpkg.com" />
<link rel="stylesheet" href="https://jsdelivr.net">

<div id="map" style="width: 100%; height: 500px;"></div>

<script src="https://unpkg.com"></script>
<script src="https://jsdelivr.net"></script>
<script src="https://jsdelivr.net"></script>
```

### 3. Google Calendar Events Widget
```html
<link rel="stylesheet" href="https://jsdelivr.net">

<div id="calendar-events">Loading schedule...</div>

<script src="https://jsdelivr.net"></script>
<script src="https://jsdelivr.net"></script>
```

---

## Important Maintenance Rules

* **Keep Repository Public:** Both `://githubusercontent.com` and `cdn.jsdelivr.net` require this repository to remain **Public**. Never commit private API keys or passwords here.
* **File Size Limit:** Keep individual PDFs and images under **20 MB** so jsDelivr serves them reliably.
* **Updating CSS or JS Files:** jsDelivr caches `@main` links for up to 12–24 hours. When you edit a `.css` or `.js` file, clear the CDN cache immediately using the [jsDelivr Purge Tool](https://jsdelivr.com) (or replace `@main` with the latest commit hash).
* **JSON Edits Require No Purge:** Edits made to `data/*.json` via Pages CMS are loaded from `://githubusercontent.com` and update automatically without manual purging.
