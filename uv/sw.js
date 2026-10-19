importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts(__uv$config.sw || "/uv/uv.sw.js");

// Hosts the proxy must refuse to load (malicious domains from the game links,
// plus ad/malware redirectors found in the archive). Checked in the service
// worker so even a hard navigation to them cannot resolve through the proxy.
importScripts("/js/opium-blocklist.js");

async function handleRequest(event) {
	if (opiumBlocked(event.request.url)) {
		return new Response("Blocked by Opium proxy policy.", {
			status: 403,
			headers: { "content-type": "text/plain" },
		});
	}
	if (!Reflect.has(event.request, "url")) {
		return ultraviolet.fetch(event);
	}
	return ultraviolet.fetch(event);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
