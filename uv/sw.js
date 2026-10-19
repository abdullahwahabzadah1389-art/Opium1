/*global UVServiceWorker,__uv$config*/
/* Opium Shield ad-shield revision: 3 (network-level blocklist) */
/*
 * Stock service worker script.
 * Users can provide their own sw.js if they need to extend the functionality of the service worker.
 * Ideally, this will be registered under the scope in uv.config.js so it will not need to be modified.
 * However, if a user changes the location of uv.bundle.js/uv.config.js or sw.js is not relative to them, they will need to modify this script locally.
 */
importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts(__uv$config.sw || 'uv.sw.js');

const uv = new UVServiceWorker();

/*
 * Opium Shield: network-level ad blocking.
 * Every proxied request arrives here as <prefix><xor-encoded remote URL>.
 * We decode it and test it against the same blocklist that the injected
 * client script uses (built in uv.config.js), so ad/tracker requests are
 * answered with an empty 204 and never reach the page - regardless of how
 * the page tried to load them (parser-inserted scripts, setAttribute,
 * document.write, beacons, ...).
 */
const OPIUM_BLOCK_SRC = self.__opiumBlockSrc || null;
const OPIUM_BLOCK = OPIUM_BLOCK_SRC ? new RegExp(OPIUM_BLOCK_SRC, 'i') : null;
const OPIUM_PREFIX = __uv$config.prefix;

function opiumBlocked(url) {
    if (!OPIUM_BLOCK) return false;
    let target = url;
    try {
        const i = url.indexOf(OPIUM_PREFIX);
        if (i !== -1) {
            const decoded = __uv$config.decodeUrl(url.slice(i + OPIUM_PREFIX.length));
            if (typeof decoded === 'string' && decoded) target = decoded;
        }
    } catch (e) {
        target = url;
    }
    try {
        return OPIUM_BLOCK.test(target);
    } catch (e) {
        return false;
    }
}

async function handleRequest(event) {
    if (uv.route(event)) {
        return await uv.fetch(event);
    }

    return await fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    if (opiumBlocked(event.request.url)) {
        event.respondWith(new Response(null, { status: 204 }));
        return;
    }
    event.respondWith(handleRequest(event));
});
