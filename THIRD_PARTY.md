# Third-party components (Opium Shield)

The Opium Shield proxy embeds the following unmodified packages, vendored as
their published distribution files:

| Component | Version | License | Source |
|---|---|---|---|
| Ultraviolet (`@titaniumnetwork-dev/ultraviolet`) | 3.2.10 | MIT (per package manifest; upstream repo also ships AGPL-3.0 text) | https://github.com/titaniumnetwork-dev/Ultraviolet |
| bare-mux (`@mercuryworkshop/bare-mux`) | 2.1.9 | No license field published; see repository | https://github.com/MercuryWorkshop/bare-mux |
| epoxy-transport (`@mercuryworkshop/epoxy-transport`) | 3.0.1 | AGPL-3.0-only | https://github.com/MercuryWorkshop/epoxy-transport |

File locations:

- `uv/` — Ultraviolet proxy core (`sw.js`, `uv.bundle.js`, `uv.client.js`, `uv.handler.js`, `uv.sw.js`) plus `uv.config.js`, which is Opium's own configuration and includes the Opium ad-shield script injected into proxied pages.
- `baremux/` — transport multiplexer (`baremux.js`, `worker.js`).
- `epoxy/` — Wisp transport with embedded WebAssembly (`epoxy.js`), plus `epoxy-shim.js`,
  an Opium-authored compatibility wrapper that normalizes the header format between
  UV's embedded bare-mux v2.1.6 and epoxy v3.0.1.

The Shield routes proxied traffic through Mercury Workshop's public Wisp demo
server (`wss://wisp.mercurywork.shop/`), which is rate limited. Host your own
Wisp server for production use and update the constant in
`prox1es/shield.html`.

Because the AGPL-3.0 epoxy transport is served from this site, its complete
source remains available at the repository link above; the vendored file in
`epoxy/epoxy.js` is the unmodified upstream build output.
