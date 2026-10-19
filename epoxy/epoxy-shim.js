// Opium compatibility shim for the epoxy transport.
//
// UV v3.2.10 embeds bare-mux v2.1.6, whose service worker reads response
// headers from the transport result with `for (let key in rawHeaders)`,
// i.e. it expects a plain object. The published epoxy-transport v3.0.1
// returns headers as an array of [key, value] pairs, which made UV treat
// every proxied page as non-HTML (no content-type), skipping its HTML
// rewriting entirely and leaking raw subresource requests to Opium's own
// server as 404s.
//
// This wrapper normalizes both directions:
//  - request headers: plain object  -> iterable of pairs (what epoxy wants)
//  - response headers: pairs array  -> plain object      (what UV's SW wants)
import EpoxyTransport from './epoxy.js';

function toEntries(headers) {
    if (!headers) return [];
    if (typeof headers[Symbol.iterator] === 'function') return headers;
    return Object.entries(headers);
}

function toObject(headers) {
    if (!headers) return {};
    if (!Array.isArray(headers) && typeof headers[Symbol.iterator] !== 'function') {
        return headers;
    }
    const obj = {};
    for (const [key, value] of headers) {
        const name = String(key).toLowerCase();
        if (name === 'set-cookie') {
            obj[name] = [].concat(obj[name] || [], value);
        } else if (obj[name] === undefined) {
            obj[name] = value;
        } else {
            obj[name] = obj[name] + ', ' + value;
        }
    }
    return obj;
}

export default class OpiumEpoxyTransport extends EpoxyTransport {
    async request(remote, method, body, headers, signal) {
        const res = await super.request(remote, method, body, toEntries(headers), signal);
        return { ...res, headers: toObject(res && res.headers) };
    }

    connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
        return super.connect(url, protocols, toEntries(requestHeaders), onopen, onmessage, onclose, onerror);
    }
}
