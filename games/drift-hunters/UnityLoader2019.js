/*
 * Drift Hunters ships its ~129 MB data file split into six parts
 * (dh.data.unityweb.000 ... .005) because the original portal capped single
 * downloads; dh.json records the scheme (totalFile / size / split_size).
 * The stock Unity loader knows nothing about that and would 404 on
 * "dh.data.unityweb", leaving the game on a loading screen forever.
 *
 * This shim reassembles the parts in the browser (they concatenate back into
 * one gzip'd "UnityWeb" container - the joined byte count matches the
 * manifest's "size" field), hands the joined Blob URL to the real Unity
 * 2019-era loader as Module.dataUrl (a preset Module key wins over the
 * manifest in that loader), and otherwise stays out of the way.
 *
 * The real loader lives in unityloader.core.js next to this file.
 */
(function () {
  var CORE_SRC = "unityloader.core.js";
  var api = window.UnityLoader || (window.UnityLoader = {});

  var pending = null; // { container, url, overrides }
  var dataUrl = null; // blob: URL of the joined data file
  var coreReady = false;
  var started = false;

  function logError() {
    if (window.console && console.error) {
      console.error.apply(console, ["DriftHunters loader:"].concat([].slice.call(arguments)));
    }
  }

  function splitName(base, index) {
    return base + "." + ("00" + index).slice(-3);
  }

  function fetchPart(url, cb) {
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.responseType = "arraybuffer";
    x.onload = function () {
      if (x.status && x.status >= 400) {
        cb(new Error("HTTP " + x.status + " for " + url));
        return;
      }
      cb(null, new Uint8Array(x.response));
    };
    x.onerror = function () {
      cb(new Error("Network error for " + url));
    };
    x.send();
  }

  function joinParts(manifest, cb) {
    var count = manifest.totalFile | 0;
    if (count < 1 || !manifest.dataUrl) {
      cb(new Error("dh.json is missing dataUrl/totalFile"));
      return;
    }
    var chunks = new Array(count);
    var remaining = count;
    var failed = false;
    for (var i = 0; i < count; i++) {
      (function (index) {
        fetchPart(splitName(manifest.dataUrl, index), function (err, bytes) {
          if (failed) return;
          if (err) {
            failed = true;
            cb(err);
            return;
          }
          chunks[index] = bytes;
          if (--remaining === 0) {
            var total = 0;
            for (var j = 0; j < count; j++) total += chunks[j].length;
            if (manifest.size && total !== manifest.size) {
              logError("joined size " + total + " != manifest size " + manifest.size);
            }
            var joined = new Uint8Array(total);
            var offset = 0;
            for (var k = 0; k < count; k++) {
              joined.set(chunks[k], offset);
              offset += chunks[k].length;
            }
            cb(
              null,
              URL.createObjectURL(new Blob([joined], { type: "application/octet-stream" }))
            );
          }
        });
      })(i);
    }
  }

  function copyOverrides(overrides) {
    var out = {};
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) out[key] = overrides[key];
    }
    var module = {};
    for (var m in overrides && overrides.Module) {
      if (Object.prototype.hasOwnProperty.call(overrides.Module, m)) module[m] = overrides.Module[m];
    }
    out.Module = module;
    return out;
  }

  function flush() {
    if (!pending || !coreReady || !dataUrl || started) return;
    started = true;
    var item = pending;
    pending = null;
    var real = window.UnityLoader;
    if (!real || typeof real.instantiate !== "function" || real === api) {
      logError("core loader did not load");
      return;
    }
    var overrides = copyOverrides(item.overrides || {});
    overrides.Module.dataUrl = dataUrl; // preset key wins over the manifest
    var instance = real.instantiate(item.container, item.url, overrides);
    // game.html keeps the return value of our async wrapper; mirror the real
    // instance onto it so anything reading gameInstance.Module still works.
    if (item.stub && instance && typeof instance === "object") {
      for (var key in instance) {
        if (Object.prototype.hasOwnProperty.call(instance, key)) item.stub[key] = instance[key];
      }
    }
  }

  api.instantiate = function (container, url, overrides) {
    var stub = {};
    pending = { container: container, url: url, overrides: overrides || {}, stub: stub };

    // Load the manifest + parts and the real loader in parallel.
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.responseType = "text";
    x.onload = function () {
      if (x.status && x.status >= 400) {
        logError("HTTP " + x.status + " for " + url);
        return;
      }
      var manifest;
      try {
        manifest = JSON.parse(x.responseText);
      } catch (e) {
        logError("could not parse " + url, e);
        return;
      }
      joinParts(manifest, function (err, blobUrl) {
        if (err) {
          logError(err.message || err);
          return;
        }
        dataUrl = blobUrl;
        flush();
      });
    };
    x.onerror = function () {
      logError("Network error for " + url);
    };
    x.send();

    if (!started && !coreReady) {
      var s = document.createElement("script");
      s.src = CORE_SRC;
      s.onload = function () {
        coreReady = true;
        flush();
      };
      s.onerror = function () {
        logError("Could not load " + CORE_SRC);
      };
      (document.head || document.documentElement).appendChild(s);
    }

    return stub;
  };
})();
