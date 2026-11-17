const SITE_ROOT_URL = (() => {
    const scriptUrl = document.currentScript?.src;
    return scriptUrl ? new URL("../", scriptUrl) : new URL("./", document.baseURI);
})();

const FETCH_TIMEOUT_MS = 20000;
const FETCH_RETRY_DELAYS_MS = [1000, 3000];

const SiteUtils = {
    getDataUrl(filePath) {
        return new URL(String(filePath).replace(/^\/+/, ""), SITE_ROOT_URL).href;
    },

    getAssetUrl(assetPath) {
        if (!assetPath) return "";
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(assetPath)) return assetPath;
        return new URL(String(assetPath).replace(/^\/+/, ""), SITE_ROOT_URL).href;
    },

    readCache(key) {
        for (const storageName of ["localStorage", "sessionStorage"]) {
            try {
                const value = window[storageName].getItem(key);
                if (value !== null) return JSON.parse(value);
            } catch (error) {
                console.warn(`SiteUtils could not read ${storageName} cache:`, error);
            }
        }
        return null;
    },

    writeCache(key, data) {
        const value = JSON.stringify(data);
        for (const storageName of ["localStorage", "sessionStorage"]) {
            try {
                window[storageName].setItem(key, value);
            } catch (error) {
                console.warn(`SiteUtils could not write ${storageName} cache:`, error);
            }
        }
    },

    async fetchJson(filePath, { validate = (data) => data } = {}) {
        const url = this.getDataUrl(filePath);
        let lastError;

        for (let attempt = 0; attempt <= FETCH_RETRY_DELAYS_MS.length; attempt++) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            try {
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status} loading ${filePath}`);
                }

                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    const error = new Error(`Invalid JSON returned while loading ${filePath}.`);
                    error.permanent = true;
                    throw error;
                }

                try {
                    return validate(data);
                } catch (cause) {
                    const error = new Error(`Invalid data in ${filePath}: ${cause.message}`);
                    error.permanent = true;
                    throw error;
                }
            } catch (error) {
                lastError = error.name === "AbortError"
                    ? new Error(`Request timed out loading ${filePath}.`)
                    : error;
                if (error.permanent) break;
            } finally {
                clearTimeout(timeout);
            }

            if (attempt < FETCH_RETRY_DELAYS_MS.length) {
                await new Promise((resolve) => setTimeout(resolve, FETCH_RETRY_DELAYS_MS[attempt]));
            }
        }

        throw lastError;
    },

    async fetchCachedJson(filePath, options) {
        const cacheKey = `gh_cache_${filePath}`;
        const cached = this.readCache(cacheKey);

        try {
            const data = await this.fetchJson(filePath, options);
            this.writeCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error("SiteUtils fetch error:", error);
            if (cached !== null) return cached;
            throw error;
        }
    },

    async loadJsonWithSWR(filePath, cachePrefix, { onRender, onStaleError, onFatalError, validate }) {
        const cacheKey = `${cachePrefix}_${filePath}`;
        let cached = this.readCache(cacheKey);

        if (cached !== null && validate) {
            try {
                cached = validate(cached);
            } catch (error) {
                console.warn("SiteUtils ignoring invalid cached data:", error);
                cached = null;
            }
        }

        if (cached !== null) onRender(cached);

        try {
            const data = await this.fetchJson(filePath, { validate });
            this.writeCache(cacheKey, data);
            onRender(data);
        } catch (error) {
            console.error("SiteUtils refresh error:", error);
            if (cached !== null) onStaleError(error);
            else onFatalError(error);
        }
    },

    parseMarkdown(text) {
        if (!text) return "";
        return typeof marked !== "undefined" ? marked.parse(text) : text;
    }
};
