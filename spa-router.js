/**
 * SPA Router for Static Sites (GitHub Pages Compatible)
 * Logic: Intercepts internal links, fetches the HTML in the background,
 * and swaps the content inside #main-wrapper without a full page reload.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Configuration
    const WRAPPER_ID = 'main-wrapper'; 
    const FADE_DURATION = 300; // ms

    // Helper: Is this a link we should intercept?
    function shouldIntercept(link) {
        // 1. Must be an internal link
        if (link.origin !== location.origin) return false;
        // 2. Ignore _blank targets
        if (link.target === '_blank') return false;
        // 3. Ignore just hash links on the same page (scrolling)
        if (link.pathname === location.pathname && link.hash) return false;
        // 4. Ignore downloads
        if (link.hasAttribute('download')) return false;
        return true;
    }

    // Helper: Fade Out
    function fadeOut() {
        const wrapper = document.getElementById(WRAPPER_ID);
        if (wrapper) {
            wrapper.style.transition = `opacity ${FADE_DURATION}ms ease`;
            wrapper.style.opacity = '0';
        }
    }

    // Helper: Fade In
    function fadeIn() {
        const wrapper = document.getElementById(WRAPPER_ID);
        if (wrapper) {
            wrapper.style.opacity = '0';
            // Trigger reflow
            void wrapper.offsetWidth; 
            wrapper.style.transition = `opacity ${FADE_DURATION}ms ease`;
            wrapper.style.opacity = '1';
        }
    }

    // Core: Fetch and Swap
    async function loadPage(url, pushHistory = true) {
        const wrapper = document.getElementById(WRAPPER_ID);
        if (!wrapper) return;

        // 1. Start Animation
        fadeOut();

        try {
            // 2. Fetch the new HTML
            // Wait for fade out to finish (optional, but looks smoother)
            await new Promise(r => setTimeout(r, FADE_DURATION));

            const response = await fetch(url);
            if (!response.ok) throw new Error('Page not found');
            const htmlText = await response.text();

            // 3. Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const newContent = doc.getElementById(WRAPPER_ID);
            const newTitle = doc.title;

            if (!newContent) {
                // Fallback: If the target page doesn't have the wrapper, do a hard reload
                window.location = url;
                return;
            }

            // 4. Update History URL
            if (pushHistory) {
                history.pushState({}, newTitle, url);
            }

            // 5. Swap Content
            wrapper.innerHTML = newContent.innerHTML;
            document.title = newTitle;

            // 6. Handle Scroll (Hash or Top)
            const hash = window.location.hash;
            if (hash) {
                const element = document.getElementById(hash.substring(1));
                if (element) element.scrollIntoView();
            } else {
                window.scrollTo(0, 0);
            }

            // 7. Re-initialize Bootstrap (Required for Navbar/Modals to work after swap)
            if (window.bootstrap) {
                const navLinks = document.querySelectorAll('.navbar-collapse');
                navLinks.forEach(collapse => new bootstrap.Collapse(collapse, { toggle: false }));
            }

            // 8. Re-initialize Badges (Altmetric & Dimensions)
            initPlugins();

            // 9. End Animation
            fadeIn();

        } catch (error) {
            console.error('SPA Error:', error);
            window.location = url; // Fallback to standard reload
        }
    }

    // Event Listener: Clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && shouldIntercept(link)) {
            e.preventDefault();
            loadPage(link.href);
        }
    });

    // Event Listener: Browser Back/Forward Buttons
    window.addEventListener('popstate', () => {
        loadPage(window.location.href, false);
    });
});


/**
 * Helper Functions to re-initialize external scripts
 * This fixes the issue where badges don't load when navigating between tabs.
 */
function initPlugins() {
    // 1. Re-initialize Altmetric Badges
    if (window._altmetric_embed_init) {
        window._altmetric_embed_init();
    } else {
        // If script is missing but badges exist, load it dynamically
        if (document.querySelector('.altmetric-embed')) {
            loadScript('https://embed.altmetric.com/assets/embed.js');
        }
    }

    // 2. Re-initialize Dimensions Badges
    if (window.__dimensions_embed && window.__dimensions_embed.addBadges) {
        window.__dimensions_embed.addBadges();
    } else {
        // If script is missing but badges exist, load it dynamically
        if (document.querySelector('.__dimensions_badge_embed__')) {
            loadScript('https://badge.dimensions.ai/badge.js');
        }
    }
}

// Helper to load external scripts dynamically if they aren't present
function loadScript(src) {
    // Check if script already exists to avoid duplicates
    if (document.querySelector(`script[src="${src}"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.charset = "utf-8";
    document.body.appendChild(script);
}
