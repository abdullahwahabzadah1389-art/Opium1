/**
 * Opium proxy blocklist.
 *
 * Hosts the web proxy (Ultraviolet + Epoxy) must refuse to load. Two kinds:
 *  1. Malicious domains that appeared in the game archive as link redirects
 *     (fake "download/verify" pages, phishing, crypto drainers).
 *  2. Ad / malware redirector and cloaking-script hosts found scanning the site.
 *
 * Loaded by uv/sw.js (403s blocked navigations service-side) and available to
 * page scripts as window.opiumBlocked(url).
 */
(function (scope) {
  var OP1UM_BLOCKED = [
    // Malicious redirects found on game links
    "justbuild.nyc3.cdn.digitaloceanspaces.com",
    "www.g2a.com",
    "g2a.com",
    "www.hackthebox.com",
    "hackthebox.com",
    // Ad / malware / cloaking hosts found in the archive
    "addthis.com",
    "mail.ru",
    "hypercomments.com",
    "adtng.com",
    "mgid.com",
    "pushame.com",
    "pushance.com",
    "pushanse.com",
    "pushazer.com",
    "pushnami.com",
    "outbrain.com",
    "exdynsrv.com",
    "exoclick.com",
    "onclkds.com",
    "propellerads.com",
    "juicyads.com",
    "trafficjunky.com",
    "adnium.com",
    "adsco.re",
    "d2m3ne3kdl2v5q.cloudfront.net",
    "ketchh.com",
    "grolewe.com",
    "netundead.com",
    "series4.ru",
    "loadshare.org",
    "ouo.io",
    "adfoc.us",
    "sh.st",
    "linkvertise.com",
    "lootlinks.co",
    "work.ink",
    "gleech.org",
    "clk.sh",
    "adskeeper.com",
    "hilltopads.net",
    "adsterra.com",
    "galaksion.com",
    "tubecorporate.com",
    "mgid.com",
    "yllix.com",
    "popads.net",
    "propu.sh",
    "pushprofit.net",
    "notifpush.com",
    "browserad.com",
    "notifpush.net",
    "glersakr.com",
    "pichica.com",
    "juicyads.com"
  ];

  function normalizeHost(host) {
    if (!host) return "";
    host = String(host).toLowerCase();
    // Strip a leading "www." so both forms match either way.
    if (host.indexOf("www.") === 0) host = host.slice(4);
    return host;
  }

  function opiumBlocked(url) {
    var host;
    try {
      host = normalizeHost(new URL(url, self.location ? self.location.href : "http://localhost/").hostname);
    } catch (e) {
      // Unparseable URL: fail closed for anything that isn't plainly relative.
      return /^[a-z]+:\/\//i.test(String(url));
    }
    if (!host) return false;
    for (var i = 0; i < OP1UM_BLOCKED.length; i++) {
      var b = normalizeHost(OP1UM_BLOCKED[i]);
      if (host === b || host.slice(-(b.length + 1)) === "." + b) return true;
    }
    return false;
  }

  scope.OP1UM_BLOCKED = OP1UM_BLOCKED;
  scope.opiumBlocked = opiumBlocked;
})(typeof self !== "undefined" ? self : this);
