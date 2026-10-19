/*global Ultraviolet*/
/*
 * Opium - Ultraviolet proxy configuration
 * UV core: @titaniumnetwork-dev/ultraviolet v3.2.10 (MIT, see /THIRD_PARTY.md)
 * Transport: @mercuryworkshop/bare-mux v2.1.9 + @mercuryworkshop/epoxy-transport v3.0.1 (AGPL-3.0)
 * https://github.com/titaniumnetwork-dev/Ultraviolet
 * https://github.com/mercuryworkshop/bare-mux
 * https://github.com/mercuryworkshop/epoxy-transport
 */

/*
 * Opium Shield ad-shield revision 3.
 *
 * One blocklist, two enforcement layers:
 *  - uv/sw.js tests every proxied request (decoded from the XOR prefix) and
 *    answers blocked ad/tracker requests with an empty 204 at the network
 *    level, so nothing even reaches the page.
 *  - A client script is injected into the head of every proxied document and
 *    patches fetch/XHR/beacon/WebSocket/window.open plus element loaders, and
 *    sweeps ad DOM nodes, covering what the service worker cannot see.
 */

// Plain domains (auto-escaped below so no manual regex escaping is needed).
const OPIUM_ADS_DOMAINS = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'google-analytics.com',
    'googletagmanager.com',
    'adnxs.com',
    'criteo.com',
    'criteo.net',
    'taboola.com',
    'outbrain.com',
    'amazon-adsystem.com',
    'adsrvr.org',
    'scorecardresearch.com',
    'monetag.com',
    'onclickal.com',
    'adsterra.com',
    'adsterratech.com',
    'highperformanceformat.com',
    'propellerads.com',
    'propellerclick.com',
    'propeller-tracking.com',
    'propellerpops.com',
    'rtmark.net',
    'onclkds.com',
    'onclkds.net',
    'onclickads.net',
    'popcash.net',
    'popads.net',
    'popmyads.com',
    'exoclick.com',
    'exosrv.com',
    'exdynsrv.com',
    'pemsrv.com',
    'juicyads.com',
    'trafficjunky.net',
    'adskeeper.com',
    'adskeeper.co.uk',
    'hilltopads.net',
    'adform.net',
    'openx.net',
    'rubiconproject.com',
    'pubmatic.com',
    'zedo.com',
    'yieldmo.com',
    'revcontent.com',
    'mgid.com',
    'adcolony.com',
    'unityads.unity3d.com',
    'supersonicads.com',
    'chartboost.com',
    'inmobi.com',
    'vungle.com',
    'applovin.com',
    'airpush.com',
    'pushame.com',
    'pushance.com',
    'pushprofit.net',
    'notix.io',
    'onesignal.com',
    'adpushup.com',
    'yllix.com',
    'adfly.com',
    // rev 3 additions
    '2mdn.net',
    'advertising.com',
    'adtechus.com',
    'smartadserver.com',
    'teads.tv',
    'moatads.com',
    '33across.com',
    'sharethrough.com',
    'media.net',
    'adroll.com',
    'demdex.net',
    'omtrdc.net',
    'bluekai.com',
    'krxd.net',
    'rlcdn.com',
    'casalemedia.com',
    'sovrn.com',
    'bidswitch.net',
    'doubleverify.com',
    'adsafeprotected.com',
    'serving-sys.com',
    'yieldlab.net',
    'yieldlab.de',
    'fundingchoicesmessages.google.com',
    'craktraffic.com',
    'trafficstars.com',
    'plugrush.com',
    'ad-maven.com',
];

const OPIUM_ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
const OPIUM_BLOCK_SRC =
    '(^|[^a-z0-9-])(' +
    OPIUM_ADS_DOMAINS.map((d) => d.replace(OPIUM_ESCAPE_RE, '\\$&')).join('|') +
    '|adservice[-a-z]*\\.|pagead2?\\.|syndication\\.|ads\\.)' +
    // first-party ad scripts: /ad.js, /ads.js, /ad.php, /ad-banner.html, /adserver.js, /advert-300.js, ...
    '|(\\/ads?(?:[._-][a-z0-9_.-]*)?\\.(js|php|html?)' +
    '|\\/ad(?:server|vert(ising)?|banner|frame|push|view)[a-z0-9_.-]*\\.(js|php|html?))';

// Consumed by uv/sw.js for network-level blocking.
self.__opiumBlockSrc = OPIUM_BLOCK_SRC;

// Ad shield injected into the head of every proxied page.
// It runs inside the proxied document, so its network + DOM patches genuinely
// apply to the proxied site. Inside a proxied page, URLs that pass through the
// UV client are XOR-encoded against our proxy prefix, so every URL is decoded
// (via __uv$config.decodeUrl) before it is tested against the blocklist.
const OPIUM_ADBLOCK = [
    '(function(){',
    'if(window.__opiumShield)return;window.__opiumShield=true;',
    'var A=/' + OPIUM_BLOCK_SRC + '/i;',
    'var CFG=self.__uv$config||{},PREFIX=CFG.prefix||"/uv/service/";',
    'function dec(u){try{if(typeof u!=="string"||u.indexOf(PREFIX)<0||!CFG.decodeUrl)return u;var d=CFG.decodeUrl(u.slice(u.indexOf(PREFIX)+PREFIX.length));return typeof d==="string"&&d?d:u;}catch(e){return u;}}',
    'function bad(u){if(typeof u!=="string"||!u)return false;if(A.test(u))return true;var d=dec(u);return d!==u&&A.test(d);}',
    'var of=window.fetch;',
    'if(of)window.fetch=function(i,init){if(bad(typeof i==="string"?i:(i&&i.url)||""))return Promise.reject(new TypeError("Opium Shield: blocked"));return of.apply(this,arguments);};',
    'var ox=XMLHttpRequest.prototype.open;',
    'XMLHttpRequest.prototype.open=function(m,u){if(bad(u))this.__opiumShieldBlock=1;return ox.apply(this,arguments);};',
    'var os=XMLHttpRequest.prototype.send;',
    'XMLHttpRequest.prototype.send=function(){if(this.__opiumShieldBlock)return;return os.apply(this,arguments);};',
    'function patchSrc(Ctor){var d=Object.getOwnPropertyDescriptor(Ctor.prototype,"src");if(d&&d.set)Object.defineProperty(Ctor.prototype,"src",{get:d.get,set:function(v){if(!bad(v))d.set.call(this,v);},configurable:true});}',
    'try{patchSrc(HTMLImageElement);}catch(e){}',
    'try{patchSrc(HTMLScriptElement);}catch(e){}',
    'try{patchSrc(HTMLIFrameElement);}catch(e){}',
    'try{var oln=Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype,"href");if(oln&&oln.set)Object.defineProperty(HTMLLinkElement.prototype,"href",{get:oln.get,set:function(v){if(!bad(v))oln.set.call(this,v);},configurable:true});}catch(e){}',
    'var osa=Element.prototype.setAttribute;',
    'Element.prototype.setAttribute=function(n,v){var ln=String(n||"").toLowerCase();if((ln==="src"||ln==="href"||ln==="data-src"||ln==="data-cfsrc")&&bad(v))return this;return osa.apply(this,arguments);};',
    'if(navigator.sendBeacon){var ob=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=function(u,d){if(bad(u))return true;return ob(u,d);};}',
    'var ow=window.open,gesture=0;',
    'document.addEventListener("pointerdown",function(){gesture=Date.now();},true);',
    'document.addEventListener("click",function(){gesture=Date.now();},true);',
    'window.open=function(u,n,f){if(bad(u))return null;var w=ow.apply(this,arguments);if(Date.now()-gesture>2500){try{w&&w.close();}catch(e){}return null;}return w;};',
    'try{var OW=WebSocket;',
    'window.WebSocket=function(u,p){if(bad(u))throw new Error("Opium Shield: blocked");return p===undefined?new OW(u):new OW(u,p);};',
    'window.WebSocket.prototype=OW.prototype;}catch(e){}',
    'var S="ins.adsbygoogle,.adsbygoogle,[data-ad-client],[data-ad-slot],[id^=\\"div-gpt-ad\\"],[id^=\\"google_ads\\"],[id^=\\"adngin\\"],#ad_iframe,.pub_300x250,.text-ad-links,#bottomad,.ad-container,.ad-slot,.banner-ads,.ads-container,.sponsored-post,.ad-banner";',
    'var ATTRS=["src","data-src","href","data-cfsrc"];',
    'function elBad(el){',
    'try{if(el.matches&&el.matches(S))return true;}catch(e){}',
    'for(var i=0;i<ATTRS.length;i++){var v=el.getAttribute?el.getAttribute(ATTRS[i]):null;if(bad(v))return true;}',
    'return false;}',
    'var tq=0;',
    'function sweep(){var l=document.querySelectorAll("iframe,script,img,ins,a,div,section");for(var i=0;i<l.length;i++){var el=l[i];if(el&&el.parentNode&&elBad(el))el.parentNode.removeChild(el);}}',
    'function sweepSoon(){if(tq)return;tq=setTimeout(function(){tq=0;sweep();},150);}',
    'function obs(ms){for(var i=0;i<ms.length;i++){var ns=ms[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(n.nodeType!==1)continue;if(elBad(n)){if(n.parentNode)n.parentNode.removeChild(n);}else{sweepSoon();}}}}',
    'function start(){if(!document.body)return;sweep();new MutationObserver(obs).observe(document.documentElement,{childList:true,subtree:true});}',
    'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();',
    '})();',
].join('');

self.__uv$config = {
    prefix: '/uv/service/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/uv/uv.handler.js',
    client: '/uv/uv.client.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js',
    inject: [
        {
            host: /.*/,
            injectTo: 'head',
            html: '<script>' + OPIUM_ADBLOCK + '</script>',
        },
    ],
};
