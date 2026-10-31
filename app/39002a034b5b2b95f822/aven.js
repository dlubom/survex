// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split('-')[0]; // Remove any trailing part from e.g. "12.53.3-alpha"
    var vers = str.split('.').slice(0, 3);
    while(vers.length < 3) vers.push('00');
    vers = vers.map((n, i, arr) => n.padStart(2, '0'));
    return vers.join('');
  }
  // 300000 -> "30.0.0"
  var packedVersionToHumanReadable = n => [n / 10000 | 0, (n / 100 | 0) % 100, n % 100].join('.');

  var TARGET_NOT_SUPPORTED = 2147483647;

  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.

  // We skip the node version checking when running on Bun/Deno since the node
  // version they report doesn't seem to be useful.
  if (typeof process !== 'undefined' && !process.versions?.bun && typeof Deno == "undefined") {
    var currentNodeVersion = process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
    if (currentNodeVersion < 180300) {
      throw new Error(`This emscripten-generated code requires node v${ packedVersionToHumanReadable(180300) } (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
    }
  }

  var userAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  if (!userAgent) {
    return;
  }

  var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 150200) {
    throw new Error(`This emscripten-generated code requires Safari v${ packedVersionToHumanReadable(150200) } (detected v${currentSafariVersion})`);
  }

  var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 100) {
    throw new Error(`This emscripten-generated code requires Firefox v100 (detected v${currentFirefoxVersion})`);
  }

  var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 95) {
    throw new Error(`This emscripten-generated code requires Chrome v95 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: /var/folders/2w/cpt06jjj2hl9v89_bzgz8xvm0000gn/T/tmpp11uhw5p.js

  if (!Module['expectedDataFileDownloads']) Module['expectedDataFileDownloads'] = 0;
  Module['expectedDataFileDownloads']++;
  (() => {
    // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    var isNode = globalThis.process && globalThis.process.versions && globalThis.process.versions.node && globalThis.process.type != 'renderer';
    async function loadPackage(metadata) {

      var PACKAGE_PATH = '';
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/');
      } else if (typeof process === 'undefined' && typeof location !== 'undefined') {
        // web worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/');
      }
      var PACKAGE_NAME = '/private/tmp/aven-webgl2-stage4-build/web/aven.data';
      var REMOTE_PACKAGE_BASE = 'aven.data';
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
      var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];

      async function fetchRemotePackage(packageName, packageSize) {
        if (isNode) {
          var contents = require('fs').readFileSync(packageName);
          return new Uint8Array(contents).buffer;
        }
        if (!Module['dataFileDownloads']) Module['dataFileDownloads'] = {};
        try {
          var response = await fetch(packageName);
        } catch (e) {
          throw new Error(`Network Error: ${packageName}`, {e});
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.url}`);
        }

        const chunks = [];
        const headers = response.headers;
        const total = Number(headers.get('Content-Length') || packageSize);
        let loaded = 0;

        Module['setStatus'] && Module['setStatus']('Downloading data...');
        const reader = response.body.getReader();

        while (1) {
          var {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          Module['dataFileDownloads'][packageName] = {loaded, total};

          let totalLoaded = 0;
          let totalSize = 0;

          for (const download of Object.values(Module['dataFileDownloads'])) {
            totalLoaded += download.loaded;
            totalSize += download.total;
          }

          Module['setStatus'] && Module['setStatus'](`Downloading data... (${totalLoaded}/${totalSize})`);
        }

        const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
        let offset = 0;
        for (const chunk of chunks) {
          packageData.set(chunk, offset);
          offset += chunk.length;
        }
        return packageData.buffer;
      }

      var fetchPromise;
      var fetched = Module['getPreloadedPackage'] && Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);

      if (!fetched) {
        // Note that we don't use await here because we want to execute the
        // the rest of this function immediately.
        fetchPromise = fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
      }

    async function runWithFS(Module) {

      function assert(check, msg) {
        if (!check) throw new Error(msg);
      }
Module['FS_createPath']("/", "external", true, true);
Module['FS_createPath']("/", "fixtures", true, true);
Module['FS_createPath']("/fixtures", "malformed-hgt", true, true);
Module['FS_createPath']("/fixtures", "official-sample", true, true);
Module['FS_createPath']("/fixtures/official-sample", "sample", true, true);
Module['FS_createPath']("/fixtures/official-sample/sample", "loser", true, true);
Module['FS_createPath']("/fixtures/official-sample/sample/loser", "caves", true, true);
Module['FS_createPath']("/fixtures/official-sample/sample/loser/caves", "205", true, true);
Module['FS_createPath']("/", "proj", true, true);
Module['FS_createPath']("/", "survex", true, true);
Module['FS_createPath']("/survex", "icons", true, true);
Module['FS_createPath']("/survex", "images", true, true);

      async function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, 'bad input to processPackageData ' + arrayBuffer.constructor.name);
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
          for (var file of metadata['files']) {
            var name = file['filename'];
            var data = byteArray.subarray(file['start'], file['end']);
            // canOwn this data in the filesystem, it is a slice into the heap that will never change
        Module['FS_createDataFile'](name, null, data, true, true, true);
          }
          Module['removeRunDependency']('datafile_/private/tmp/aven-webgl2-stage4-build/web/aven.data');
      }
      Module['addRunDependency']('datafile_/private/tmp/aven-webgl2-stage4-build/web/aven.data');

      if (!Module['preloadResults']) Module['preloadResults'] = {};

      Module['preloadResults'][PACKAGE_NAME] = {fromCache: false};
      if (!fetched) {
        fetched = await fetchPromise;
      }
      await processPackageData(fetched);

    }
    // Detect whether the module JS file has already been loaded.
    if (Module['FS_createPath']) {
      runWithFS(Module);
    } else {
      if (!Module['preRun']) Module['preRun'] = [];
      Module['preRun'].push(runWithFS); // FS is not initialized yet, wait for it
    }

    }
    loadPackage({"files": [{"filename": "/external/kataster.3d", "start": 0, "end": 659882}, {"filename": "/external/terrain.zip", "start": 659882, "end": 11291017}, {"filename": "/fixtures/README.md", "start": 11291017, "end": 11298769}, {"filename": "/fixtures/bundled-passage.3d", "start": 11298769, "end": 11299091}, {"filename": "/fixtures/bundled-passage.cavern.log", "start": 11299091, "end": 11299753}, {"filename": "/fixtures/bundled-passage.dump", "start": 11299753, "end": 11300634}, {"filename": "/fixtures/bundled-passage.err", "start": 11300634, "end": 11300634}, {"filename": "/fixtures/bundled-passage.legs.dump", "start": 11300634, "end": 11301541}, {"filename": "/fixtures/bundled-passage.svx", "start": 11301541, "end": 11302100}, {"filename": "/fixtures/fixture-counts.json", "start": 11302100, "end": 11303133}, {"filename": "/fixtures/invalid-browser-input.3d", "start": 11303133, "end": 11303146}, {"filename": "/fixtures/malformed-hgt/N49E019.hgt", "start": 11303146, "end": 11303149}, {"filename": "/fixtures/malformed-hgt/README.md", "start": 11303149, "end": 11303768}, {"filename": "/fixtures/official-sample/sample/loser/caves/205/205.svx", "start": 11303768, "end": 11305947}, {"filename": "/fixtures/real-nordalpenschacht-205.3d", "start": 11305947, "end": 11306587}, {"filename": "/fixtures/real-nordalpenschacht-205.cavern.log", "start": 11306587, "end": 11309136}, {"filename": "/fixtures/real-nordalpenschacht-205.dump", "start": 11309136, "end": 11310981}, {"filename": "/fixtures/real-nordalpenschacht-205.err", "start": 11310981, "end": 11310981}, {"filename": "/fixtures/real-nordalpenschacht-205.legs.dump", "start": 11310981, "end": 11313076}, {"filename": "/fixtures/real-nordalpenschacht-205.svx", "start": 11313076, "end": 11315255}, {"filename": "/fixtures/sample.tar.gz", "start": 11315255, "end": 11653862}, {"filename": "/fixtures/sha256.json", "start": 11653862, "end": 11654905}, {"filename": "/fixtures/synthetic-2180.3d", "start": 11654905, "end": 11655302}, {"filename": "/fixtures/synthetic-2180.cavern.log", "start": 11655302, "end": 11656138}, {"filename": "/fixtures/synthetic-2180.dump", "start": 11656138, "end": 11657473}, {"filename": "/fixtures/synthetic-2180.err", "start": 11657473, "end": 11657473}, {"filename": "/fixtures/synthetic-2180.legs.dump", "start": 11657473, "end": 11658871}, {"filename": "/fixtures/synthetic-2180.svx", "start": 11658871, "end": 11659519}, {"filename": "/fixtures/synthetic-stations-wgs84.txt", "start": 11659519, "end": 11659884}, {"filename": "/fixtures/synthetic-terrain.bil", "start": 11659884, "end": 11668334}, {"filename": "/fixtures/synthetic-terrain.hdr", "start": 11668334, "end": 11668544}, {"filename": "/fixtures/synthetic-terrain.json", "start": 11668544, "end": 11669067}, {"filename": "/fixtures/synthetic-terrain.prj", "start": 11669067, "end": 11669224}, {"filename": "/fixtures/synthetic-terrain.zip", "start": 11669224, "end": 11670024}, {"filename": "/fixtures/verification.log", "start": 11670024, "end": 11671141}, {"filename": "/fixtures/verify_fixtures.py", "start": 11671141, "end": 11674780}, {"filename": "/proj/proj.db", "start": 11674780, "end": 21251228}, {"filename": "/survex/ChineseSimplified.isl", "start": 21251228, "end": 21272554}, {"filename": "/survex/ChineseTraditional.isl", "start": 21272554, "end": 21292578}, {"filename": "/survex/EnglishBritish.isl", "start": 21292578, "end": 21314197}, {"filename": "/survex/Greek.isl", "start": 21314197, "end": 21351544}, {"filename": "/survex/Indonesian.isl", "start": 21351544, "end": 21370090}, {"filename": "/survex/Info.plist.in", "start": 21370090, "end": 21372757}, {"filename": "/survex/Makefile.am", "start": 21372757, "end": 21375285}, {"filename": "/survex/Makefile.in", "start": 21375285, "end": 21403560}, {"filename": "/survex/Romanian.isl", "start": 21403560, "end": 21425500}, {"filename": "/survex/bcra3.svx", "start": 21425500, "end": 21425946}, {"filename": "/survex/bcra5.svx", "start": 21425946, "end": 21426385}, {"filename": "/survex/bg.msg", "start": 21426385, "end": 21443326}, {"filename": "/survex/bg.po", "start": 21443326, "end": 21539482}, {"filename": "/survex/ca.msg", "start": 21539482, "end": 21556563}, {"filename": "/survex/ca.po", "start": 21556563, "end": 21661435}, {"filename": "/survex/checkshortcut.pl", "start": 21661435, "end": 21663228}, {"filename": "/survex/cs.msg", "start": 21663228, "end": 21678824}, {"filename": "/survex/cs.po", "start": 21678824, "end": 21773971}, {"filename": "/survex/de.msg", "start": 21773971, "end": 21791486}, {"filename": "/survex/de.po", "start": 21791486, "end": 21898121}, {"filename": "/survex/de_CH.msg", "start": 21898121, "end": 21915636}, {"filename": "/survex/de_CH.po", "start": 21915636, "end": 22022279}, {"filename": "/survex/el.msg", "start": 22022279, "end": 22039173}, {"filename": "/survex/el.po", "start": 22039173, "end": 22134672}, {"filename": "/survex/en.msg", "start": 22134672, "end": 22149844}, {"filename": "/survex/en_US.msg", "start": 22149844, "end": 22164995}, {"filename": "/survex/en_US.po", "start": 22164995, "end": 22271796}, {"filename": "/survex/es.msg", "start": 22271796, "end": 22289958}, {"filename": "/survex/es.po", "start": 22289958, "end": 22397888}, {"filename": "/survex/extract-msgs.pl", "start": 22397888, "end": 22403195}, {"filename": "/survex/fr.msg", "start": 22403195, "end": 22422081}, {"filename": "/survex/fr.po", "start": 22422081, "end": 22531304}, {"filename": "/survex/hu.msg", "start": 22531304, "end": 22547629}, {"filename": "/survex/hu.po", "start": 22547629, "end": 22646268}, {"filename": "/survex/icons/3d.ico", "start": 22646268, "end": 22648506}, {"filename": "/survex/icons/3d.iconset.zip", "start": 22648506, "end": 22872904}, {"filename": "/survex/icons/3d.png", "start": 22872904, "end": 22874013}, {"filename": "/survex/icons/3d.svg", "start": 22874013, "end": 22890149}, {"filename": "/survex/icons/Aven.iconset.zip", "start": 22890149, "end": 23093940}, {"filename": "/survex/icons/Makefile.am", "start": 23093940, "end": 23096436}, {"filename": "/survex/icons/Makefile.in", "start": 23096436, "end": 23113874}, {"filename": "/survex/icons/aven.ico", "start": 23113874, "end": 23116112}, {"filename": "/survex/icons/aven.svg", "start": 23116112, "end": 23122846}, {"filename": "/survex/icons/aven.xpm", "start": 23122846, "end": 23128457}, {"filename": "/survex/icons/crosses.xpm", "start": 23128457, "end": 23128895}, {"filename": "/survex/icons/defaults.xpm", "start": 23128895, "end": 23129334}, {"filename": "/survex/icons/elevation.xpm", "start": 23129334, "end": 23129774}, {"filename": "/survex/icons/entrances.xpm", "start": 23129774, "end": 23130199}, {"filename": "/survex/icons/err.ico", "start": 23130199, "end": 23132437}, {"filename": "/survex/icons/err.iconset.zip", "start": 23132437, "end": 23380560}, {"filename": "/survex/icons/err.png", "start": 23380560, "end": 23381857}, {"filename": "/survex/icons/err.svg", "start": 23381857, "end": 23398498}, {"filename": "/survex/icons/exported_pts.xpm", "start": 23398498, "end": 23398941}, {"filename": "/survex/icons/fixed_pts.xpm", "start": 23398941, "end": 23399366}, {"filename": "/survex/icons/log.xpm", "start": 23399366, "end": 23399760}, {"filename": "/survex/icons/names.xpm", "start": 23399760, "end": 23400181}, {"filename": "/survex/icons/open.xpm", "start": 23400181, "end": 23400646}, {"filename": "/survex/icons/open_pres.xpm", "start": 23400646, "end": 23401116}, {"filename": "/survex/icons/plan.xpm", "start": 23401116, "end": 23401551}, {"filename": "/survex/icons/plt.ico", "start": 23401551, "end": 23402317}, {"filename": "/survex/icons/plt.iconset.zip", "start": 23402317, "end": 23557954}, {"filename": "/survex/icons/plt.png", "start": 23557954, "end": 23558429}, {"filename": "/survex/icons/plt.svg", "start": 23558429, "end": 23567838}, {"filename": "/survex/icons/png2iconsetzip", "start": 23567838, "end": 23568378}, {"filename": "/survex/icons/png2winicon", "start": 23568378, "end": 23568498}, {"filename": "/survex/icons/pos.ico", "start": 23568498, "end": 23570736}, {"filename": "/survex/icons/pos.iconset.zip", "start": 23570736, "end": 23815094}, {"filename": "/survex/icons/pos.png", "start": 23815094, "end": 23816279}, {"filename": "/survex/icons/pos.svg", "start": 23816279, "end": 23833739}, {"filename": "/survex/icons/pres_ff.xpm", "start": 23833739, "end": 23834177}, {"filename": "/survex/icons/pres_fff.xpm", "start": 23834177, "end": 23834616}, {"filename": "/survex/icons/pres_frew.xpm", "start": 23834616, "end": 23835056}, {"filename": "/survex/icons/pres_go.xpm", "start": 23835056, "end": 23835494}, {"filename": "/survex/icons/pres_go_back.xpm", "start": 23835494, "end": 23835937}, {"filename": "/survex/icons/pres_pause.xpm", "start": 23835937, "end": 23836378}, {"filename": "/survex/icons/pres_rew.xpm", "start": 23836378, "end": 23836817}, {"filename": "/survex/icons/pres_stop.xpm", "start": 23836817, "end": 23837257}, {"filename": "/survex/icons/pres_tree.xpm", "start": 23837257, "end": 23837712}, {"filename": "/survex/icons/rotation.xpm", "start": 23837712, "end": 23838136}, {"filename": "/survex/icons/solid_surface.xpm", "start": 23838136, "end": 23838625}, {"filename": "/survex/icons/surface_legs.xpm", "start": 23838625, "end": 23839714}, {"filename": "/survex/icons/survey_tree.xpm", "start": 23839714, "end": 23840156}, {"filename": "/survex/icons/svg2iconsetzip", "start": 23840156, "end": 23840838}, {"filename": "/survex/icons/svx.ico", "start": 23840838, "end": 23843076}, {"filename": "/survex/icons/svx.iconset.zip", "start": 23843076, "end": 24114343}, {"filename": "/survex/icons/svx.png", "start": 24114343, "end": 24115621}, {"filename": "/survex/icons/svx.svg", "start": 24115621, "end": 24133826}, {"filename": "/survex/icons/tubes.xpm", "start": 24133826, "end": 24134307}, {"filename": "/survex/icons/ug_legs.xpm", "start": 24134307, "end": 24135226}, {"filename": "/survex/id.msg", "start": 24135226, "end": 24152041}, {"filename": "/survex/id.po", "start": 24152041, "end": 24258320}, {"filename": "/survex/images/Makefile.am", "start": 24258320, "end": 24258471}, {"filename": "/survex/images/Makefile.in", "start": 24258471, "end": 24273397}, {"filename": "/survex/images/aven-about.png", "start": 24273397, "end": 24300624}, {"filename": "/survex/images/osterei.png", "start": 24300624, "end": 24328820}, {"filename": "/survex/images/texture.png", "start": 24328820, "end": 24504155}, {"filename": "/survex/it.msg", "start": 24504155, "end": 24521257}, {"filename": "/survex/it.po", "start": 24521257, "end": 24626983}, {"filename": "/survex/make-pixel-font", "start": 24626983, "end": 24629502}, {"filename": "/survex/pl.msg", "start": 24629502, "end": 24646910}, {"filename": "/survex/pl.po", "start": 24646910, "end": 24755336}, {"filename": "/survex/po-to-msg.pl", "start": 24755336, "end": 24764138}, {"filename": "/survex/preload_font.h", "start": 24764138, "end": 24788999}, {"filename": "/survex/pt.msg", "start": 24788999, "end": 24805924}, {"filename": "/survex/pt.po", "start": 24805924, "end": 24910184}, {"filename": "/survex/pt_BR.msg", "start": 24910184, "end": 24927136}, {"filename": "/survex/pt_BR.po", "start": 24927136, "end": 25031788}, {"filename": "/survex/ro.msg", "start": 25031788, "end": 25048815}, {"filename": "/survex/ro.po", "start": 25048815, "end": 25152897}, {"filename": "/survex/ru.msg", "start": 25152897, "end": 25184410}, {"filename": "/survex/ru.po", "start": 25184410, "end": 25307286}, {"filename": "/survex/sk.msg", "start": 25307286, "end": 25323992}, {"filename": "/survex/sk.po", "start": 25323992, "end": 25429372}, {"filename": "/survex/survex-aven.desktop", "start": 25429372, "end": 25429781}, {"filename": "/survex/survex.lang", "start": 25429781, "end": 25444740}, {"filename": "/survex/survex.pot", "start": 25444740, "end": 25536948}, {"filename": "/survex/survex.xml", "start": 25536948, "end": 25538153}, {"filename": "/survex/unifont.pixelfont", "start": 25538153, "end": 27152073}, {"filename": "/survex/zh_CN.msg", "start": 27152073, "end": 27166366}, {"filename": "/survex/zh_CN.po", "start": 27166366, "end": 27267598}], "remote_package_size": 27267598});

  })();

// end include: /var/folders/2w/cpt06jjj2hl9v89_bzgz8xvm0000gn/T/tmpp11uhw5p.js
// include: /var/folders/2w/cpt06jjj2hl9v89_bzgz8xvm0000gn/T/tmpv_ulj34s.js

    // All the pre-js content up to here must remain later on, we need to run
    // it.
    if ((typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER) || (typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD) || (typeof ENVIRONMENT_IS_AUDIO_WORKLET != 'undefined' && ENVIRONMENT_IS_AUDIO_WORKLET)) Module['preRun'] = [];
    var necessaryPreJSTasks = Module['preRun'].slice();
  // end include: /var/folders/2w/cpt06jjj2hl9v89_bzgz8xvm0000gn/T/tmpv_ulj34s.js
// include: /private/tmp/aven-wasm-spike/support/jspi-scheduler.js
// jspi-scheduler.js — the wx scheduler shim for the JSPI runtime.
//
// Ships as a --pre-js. Provides the S4 token-wait registry
// (beginWait/waitPromise/resolveWait/resolveTopWait/waitEarlyResolved/
// takeWaitResult/pendingWaits/shutdown) that every C++ bridge and web
// caller relies on, plus the two things JSPI needs:
//
//  1. ACTIVATION TRACKING. Every promising export the app declares is wrapped
//     so the shim always knows which activation is executing synchronously
//     (an explicit stack; JS is single-threaded so this is exact).
//
//  2. SHADOW-STACK DISCIPLINE (emscripten #27364, red/green-proven by
//     tests/apps/standalone/jspi-stack). JSPI switches the native stack per
//     activation but NOT the C spill stack. Every wrapped activation runs on
//     its own pooled spill-stack region with SP swapped at the window
//     boundaries ("green-region", same as libcontext's JSPI backend — KiCad
//     tool coroutines carry their own regions there and do NOT route through
//     here). Green-copy (snapshot/restore of the suspended range) is
//     deliberately NOT used: it rolls back writes other activations make
//     into parked frames' locals (stack-allocated wxDialog members mutated
//     by a cross-tick EndModal), resurrecting dead state at resume.
//
// Observability: an event ring + live activation table via __wxWaitDump().

(function () {
  "use strict";

  if (globalThis.__wxSchedulerInstalled) {
    return; // idempotent under double injection
  }

  var RING_CAP = 256;

  var S = {
    // --- mailbox lane (timers/wheel; ordering machinery, mechanism-free) ----
    // enqueueAfter queues a C callback; delivery happens through the dedicated
    // _wxWasmMailboxTick export from a fresh task, in order. The tick is a
    // suspension inside a delivered handler parks the tick's own activation,
    // and the rejection path carries the same containment (a throwing handler
    // must not leave a parked quasi-modal unresolved).
    mailbox: [],
    enqueued: 0,
    delivered: 0,
    _tickArmed: false,
    enqueueAfter: function (fn, arg, ms) {
      var self = this;
      setTimeout(function () {
        if (self.dead) return; // never deliver into a torn-down app
        self.mailbox.push({ fn: fn, arg: arg });
        self.enqueued++;
        self._armDeliveryTick();
      }, ms);
    },
    pop: function () {
      var m = this.mailbox.shift();
      if (m) this.delivered++;
      return m || null;
    },
    _tickErrorContainment: function (e) {
      if (Module["_wx_dispatch_abandon"]) Module["_wx_dispatch_abandon"]();
      this.resolveTopWait("nested", 0);
      this.resolveTopWait("modal", 5101); // wxID_CANCEL
      console.warn("[wx-scheduler] mailbox tick error: " + e);
    },
    _armDeliveryTick: function () {
      if (this._tickArmed) return;
      this._tickArmed = true;
      var self = this;
      setTimeout(function tick() {
        if (self.dead) { self._tickArmed = false; return; }
        var p;
        try {
          p = Module["_wxWasmMailboxTick"] ? Module["_wxWasmMailboxTick"]() : undefined;
        } catch (e) {
          self._tickArmed = false;
          self._tickErrorContainment(e);
          throw e;
        }
        Promise.resolve(p).catch(function (e) { self._tickErrorContainment(e); });
        if (self.mailbox.length > 0) {
          setTimeout(tick, 17);
        } else {
          self._tickArmed = false;
        }
      }, 0);
    },

    // --- S1 embind lane --
    // Mutators (doc 18 classification) must not enter wasm while a load is in
    // flight: the open activation is suspended mid-load and a collab-apply /
    // save / theme flip entering between its parks would mutate the board
    // under it. The exclusion is semantic, independent of the suspension
    // mechanism. The FIFO drains, in order, once kicadOpenFileBusy clears.
    MUTATOR_NAMES: [
      "kicadSetChrome", "kicadSetReadOnly",
      "kicadCollabApply", "kicadCollabApplyItems",
      "kicadCollabSnapshot", "kicadCollabSnapshotItems",
      "kicadCollabPresenceStart", "kicadCollabSetRemote",
      "kicadCollabSetRemoteCursors",
      "kicadCollabSetPins", "kicadCollabSetStyle",
      "kicadCollabSetViewport", "kicadCollabFitViewport",
      "kicadCollabReleaseSelection", "kicadSetColorTheme",
      "kicadSaveBoard", "kicadSaveSchematic", "kicadSaveDrawingSheet",
      "kicadLayersSetVisible", "kicadLayersSetActive",
    ],
    mutatorQueue: [],
    mutatorsWrapped: 0,
    mutatorsDelivered: 0,
    _mutatorPumpArmed: false,
    _openBusy: function () {
      var probe = Module["kicadOpenFileBusy"];
      if (typeof probe !== "function") return false;
      try { return !!probe(); } catch (e) { return true; }
    },
    _wrapMutators: function () {
      var self = this;
      this.MUTATOR_NAMES.forEach(function (name) {
        var orig = Module[name];
        if (typeof orig !== "function") return;
        self.mutatorsWrapped++;
        Module[name] = function () {
          var args = arguments;
          var call = function () { return orig.apply(Module, args); };
          if (self.mutatorQueue.length === 0 && !self._openBusy()) {
            self.mutatorsDelivered++;
            return call();
          }
          return new Promise(function (resolve, reject) {
            self.mutatorQueue.push({ name: name, call: call, resolve: resolve, reject: reject });
            self._armMutatorPump();
          });
        };
      });
      if (this.mutatorsWrapped > 0)
        this._note("wrapped", "mutators", this.mutatorsWrapped);
    },
    _armMutatorPump: function () {
      if (this._mutatorPumpArmed) return;
      this._mutatorPumpArmed = true;
      var self = this;
      var now = (typeof performance !== "undefined" && performance.now)
        ? function () { return performance.now(); }
        : function () { return Date.now(); };
      setTimeout(function pump() {
        if (self.dead) { self._mutatorPumpArmed = false; return; }
        // Unkillable: an exception escaping this body would end the setTimeout
        // chain and wedge the queue forever (observed: 559 frozen messages).
        try {
          if (!self._openBusy()) {
            // Time-boxed drain: ~8 ms of work per 16 ms tick keeps the page
            // live while a long backlog drains in order.
            var t0 = now();
            while (self.mutatorQueue.length > 0 && now() - t0 < 8) {
              if (self._openBusy()) break;
              var m = self.mutatorQueue.shift();
              self.mutatorsDelivered++;
              try { m.resolve(m.call()); } catch (e) { m.reject(e); }
            }
          }
        } catch (e) {
          self._pumpErrors = (self._pumpErrors || 0) + 1;
          if (self._pumpErrors <= 5)
            console.warn("[wx-scheduler] mutator pump error (occurrence "
              + self._pumpErrors + "): " + e);
        }
        if (self.mutatorQueue.length > 0) setTimeout(pump, 16);
        else self._mutatorPumpArmed = false;
      }, 16);
    },

    // The embind PARKERs (kicadOpenFile / kicadOpenFiles / kicadLibsReload,
    // registered emscripten::async()): wrap them with the
    // same activation tracking as the raw promising exports, so their parks
    // (wxWasmYieldUntil inside the load) find a tracked record and get the
    // green-region spill-stack discipline. Embind names live on Module WITHOUT
    // the underscore prefix, hence the separate installer.
    PARKER_NAMES: [
      "kicadOpenFile",
      "kicadOpenFiles",
      "kicadLibsReload",
      "kicadLibsAddEntry",
    ],
    _wrapParkers: function () {
      var wrapped = 0;
      for (var i = 0; i < this.PARKER_NAMES.length; i++) {
        var name = this.PARKER_NAMES[i];
        if (typeof Module[name] === "function") {
          Module[name] = this._wrapPromising(name, Module[name], this.PARKER_REGION_BYTES);
          wrapped++;
        }
      }
      this._note("wrapped", "parkers", wrapped);
      return wrapped;
    },

    // --- S4 wait registry (contract-compatible) ----------------------------
    waits: new Map(), // token -> {kind, promise, resolve, resolved, result, awaited}
    waitSeq: 0,
    waitStacks: {},   // kind -> [unresolved tokens], LIFO
    waitsBegun: 0,
    waitsResolved: 0,
    earlyWaitResolves: 0,

    beginWait: function (kind) {
      if (this.dead || this.terminal) {
        // Refuse to mint a wait an unhealthy instance can never satisfy.
        // Callers treat token 0 as "not started" (the C++ bridges bail);
        // a stray waitPromise(0) settles immediately and warns.
        this._note("beginWaitRefused", kind, 0);
        return 0;
      }
      var token = ++this.waitSeq;
      var entry = { kind: kind, resolved: false, resolve: null, promise: null };
      entry.promise = new Promise(function (resolve) { entry.resolve = resolve; });
      this.waits.set(token, entry);
      (this.waitStacks[kind] = this.waitStacks[kind] || []).push(token);
      this.waitsBegun++;
      this._note("beginWait", kind, token);
      return token;
    },

    waitPromise: function (token) {
      var entry = this.waits.get(token);
      if (!entry) {
        console.warn("[wx-scheduler] waitPromise(" + token + "): unknown token");
        return Promise.resolve(0);
      }
      if (entry.resolved) {
        // resolved before the waiter parked (early-resolve window)
        this.waits.delete(token);
        return Promise.resolve(entry.result | 0);
      }
      entry.awaited = true;
      this._note("park", entry.kind, token);
      return this._suspendOn(entry.promise, entry.kind, token);
    },

    waitEarlyResolved: function (token) {
      var entry = this.waits.get(token);
      return entry && entry.resolved ? 1 : 0;
    },

    takeWaitResult: function (token) {
      var entry = this.waits.get(token);
      if (!entry || !entry.resolved) return 0;
      this.waits.delete(token);
      return entry.result | 0;
    },

    resolveWait: function (token, result) {
      var entry = this.waits.get(token);
      if (!entry || entry.resolved) return false;
      if (this.terminal) {
        // Resolving would resume the parked frame INSIDE the trapped module
        // (the runWaitCompletion invariant, which the bare finishers used to
        // bypass). Refuse WITHOUT consuming the entry — the frame stays
        // visibly parked in dump() and the ring says why.
        this._note("resolveRefused", entry.kind, token);
        console.warn("[wx-scheduler] resolveWait(" + token + ", " + entry.kind
          + ") refused: instance is terminal");
        return false;
      }
      entry.resolved = true;
      this.waitsResolved++;
      var stack = this.waitStacks[entry.kind];
      if (stack) {
        var idx = stack.indexOf(token);
        if (idx !== -1) stack.splice(idx, 1);
      }
      entry.result = result | 0;
      entry.resolve(result | 0);
      this._note("resolve", entry.kind, token);
      if (entry.awaited) {
        this.waits.delete(token);
      } else {
        // early resolve: keep the entry, result attached, for the late waiter
        this.earlyWaitResolves++;
      }
      return true;
    },

    resolveTopWait: function (kind, result) {
      var stack = this.waitStacks[kind];
      if (!stack || stack.length === 0) return false;
      return this.resolveWait(stack[stack.length - 1], result);
    },

    pendingWaits: function (kind) {
      var stack = this.waitStacks[kind];
      return stack ? stack.length : 0;
    },

    dead: false,
    // --- E-8: admission gate for delayed worker/MEMFS completions -----------
    // `terminal` means the wasm instance TRAPPED (WebAssembly.RuntimeError,
    // or emscripten's abort — which throws a RuntimeError itself and is also
    // latched authoritatively via Module.onAbort → terminalize): the heap may
    // be mid-mutation, so no further native work (malloc / heap stores / FS
    // writes) may run and no parked frame may be resumed into it. Distinct
    // from `dead` (orderly shutdown). One-way.
    terminal: false,
    canTouchNative: function () { return !this.dead && !this.terminal; },
    // Public one-way latch (also wired from boot's Module.onAbort — the
    // authoritative abort notification).
    terminalize: function (site, e) {
      if (this.terminal) return;
      this.terminal = true;
      this._note("terminal", site, 0);
      console.error("[wx-scheduler] instance is terminal (" + site
        + ") — all further native completions are inert: " + (e || ""));
    },
    _terminalizeNativeTrap: function (site, e) {
      // Structural signals only: a genuine engine trap in this same-realm
      // prepare/entry IS a WebAssembly.RuntimeError instance; the duck-typed
      // name fallback survives realm loss on a relayed error object. The old
      // message-substring sniff ('Aborted(', 'index out of bounds', …) only
      // added false positives — any plain JS error QUOTING such text bricked
      // a healthy instance permanently.
      var isTrap = (typeof WebAssembly !== "undefined"
            && WebAssembly.RuntimeError
            && e instanceof WebAssembly.RuntimeError)
        || !!(e && e.name === "RuntimeError");
      if (!isTrap) return false;
      this.terminalize(site, e);
      return true;
    },
    // The one admission boundary for delayed completions that both touch
    // native state and wake a parked waiter (the four worker/MEMFS completion
    // sites: OCC export, OCC model, ngspice request, ngspice vector).
    // `prepare` runs IMMEDIATELY, never queued — it owns the parked waiter's
    // output pointers, and queuing it behind anything can deadlock the very
    // frame this completion wakes. Disposition (every drop is loud, never
    // silent):
    //   stale/unknown token        -> drop + warn (late frame from a retired
    //                                 worker generation)
    //   dead or terminal instance  -> drop + warn, DO NOT resolve — resolving
    //                                 resumes the suspended frame INSIDE the
    //                                 damaged module
    //   prepare() traps            -> latch terminal, DO NOT resolve
    //   prepare() throws plain JS  -> resolve inertResult (fail the wait
    //                                 rather than strand its parked frame in
    //                                 a healthy instance)
    runWaitCompletion: function (site, token, prepare, inertResult) {
      var entry = this.waits.get(token);
      if (!entry || entry.resolved) {
        console.warn("[wx-scheduler] " + site + ": completion for stale wait "
          + token + " dropped");
        this._note("staleCompletion", site, token);
        return false;
      }
      if (!this.canTouchNative()) {
        console.warn("[wx-scheduler] " + site + ": completion dropped ("
          + (this.terminal ? "terminal" : "dead") + " instance)");
        this._note("inertCompletion", site, token);
        return false;
      }
      var result;
      try {
        result = prepare();
      } catch (e) {
        if (this._terminalizeNativeTrap(site, e)) {
          this._note("completionTrap", site, token);
          return false;
        }
        console.error("[wx-scheduler] " + site + ": completion failed: " + e);
        this._note("completionError", site, token);
        this.resolveWait(token, inertResult == null ? 0 : inertResult | 0);
        return false;
      }
      this.resolveWait(token, result | 0);
      return true;
    },
    shutdown: function (why) {
      this.dead = true;
      // S6 teardown contract: queued-but-
      // undelivered mutators FAIL LOUDLY instead of hanging their callers,
      // and undelivered mailbox messages drop — the pumps stop themselves on
      // the dead flag.
      var q = this.mutatorQueue.splice(0, this.mutatorQueue.length);
      for (var i = 0; i < q.length; i++) {
        try { q[i].reject(new Error("wx scheduler shutdown: " + why)); } catch (e) { /* reject never throws */ }
      }
      this.mailbox.length = 0;
      var stranded = this.waits.size;
      if (stranded) {
        console.warn("[wx-scheduler] shutdown (" + why + ") stranded:" + stranded);
      } else {
        // teardown-gate contract (e2e/app-quit.spec.ts): a clean exit must
        // SAY so on the console
        console.log("[wx-scheduler] shutdown (" + why + ") clean");
      }
      this._note("shutdown", why, stranded);
    },

    // --- activation tracking + shadow-stack discipline ---------------------
    //
    // Window model (JS is single-threaded, so this is exact):
    //   * FIRST window — a promising export runs synchronously from its JS
    //     caller until first suspend or completion. It is a real JS call
    //     frame, so _actStack (push in the wrap, pop in its finally) mirrors
    //     the JS stack exactly, including exports entered synchronously from
    //     inside a resumed window.
    //   * RESUMED window — the engine re-enters a suspended activation from a
    //     promise reaction. There is NO JS frame of ours around it, so it is
    //     tracked by _windowLive instead.
    //   The wasm code executing at any suspension therefore belongs to
    //   _actStack's top when non-empty, else to _windowLive.
    //
    // Discipline: GREEN-REGION (per-activation spill-stack region + SP swap
    // at the window boundaries), the same leg of the jspi-stack red/green
    // bake-off the libcontext JSPI backend uses. NOT green-copy: a snapshot/
    // restore of the suspended range rolls back writes that OTHER activations
    // legitimately made into the parked frames' locals — a stack-allocated
    // wxDialog whose EndModal (from another tick's window) cleared
    // m_isShowingModal would have the flag restored to true at resume, and
    // its destructor then fires EndModal(wxID_CANCEL) into some OUTER modal's
    // wait (observed as the triple-modal LIFO failure). With a region per
    // activation nothing else ever executes on a parked activation's stack,
    // so cross-activation writes persist and nothing needs copying.
    //
    // Resume TURNSTILE: SP swaps must happen (a) only at microtask
    // boundaries (never while wasm frames are live on the JS stack) and
    // (b) for at most ONE activation between wasm re-entries — between our
    // swap and the engine's actual re-entry other microtasks still run, and
    // a second swap would redirect it. So ready resumes queue in
    // _resumeReady and _pumpResume (microtask-scheduled only) arms exactly
    // one and resolves its gate; the engine's re-entry is the only reaction
    // on that gate. The next pump happens when that window ENDS — its next
    // suspension or its completion — both of which we observe.
    _actSeq: 0,
    _actStack: [],        // records of FIRST windows currently on the JS stack
    _suspended: new Map(),// actId -> record, while suspended (dump/watchdog)
    _windowLive: null,    // record whose RESUMED window is executing (or armed)
    _resumeReady: [],     // FIFO of {rec, gate} whose wait promise resolved

    _sp: function () { return Module["stackSave"](); },
    _setSp: function (v) { Module["stackRestore"](v); },

    _top: function () {
      return this._actStack.length
          ? this._actStack[this._actStack.length - 1]
          : null;
    },

    // Per-activation spill-stack regions, pooled (malloc'd from the wasm
    // heap; wx dispatch chains are shallow compared to tool coroutines —
    // the deep KiCad tool bodies run on libcontext's own 256K regions).
    // PARKER_REGION_BYTES for the embind load chains (kicadOpenFile parses
    // whole boards on this stack).
    // KiCad dispatch chains and board loads run DEEP (a full board parse
    // happens on the parker's region; a paint dispatch can recurse through
    // tool handlers) — an overflowing region scribbles the heap below it and
    // kills the renderer. Regions are pooled, so generous sizes cost little.
    REGION_BYTES: 1024 * 1024,
    PARKER_REGION_BYTES: 8 * 1024 * 1024,
    _regionPool: {},      // size -> [regions]
    // This file is a --pre-js, so the glue's bare _malloc/_free are in scope
    // at call time; Module["_malloc"] is the fallback for glue shapes that
    // attach them there instead.
    _mallocFn: function () {
      return (typeof _malloc === "function") ? _malloc : Module["_malloc"];
    },
    _freeFn: function () {
      return (typeof _free === "function") ? _free : Module["_free"];
    },
    _regionAlloc: function (size) {
      var pool = (this._regionPool[size] = this._regionPool[size] || []);
      var r = pool.pop();
      if (r) return r;
      var base = this._mallocFn()(size);
      if (!base) throw new Error("[wx-scheduler] region alloc failed (" + size + ")");
      // A JS-initiated _malloc can GROW wasm memory, and glue code holding
      // pre-growth views then writes into a detached buffer (observed: the
      // fd_write out-param never landing, musl's __stdio_write retrying a
      // 0-byte writev forever). Refresh the glue's views immediately; the
      // install-time preallocation below makes this path rare to begin with.
      try {
        if (typeof updateMemoryViews === "function" && typeof wasmMemory !== "undefined"
            && typeof HEAPU8 !== "undefined" && HEAPU8.buffer !== wasmMemory.buffer) {
          updateMemoryViews();
        }
      } catch (e) { /* non-glue host (unit tests) */ }
      // The wasm C stack REQUIRES 16-byte alignment; wasm32 malloc only
      // guarantees 8. A region top at base+size can be 8 (mod 16), and a
      // misaligned SP skews every alignment-derived address in the
      // activation by 8 (observed: EM_ASM's readEmAsmArgs assert, and musl
      // __stdio_write passing an iov pointer 8 below the array it populated
      // -> an infinite 0-byte writev retry loop wedging the main thread).
      // Align the top DOWN; the lost <16 bytes are spare.
      return { base: base, top: (base + size) & ~15, size: size };
    },
    // Fill the pools while nothing is suspended (runtime init): any memory
    // growth this causes happens at a safe boundary instead of mid-window.
    _preallocRegions: function (haveParkers) {
      // Host without a wasm heap (the vitest fake runtime): nothing to fill.
      if (typeof this._mallocFn() !== "function") return;
      var i, rs = [];
      for (i = 0; i < 8; i++) rs.push(this._regionAlloc(this.REGION_BYTES));
      if (haveParkers) for (i = 0; i < 2; i++) rs.push(this._regionAlloc(this.PARKER_REGION_BYTES));
      for (i = 0; i < rs.length; i++) this._regionFree(rs[i]);
    },
    _regionFree: function (r) {
      var pool = (this._regionPool[r.size] = this._regionPool[r.size] || []);
      if (pool.length < 8) pool.push(r);
      else this._freeFn()(r.base);
    },

    // Wrap one promising export so the shim tracks its windows and gives the
    // activation its own spill region. The returned promise
    // (WebAssembly.promising exports and embind async() invokers always
    // return one) settles when the ACTIVATION completes — that frees the
    // region and un-parks the turnstile.
    _wrapPromising: function (name, fn, regionBytes) {
      var S = this;
      var bytes = regionBytes || S.REGION_BYTES;
      return function () {
        var enclosingSp = S._sp();
        var region = S._regionAlloc(bytes);
        var rec = {
          id: ++S._actSeq,
          kind: name,
          region: region,
          entrySp: region.top,
          suspendedAt: 0
        };
        S._actStack.push(rec);
        S._setSp(region.top);
        var out;
        try {
          out = fn.apply(this, arguments);
        } finally {
          var popped = S._actStack.pop();
          if (popped !== rec) {
            console.warn("[wx-scheduler] activation stack imbalance at " + name);
          }
          // First window over (completed, suspended, or threw): the caller
          // continues on the enclosing stack either way.
          S._setSp(enclosingSp);
          if (!(out && typeof out.then === "function")) {
            // sync throw or non-promise return: the activation is over now
            S._endActivation(rec);
          }
        }
        if (out && typeof out.then === "function") {
          out.then(
            function () { S._endActivation(rec); },
            function () { S._endActivation(rec); }
          );
        }
        return out;
      };
    },

    _endActivation: function (rec) {
      this._suspended.delete(rec.id);
      if (this._windowLive === rec) {
        // completed from a RESUMED window: wasm's epilogue left SP at the
        // region top — put the enclosing stack back before anything else
        // enters wasm.
        this._windowLive = null;
        if (rec.enclosingSp !== undefined) this._setSp(rec.enclosingSp);
      }
      if (rec.region) {
        this._regionFree(rec.region);
        rec.region = null;
      }
      var S = this;
      queueMicrotask(function () { S._pumpResume(); });
    },

    _pumpResume: function () {
      // `terminal` too: a queued wake must never re-enter a trapped module —
      // resuming swaps SP into (and runs wasm on) a heap that may be
      // mid-mutation. Freezing the pump on a terminal instance is by design:
      // the fatal overlay owns the page from here.
      if (this.dead || this.terminal) return;
      if (this._windowLive) {
        // Self-heal: an activation that suspended RAW (bypassing the shim)
        // or completed untracked never ends its window here; without this
        // the pump would refuse resumes forever. Anything armed >2s while
        // resumes queue is such a leak — clear it loudly. (A window whose
        // wasm is genuinely executing can't be observed here at all: the
        // pump only runs between JS jobs.)
        var w = this._windowLive;
        if (w.windowArmedAt && Date.now() - w.windowArmedAt > 2000
            && this._resumeReady.length) {
          console.warn("[wx-scheduler] force-clearing stuck window act "
            + w.id + ":" + w.kind + " — some suspension bypassed the shim");
          this._note("forceClearWindow", w.kind, w.id);
          this._windowLive = null;
        } else {
          return;
        }
      }
      if (this._resumeReady.length === 0) return;
      var e = this._resumeReady.shift();
      var rec = e.rec;
      if (rec.dead) {
        // Quarantined (coroutine released while parked): the body's C++ is
        // freed — a late wake must never re-enter it. Drop the wake; the
        // gate promise parks the leaked activation forever (censused C-side).
        console.warn("[wx-scheduler] dropping wake for quarantined " + rec.id);
        this._note("deadWakeDropped", rec.kind, rec.id);
        var S = this;
        queueMicrotask(function () { S._pumpResume(); });
        return;
      }
      this._suspended.delete(rec.id);
      rec.suspendedAt = 0;
      // Arm the window: remember the enclosing stack (to put back when this
      // window ends) and point SP back into the activation's own region,
      // exactly where it suspended.
      rec.enclosingSp = this._sp();
      rec.windowArmedAt = Date.now();
      // Truthful attribution for the resumed slice's NEXT suspension: after
      // a foreign wake a coroutine re-enters through plain C with nothing on
      // the path to re-arm g_current (own-yield resumes re-set it C-side —
      // idempotent with this). Before the SP swap: make_current has real
      // frames (registry lookup) and must run on the enclosing stack.
      this._libctxMakeCurrent(rec.lcid || 0);
      this._setSp(rec.sp);
      this._windowLive = rec;
      // The engine's re-entry is the only reaction on the gate; microtasks
      // queued before it can only enqueue further resumes (no SP swaps —
      // _windowLive is set), so SP survives untouched until wasm runs.
      if (e.rejected) e.gate.reject(e.value);
      else e.gate.resolve(e.value);
    },

    // Untracked activations (main — the runtime calls it before the wraps
    // exist — and libctx coroutine bodies doing FOREIGN yields like
    // sleepYield) get a FRESH anonymous record per suspension. Not a shared
    // singleton: main is eternally parked on its frame yield, and a
    // singleton would let a coroutine's suspension overwrite main's saved
    // SP (cross-wired resumes). An uncontended activation like main still
    // keeps a stable identity naturally: its next suspension is attributed
    // to its own live window (rec === _windowLive) and reuses the record.
    _anonSeq: 0,

    // Route a suspension through the turnstile. No byte copying: the
    // activation's frames live in its own region (main: the central stack)
    // and stay valid while parked; only the shared SP global is handed back
    // and forth.
    _suspendOn: function (p, kind, token) {
      var S = this;
      // A FOREIGN yield from inside a KiCad coroutine body belongs to the
      // COROUTINE's activation — the wx entry that entered it is still on
      // the JS stack and must not be double-booked (its own libctx-enter
      // suspension already owns that record).
      var lcid = 0;
      try {
        lcid = (typeof _pcbjam_libctx_current === "function") ? _pcbjam_libctx_current()
             : (Module["_pcbjam_libctx_current"] ? Module["_pcbjam_libctx_current"]() : 0);
      } catch (e) { /* pre-runtime */ }
      var rec;
      if (lcid) {
        rec = S._libctxRecs[lcid] || (S._libctxRecs[lcid] = {
          id: "lc" + lcid, kind: "libctx", region: null,
          entrySp: S._sp(), suspendedAt: 0, libctx: true, lcid: lcid
        });
      } else {
        rec = S._actStack.length ? S._top() : S._windowLive;
      }
      if (!rec) {
        rec = {
          id: --S._anonSeq, kind: "untracked", region: null,
          entrySp: S._sp(), suspendedAt: 0, anon: true
        };
      }
      rec.sp = S._sp();
      rec.suspendedAt = Date.now();
      rec.waitKind = kind;
      rec.waitToken = token;
      S._suspended.set(rec.id, rec);
      // A coroutine that parks stops being the "current context": whatever
      // the event loop runs next would otherwise attribute ITS suspensions
      // to this parked coroutine (g_current dangles — no C code runs on the
      // unwind path). The arm below re-establishes it on resume.
      if (lcid) S._libctxMakeCurrent(0);
      if (S._windowLive === rec) {
        // a RESUMED window just suspended again — its window ends here; put
        // the enclosing stack back for whatever runs next.
        S._windowLive = null;
        if (rec.enclosingSp !== undefined) S._setSp(rec.enclosingSp);
        queueMicrotask(function () { S._pumpResume(); });
      }
      // (a FIRST window's end — including its SP hand-back — is the wrap's
      // finally; the completion hook frees the region.)
      var gate = {};
      gate.promise = new Promise(function (res, rej) {
        gate.resolve = res;
        gate.reject = rej;
      });
      p.then(
        function (v) {
          S._resumeReady.push({ rec: rec, gate: gate, value: v, rejected: false });
          queueMicrotask(function () { S._pumpResume(); });
        },
        function (err) {
          S._resumeReady.push({ rec: rec, gate: gate, value: err, rejected: true });
          queueMicrotask(function () { S._pumpResume(); });
        }
      );
      return gate.promise;
    },

    // --- libcontext (KiCad coroutine) turnstile integration ----------------
    // The coroutine backend manages its own spill REGIONS and SP save/restore
    // around its awaits, but its engine-level resumes must still be
    // SERIALIZED with everyone else's: un-turnstiled, the microtask that
    // restores the coroutine's SP can interleave with a turnstile arm, and
    // whichever runs last wins — the resumed wasm then spills into another
    // activation's region (observed: PCB_SELECTION_TOOL's first Wait()
    // trapping "memory access out of bounds" in Chromium, engine-ordering
    // dependent). The coroutine's ENTER/RESUME awaits suspend the CALLING wx
    // activation and route through promiseYield; the YIELD suspends the
    // COROUTINE'S OWN activation and uses these two hooks instead (explicit
    // SP, no _actStack attribution — at yield time the stack top is the
    // caller, not the coroutine).
    _libctxRecs: {},
    // Re-point the C-side g_current at the activation being armed (0 = root).
    // Leaf export; absent on heapless hosts (vitest) and pre-runtime — no-op.
    _libctxMakeCurrent: function (lcid) {
      try {
        if (typeof _pcbjam_libctx_make_current === "function") _pcbjam_libctx_make_current(lcid);
        else if (typeof Module !== "undefined" && Module["_pcbjam_libctx_make_current"]) Module["_pcbjam_libctx_make_current"](lcid);
      } catch (e) { /* pre-runtime */ }
    },
    libctxSuspend: function (id, p, sp) {
      var S = this;
      var rec = S._libctxRecs[id] || (S._libctxRecs[id] = {
        id: "lc" + id, kind: "libctx", region: null,
        entrySp: sp, suspendedAt: 0, libctx: true, lcid: id
      });
      rec.sp = sp;
      rec.suspendedAt = Date.now();
      rec.waitKind = "libctx";
      rec.waitToken = 0;
      S._suspended.set(rec.id, rec);
      // Parked: clear the C-side current-context pointer (see _suspendOn).
      S._libctxMakeCurrent(0);
      if (S._windowLive === rec) {
        S._windowLive = null;
        if (rec.enclosingSp !== undefined) S._setSp(rec.enclosingSp);
        queueMicrotask(function () { S._pumpResume(); });
      }
      var gate = {};
      gate.promise = new Promise(function (res, rej) {
        gate.resolve = res;
        gate.reject = rej;
      });
      p.then(
        function (v) {
          S._resumeReady.push({ rec: rec, gate: gate, value: v, rejected: false });
          queueMicrotask(function () { S._pumpResume(); });
        },
        function (err) {
          S._resumeReady.push({ rec: rec, gate: gate, value: err, rejected: true });
          queueMicrotask(function () { S._pumpResume(); });
        }
      );
      return gate.promise;
    },
    // Coroutine released while parked (quarantine contract): mark the record
    // dead so the pump drops any late wake (never re-enter the freed body),
    // and forget it. The rec object itself stays reachable from pending
    // p.then closures — the dead flag is what protects those paths.
    libctxQuarantine: function (id) {
      var rec = this._libctxRecs[id];
      if (!rec) return;
      rec.dead = true;
      this._suspended.delete(rec.id);
      if (this._windowLive === rec) {
        // Released from within its own running slice: that slice's wasm is
        // executing on this region RIGHT NOW — restoring the enclosing SP
        // here would yank the stack out from under it. Just drop the window
        // marker; the turnstile moves on when this job ends. (g_current is
        // reset C-side by release_fcontext.)
        console.warn("[wx-scheduler] quarantine of the LIVE window lc" + id
          + " — self-release mid-slice; skipping SP restore");
        this._windowLive = null;
      }
      delete this._libctxRecs[id];
      this._note("libctxQuarantine", "libctx", rec.id);
      var S = this;
      queueMicrotask(function () { S._pumpResume(); });
    },
    // Coroutine's entry activation completed (finished or trapped): end its
    // window so the turnstile moves on.
    libctxEnd: function (id) {
      var S = this;
      var rec = S._libctxRecs[id];
      if (!rec) return;
      S._suspended.delete(rec.id);
      if (S._windowLive === rec) {
        S._windowLive = null;
        if (rec.enclosingSp !== undefined) S._setSp(rec.enclosingSp);
      }
      delete S._libctxRecs[id];
      queueMicrotask(function () { S._pumpResume(); });
    },

    // Suspension helpers the wx EM_ASYNC_JS bodies route through, so every
    // park shares the one discipline implementation.
    frameYield: function () {
      return this._suspendOn(
        new Promise(function (r) { requestAnimationFrame(function () { r(0); }); }),
        "frame", 0);
    },
    sleepYield: function (ms) {
      return this._suspendOn(
        new Promise(function (r) { setTimeout(function () { r(0); }, ms); }),
        "sleep", 0);
    },
    promiseYield: function (p, kind) {
      return this._suspendOn(Promise.resolve(p), kind || "promise", 0);
    },

    // Called once the runtime is up: wrap the app's promising entry exports.
    // The list mirrors -sJSPI_EXPORTS (main excluded: the runtime calls it
    // before this hook can matter, and boot suspensions predate any tracked
    // activation anyway — see _suspendOn's null-rec path).
    installExportWraps: function (names) {
      var wrapped = 0;
      for (var i = 0; i < names.length; i++) {
        var key = "_" + names[i];
        if (typeof Module[key] === "function") {
          Module[key] = this._wrapPromising(names[i], Module[key]);
          wrapped++;
        }
      }
      this._note("wrapped", "exports", wrapped);
      return wrapped;
    },

    // --- observability ------------------------------------------------------
    _ring: [],
    _note: function (ev, a, b) {
      this._ring.push([Date.now(), ev, String(a), b | 0]);
      if (this._ring.length > RING_CAP) this._ring.shift();
    },

    dump: function () {
      var acts = [];
      this._suspended.forEach(function (rec) {
        acts.push({
          id: rec.id, kind: rec.kind, waitKind: rec.waitKind || null,
          token: rec.waitToken || 0,
          suspendedMs: rec.suspendedAt ? Date.now() - rec.suspendedAt : 0
        });
      });
      return {
        dead: this.dead,
        waitsBegun: this.waitsBegun,
        waitsResolved: this.waitsResolved,
        earlyWaitResolves: this.earlyWaitResolves,
        pendingWaits: this.waits.size,
        runningActivations: this._actStack.length,
        suspendedActivations: acts,
        mutatorsWrapped: this.mutatorsWrapped,
        mutatorsDelivered: this.mutatorsDelivered,
        mutatorQueueDepth: this.mutatorQueue.length,
        ring: this._ring.slice(-64)
      };
    }
  };

  globalThis.__wxScheduler = S;
  globalThis.__wxSchedulerInstalled = true; // wxWasmSchedulerAssertInstalled probe

  // --- diagnostic signals ---------------------------------------------------
  // SuspendError attributor: a SuspendError means a PLAIN (non-promising)
  // wasm entry tried to park — a missed -sJSPI_EXPORTS/installExportWraps
  // entry. The engine cannot say WHICH export, but the live dump (what was
  // wrapped, what was executing) is exactly the targeting data needed.
  if (typeof addEventListener === "function") {
    var suspendErr = function (m) {
      if (!m || !/suspend/i.test(String(m))) return;
      console.error("[wx-scheduler] SuspendError: a NON-promising wasm entry "
        + "tried to park — add the missing entry export to -sJSPI_EXPORTS and "
        + "installExportWraps. dump=" + JSON.stringify(S.dump()));
    };
    addEventListener("unhandledrejection", function (ev) {
      suspendErr(ev && ev.reason && (ev.reason.message || ev.reason));
    });
    addEventListener("error", function (ev) {
      suspendErr(ev && (ev.message || (ev.error && ev.error.message)));
    });
  }
  // Lost-wake watchdog: an activation parked on a TOKEN wait whose registry
  // entry is GONE (resolved+consumed or never registered) can never be
  // resumed — a lost wake. Frame/sleep parks are excluded (a hidden tab
  // legitimately parks the frame yield for minutes).
  setInterval(function () {
    if (S.dead) return;
    S._suspended.forEach(function (rec) {
      if (!rec.waitToken || rec.waitKind === "frame" || rec.waitKind === "sleep") return;
      if (rec.suspendedAt && Date.now() - rec.suspendedAt > 30000
          && !S.waits.has(rec.waitToken) && !rec._lostWakeWarned) {
        rec._lostWakeWarned = true;
        console.warn("[wx-scheduler] LOST WAKE: act " + rec.id + ":" + rec.kind
          + " parked " + Math.round((Date.now() - rec.suspendedAt) / 1000)
          + "s on " + rec.waitKind + "/" + rec.waitToken
          + " but the wait is no longer registered");
      }
    });
  }, 10000);
  globalThis.__wxWaitDump = function () { return S.dump(); };

  // Self-install the activation wraps once the runtime is up (this file ships
  // as a --pre-js, so Module exists here). The name set mirrors the
  // suspension-capable half of -sJSPI_EXPORTS; absent names are skipped.
  if (typeof Module !== "undefined") {
    var prevInit = Module["onRuntimeInitialized"];
    Module["onRuntimeInitialized"] = function () {
      if (prevInit) prevInit();
      S.installExportWraps([
        "wx_dom_event", "wx_dom_mouse", "wx_window_close", "wx_window_move",
        "wx_window_resize", "ProcessEvents", "wxWasmMailboxTick",
        "wxWasmTopLevelTick", "wxWasmJobTick"
      ]);
      // KiCad-only surfaces; both installers skip absent names, so the wx
      // test apps (no embind) pass through here untouched.
      var parkers = S._wrapParkers();
      S._wrapMutators();
      S._preallocRegions(parkers > 0);
    };
  }
})();

// end include: /private/tmp/aven-wasm-spike/support/jspi-scheduler.js
// include: /private/tmp/aven-wasm-spike/wxwidgets/build/wasm/wx.js
// Element Registry for E2E Tests
// Tracks all wxWindow instances with their positions for automated testing
(function() {
  if (typeof window !== 'undefined' && typeof window.wxElementRegistry === 'undefined') {
    window.wxElementRegistry = {
      elements: new Map(),
      version: 0,

      register: function(id, info) {
        this.elements.set(id, info);
        this.version++;
      },

      update: function(id, updates) {
        var elem = this.elements.get(id);
        if (elem) {
          Object.assign(elem, updates);
          elem.lastUpdated = Date.now();
          this.version++;
        }
      },

      unregister: function(id) {
        this.elements.delete(id);
        this.version++;
      },

      findByLabel: function(label, options) {
        options = options || {};
        var results = [];
        var exact = options.exact || false;
        var visibleOnly = options.visible !== false;

        this.elements.forEach(function(elem) {
          if (visibleOnly && !elem.visible) return;
          if (options.enabled && !elem.enabled) return;
          if (options.type && elem.typeName !== options.type) return;

          var matches = exact
            ? elem.label === label
            : elem.label.indexOf(label) !== -1;
          if (matches) results.push(elem);
        });

        return results;
      },

      findByName: function(name, options) {
        options = options || {};
        var results = [];
        var exact = options.exact || false;
        var visibleOnly = options.visible !== false;

        this.elements.forEach(function(elem) {
          if (visibleOnly && !elem.visible) return;
          if (options.enabled && !elem.enabled) return;
          if (options.type && elem.typeName !== options.type) return;

          var matches = exact
            ? elem.name === name
            : elem.name.indexOf(name) !== -1;
          if (matches) results.push(elem);
        });

        return results;
      },

      findByType: function(typeName, options) {
        options = options || {};
        var results = [];
        var visibleOnly = options.visible !== false;

        this.elements.forEach(function(elem) {
          if (visibleOnly && !elem.visible) return;
          if (options.enabled && !elem.enabled) return;
          if (elem.typeName === typeName) results.push(elem);
        });

        return results;
      },

      findAll: function(filter) {
        filter = filter || {};
        var results = [];
        var visibleOnly = filter.visible !== false;

        this.elements.forEach(function(elem) {
          if (visibleOnly && !elem.visible) return;
          if (filter.enabled && !elem.enabled) return;
          if (filter.type && elem.typeName !== filter.type) return;
          if (filter.label && elem.label.indexOf(filter.label) === -1) return;
          if (filter.name && elem.name.indexOf(filter.name) === -1) return;
          results.push(elem);
        });

        return results;
      },

      getElement: function(id) {
        return this.elements.get(id) || null;
      },

      dump: function() {
        console.log('[wxElementRegistry] Elements:', this.elements.size);
        this.elements.forEach(function(elem) {
          console.log('  ' + elem.id + ': ' + elem.typeName + ' "' + elem.label + '" at (' + elem.screenX + ',' + elem.screenY + ') ' + elem.width + 'x' + elem.height);
        });
      },

      getStats: function() {
        var stats = { total: 0, byType: {} };
        this.elements.forEach(function(elem) {
          stats.total++;
          stats.byType[elem.typeName] = (stats.byType[elem.typeName] || 0) + 1;
        });
        return stats;
      },

      // ========== Rendered Elements (toolbar tools, menu items, etc.) ==========
      renderedElements: new Map(),
      renderedVersion: 0,

      registerRendered: function(id, info) {
        this.renderedElements.set(id, info);
        this.renderedVersion++;
      },

      updateRendered: function(id, updates) {
        var elem = this.renderedElements.get(id);
        if (elem) {
          Object.assign(elem, updates);
          elem.lastUpdated = Date.now();
          this.renderedVersion++;
        }
      },

      unregisterRendered: function(id) {
        this.renderedElements.delete(id);
        this.renderedVersion++;
      },

      unregisterRenderedByParent: function(parentId) {
        var toDelete = [];
        var self = this;
        this.renderedElements.forEach(function(elem, key) {
          if (elem.parentId === parentId) {
            toDelete.push(key);
          }
        });
        toDelete.forEach(function(key) {
          self.renderedElements.delete(key);
        });
        if (toDelete.length > 0) this.renderedVersion++;
      },

      findRenderedByLabel: function(label, options) {
        options = options || {};
        var results = [];
        var exact = options.exact || false;

        this.renderedElements.forEach(function(elem) {
          if (options.enabled !== undefined && elem.enabled !== options.enabled) return;
          if (options.elementType && elem.elementType !== options.elementType) return;
          if (options.subType && elem.subType !== options.subType) return;
          if (options.parentId && elem.parentId !== options.parentId) return;

          var elemLabel = elem.label || elem.tooltip || '';
          var matches = exact
            ? elemLabel === label
            : elemLabel.indexOf(label) !== -1;
          if (matches) results.push(elem);
        });

        return results;
      },

      findRenderedByType: function(elementType, options) {
        options = options || {};
        var results = [];

        this.renderedElements.forEach(function(elem) {
          if (elem.elementType !== elementType) return;
          if (options.enabled !== undefined && elem.enabled !== options.enabled) return;
          if (options.subType && elem.subType !== options.subType) return;
          if (options.parentId && elem.parentId !== options.parentId) return;
          results.push(elem);
        });

        return results;
      },

      findRenderedByParent: function(parentId, options) {
        options = options || {};
        var results = [];

        this.renderedElements.forEach(function(elem) {
          if (elem.parentId !== parentId) return;
          if (options.enabled !== undefined && elem.enabled !== options.enabled) return;
          if (options.elementType && elem.elementType !== options.elementType) return;
          if (options.subType && elem.subType !== options.subType) return;
          results.push(elem);
        });

        return results;
      },

      findAllRendered: function(filter) {
        filter = filter || {};
        var results = [];

        this.renderedElements.forEach(function(elem) {
          if (filter.enabled !== undefined && elem.enabled !== filter.enabled) return;
          if (filter.elementType && elem.elementType !== filter.elementType) return;
          if (filter.subType && elem.subType !== filter.subType) return;
          if (filter.parentId && elem.parentId !== filter.parentId) return;
          if (filter.label) {
            var elemLabel = elem.label || elem.tooltip || '';
            if (elemLabel.indexOf(filter.label) === -1) return;
          }
          results.push(elem);
        });

        return results;
      },

      dumpRendered: function() {
        console.log('[wxElementRegistry] Rendered Elements:', this.renderedElements.size);
        this.renderedElements.forEach(function(elem) {
          console.log('  ' + elem.id + ': ' + elem.elementType + '/' + elem.subType + ' "' + (elem.label || elem.tooltip || '') + '" at (' + elem.screenX + ',' + elem.screenY + ') ' + elem.width + 'x' + elem.height);
        });
      },

      getRenderedStats: function() {
        var stats = { total: 0, byType: {} };
        this.renderedElements.forEach(function(elem) {
          stats.total++;
          var key = elem.elementType + '/' + elem.subType;
          stats.byType[key] = (stats.byType[key] || 0) + 1;
        });
        return stats;
      }
    };
  }
})();

// Helper functions called from C++ via EM_ASM
function wxElementRegister(id, label, name, typeName, screenX, screenY, width, height, parentId, visible, enabled, topLevelId) {
  if (window.wxElementRegistry) {
    window.wxElementRegistry.register(id, {
      id: id,
      label: label,
      name: name,
      typeName: typeName,
      screenX: screenX,
      screenY: screenY,
      width: width,
      height: height,
      centerX: screenX + Math.floor(width / 2),
      centerY: screenY + Math.floor(height / 2),
      parentId: parentId,
      // The owning frame/dialog (wxGetTopLevelParent) — containers between
      // are not registered, so parentId chains stop short of it.
      topLevelId: topLevelId,
      visible: visible,
      enabled: enabled,
      lastUpdated: Date.now()
    });
  }
}

function wxElementUpdate(id, label, name, typeName, screenX, screenY, width, height, parentId, visible, enabled, topLevelId) {
  if (window.wxElementRegistry) {
    var elem = window.wxElementRegistry.elements.get(id);
    if (elem) {
      elem.label = label;
      elem.name = name;
      elem.typeName = typeName;
      elem.screenX = screenX;
      elem.screenY = screenY;
      elem.width = width;
      elem.height = height;
      elem.centerX = screenX + Math.floor(width / 2);
      elem.centerY = screenY + Math.floor(height / 2);
      elem.parentId = parentId;
      elem.topLevelId = topLevelId;
      elem.visible = visible;
      elem.enabled = enabled;
      elem.lastUpdated = Date.now();
      window.wxElementRegistry.version++;
    }
  }
}

function wxElementUnregister(id) {
  if (window.wxElementRegistry) {
    window.wxElementRegistry.unregister(id);
  }
}

// Helper functions for rendered elements (called from C++ via EM_ASM)
function wxRenderedElementRegister(id, parentId, elementType, subType, label, tooltip, screenX, screenY, width, height, enabled, index, userId) {
  if (window.wxElementRegistry) {
    var info = {
      id: id,
      parentId: parentId,
      elementType: elementType,
      subType: subType,
      label: label,
      tooltip: tooltip,
      screenX: screenX,
      screenY: screenY,
      width: width,
      height: height,
      centerX: screenX + Math.floor(width / 2),
      centerY: screenY + Math.floor(height / 2),
      enabled: enabled,
      index: index,
      lastUpdated: Date.now()
    };
    // The item's own id (toolbar tool id), when the paint site passed one.
    if (userId !== undefined) info.userId = userId;
    window.wxElementRegistry.registerRendered(id, info);
  }
}

function wxRenderedElementUpdate(id, screenX, screenY, width, height, enabled) {
  if (window.wxElementRegistry) {
    window.wxElementRegistry.updateRendered(id, {
      screenX: screenX,
      screenY: screenY,
      width: width,
      height: height,
      centerX: screenX + Math.floor(width / 2),
      centerY: screenY + Math.floor(height / 2),
      enabled: enabled
    });
  }
}

function wxRenderedElementUnregister(id) {
  if (window.wxElementRegistry) {
    window.wxElementRegistry.unregisterRendered(id);
  }
}

function wxRenderedElementUnregisterByParent(parentId) {
  if (window.wxElementRegistry) {
    window.wxElementRegistry.unregisterRenderedByParent(parentId);
  }
}

if (typeof navigator !== 'undefined') {
  var browserInfo = (function () {
    var ua = navigator.userAgent;

    var match =
      /(Opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
      /(OPR)[ \/]([\w.]+)/.exec(ua) ||
      /(Edge)[ \/]([\w.]+)/.exec(ua) ||
      /(MSIE) ([\w.]+)/.exec(ua) ||
      /(Chrome)[ \/]([\w.]+)/.exec(ua) ||
      /Version[ \/]([\w.]+) (Safari)/.exec(ua) ||
      /(Safari)[ \/]([\w.]+)/.exec(ua) ||
      /(Firefox)[ \/]([\w.]+)/.exec(ua) ||
      ua.indexOf('compatible') < 0 &&
      /(Mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
      [];

    if (match[2] === 'Safari') {
      return {
        browser: match[2],
        name: match[2],
        version: match[1]
      };
    } else {
      return {
        browser: match[1] || '',
        name: match[1] || '',
        version: match[2] || '0'
      };
    }
  })();

  var isWebkit = function () {
    return browserInfo.name === 'Chrome' || browserInfo.name === 'Safari';
  }

  var platformInfo = (function () {
    var ua = navigator.userAgent;

    var match =
      /(Windows NT) ([\w.]+)/.exec(ua) ||
      /(Mac OS X) ([\w.]+)/.exec(ua) ||
      /(CrOS) \w+ ([\w.]+)/.exec(ua) ||
      /(iPhone); .* OS ([\d_]+)/.exec(ua) ||
      /(iPad); .* OS ([\d_]+)/.exec(ua);

    var name = 'unknown';
    var version = '';

    if (match) {
      name = match[1];
      version = match[2];
    } else {
      var PLATFORMS = ['Android', 'iPhone', 'iPad', 'Windows', 'Macintosh', 'Linux', 'CrOs', 'NetBSD', 'OpenBSD', 'FreeBSD'];

      for (var i = 0; i < PLATFORMS.length; i++) {
        if (ua.indexOf(PLATFORMS[i]) !== -1) {
          name = PLATFORMS[i];
        }
      }
    }

    return {
      name: name,
      version: version
    };
  })();
}

  var openUrl = function(url) {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  var setIcon = function(id) {
    var bitmap = bitmapMap.get(id);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    drawImage(ctx, bitmap, 0, 0);

    var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL('image/png');
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  var displayScaleFactor = null;

  var getDisplayScaleFactor = function () {
    if (displayScaleFactor === null) {
      displayScaleFactor = window.devicePixelRatio >= 1.5 ? 2.0 : 1.0;
    }
    return displayScaleFactor;
  };

  // wx "screen" coords are #canvas-relative CSS px (the mouse-ingress and
  // element-registry contract: emscripten targetX/Y and wx-dom's forwarded
  // events are both computed against #canvas). Positioned window elements
  // live in OTHER CSS frames — absolute children of #window-container, or the
  // viewport for fixed popups — and those frames need not share #canvas's
  // origin (template.html puts #window-container BELOW the canvas, so
  // unanchored windows land a full viewport off-screen). Returns the offset
  // that maps wx screen coords into the element's frame. Measured per call:
  // both rects are viewport-relative so scroll cancels, and no cache means no
  // invalidation bugs. #canvas always exists and has live geometry by the
  // time any secondary window is placed (they are created after runtime
  // init, when the shell has flipped the canvas to display:block).
  var wxScreenBase = function (isFixed) {
    var canvasRect = document.getElementById('canvas').getBoundingClientRect();
    if (isFixed) {
      return { left: canvasRect.left, top: canvasRect.top };
    }
    var containerRect =
        document.getElementById('window-container').getBoundingClientRect();
    return { left: canvasRect.left - containerRect.left,
             top: canvasRect.top - containerRect.top };
  };

  /* wxNonOwnedWindow */

  // Ensure #window-container creates a stacking context so GL canvases
  // render above the 2D #canvas inside #main-window.
  // This runs at script eval, and with -pthread the same script also evaluates
  // inside Web Workers, where `document` doesn't exist — guard or the workers
  // die with "ReferenceError: document is not defined" before the app loads.
  var windowContainer = (typeof document !== 'undefined')
      ? document.getElementById('window-container') : null;
  if (windowContainer) {
    // The app's coordinate anchors (#main-window wrapping #canvas, and
    // #window-container holding secondary windows) must not move with page
    // flow: content above them (the template's status block) collapses when
    // the app starts, and an anchor that shifts AFTER windows were placed
    // strands those windows at stale offsets. A host that positioned the
    // elements itself (the kicad pages pin both at 0,0) is respected; an
    // unpositioned one gets the same pinned-overlay layout enforced here.
    // #window-container also creates a stacking context (z-index:1) so GL
    // canvases render above the 2D #canvas inside #main-window.
    if (document.defaultView.getComputedStyle(windowContainer).position === 'static') {
      windowContainer.style.position = 'absolute';
      windowContainer.style.left = '0';
      windowContainer.style.top = '0';
    }
    windowContainer.style.zIndex = '1';

    // wx-dom controls are absolute children of #main-window carrying
    // wx-screen (canvas-origin) coords, so #main-window must be a positioned
    // element wrapping #canvas at its top-left.
    var mainWindowEl = document.getElementById('main-window');
    if (mainWindowEl &&
        document.defaultView.getComputedStyle(mainWindowEl).position === 'static') {
      mainWindowEl.style.position = 'absolute';
      mainWindowEl.style.left = '0';
      mainWindowEl.style.top = '0';
    }

    // Window-chrome CSS for the divs createWindow() builds (.window /
    // .window.toplevel / .window-canvas). Injected here — the code that creates
    // these elements — so every host (the e2e test pages, the React standalone
    // shell, and the wx build template) gets identical styling from one source
    // instead of pasting it into each page's <style>. pcbjam #22.
    if (!document.getElementById('wx-window-chrome')) {
      var wxStyle = document.createElement('style');
      wxStyle.id = 'wx-window-chrome';
      wxStyle.textContent = [
        '.window {',
        '  position: absolute;',
        '  pointer-events: none;',
        '  z-index: 10;',
        '  background-color: black;',
        '  overflow: hidden;',
        '  width: 0;',
        '  height: 0;',
        '}',
        // Modal dialogs (top-level windows, not popup menus) get a border + drop
        // shadow so they read as raised surfaces. Popup menus style themselves
        // in wx-dom.js and the main frame is #canvas — neither matches
        // .window.toplevel, so neither is affected.
        '.window.toplevel {',
        // outline, not border: a border shifts the padding box (where
        // .window-canvas and wx-dom controls anchor) 1px off the wx model
        // rect; an outline draws outside the box with zero layout effect.
        '  outline: 1px solid #808080;',
        '  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.35);',
        '}',
        // Input barrier for surfaces shadowed by a higher, overlapping
        // top-level window (see recomputeModalBarrier). Each dialog/main-frame
        // control is a real DOM element with pointer-events:auto, so without
        // this a click over an upper window's canvas-drawn area (which is
        // pointer-events:none) still hit-tests the live control beneath it —
        // a dialog's control under a higher dialog, or a main-frame control
        // (e.g. pcbnew's track-width <select>) under a secondary frame like
        // the 3D viewer. Forcing the subtree to pointer-events:none —
        // !important to beat the inline pointer-events:auto wx-dom.js sets on
        // controls — drops the click through to #canvas, where the C++
        // hit-test routes it to the true topmost window. Native wx leans on
        // the OS to block input to shadowed windows; the browser has no such
        // barrier, so we add one here.
        '.wx-inert, .wx-inert * {',
        '  pointer-events: none !important;',
        '}',
        // Per-control barrier under an open popup (combo dropdown etc., see
        // recomputePopupShadow). Kept apart from .wx-inert on purpose: it
        // never sets .inert, so a focused input beneath the popup keeps its
        // focus (blurring it would itself dismiss the popup).
        '.wx-popup-shadowed, .wx-popup-shadowed * {',
        '  pointer-events: none !important;',
        '}',
        '.window-canvas {',
        '  position: absolute;',
        '  top: 0;',
        '  left: 0;',
        '  pointer-events: none;',
        '}',
        // Real DOM title bar for non-main wxFrames (e.g. the 3D viewer). It lives
        // in the top strip of the window-N div with pointer-events:auto, so it
        // wins hit-testing over OTHER frames' DOM controls (it sits inside
        // #window-container (z-index:1), above #main-window's controls). It never
        // overlaps the GL canvas — the GL canvas is positioned the title-bar
        // height BELOW the frame top — so the GL canvas's huge z-index is
        // irrelevant. z-index:11 keeps the bar above the sibling .window-canvas
        // inside window-N's own stacking context (window-N has z-index:10), so it
        // never escapes that context or competes with the GL sentinel z.
        '.window-titlebar {',
        '  position: absolute;',
        '  top: 0;',
        '  left: 0;',
        '  right: 0;',
        '  pointer-events: auto;',
        '  cursor: move;',
        '  z-index: 11;',
        '  display: flex;',
        '  align-items: center;',
        '  box-sizing: border-box;',
        '  background-color: #c8c8c8;',
        '  color: #282828;',
        '  font: bold 12px sans-serif;',
        '  user-select: none;',
        '}',
        '.window-titlebar-text {',
        '  flex: 1;',
        '  padding: 0 6px;',
        '  overflow: hidden;',
        '  text-overflow: ellipsis;',
        '  white-space: nowrap;',
        '}',
        '.window-titlebar-close {',
        '  pointer-events: auto;',
        '  cursor: pointer;',
        '  width: 22px;',
        '  height: 100%;',
        '  border: 0;',
        '  padding: 0;',
        '  background: transparent;',
        '  color: #282828;',
        '  font: bold 15px sans-serif;',
        '  line-height: 1;',
        '}',
        '.window-titlebar-close:hover {',
        '  background-color: #e25a5a;',
        '  color: #ffffff;',
        '}',
        // Edge-resize handles for resizable (wxRESIZE_BORDER) non-main windows.
        // pointer-events:auto + z-index:12 so they win hit-testing inside window-N's
        // own stacking context (above the .window-canvas) AND over other frames'
        // controls (#window-container z-index:1 out-stacks #main-window). Box geometry
        // (top/left/right/bottom/size) is set inline by createWindowResizeHandles so
        // the left/right edges can start below the title bar; CSS carries only the
        // shared bits + per-direction cursor. No top edge/corners: the title bar owns
        // the top strip (move + close), so handles never overlap it.
        '.window-resize-handle {',
        '  position: absolute;',
        '  pointer-events: auto;',
        '  z-index: 12;',
        '}',
        '.window-resize-e { cursor: ew-resize; }',
        '.window-resize-w { cursor: ew-resize; }',
        '.window-resize-s { cursor: ns-resize; }',
        '.window-resize-se { cursor: nwse-resize; z-index: 13; }',
        '.window-resize-sw { cursor: nesw-resize; z-index: 13; }'
      ].join('\n');
      document.head.appendChild(wxStyle);
    }
  }

  var nextWindowId = 0;
  var windowMap = new Map();

  var createWindow = function (id, needsCanvas, isVisible, classList) {
    //console.log('createWindow: ' + id + ' ' + needsCanvas + ' ' + isVisible);

    if (id === -1) {
      id = nextWindowId++;
    }
    
    var window = null;
    var canvas = null;

    if (id === 0) {
      window = document.getElementById('main-window');
      canvas = document.getElementById('canvas');
    } else {
      window = document.createElement('div');
      window.className = classList;
      window.id = 'window-' + id;
      window.style.display = isVisible ? 'block' : 'none';

      // Popup/transient windows (toolbar palettes, color pickers, etc.) are
      // floating overlays. Position them relative to the viewport instead of
      // absolutely within #window-container so they never scroll with page
      // content; setWindowRect maps their wx screen coords to the viewport
      // via wxScreenBase(true) (#canvas's viewport offset).
      if (classList && (' ' + classList + ' ').indexOf(' popup ') !== -1) {
        window.style.position = 'fixed';
      }

      if (needsCanvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'window-canvas';
        window.appendChild(canvas);
      }

      document.getElementById('window-container').appendChild(window);
    }

    windowMap.set(id, {
      window: window,
      canvas: canvas,
      width: 0,
      height: 0,
      imageData: null,
      context: null
    });

    return id;
  };

  var destroyWindow = function (id) {
    var windowData = windowMap.get(id);

    // The window element isn't always a child of #window-container (it may have
    // been moved or never appended), so removeChild() on the container throws
    // NotFoundError — which unwinds out of native callers like OpenProjectFiles
    // and aborts the operation. Use Element.remove(): detaches from whatever
    // parent it has, and is a no-op when unparented.
    if (windowData && windowData.window) windowData.window.remove();
    windowMap.delete(id);
    recomputeModalBarrier();
  };

  // Read-only accessor for the DOM port's control layer (wx-dom.js): native
  // controls attach to their top-level window's container element. No
  // behavior change for the canvas port. (Guarded: with -pthread this script
  // also evaluates in Web Workers, where `window` doesn't exist.)
  if (typeof window !== 'undefined') {
    window.__wxGetWindowElement = function (id) {
      var windowData = windowMap.get(id);
      return windowData ? windowData.window : null;
    };
  }

  var setWindowVisibility = function (id, isVisible) {
    //console.log('setWindowVisibility: ' + id + ': ' + isVisible);

    var windowData = windowMap.get(id);
    windowData.window.style.display = isVisible ? 'block' : 'none';
    recomputeModalBarrier();
  };

  var setWindowRect = function (id, x, y, width, height) {
    //console.log('setWindowRect: ' + id + ' (' + x + ', ' + y + ', ' + width + ', ' + height + ')');

    var windowData = windowMap.get(id);

    var window = windowData.window;
    if (id === 0) {
      // The main window owns #canvas — it DEFINES the wx screen origin.
      window.style.left = x + 'px';
      window.style.top = y + 'px';
    } else {
      var base = wxScreenBase(window.style.position === 'fixed');
      window.style.left = (x + base.left) + 'px';
      window.style.top = (y + base.top) + 'px';
    }
    window.style.width = width + 'px';
    window.style.height = height + 'px';

    // A moved/resized window changes which main-frame controls it shadows.
    wxScheduleBarrierRecompute();

    var canvas = windowData.canvas;

    if (canvas) {
      var scaleFactor = getDisplayScaleFactor();
      var newWidth = width * scaleFactor;
      var newHeight = height * scaleFactor;

      // Only RE-ASSIGN canvas.width/height when the pixel dimensions actually
      // change. Assigning canvas.width/height clears the canvas to transparent
      // (true in both Chrome and Firefox, even when the value is unchanged). A
      // position-only move — e.g. dragging a dialog by its title bar — keeps the
      // same size, and a move does not schedule a repaint of the window's own
      // content (DoMoveWindow only refreshes the parent). Clearing here would
      // therefore leave the canvas transparent, exposing the black `.window`
      // div behind it until some later repaint. See pcbjam #22.
      //
      // Everything below the guard must run UNCONDITIONALLY: a freshly created
      // window's canvas defaults to 300x150, so when a modal's first
      // setWindowRect happens to match that size the guard is false — and if the
      // context/imageData init lived inside the guard, windowData.context would
      // stay null and the next paint (createWindowContext) would throw
      // "Cannot read properties of null (reading 'depth')", cancelling the modal.
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }

      windowData.width = canvas.width;
      windowData.height = canvas.height;

      if (windowData.width > 0 && windowData.height > 0) {
        windowData.imageData = new ImageData(windowData.width, windowData.height);
      } else {
        windowData.imageData = null;
      }

      var ctx = canvas.getContext('2d');
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.imageSmoothingEnabled = false;
      ctx.textBaseline = 'alphabetic';
      ctx.depth = 0;
      ctx.stack = [];

      windowData.context = ctx;
    }

    // A move/resize changes which windows overlap, so re-derive the barrier
    // (e.g. a modal is centered via setWindowRect after it is first shown).
    recomputeModalBarrier();
  };

  // Build a real DOM title bar (drag handle + title text + close "X") for a
  // non-main wxFrame's window-N div (called from wxTopLevelWindowWasm::Create via
  // EM_ASM). Replaces the canvas-painted title bar so the bar wins DOM
  // hit-testing instead of relying on #canvas event routing — which an
  // overlapping pointer-events:auto control from another frame would steal (the
  // confirmed 3D-viewer bug). Drag funnels through wx_window_move ->
  // wxWindow::Move (one reposition source of truth: children follow via the
  // size-event -> Layout path). Close funnels through wx_window_close -> wx
  // Close() as an ASYNC ccall (Close may pump the loop / show a modal).
  // barHeight comes from the C++ TITLE_BAR_HEIGHT so the strip height is single-
  // sourced and never under/over-laps the client area reserved for it.
  var createWindowTitlebar = function (id, title, barHeight) {
    var windowData = windowMap.get(id);
    if (!windowData || !windowData.window) {
      return;
    }
    var win = windowData.window;

    var bar = document.createElement('div');
    bar.className = 'window-titlebar';
    bar.style.height = barHeight + 'px';

    var text = document.createElement('span');
    text.className = 'window-titlebar-text';
    text.textContent = title || '';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'window-titlebar-close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    bar.appendChild(text);
    bar.appendChild(closeBtn);
    win.appendChild(bar);

    windowData.titlebar = bar;
    windowData.titlebarText = text;

    // --- Drag: titlebar pointer -> wx screen coords -> wx_window_move. --------
    var dragging = false;
    var grabDX = 0;
    var grabDY = 0;
    var pendingX = 0;
    var pendingY = 0;
    var rafPending = false;

    var flushMove = function () {
      rafPending = false;
      if (typeof Module !== 'undefined' && Module.ccall) {
        Module.ccall('wx_window_move', null,
                     ['number', 'number', 'number'], [id, pendingX, pendingY]);
      }
    };

    bar.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) {
        return;
      }
      var r = win.getBoundingClientRect();
      grabDX = ev.clientX - r.left;
      grabDY = ev.clientY - r.top;
      dragging = true;
      try { bar.setPointerCapture(ev.pointerId); } catch (e) {}
      ev.preventDefault();
      ev.stopPropagation();
    });

    bar.addEventListener('pointermove', function (ev) {
      if (!dragging) {
        return;
      }
      // Place the window's top-left so the grab point stays under the cursor,
      // in wx screen coords (#canvas-relative CSS px) — the inverse of
      // setWindowRect's wxScreenBase anchoring.
      var canvasRect = document.getElementById('canvas').getBoundingClientRect();
      pendingX = Math.round(ev.clientX - grabDX - canvasRect.left);
      pendingY = Math.round(ev.clientY - grabDY - canvasRect.top);
      ev.stopPropagation();
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(flushMove);
      }
    });

    var endDrag = function (ev) {
      if (!dragging) {
        return;
      }
      dragging = false;
      try { bar.releasePointerCapture(ev.pointerId); } catch (e) {}
      ev.stopPropagation();
    };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    // --- Close: X -> wx_window_close (ASYNC: Close may open a modal). ---------
    closeBtn.addEventListener('pointerdown', function (ev) {
      ev.stopPropagation(); // a press on the X must not start a window drag
    });
    closeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (typeof Module !== 'undefined' && Module.ccall) {
        Module.ccall('wx_window_close', null, ['number'], [id], { async: true });
      }
    });
  };

  // Edge-resize handles for a resizable (wxRESIZE_BORDER) non-main window. Mirrors
  // createWindowTitlebar's pointer/rAF plumbing but drives wx_window_resize
  // (-> wxWindow::SetSize) with a FULL rect: the left/bottom edges and corners move
  // the window origin as well as its size. Five handles — right (e), left (w),
  // bottom (s) and the two bottom corners (se, sw). The top strip is the title bar
  // (move + close), so there are deliberately no top handles. barHeight comes from
  // the C++ TITLE_BAR_HEIGHT so the side handles start just below the bar.
  var createWindowResizeHandles = function (id, barHeight) {
    var windowData = windowMap.get(id);
    if (!windowData || !windowData.window) {
      return;
    }
    var win = windowData.window;

    var MIN_W = 120;    // minimum window size, px (flat floor)
    var MIN_H = 80;
    var EDGE = 6;       // edge-handle thickness, px
    var CORNER = 12;    // corner-handle size, px

    // Each handle: which window borders it moves (edges) + its inline box. e/w start
    // at barHeight so they never overlap the title bar; s/corners sit at the bottom.
    var defs = [
      { cls: 'window-resize-e', edges: { right: true },
        box: { top: barHeight + 'px', right: '0px', bottom: '0px', width: EDGE + 'px' } },
      { cls: 'window-resize-w', edges: { left: true },
        box: { top: barHeight + 'px', left: '0px', bottom: '0px', width: EDGE + 'px' } },
      { cls: 'window-resize-s', edges: { bottom: true },
        box: { left: CORNER + 'px', right: CORNER + 'px', bottom: '0px', height: EDGE + 'px' } },
      { cls: 'window-resize-se', edges: { right: true, bottom: true },
        box: { right: '0px', bottom: '0px', width: CORNER + 'px', height: CORNER + 'px' } },
      { cls: 'window-resize-sw', edges: { left: true, bottom: true },
        box: { left: '0px', bottom: '0px', width: CORNER + 'px', height: CORNER + 'px' } }
    ];

    var handles = [];
    var resizing = false;
    var activeEdges = null;
    var startRect = null;       // window rect (viewport coords) captured at grab
    var startX = 0, startY = 0; // pointerdown coords
    var pending = null;         // {x, y, w, h} in wx screen coords
    var rafPending = false;

    var flushResize = function () {
      rafPending = false;
      if (pending && typeof Module !== 'undefined' && Module.ccall) {
        Module.ccall('wx_window_resize', null,
                     ['number', 'number', 'number', 'number', 'number'],
                     [id, pending.x, pending.y, pending.w, pending.h]);
      }
    };

    defs.forEach(function (def) {
      var handle = document.createElement('div');
      handle.className = 'window-resize-handle ' + def.cls;
      for (var k in def.box) {
        if (def.box.hasOwnProperty(k)) {
          handle.style[k] = def.box[k];
        }
      }
      win.appendChild(handle);
      handles.push(handle);

      handle.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) {
          return;
        }
        resizing = true;
        activeEdges = def.edges;
        startRect = win.getBoundingClientRect();
        startX = ev.clientX;
        startY = ev.clientY;
        try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
        ev.preventDefault();
        ev.stopPropagation();
      });

      handle.addEventListener('pointermove', function (ev) {
        if (!resizing) {
          return;
        }
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;

        // New viewport rect: move only the active borders (top never moves here).
        var left = startRect.left;
        var top = startRect.top;
        var right = startRect.right;
        var bottom = startRect.bottom;
        if (activeEdges.left) { left = startRect.left + dx; }
        if (activeEdges.right) { right = startRect.right + dx; }
        if (activeEdges.bottom) { bottom = startRect.bottom + dy; }

        var w = right - left;
        var h = bottom - top;
        // Clamp to the minimum, anchored to the FIXED edge so the window doesn't jump.
        if (w < MIN_W) {
          if (activeEdges.left) { left = right - MIN_W; }
          w = MIN_W;
        }
        if (h < MIN_H) {
          bottom = top + MIN_H; // top is anchored; only the bottom moved
          h = MIN_H;
        }

        // Convert the top-left back to wx screen coords (#canvas-relative CSS
        // px) — the inverse of setWindowRect's wxScreenBase anchoring, the
        // same transform the title-bar drag uses.
        var canvasRect = document.getElementById('canvas').getBoundingClientRect();
        pending = {
          x: Math.round(left - canvasRect.left),
          y: Math.round(top - canvasRect.top),
          w: Math.round(w),
          h: Math.round(h)
        };
        ev.stopPropagation();
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(flushResize);
        }
      });

      var endResize = function (ev) {
        if (!resizing) {
          return;
        }
        resizing = false;
        try { handle.releasePointerCapture(ev.pointerId); } catch (e) {}
        ev.stopPropagation();
      };
      handle.addEventListener('pointerup', endResize);
      handle.addEventListener('pointercancel', endResize);
    });

    windowData.resizeHandles = handles;
  };

  // Update an existing DOM title bar's text (no-op if the bar isn't built yet —
  // the Create-time SetTitle runs before createWindowTitlebar).
  var setWindowTitle = function (id, title) {
    var windowData = windowMap.get(id);
    if (windowData && windowData.titlebarText) {
      windowData.titlebarText.textContent = title || '';
    }
  };

  var setWindowZIndex = function (id, zIndex) {
    //console.log('setWindowZIndex: ' + id + ': ' + zIndex);

    // The main window (id=0) lives outside #window-container at the body level.
    // Setting its z-index would place it above #window-container's stacking context,
    // hiding GL canvases and popup windows inside it.
    if (id === 0) return;

    var windowData = windowMap.get(id);
    windowData.window.style.zIndex = zIndex;
  };

  var raiseWindow = function (id) {
    var maxZ = 0;

    // Check z-index of all windows
    for (const windowId of windowMap.keys()) {
      var windowData = windowMap.get(windowId);
      if (windowId !== id && windowData) {
        var style = document.defaultView.getComputedStyle(windowData.window);
        var zIndex = parseInt(style.getPropertyValue('z-index'), 10);
        if (!isNaN(zIndex)) {
          maxZ = Math.max(maxZ, zIndex);
        }
      }
    }

    // Also check z-index of GL canvases so popups can appear above them
    for (const [glId, canvas] of glCanvasMap.entries()) {
      if (canvas && canvas.style.display !== 'none') {
        var style = document.defaultView.getComputedStyle(canvas);
        var zIndex = parseInt(style.getPropertyValue('z-index'), 10);
        if (!isNaN(zIndex)) {
          maxZ = Math.max(maxZ, zIndex);
        }
      }
    }

    setWindowZIndex(id, maxZ + 1);
    recomputeModalBarrier();
  };

  var lowerWindow = function (id) {
    var minZ = 0;

    for (const windowId of windowMap.keys()) {
      var windowData = windowMap.get(windowId);
      if (windowId !== id && windowData) {
        var style = document.defaultView.getComputedStyle(windowData.window);
        var zIndex = parseInt(style.getPropertyValue('z-index'), 10);
        if (!isNaN(zIndex)) {
          minZ = Math.min(minZ, zIndex);
        }
      }
    }

    setWindowZIndex(id, minZ - 1);
    recomputeModalBarrier();
  };

  var rectsOverlap = function (a, b) {
    return a.left < b.right && a.right > b.left &&
           a.top < b.bottom && a.bottom > b.top;
  };

  // Re-derive the shadowed-window input barrier from the current z-order and
  // geometry. A top-level dialog/frame is "shadowed" — and gets the wx-inert
  // class so its DOM controls stop receiving pointer events — when some other
  // top-level window with a higher z-index overlaps it. This is what makes a
  // click land on the genuine topmost window (via #canvas + the C++ hit-test)
  // instead of leaking to a live control of a dialog stacked underneath it.
  //
  // Excluded from the barrier, by design:
  //   - the main window (id 0): its #canvas must stay live so shadowed windows'
  //     clicks can fall through to the C++ hit-test.
  //   - popups/tooltips (.popup): they must stay interactive (e.g. a combobox
  //     dropdown) and must never shadow the dialog beneath them, so they count
  //     neither as inert candidates nor as shadowing windows.
  // Non-overlapping windows (e.g. two side-by-side modeless dialogs) are left
  // interactive — only a genuine overlap blocks input.
  var recomputeModalBarrier = function () {
    if (typeof document === 'undefined') return; // worker context: no DOM
    var wins = [];
    windowMap.forEach(function (windowData, id) {
      if (id === 0 || !windowData) return;
      var el = windowData.window;
      if (!el || !el.classList ||
          !el.classList.contains('toplevel') || el.classList.contains('popup')) {
        return;
      }
      if (el.style.display === 'none') return;
      var z = parseInt(document.defaultView.getComputedStyle(el).zIndex, 10);
      if (isNaN(z)) z = 0;
      wins.push({ el: el, z: z, rect: el.getBoundingClientRect() });
    });

    wins.forEach(function (w) {
      var shadowed = wins.some(function (o) {
        return o !== w && o.z > w.z && rectsOverlap(o.rect, w.rect);
      });
      w.el.classList.toggle('wx-inert', shadowed);
      // Also block focus/keyboard on the shadowed window where supported; the
      // pointer-events CSS above is what actually re-routes the clicks.
      try { w.el.inert = shadowed; } catch (e) { /* older engine: CSS suffices */ }
    });

    // The main window (id 0) is excluded from `wins` — its #canvas must stay
    // live — but its wx-dom controls sit ABOVE #canvas with
    // pointer-events:auto, so a click meant to fall through an overlapping
    // secondary window's pointer-events:none surface lands on a control of
    // the frame BENEATH it instead (the 3D viewer's toolbar row over pcbnew's
    // track-width <select> popped that select's native dropdown). Secondary
    // windows always paint above #main-window (#window-container is
    // z-index:1), so a main-frame control that any visible one overlaps must
    // not take input. Per-control granularity: controls outside the overlap
    // (e.g. the layers panel beside a small viewer) stay interactive.
    var mainData = windowMap.get(0);
    if (mainData && mainData.window) {
      mainData.window.querySelectorAll(
          '.wx-dom-control, .wx-tab-strip, [data-wx-menu-bar="1"]')
        .forEach(function (c) {
          var covered = false;
          if (wins.length) {
            var cr = c.getBoundingClientRect();
            if (cr.width > 0 && cr.height > 0) {
              covered = wins.some(function (w) { return rectsOverlap(w.rect, cr); });
            }
          }
          c.classList.toggle('wx-inert', covered);
          try { c.inert = covered; } catch (e) { /* older engine: CSS suffices */ }
        });
    }

    recomputePopupShadow();
  };

  // Popups (wxPopupTransientWindow: generic wxOwnerDrawnComboBox /
  // wxBitmapComboBox / wxComboCtrl dropdowns) are canvas-drawn with a
  // pointer-events:none .window, so a click on a row falls through to #canvas
  // and the C++ hit-test routes it to the popup. But a pointer-events:auto
  // DOM control of the window BENEATH the popup (a dialog's <input>, a
  // button, a tab strip) sits above #canvas and catches that click instead:
  // the input takes focus, FOCUSIN -> SetFocus dismisses the popup, and the
  // row is never picked (a button would even get pressed). Popups are kept
  // out of the window-level barrier above (they must never make the dialog
  // beneath inert), so here each such control that lies under a visible
  // popup — outside it, in a lower window — gets .wx-popup-shadowed. Only the
  // overlapped controls are affected; the rest of the dialog stays live, and
  // the class drops as soon as the popup hides, moves away or is destroyed
  // (every show/raise/rect/destroy path recomputes the barrier).
  var POPUP_SHADOW_SELECTOR =
      '.wx-dom-control, .wx-tab-strip, [data-wx-menu-bar="1"], ' +
      '.window-titlebar, .window-resize-handle';

  var windowZ = function (el) {
    var z = parseInt(document.defaultView.getComputedStyle(el).zIndex, 10);
    return isNaN(z) ? 0 : z;
  };

  var recomputePopupShadow = function () {
    var popups = [];
    windowMap.forEach(function (windowData, id) {
      if (id === 0 || !windowData) return;
      var el = windowData.window;
      if (!el || !el.classList || !el.classList.contains('popup')) return;
      if (el.style.display === 'none' || !el.isConnected) return;
      var r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      popups.push({ el: el, z: windowZ(el), rect: r });
    });

    if (!popups.length) {
      document.querySelectorAll('.wx-popup-shadowed').forEach(function (c) {
        c.classList.remove('wx-popup-shadowed');
      });
      return;
    }

    var container = document.getElementById('window-container');
    var zCache = new Map();
    // The control's own top-level window div: the #window-container child
    // that holds it, or null for #main-window (always below every popup —
    // #window-container out-stacks it).
    var ownerOf = function (c) {
      var n = c;
      while (n && n.parentElement && n.parentElement !== container) {
        n = n.parentElement;
      }
      return n && n.parentElement === container ? n : null;
    };

    document.querySelectorAll(POPUP_SHADOW_SELECTOR).forEach(function (c) {
      var owner = ownerOf(c);
      var shadowed = false;
      var cr = c.getBoundingClientRect();
      if (cr.width > 0 && cr.height > 0) {
        var ownerZ = -Infinity;
        if (owner) {
          if (!zCache.has(owner)) zCache.set(owner, windowZ(owner));
          ownerZ = zCache.get(owner);
        }
        shadowed = popups.some(function (p) {
          if (p.el === owner || !rectsOverlap(p.rect, cr)) return false;
          if (ownerZ !== p.z) return ownerZ < p.z;
          // Equal z: the later sibling paints on top.
          return !!(owner.compareDocumentPosition(p.el) &
                    Node.DOCUMENT_POSITION_FOLLOWING);
        });
      }
      c.classList.toggle('wx-popup-shadowed', shadowed);
    });
  };

  // Window rects change per animation frame during a titlebar drag or edge
  // resize, and wx-dom controls move during main-frame relayout — coalesce
  // the barrier recomputes those trigger instead of running one per call.
  var barrierRecomputePending = false;
  var wxScheduleBarrierRecompute = function () {
    if (typeof document === 'undefined' || barrierRecomputePending) return;
    barrierRecomputePending = true;
    requestAnimationFrame(function () {
      barrierRecomputePending = false;
      recomputeModalBarrier();
    });
  };

  /* wxColour */

  var formatHexString = function (n) {
    var hexString = n.toString(16);
    while (hexString.length < 8) {
      hexString = '0' + hexString;
    }
    return hexString;
  };

  var makeColorString = function (color) {
    var a = (color >> 24) & 0xff;
    var b = (color >> 16) & 0xff;
    var g = (color >> 8) & 0xff;
    var r = color & 0xff;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a / 255.0 + ')';
    //return '#' + formatHexString(color);
  };

  /* wxBitmap */

  var nextBitmapId = 0;
  var bitmapMap = new Map();

  var createBitmap = function (x, y, width, height, data, scaleFactor) {
    //console.log('setWindowImageData: ' + id + ': ' + '(' + x + ', ' + y + ') ' + width + 'x' + height);

    var id = nextBitmapId++;    
    setBitmapData(id, x, y, width, height, data, scaleFactor);

    return id;
  };

  var destroyBitmap = function (id) {
    bitmapMap.delete(id);
  };

  var getBitmapData = function (id, data) {
    var bitmap = bitmapMap.get(id);

    if (!bitmap) {
      return;
    }

    var imageData;

    if (bitmap.context) {
      imageData = bitmap.context.getImageData(0, 0, bitmap.width, bitmap.height);
      bitmap.context = null;
    } else {
      imageData = bitmap.imageData;
    }

    if (!imageData) {
      return;
    }

    // Cache the recovered pixels so a later SyncToCpp on this bitmap (after its
    // memory-DC context has been consumed) can't dereference a null imageData.
    bitmap.imageData = imageData;
    bitmap.imageBitmap = null;

    Module.HEAPU8.set(imageData.data, data);
  };

  var setBitmapData = function (id, width, height, data, scaleFactor) {
    var size = 4 * width * height;
    var array = new Uint8ClampedArray(Module.HEAPU8.buffer, data, size);
    var imageData = new ImageData(width, height);  
    imageData.data.set(array);

    var bitmap = {
      data: data,
      size: size,
      width: width,
      height: height,
      scaleFactor: scaleFactor,
      imageData: imageData,
      imageBitmap: null,
      context: null
    };

    bitmapMap.set(id, bitmap);

    createImageBitmap(imageData, 0, 0, width, height).then(function (imageBitmap) {
      // TODO: fix race condition
      var bitmap = bitmapMap.get(id);
      if (bitmap && !bitmap.context) {
        bitmap.imageBitmap = imageBitmap;
      }
    })
  };

  /* wxDC */

  var nextContextId = 0;
  var contextMap = new Map();

  var createOffscreenContext = function (width, height) {
    var canvas = null;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== 'undefined' && 'createElement' in document) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    if (canvas !== null) {
        var ctx = canvas.getContext('2d');
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.textBaseline = 'alphabetic';
        return ctx;
    } else {
        return null;
    }
  };

  var offscreenContext = createOffscreenContext(1, 1);

  var pushContext = function (ctx) {
    var saveCtx = {
      x: ctx.x,
      y: ctx.y,
      width: ctx.width,
      height: ctx.height,
      scaleFactor: ctx.scaleFactor,
      isInitialized: ctx.isInitialized
    };

    if (ctx.isInitialized) {
      saveCtx.font = ctx.font,
      saveCtx.lineWidth = ctx.lineWidth,
      saveCtx.lineJoin = ctx.lineJoin,
      saveCtx.lineCap = ctx.lineCap,
      saveCtx.fillStyle = ctx.fillStyle,
      saveCtx.strokeStyle = ctx.strokeStyle
      saveCtx.dashCount = ctx.dashCount;

      if (saveCtx.dashCount > 0) {
        saveCtx.setLineDash(ctx.getLineDash());
      }

      ctx.restore();
      ctx.save();
    }

    ctx.stack.push(saveCtx);
  };

  var popContext = function (ctx) {
    var restoreCtx = ctx.stack.pop();

    ctx.x = restoreCtx.x;
    ctx.y = restoreCtx.y;
    ctx.width = restoreCtx.width;
    ctx.height = restoreCtx.height;
    ctx.scaleFactor = restoreCtx.scaleFactor;
    ctx.isInitialized = restoreCtx.isInitialized;

    if (ctx.isInitialized) {
      ctx.restore();
      ctx.save();

      ctx.font = restoreCtx.font;
      ctx.lineWidth = restoreCtx.lineWidth;
      ctx.lineJoin = restoreCtx.lineJoin;
      ctx.lineCap = restoreCtx.lineCap;
      ctx.fillStyle = restoreCtx.fillStyle;
      ctx.strokeStyle = restoreCtx.strokeStyle;
      ctx.dashCount = restoreCtx.dashCount;

      if (ctx.dashCount > 0) {
        ctx.setLineDash(restoreCtx.getLineDash());
      }

      // TODO: save/restore clip
      ctx.beginPath();
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.clip();
    }
  };

  // GL canvas element management (for wxGLCanvas child windows)
  var glCanvasMap = new Map();
  var nextGLCanvasId = 1;

  var createGLCanvas = function (isVisible) {
    var id = nextGLCanvasId++;
    var canvas = document.createElement('canvas');
    canvas.id = 'glcanvas-' + id;
    canvas.className = 'gl-canvas';
    canvas.style.position = 'absolute';
    canvas.style.display = 'none';  // Always start hidden until properly positioned
    // A GL canvas created while another is already on screen belongs to a SECONDARY
    // top-level window (e.g. the 3D viewer). The shared 2D #canvas is painted above
    // the GL canvases and is only kept transparent over the MAIN window's canvas
    // region, so a secondary GL canvas is otherwise hidden behind #canvas's window
    // fill. Lift it above #canvas. (Pop-up menus are DOM and stack above regardless;
    // only a modal dialog drawn on #canvas over this canvas would be occluded — rare
    // for the 3D viewer.)
    var hasVisibleGL = false;
    glCanvasMap.forEach(function (c) { if (c.style.display !== 'none') hasVisibleGL = true; });
    canvas.style.zIndex = hasVisibleGL ? '2147483647' : '100';
    canvas.style.pointerEvents = 'none';  // Don't intercept clicks - let main canvas handle events
    document.getElementById('window-container').appendChild(canvas);
    glCanvasMap.set(id, canvas);
    return id;
  };

  var setGLCanvasRect = function (id, x, y, width, height) {
    var canvas = glCanvasMap.get(id);
    if (!canvas) return;

    // Only position and show if we have valid dimensions
    if (width <= 0 || height <= 0) {
      canvas.style.display = 'none';
      return;
    }

    // GL canvases are absolute children of #window-container — anchor them
    // the same way setWindowRect anchors window divs, so they stay glued to
    // their frame in hosts where the container is not at the canvas origin.
    var base = wxScreenBase(false);
    canvas.style.left = (x + base.left) + 'px';
    canvas.style.top = (y + base.top) + 'px';
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    var scaleFactor = getDisplayScaleFactor();
    var newW = width * scaleFactor;
    var newH = height * scaleFactor;
    // Only reassign the backing store when the pixel size actually changes:
    // assigning canvas.width/height clears the GL drawing buffer, which would
    // blank/flicker the 3D view on every pointermove during a title-bar drag (a
    // drag is a pure move — same size). Mirrors the guard in setWindowRect.
    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width = newW;
      canvas.height = newH;
    }

    // Show the canvas now that it's properly positioned
    // (visibility is also controlled by setGLCanvasVisibility for show/hide logic)
    if (canvas.dataset.shouldBeVisible !== 'false') {
      canvas.style.display = 'block';
    }
  };

  var setGLCanvasVisibility = function (id, isVisible) {
    var canvas = glCanvasMap.get(id);
    if (canvas) {
      canvas.dataset.shouldBeVisible = isVisible ? 'true' : 'false';
      canvas.style.display = isVisible ? 'block' : 'none';
    }
  };

  var destroyGLCanvas = function (id) {
    var canvas = glCanvasMap.get(id);
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    glCanvasMap.delete(id);
  };

  // Patch Emscripten's GL.newRenderingFrameStarted to handle contexts without temp buffers
  // This is needed because wxGLCanvas creates additional WebGL contexts that don't have
  // the temp buffers initialized (those are only set up during GLImmediate.init for the main context)
  var patchGLNewRenderingFrameStarted = function () {
    if (typeof GL === 'undefined' || !GL.newRenderingFrameStarted) {
      return; // GL not initialized yet
    }
    if (GL._wxPatched) {
      return; // Already patched
    }
    var originalNewRenderingFrameStarted = GL.newRenderingFrameStarted;
    GL.newRenderingFrameStarted = function () {
      if (!GL.currentContext) {
        return;
      }
      // Skip temp buffer operations if they haven't been initialized for this context
      if (!GL.currentContext.tempVertexBuffers1 || !GL.currentContext.tempVertexBufferCounters1) {
        return;
      }
      return originalNewRenderingFrameStarted.call(this);
    };
    GL._wxPatched = true;
  };

  // Try to patch GL immediately and also set up a delayed check
  // (GL object is created after wx.js runs)
  if (typeof GL !== 'undefined') {
    patchGLNewRenderingFrameStarted();
  }
  // Check periodically until patched (GL is created during Module initialization)
  var glPatchInterval = setInterval(function () {
    if (typeof GL !== 'undefined') {
      patchGLNewRenderingFrameStarted();
      if (GL._wxPatched) {
        clearInterval(glPatchInterval);
      }
    }
  }, 10);
  // Clear interval after 5 seconds to avoid memory leak if GL never gets created
  setTimeout(function () {
    clearInterval(glPatchInterval);
  }, 5000);

  var createWindowContext = function (windowId, x, y, width, height, scaleFactor) {
    var id = nextContextId++;
    //console.log('createWindowContext: ' + windowId + ' ' + x + ' ' + y + ' ' + width + ' ' + height);

    var windowData = windowMap.get(windowId);
    var ctx = windowData.context;

    if (ctx.depth > 0) {
      pushContext(ctx);
    }

    ctx.x = x;
    ctx.y = y;
    ctx.width = width;
    ctx.height = height;
    ctx.scaleFactor = scaleFactor;
    ctx.isInitialized = false;
    ctx.depth++;

    contextMap.set(id, ctx);

    return id;
  };

  var destroyWindowContext = function (id) {
    var ctx = contextMap.get(id);

    if (ctx.isInitialized) {
      ctx.restore();
    }

    if (ctx.depth > 1) {
      popContext(ctx);
    }

    ctx.depth--;

    //console.log('destroyContext: ' + id + ' ' + ctx.width + ' ' + ctx.height);
    contextMap.delete(id);
  };

  var createMemoryContext = function (bitmapId, scaleFactor) {
    var contextId = nextContextId++;
    var bitmap = bitmapMap.get(bitmapId);

    var ctx = createOffscreenContext(bitmap.width, bitmap.height);

    ctx.x = 0;
    ctx.y = 0;
    ctx.width = bitmap.width / scaleFactor;
    ctx.height = bitmap.height / scaleFactor;
    ctx.scaleFactor = scaleFactor;
    ctx.dashCount = 0;
    ctx.isInitialized = true;
    ctx.depth = 0;
    ctx.stack = [];

    ctx.scale(scaleFactor, scaleFactor);

    contextMap.set(contextId, ctx);

    drawImage(ctx, bitmap, 0, 0);

    bitmap.imageData = null;
    bitmap.imageBitmap = null;
    bitmap.context = ctx;

    return contextId;
  };

  var destroyMemoryContext = function (contextId) {
    //console.log('deselectBitmap: ' + contextId);
    contextMap.delete(contextId);
  };

  var getContext = function (id) {
    var ctx = contextMap.get(id);

    if (!ctx.isInitialized) {
      // scale and translate(x, y)
      var x = ctx.x;
      var y = ctx.y;
      var scaleFactor = ctx.scaleFactor;

      ctx.setTransform(scaleFactor, 0, 0, scaleFactor, scaleFactor * x, scaleFactor * y);

      ctx.save();

      ctx.beginPath();
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.clip()

      ctx.dashCount = 0;
      ctx.isInitialized = true;
    }

    return ctx;
  };

  var setFont = function (id, font) {
    var ctx = getContext(id);
    ctx.font = font;
  };

  var createPattern = function (contextId, bitmapId) {
    var ctx = getContext(contextId);
    var bitmap = bitmapMap.get(bitmapId);
    var source;

    if (bitmap.imageBitmap) {
      source = bitmap.imageBitmap;
    } else if (bitmap.context) {
      source = bitmap.context.canvas;
    } else {
      offscreenContext.canvas.width = bitmap.width;
      offscreenContext.canvas.height = bitmap.height;
      offscreenContext.putImageData(bitmap.imageData, 0, 0);
      source = offscreenContext.canvas;
    }

    return ctx.createPattern(source, 'repeat');
  };

  var setBrush = function (contextId, color, bitmapId) {
    var ctx = getContext(contextId);

    if (bitmapId === -1 || typeof bitmapId === 'undefined') {
      ctx.fillStyle = makeColorString(color);
    } else {
      ctx.fillStyle = createPattern(contextId, bitmapId);
    }
  };

  var lineJoinMap = [
    'round',
    'bevel',
    'miter'
  ];

  var lineCapMap = [
    'butt',
    'round',
    'square'
  ];

  var setPen = function (contextId, color, lineWidth, lineJoin, lineCap, dashCount, dashPtr, bitmapId) {
    var ctx = getContext(contextId);

    ctx.lineWidth = lineWidth;
    ctx.lineJoin = lineJoinMap[lineJoin];
    ctx.lineCap = lineCapMap[lineCap];

    if (bitmapId === -1 || typeof bitmapId === 'undefined') {
      ctx.strokeStyle = makeColorString(color);
    } else {
      ctx.strokeStyle = createPattern(contextId, bitmapId);
    }

    ctx.dashCount = dashCount;
    var dashes = [];
    for (var i = 0; i < dashCount; i++) {
      dashes.push(Module.HEAP8[dashPtr + i]);
    }
    ctx.setLineDash(dashes);
  };

  var resetClip = function (ctx) {
    var font = ctx.font;
    var lineWidth = ctx.lineWidth;
    var lineJoin = ctx.lineJoin;
    var lineCap = ctx.lineCap;
    var fillStyle = ctx.fillStyle;
    var strokeStyle = ctx.strokeStyle;

    ctx.restore();
    ctx.save();

    ctx.font = font;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = lineJoin;
    ctx.lineCap = lineCap;
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
  };

  var clipRect = function (id, x, y, width, height) {
    //console.log('clipRect: ' + x + ' ' + y + ' ' + width + ' ' + height);
    var ctx = getContext(id);

    // An empty clip box means "everything is clipped out" — apply it as such.
    // (An earlier fallback expanded empty rects to the full context, but that
    // was masking the C++ side sending empty boxes for every clip.)
    if (width < 0) width = 0;
    if (height < 0) height = 0;

    resetClip(ctx);

    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
  };

  // Clip to a non-rectangular region composed of multiple rectangles
  var clipRegion = function (id, rectDataPtr, rectCount) {
    var ctx = getContext(id);
    resetClip(ctx);

    ctx.beginPath();

    // Read rectangle data from WASM memory (4 ints per rect: x, y, w, h)
    for (var i = 0; i < rectCount; i++) {
      var offset = rectDataPtr / 4 + i * 4;  // Convert byte offset to int offset
      var x = Module.HEAP32[offset];
      var y = Module.HEAP32[offset + 1];
      var w = Module.HEAP32[offset + 2];
      var h = Module.HEAP32[offset + 3];
      ctx.rect(x, y, w, h);
    }

    ctx.clip();
  };

  var destroyClip = function (id) {
    var ctx = getContext(id);

    resetClip(ctx);

    ctx.beginPath();
    ctx.rect(0, 0, ctx.width, ctx.height);
    ctx.clip();
  };

  var clearRect = function (id, width, height, color) {
    var ctx = getContext(id);

    var saveFillStyle = ctx.fillStyle;
    ctx.fillStyle = makeColorString(color);
    // TODO: save/restore clip

    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = saveFillStyle;
  };

  var drawRect = function (id, x, y, width, height, fill, stroke) {
    var ctx = getContext(id);

    if (fill) {
      ctx.fillRect(x, y, width, height);
    }

    if (stroke) {
      ctx.strokeRect(x, y, width, height);
    }
  };

  var drawRoundedRect = function (id, x, y, width, height, radius, fill, stroke) {
    var ctx = getContext(id);

    if (width < 0) { width = -width; x -= width; }
    if (height < 0) { height = -height; y -= height; }
    // arcTo throws IndexSizeError on a negative radius; also keep the corner
    // arcs from overlapping when the radius exceeds half a side
    radius = Math.max(0, Math.min(radius, width / 2, height / 2));

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();

    if (fill) {
      ctx.fill();
    }

    if (stroke) {
      ctx.stroke();
    }
  };

  var drawEllipse = function (id, x, y, width, height, fill, stroke) {
    var ctx = getContext(id);

    var radiusX = width / 2.0; 
    var radiusY = height / 2.0;
    var cx = x + radiusX;
    var cy = y + radiusY 

    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, 0.0, 0.0, 2 * Math.PI);

    if (fill) {
      ctx.fill();
    }

    if (stroke) {
      ctx.stroke();
    }
  };

  var drawArc = function (id, x, y, radius, startAngle, endAngle, fill, stroke) {
    var ctx = getContext(id);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, startAngle, endAngle, true);

    if (fill) {
      ctx.fill();
    }

    if (stroke) {
      ctx.stroke();
    }
  };

  var drawEllipticArc = function (id, x, y, width, height, startDegrees, endDegrees, fill, stroke) {
    var ctx = getContext(id);

    var radiusX = width / 2.0;
    var radiusY = height / 2.0;
    var cx = x + radiusX;
    var cy = y + radiusY;
    var startRadians = -startDegrees * (Math.PI / 180.0);
    var endRadians = -endDegrees * (Math.PI / 180.0);

    if (fill) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0.0, startRadians, endRadians, true);
      ctx.lineTo(cx, cy);
      ctx.fill();
    }

    if (stroke) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0.0, startRadians, endRadians, true);
      ctx.stroke();
    }
  };

  var drawPoint = function (id, x, y) {
    var ctx = getContext(id);
    ctx.strokeRect(x, y, 1e-6, 1e-6);
  };

  var drawLine = function (id, x1, y1, x2, y2) {
    var ctx = getContext(id);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.stroke();
  };

  var drawLines = function (id, n, ptr) {
    var ctx = getContext(id);

    if (n > 0) {
      var index = ptr >> 2;
      var x = Module.HEAP32[index++];
      var y = Module.HEAP32[index++];

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (var i = 1; i < n; i++) {
        x = Module.HEAP32[index++]; 
        y = Module.HEAP32[index++];
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    } 
  };

  var drawPolygon = function (id, n, ptr, fillEvenOdd, fill, stroke) {
    var ctx = getContext(id);

    if (n > 0) {
      var index = ptr >> 2;
      var x = Module.HEAP32[index++];
      var y = Module.HEAP32[index++];

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (var i = 1; i < n; i++) {
        x = Module.HEAP32[index++]; 
        y = Module.HEAP32[index++];
        ctx.lineTo(x, y);
      }

      ctx.closePath();

      if (fill) {
        ctx.fill(fillEvenOdd ? 'evenodd' : 'nonzero');
      }

      if (stroke) {
        ctx.stroke();
      }
    } 
  };

  var drawImage = function (ctx, bitmap, x, y) {
    var w = bitmap.width;
    var h = bitmap.height;
    var sf = bitmap.scaleFactor;
    var source;

    // console.log('drawImage: ' + bitmap.id + ' ' + x + ' ' + y + ' ' + w + ' ' + h + ' ' + sf);

    if (bitmap.imageBitmap) {
      source = bitmap.imageBitmap;
    } else if (bitmap.context) {
      source = bitmap.context.canvas;
    } else {
      offscreenContext.canvas.width = bitmap.width;
      offscreenContext.canvas.height = bitmap.height;
      offscreenContext.putImageData(bitmap.imageData, 0, 0);
      source = offscreenContext.canvas;
    }

    if (bitmap.scaleFactor == 1.0) {
      ctx.drawImage(source, x, y);
    } else {
      var sf = 1.0 / bitmap.scaleFactor;
      ctx.drawImage(source, 0, 0, w, h, x, y, w * sf, h * sf);
    }
  };

  var drawBitmap = function (contextId, bitmapId, x, y) {
    var ctx = getContext(contextId);
    var bitmap = bitmapMap.get(bitmapId);

    //console.log('drawBitmap: ' + contextId + ' ' + bitmapId + ' (' + x + ', ' + y + ')' + ' (' + bitmap.width + ', ' + bitmap.height + ')');

    drawImage(ctx, bitmap, x, y);
  };

  var blit = function (srcId, dstId, sx, sy, width, height, dx, dy) {
    var srcCtx = getContext(srcId);
    var dstCtx = getContext(dstId);

    //console.log('blit: ' + sx + ' ' + sy + ' ' + dx + ' ' + dy + ' ' + width + ' ' + height + ' ' + srcCtx.scaleFactor + ' ' + dstCtx.scaleFactor);

    var sf = srcCtx.scaleFactor
    dstCtx.drawImage(srcCtx.canvas, sx * sf, sy * sf, width * sf, height * sf, dx, dy, width, height);
  };

  var drawText = function (id, text, x, y, textColor, underline, strikethrough) {
    var ctx = getContext(id);
    //console.log('drawText: ' + text + ' ' + id + ' ' + ctx.width + ' ' + ctx.height);

    var fillStyle = ctx.fillStyle;

    ctx.fillStyle = makeColorString(textColor);
    ctx.fillText(text, x, y);

    // Draw text decorations (underline and/or strikethrough)
    if (underline || strikethrough) {
      var metrics = ctx.measureText(text);
      var textWidth = metrics.width;

      // Save current state
      var strokeStyle = ctx.strokeStyle;
      var lineWidth = ctx.lineWidth;

      ctx.strokeStyle = makeColorString(textColor);
      ctx.lineWidth = 1;

      if (underline) {
        // Draw underline below the baseline
        // Use fontBoundingBoxDescent if available, otherwise estimate
        var descent = metrics.fontBoundingBoxDescent || 3;
        var underlineY = y + descent;
        ctx.beginPath();
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + textWidth, underlineY);
        ctx.stroke();
      }

      if (strikethrough) {
        // Draw strikethrough at middle of text
        // Use fontBoundingBoxAscent if available, otherwise estimate
        var ascent = metrics.fontBoundingBoxAscent || 10;
        var strikeY = y - ascent * 0.35;  // ~35% up from baseline
        ctx.beginPath();
        ctx.moveTo(x, strikeY);
        ctx.lineTo(x + textWidth, strikeY);
        ctx.stroke();
      }

      // Restore state
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
    }

    ctx.fillStyle = fillStyle;
  };

  var measureText = function (text, font) {
    offscreenContext.font = font;

    var textMetrics = offscreenContext.measureText(text);
    return Math.round(textMetrics.width);
  };

  var rotateAtPoint = function (id, x, y, angle) {
    var ctx = getContext(id);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle * (Math.PI / 180.0));
  };

  var clearRotation = function (id) {
    var ctx = getContext(id);
    ctx.restore();
  };

  /* wxCursor */

  var cursorMap = [
    'default',
    'crosshair',
    'hand',
    'text',
    'wait',
    'help',
    'e-resize',
    'n-resize',
    'ne-resize',
    'nw-resize',
    's-resize',
    'se-resize',
    'sw-resize',
    'w-resize',
    'ns-resize',
    'ew-resize',
    'nesw-resize',
    'nwse-resize',
    'col-resize',
    'row-resize',
    'move',
    'vertical-text',
    'cell',
    'context-menu',
    'alias',
    'progress',
    'no-drop',
    'copy',
    'none',
    'not-allowed',
    'zoom-in',
    'zoom-out',
    'grab',
    'grabbing'
  ];

  var setCursor = function (cursorIndex, bitmapId, hotSpotX, hotSpotY) {
    if (cursorIndex >= 0 && cursorIndex < cursorMap.length) {
      var cursor = cursorMap[cursorIndex];
      if (cursor.startsWith('grab') && isWebkit()) {
        cursor = '-webkit-' + cursor;
      }
      Module.canvas.style.cursor = cursor;
    } else {
      var bitmap = bitmapMap.get(bitmapId);

      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      drawImage(ctx, bitmap, 0, 0);
      var dataUrl = 'url(' + canvas.toDataURL('image/png') + ')';

      Module.canvas.style.cursor = dataUrl + ' ' + hotSpotX + ' ' + hotSpotY + ', auto';
    }
  };

  var showFullscreen = function (enable) {
    if (enable) {
      if (document.body.requestFullscreen) {
        document.body.requestFullscreen();
      } else if (document.body.webkitRequestFullscreen()) {
        document.body.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  var showFileDialog = function (multiple) {
    var input = document.createElement('input');
    if (multiple) {
      input.setAttribute('multiple', '');
    }
    input.type = 'file';
    input.onchange = function () {
      for (var i = 0; i < input.files.length; i++) {
        var file = input.files[i];
        console.log('file selected: ' + file.name);
        file.arrayBuffer().then(function (arrayBuffer) {
          var array = new Uint8Array(arrayBuffer);
          var path = '/tmp/' + file.name;

          var stream = FS.open(path, 'w+');
          var retCode = 0;

          if (stream) {
            FS.write(stream, array, 0, file.size);
            FS.close(stream);
          } else {
            retCode = 1;
          }

          ccall('OpenFileCallback', 'void', ['string', 'number'], [path, retCode]);
        });
      }
    };
    input.click();
  };

  var downloadFile = function (filename, size, data) {
    var link = document.createElement('a');

    var sharedArray = new Uint8Array(Module.HEAPU8.buffer, data, size);
    // Blob fails when passed SharedArrayBuffer
    var array = new Uint8Array(sharedArray);
    var blob = new Blob([array], {type: 'application/octet-stream'});

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  /* wxLocalStorageConfig */

  var hasConfigEntry = function (key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var hasConfigGroup = function (key) {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith(key)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var getConfigEntryCount = function (prefix, recurse) {
    var entryCount = 0;

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end == -1 || recurse) {
            ++entryCount;
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return entryCount;
  };

  var getConfigEntryIndex = function (prefix, index) {
    var entryCount = 0;

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end == -1) {
            if (entryCount >= index) {
              return i;
            } else {
              ++entryCount;
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return -1;
  };

  var getConfigGroupCount = function (prefix, recurse) {
    var children = new Set();

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end != -1) {
            if (recurse) {
              end = key.lastIndexOf('/');
            }
            var child = key.substring(prefix.length, end);
            if (!children.has(child)) {
              children.add(child);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return children.size;
  };

  var getConfigGroupIndex = function (prefix, index) {
    var children = new Set();

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end != -1) {
            var child = key.substring(prefix.length, end);
            if (!children.has(child)) {
              if (children.size >= index) {
                return i;
              } else {
                children.add(child);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return -1;
  };

  var getConfigKeyLength = function (index) {
    try {
      return localStorage.key(index).length;
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  var getConfigKey = function (index, keyBuffer, length) {
    try {
      var key = localStorage.key(index);
      stringToUTF8(key, keyBuffer, length);
    } catch (error) {
      console.error(error);
    }
  };

  var getConfigEntryLength = function (key) {
    var value = null;
    try {
      value = localStorage.getItem(key);
    } catch (error) {
      //console.error(error);
    }

    if (value === null) {
      return -1;
    } else {
      return value.length
    }
  };

  var getConfigEntry = function (key, valueBuffer, length) {
    try {
      var value = localStorage.getItem(key);
      if (value !== null) {
        stringToUTF8(value, valueBuffer, length);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var setConfigEntry = function (key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(error);
    }
  };

  var removeConfigEntry = function (key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(error);
      }
  };

  var removeConfigGroup = function (group) {
    try {
      var keysToRemove = [];

      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(group)) {
          keysToRemove.push(key);
        }
      }
      for (var i = 0; i < keysToRemove.length; i++) {
        localStorage.removeItem(keysToRemove[i]);
      }
      return keysToRemove.length > 0;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var clearConfig = function () {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(error);
    }
  };

  var renameConfigGroup = function (oldGroup, newGroup) {
    try {
      var keysToRename = [];

      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(oldGroup)) {
          keysToRename.push(key);
        } else if (key.startsWith(newGroup)) {
          return false;
        }
      }

      if (keysToRename.length > 0) {
        for (var i = 0; i < keysToRename.length; i++) {
          var oldKey = keysToRename[i];
          var newKey = newGroup + oldKey.substring(oldGroup.length);

          var value = localStorage.getItem(oldKey);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }

  };

  /* HTML5 Drag and Drop Support */

  var pendingDropFiles = [];
  var pendingDropX = 0;
  var pendingDropY = 0;

  var dragDropHandlersRegistered = false;

  var registerDragDropHandlers = function () {
    // G-14: RegisterEmscriptenCallbacks runs once per constructed frame (the
    // merged kicad_editor builds several), and every call stacked ANOTHER
    // full listener set on the same canvas — one real drop then ran N times.
    if (dragDropHandlersRegistered) {
      return;
    }
    var canvas = Module.canvas;
    if (!canvas) {
      console.error('[DND] Module.canvas not available');
      return;
    }
    dragDropHandlersRegistered = true;

    // Prevent default to enable drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      canvas.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    canvas.addEventListener('dragenter', function (e) {
      console.log('[DND] dragenter');
      ccall('OnDragEnter', 'void', ['number', 'number'], [e.clientX, e.clientY]);
    });

    canvas.addEventListener('dragleave', function (e) {
      console.log('[DND] dragleave');
      ccall('OnDragLeave', 'void', [], []);
    });

    canvas.addEventListener('drop', function (e) {
      var files = e.dataTransfer.files;
      console.log('[DND] drop: ' + files.length + ' files');

      // Get canvas-relative coordinates
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      pendingDropFiles = [];
      pendingDropX = x;
      pendingDropY = y;

      if (files.length === 0) {
        return;
      }

      // Process all files, then notify C++ when all are ready
      var processedCount = 0;

      for (var i = 0; i < files.length; i++) {
        (function (file) {
          file.arrayBuffer().then(function (arrayBuffer) {
            var array = new Uint8Array(arrayBuffer);
            var path = '/tmp/' + file.name;

            // Write to WASM filesystem
            var stream = FS.open(path, 'w+');
            if (stream) {
              FS.write(stream, array, 0, file.size);
              FS.close(stream);
              pendingDropFiles.push(path);
              console.log('[DND] Wrote file: ' + path + ' (' + file.size + ' bytes)');
            } else {
              console.error('[DND] Failed to write file: ' + path);
            }

            processedCount++;
            if (processedCount === files.length) {
              // All files processed, notify C++
              notifyDropComplete();
            }
          }).catch(function (error) {
            console.error('[DND] Error reading file: ' + error);
            processedCount++;
            if (processedCount === files.length) {
              notifyDropComplete();
            }
          });
        })(files[i]);
      }
    });

    console.log('[DND] Drag and drop handlers registered');
  };

  var notifyDropComplete = function () {
    if (pendingDropFiles.length === 0) {
      return;
    }

    // Notify C++ for each file
    for (var i = 0; i < pendingDropFiles.length; i++) {
      ccall('OnFileDropped', 'void',
            ['string', 'number', 'number'],
            [pendingDropFiles[i], pendingDropX, pendingDropY]);
    }

    // Clear pending files
    pendingDropFiles = [];
  };

// end include: /private/tmp/aven-wasm-spike/wxwidgets/build/wasm/wx.js
// include: /private/tmp/aven-wasm-spike/wxwidgets/build/wasm/wx-dom.js
// wx-dom.js — shim additions for the WASM DOM port (non-universal build).
//
// Loaded as a second --pre-js AFTER wx.js, only in DOM-port bundles.
// wx.js keeps owning window management, the element registry, clipboard,
// file dialogs and the Canvas2D drawing used by owner-drawn widgets
// (canvas islands). This file owns native-control DOM elements: creation
// (type-based factory, composites where a wx control maps to more than one
// element), property sync, clone-based intrinsic measurement, and event
// wiring back into WASM via wx_dom_event (src/wasm/domevents.cpp).
//
// All functions are no-ops/guarded in Web Workers (-pthread evaluates
// pre-js there too) — see the wx.js worker guard precedent.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var nextControlId = 1;
  var controls = new Map(); // domId -> root HTMLElement
  var inputs = new Map();   // domId -> value-bearing element (if != root)
  var labels = new Map();   // domId -> label text target (if != root)

  // Dark-theme overrides for the DOM widgets (pcbjam comments-ux 0002): the
  // factory below sets "classic light" INLINE styles; these html.dark-scoped
  // !important rules override them live when the embedding page toggles its
  // theme class — no per-element re-styling, and light mode is untouched.
  // Keep the palette aligned with the wx wasm system-colour table
  // (src/wasm/settings.cpp): face #2d2d3e, window #1e1e2c, text #e4e4ee.
  (function injectDarkThemeStyles() {
    var css =
      'html.dark [data-wx-menu-bar="1"],' +
      'html.dark [data-wx-tool-bar="1"]{background:#2d2d3e !important;}' +
      'html.dark [data-wx-menu-bar="1"] .wx-menu-title{color:#e4e4ee !important;}' +
      'html.dark .wx-menu-popup{background:#2d2d3e !important;' +
        'border-color:#121220 !important;color:#e4e4ee !important;}' +
      'html.dark [data-wx-check-list="1"]{background:#1e1e2c !important;' +
        'border-color:#121220 !important;color:#e4e4ee !important;}' +
      'html.dark .wx-tab-strip{background:#2d2d3e !important;' +
        'border-bottom-color:#121220 !important;}' +
      'html.dark .wx-tab-strip button{background:#23233a !important;' +
        'color:#e4e4ee !important;border-color:#121220 !important;}' +
      'html.dark .wx-tab-strip button[aria-selected="true"]' +
        '{background:#3a3a54 !important;}' +
      'html.dark #wx-tooltip{background:#2d2d3e !important;' +
        'color:#e4e4ee !important;border-color:#5a5a72 !important;}' +
      'html.dark .wx-tool{color:#e4e4ee !important;}' +
      'html.dark .wx-tool[data-wx-toggled="1"]{background:#3d6ae0 !important;}' +
      'html.dark [data-wx-scrollbar="1"]{background:#23233a !important;}' +
      'html.dark [data-wx-scrollbar="1"] .wx-sb-thumb{background:#4a4a62 !important;' +
        'border-color:#5a5a72 !important;}' +
      // Native form controls (select/input/textarea .wx-dom-control): the page's
      // dark foreground bleeds into them while their native background stays
      // white — restyle both, and flip color-scheme so the dropdown list and
      // caret follow.
      'html.dark select.wx-dom-control,' +
      'html.dark input.wx-dom-control,' +
      'html.dark textarea.wx-dom-control{background:#1e1e2c !important;' +
        'color:#e4e4ee !important;border-color:#121220 !important;' +
        'color-scheme:dark;}' +
      // checkbox/radio inputs are CHILDREN of a label.wx-dom-control, so the
      // rule above never reaches them; flip their color-scheme too.
      'html.dark label.wx-dom-control{color-scheme:dark;}';
    var style = document.createElement('style');
    style.id = 'wx-dom-dark-theme';
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // Flag read by the C++ keyboard callback (src/wasm/app.cpp): while a DOM
  // editable owns browser focus, wx must not swallow/preventDefault keys.
  window.wxDomEditableFocused = 0;

  // Mirror of wxDomEventKind in include/wx/wasm/window.h.
  var EVT = { CLICK: 1, INPUT: 2, CHANGE: 3, FOCUSIN: 4, FOCUSOUT: 5,
              ENTER: 6, SPIN_UP: 7, SPIN_DOWN: 8, MENU: 9, TOOL: 10,
              TAB: 11, SCROLL: 12,
              KEY_UP: 13, KEY_DOWN: 14, KEY_PAGEUP: 15, KEY_PAGEDOWN: 16,
              DBLCLICK: 17 };
  // Navigation keys an <input> does not need for editing, forwarded to wx as
  // wxEVT_CHAR_HOOK (findings O-2: filter-box Enter/arrows were dead).
  var NAV_KEY_EVT = { ArrowUp: EVT.KEY_UP, ArrowDown: EVT.KEY_DOWN,
                      PageUp: EVT.KEY_PAGEUP, PageDown: EVT.KEY_PAGEDOWN };

  // Enter in an <input> is handed to wx as EVT.ENTER. Its handler may move
  // wx focus to a canvas-drawn window (a grid editor commits and the grid
  // takes focus), which blurs the input before the browser sends that same
  // Enter's keypress, to <body>: the canvas KeyCallback would then deliver a
  // second wxEVT_CHAR(WXK_RETURN), and wxGrid reopens the editor with it,
  // writing '\r' over the committed text. Window capture runs
  // before Emscripten's window listeners, so the stray keypress stops here.
  function swallowEnterKeypress() {
    function onPress(ev) {
      if (ev.key === 'Enter') ev.stopPropagation();
    }
    function done() {
      window.removeEventListener('keypress', onPress, true);
      window.removeEventListener('keyup', done, true);
    }
    window.addEventListener('keypress', onPress, true);
    window.addEventListener('keyup', done, true);
  }

  // Last pointer position in viewport (clientX/Y) coordinates — read by
  // wxShowContextMenu when DoPopupMenu is invoked "at the mouse" (the KiCad
  // canvas right-click case passes wxDefaultCoord). Tracked on every pointer
  // event below, including over the GAL canvas (where forwardTarget is null).
  var lastPointerClientX = 0;
  var lastPointerClientY = 0;

  // Marks the bundle as DOM-port for tests/boot code.
  window.wxDomPort = true;
  window.wxDomControls = controls;

  function dispatch(domId, kind) {
    // Containment for a chain that died mid-flight (trap, or a throwing wx
    // event handler): its dispatch-interlock guard never unwound — release it
    // or every later event defers forever behind a chain that is gone.
    // Guarded: defends against serving a stale output/ mix where this glue
    // and the wasm disagree about the export set.
    var contain = function (e) {
      // Surfaces in test logs; must never throw back into DOM event handlers.
      console.error('wx_dom_event(' + domId + ',' + kind + ') failed:', e);
      try {
        Module['ccall']('wx_dispatch_abandon', null, [], []);
      } catch (e2) {
        /* nothing else to do - the runtime is already in trouble */
      }
    };
    try {
      var p = Module['ccall']('wx_dom_event', null, ['number', 'number'], [domId, kind]);
      // JSPI: wx_dom_event is a PROMISING export — a throwing handler
      // surfaces as an async REJECTION of the returned promise, which the
      // sync catch below can never see.
      if (p && typeof p.then === 'function') p.then(null, contain);
    } catch (e) {
      contain(e);
    }
  }

  function isEditable(el) {
    return el && (el.tagName === 'TEXTAREA' ||
                  (el.tagName === 'INPUT' &&
                   ['text', 'password', 'number', 'search'].indexOf(el.type) >= 0));
  }

  function flexCenter(el) {
    el.dataset.wxDisplay = 'flex';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
  }

  // Builds the element structure for a logical wx control type. Plain HTML
  // tags ("span", "button", "textarea", "input"+typeAttr) pass through for
  // the simple controls; composite types build wrappers.
  // Returns { root, input, label } (input/label optional).
  function buildControl(type, typeAttr) {
    var root, input, label;
    switch (type) {
      case 'checkbox':
      case 'radio': {
        root = document.createElement('label');
        // Breathing room around the row: measured into the intrinsic size, so
        // sizers pick it up (wxDomCreateControl only force-zeroes padding on
        // controls that didn't set their own).
        root.style.padding = '3px 0';
        input = document.createElement('input');
        input.type = type;
        input.style.margin = '0 5px 0 0';
        // Never let a too-narrow rect crush the box into the label.
        input.style.flexShrink = '0';
        label = document.createElement('span');
        label.className = 'wx-label';
        root.appendChild(input);
        root.appendChild(label);
        flexCenter(root);
        break;
      }
      case 'toggle': {
        root = document.createElement('button');
        root.setAttribute('aria-pressed', 'false');
        flexCenter(root);
        root.style.justifyContent = 'center';
        root.style.padding = '1px 9px';
        break;
      }
      case 'statbox': {
        // Visual chrome only: the wx children of a wxStaticBox are SIBLING
        // DOM controls, so the fieldset must never intercept their input.
        root = document.createElement('fieldset');
        root.style.border = '1px solid #b5b2aa';
        root.style.borderRadius = '2px';
        label = document.createElement('legend');
        label.className = 'wx-label';
        label.style.padding = '0 3px';
        root.appendChild(label);
        root.dataset.wxChrome = '1';
        break;
      }
      case 'statline': {
        root = document.createElement('div');
        root.style.background = '#909090';
        root.dataset.wxChrome = '1';
        break;
      }
      case 'gauge': {
        root = document.createElement('progress');
        root.max = 100;
        root.value = 0;
        break;
      }
      case 'slider': {
        root = document.createElement('input');
        root.type = 'range';
        break;
      }
      case 'scrollbar': {
        // Custom track+thumb (a native <input type=range> can't express a
        // proportional thumb). Drag handlers are wired in wxDomCreateControl
        // once the domId is known; metrics arrive via wxDomSetScrollbar.
        // typeAttr "v" = vertical, "h" = horizontal.
        root = document.createElement('div');
        root.dataset.wxScrollbar = '1';
        var sbVertical = (typeAttr === 'v');
        root.style.background = '#e8e8e8';
        root.style.userSelect = 'none';
        var sbTrack = document.createElement('div');
        sbTrack.className = 'wx-sb-track';
        sbTrack.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;';
        var sbThumb = document.createElement('div');
        sbThumb.className = 'wx-sb-thumb';
        sbThumb.style.cssText =
          'position:absolute;background:#a0a0a0;border:1px solid #808080;' +
          'border-radius:2px;box-sizing:border-box;touch-action:none;' +
          'display:none;' +
          (sbVertical ? 'left:0;right:0;top:0;height:0;'
                      : 'top:0;bottom:0;left:0;width:0;');
        sbTrack.appendChild(sbThumb);
        root.appendChild(sbTrack);
        root._wxSb = { pos: 0, thumb: 0, range: 0, page: 0,
                       vertical: sbVertical, dragging: false, phase: 1,
                       dragStart: 0, dragStartOffset: 0 };
        break;
      }
      case 'choice': {
        root = document.createElement('select');
        break;
      }
      case 'listbox': {
        root = document.createElement('select');
        root.multiple = true;
        root.dataset.wxListBox = '1';
        // wxListBox is the one interactive control whose wx-side mouse
        // events are part of its contract: native ports deliver
        // wxEVT_LEFT_DOWN for a click on a row (KiCad's FILTER_COMBOPOPUP
        // — the net/footprint/symbol filter dropdowns — accepts a row from
        // exactly that event + HitTest). Forward LEFT presses alongside
        // the browser's own row selection; see the input-forwarding block.
        root.dataset.wxForwardLeft = '1';
        break;
      }
      case 'spinbutton': {
        // vertical up/down button pair; clicks dispatch SPIN_UP/SPIN_DOWN
        root = document.createElement('div');
        root.dataset.wxSpin = '1';
        var mk = function (txt, cls) {
          var b = document.createElement('button');
          b.textContent = txt;
          b.className = cls;
          b.style.cssText = 'flex:1;padding:0;margin:0;font-size:7px;' +
                            'line-height:1;min-height:0;overflow:hidden;';
          root.appendChild(b);
          return b;
        };
        root.style.display = 'flex';
        root.dataset.wxDisplay = 'flex';
        root.style.flexDirection = 'column';
        mk('▲', 'wx-spin-up');
        mk('▼', 'wx-spin-down');
        break;
      }
      case 'radiobox': {
        // owns its item rows (unlike statbox chrome): fieldset + legend +
        // one <label><input type=radio><span></span></label> per item,
        // filled by wxDomSetItems.
        root = document.createElement('fieldset');
        root.style.border = '1px solid #b5b2aa';
        root.style.borderRadius = '2px';
        label = document.createElement('legend');
        label.className = 'wx-label';
        label.style.padding = '0 3px';
        root.appendChild(label);
        root.dataset.wxRadioBox = '1';
        break;
      }
      case 'image': {
        root = document.createElement('img');
        root.dataset.wxChrome = '1'; // non-interactive like statbmp
        // Layout may hand the <img> a rect bigger than the bitmap (sizer
        // stretch, min-size constraints); keep the aspect instead of the
        // default object-fit:fill smear.
        root.style.objectFit = 'contain';
        break;
      }
      case 'combobox': {
        // Editable combo: text input + datalist autocomplete (HTML has no
        // native editable select). wxDomSetItems fills the datalist.
        root = document.createElement('input');
        root.type = 'text';
        var dl = document.createElement('datalist');
        dl.id = 'wx-datalist-' + nextControlId; // == the domId assigned below
        root.setAttribute('list', dl.id);
        document.body.appendChild(dl);
        root.dataset.wxDatalist = dl.id;
        break;
      }
      case 'checklistbox': {
        // Scrollable list of checkbox rows; row checkbox toggles dispatch
        // CHANGE with the row index retrievable via wxDomGetIntValue.
        root = document.createElement('div');
        root.dataset.wxCheckList = '1';
        root.style.overflowY = 'auto';
        root.style.background = '#ffffff';
        root.style.border = '1px solid #b5b2aa';
        break;
      }
      case 'menubar': {
        // Horizontal strip of menu-title buttons; menus open as popup divs
        // (built by wxDomMenuSetStructure).
        root = document.createElement('div');
        root.dataset.wxMenuBar = '1';
        root.style.background = '#d4d0c8';
        flexCenter(root);
        break;
      }
      case 'toolbar': {
        // Horizontal strip of tool buttons (built by wxDomToolbarSetTools).
        root = document.createElement('div');
        root.dataset.wxToolBar = '1';
        root.style.background = '#d4d0c8';
        flexCenter(root);
        break;
      }
      case 'notebook': {
        // The root box covers the whole page area, so it is CHROME — it
        // must never swallow mouse events meant for page content (canvas
        // islands and sibling DOM controls). Only the tab strip inside is
        // interactive (built by wxDomNotebookSetTabs).
        root = document.createElement('div');
        root.dataset.wxNotebook = '1';
        root.dataset.wxChrome = '1';
        var strip = document.createElement('div');
        strip.className = 'wx-tab-strip';
        strip.setAttribute('role', 'tablist');
        strip.style.cssText =
          'position:absolute;left:0;top:0;right:0;display:flex;' +
          'align-items:flex-end;background:#d4d0c8;' +
          'border-bottom:1px solid #808080;pointer-events:auto;' +
          'overflow:hidden;';
        root.appendChild(strip);
        break;
      }
      default: {
        root = document.createElement(type);
        if (typeAttr) root.setAttribute('type', typeAttr);
        if (type === 'span' || type === 'button' || type === 'label') {
          flexCenter(root);
        }
        if (type === 'button') {
          root.style.padding = '1px 9px';
          root.style.justifyContent = 'center';
        }
        break;
      }
    }
    // Passive controls have no interactive DOM behavior of their own —
    // left clicks on them belong to wx (KiCad binds LEFT_DOWN on labels).
    if (root && (type === 'span' || type === 'gauge')) {
      root.dataset.wxPassive = '1';
    }
    return { root: root, input: input, label: label };
  }

  window.wxDomCreateControl = function (tlwCssId, type, typeAttr) {
    var container = window.__wxGetWindowElement(tlwCssId);
    if (!container) {
      console.error('wxDomCreateControl: no window element for css id ' + tlwCssId);
      return 0;
    }

    var built = buildControl(type, typeAttr);
    var el = built.root;

    var domId = nextControlId++;
    el.dataset.wxDomId = String(domId);
    el.classList.add('wx-dom-control');
    el.style.position = 'absolute';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.boxSizing = 'border-box';
    el.style.margin = '0';
    if (!el.style.padding) el.style.padding = '0';
    el.style.overflow = type === 'statbox' ? 'visible' : 'hidden';
    if (el.dataset.wxDisplay === undefined) el.dataset.wxDisplay = '';
    // wx labels never soft-wrap (the wx sizer sizes them exactly), but
    // multiline wxStaticText labels DO contain hard \n breaks — 'pre'
    // preserves those while preventing wrapping. <textarea> keeps native
    // wrapping.
    if (type !== 'textarea') {
      el.style.whiteSpace = 'pre';
    }
    // The TLW container has pointer-events:none so input funnels to the
    // canvas; real controls take their own events — except pure chrome
    // (statbox/statline), which must not block canvas hit-testing or
    // sibling controls.
    el.style.pointerEvents = el.dataset.wxChrome ? 'none' : 'auto';

    var valueEl = built.input || el;
    if (built.input) inputs.set(domId, built.input);
    if (built.label) labels.set(domId, built.label);

    if (el.dataset.wxSpin) {
      el.querySelector('.wx-spin-up').addEventListener('click', function (ev) {
        dispatch(domId, EVT.SPIN_UP);
        ev.stopPropagation();
      });
      el.querySelector('.wx-spin-down').addEventListener('click', function (ev) {
        dispatch(domId, EVT.SPIN_DOWN);
        ev.stopPropagation();
      });
    } else if (el.dataset.wxScrollbar) {
      wireScrollbar(domId, el);
    } else if (!el.dataset.wxChrome) {
      el.addEventListener('click', function (ev) {
        dispatch(domId, EVT.CLICK);
        ev.stopPropagation();
      });
      if (el.dataset.wxListBox) {
        // Row double-click -> wxEVT_LISTBOX_DCLICK (see wxListBox::OnDomEvent).
        el.addEventListener('dblclick', function (ev) {
          dispatch(domId, EVT.DBLCLICK);
          ev.stopPropagation();
        });
      }
      el.addEventListener('focusin', function () {
        if (isEditable(valueEl)) {
          window.wxDomEditableFocused = 1;
        }
        dispatch(domId, EVT.FOCUSIN);
      });
      el.addEventListener('focusout', function () {
        if (isEditable(valueEl)) {
          window.wxDomEditableFocused = 0;
        }
        dispatch(domId, EVT.FOCUSOUT);
      });

      valueEl.addEventListener('input', function () {
        dispatch(domId, EVT.INPUT);
      });
      valueEl.addEventListener('change', function () {
        dispatch(domId, EVT.CHANGE);
      });
      if (isEditable(valueEl)) {
        valueEl.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' && valueEl.tagName === 'INPUT') {
            swallowEnterKeypress();
            dispatch(domId, EVT.ENTER);
          } else if (valueEl.tagName === 'INPUT' && NAV_KEY_EVT[ev.key] &&
                     !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
            // Fire-and-forget: wx_dom_event is a promising export, so the
            // browser default (caret to start/end) cannot be gated on the
            // handler's answer — harmless in a single-line input.
            dispatch(domId, NAV_KEY_EVT[ev.key]);
          }
          // Typing belongs to the input; don't let the window-level
          // Emscripten keyboard handler see it (belt — the C++ callback
          // also checks wxDomEditableFocused as suspenders).
          ev.stopPropagation();
        });
        valueEl.addEventListener('keyup', function (ev) {
          ev.stopPropagation();
        });
      }
    }

    controls.set(domId, el);
    container.appendChild(el);
    return domId;
  };

  window.wxDomDestroyControl = function (domId) {
    var el = controls.get(domId);
    if (el) {
      if (el.dataset.wxDatalist) {
        var dl = document.getElementById(el.dataset.wxDatalist);
        if (dl) dl.remove();
      }
      el.remove();
      controls.delete(domId);
      inputs.delete(domId);
      labels.delete(domId);
      // drop this control's mirrored e2e-registry entries (tabs, spin
      // arrows, text fields)
      var reg = window.wxElementRegistry;
      if (reg && reg.renderedElements) {
        var stale = [];
        reg.renderedElements.forEach(function (info, key) {
          if (String(key).indexOf(domId + ':') === 0) stale.push(key);
        });
        stale.forEach(function (key) { reg.unregisterRendered(key); });
      }
    }
  };

  window.wxDomSetRect = function (domId, x, y, w, h) {
    var el = controls.get(domId);
    if (!el) return;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    // A control that moves under (or out from under) an open secondary window
    // changes the input-barrier geometry — wx.js recomputes it (rAF-coalesced).
    wxScheduleBarrierRecompute();
    // Notebook tabs register their viewport rects in the e2e registry;
    // unlike canvas tabs they don't repaint on move, so re-sync here.
    if (el.dataset.wxNotebook && el._wxTabs) {
      scheduleTabRegistry(domId, el);
    }
    // Same for spin arrows and text fields (the canvas port published
    // them from paint hooks; DOM controls don't repaint on move).
    if (el.dataset.wxSpin || el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA') {
      scheduleControlRegistry(domId, el);
    }
    // Scrollbars re-flow the thumb to the new track length, then re-publish
    // their drag targets to the e2e registry.
    if (el.dataset.wxScrollbar) {
      layoutScrollbar(el);
      scheduleScrollbarRegistry(domId, el);
    }
  };

  // Label text: routed to the inner label element for composites
  // (checkbox/radio span, statbox legend), the element itself otherwise.
  window.wxDomSetText = function (domId, text) {
    var target = labels.get(domId) || controls.get(domId);
    if (target) target.textContent = text;
  };

  window.wxDomSetValue = function (domId, value) {
    var el = inputs.get(domId) || controls.get(domId);
    // Skip no-op assignments: setting .value always collapses the caret to
    // the end, which would clobber a selection placed by wxDomSetSelection.
    if (el && el.value !== value) el.value = value;
  };

  window.wxDomGetValue = function (domId) {
    var el = inputs.get(domId) || controls.get(domId);
    return el ? String(el.value) : '';
  };

  // Caret/selection of an <input>/<textarea>. selectionStart/End only exist
  // on text-selectable elements (and throw on some input types), so report
  // -1 when unsupported — the C++ side falls back to its cache.
  window.wxDomGetSelectionStart = function (domId) {
    var el = inputs.get(domId) || controls.get(domId);
    try {
      if (el && typeof el.selectionStart === 'number') return el.selectionStart;
    } catch (e) { /* unsupported input type */ }
    return -1;
  };

  window.wxDomGetSelectionEnd = function (domId) {
    var el = inputs.get(domId) || controls.get(domId);
    try {
      if (el && typeof el.selectionEnd === 'number') return el.selectionEnd;
    } catch (e) { /* unsupported input type */ }
    return -1;
  };

  window.wxDomSetSelection = function (domId, start, end) {
    var el = inputs.get(domId) || controls.get(domId);
    if (!el || typeof el.setSelectionRange !== 'function') return;
    var apply = function () {
      try { el.setSelectionRange(start, end); } catch (e) { /* unsupported type */ }
    };
    apply();
    // A selection set on a blurred <input> is dropped when the element is
    // later focused (the browser restores its own caret on focus). KiCad's
    // dialog select-all-on-open runs while the field is still unfocused and
    // then focuses it, so re-apply the range once on the next focus to make
    // "select then focus" (type-to-replace) behave like native.
    if (document.activeElement !== el) {
      if (el.__wxReselect) el.removeEventListener('focus', el.__wxReselect);
      el.__wxReselect = function () {
        apply();
        el.removeEventListener('focus', el.__wxReselect);
        el.__wxReselect = null;
      };
      el.addEventListener('focus', el.__wxReselect);
    }
  };

  // Boolean state: checkbox/radio checked, toggle button pressed.
  window.wxDomSetBoolValue = function (domId, on) {
    var el = inputs.get(domId) || controls.get(domId);
    if (!el) return;
    if (el.tagName === 'INPUT') {
      el.checked = !!on;
    } else {
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      el.style.background = on ? '#b0c4de' : '';
    }
  };

  window.wxDomGetBoolValue = function (domId) {
    var el = inputs.get(domId) || controls.get(domId);
    if (!el) return 0;
    if (el.tagName === 'INPUT') return el.checked ? 1 : 0;
    return el.getAttribute('aria-pressed') === 'true' ? 1 : 0;
  };

  // Numeric state: gauge/slider value, select/radiobox/combobox selection.
  window.wxDomSetIntValue = function (domId, value) {
    var el = inputs.get(domId) || controls.get(domId);
    if (!el) return;
    if (el.tagName === 'SELECT') {
      el.selectedIndex = value;
    } else if (el.dataset && el.dataset.wxRadioBox) {
      var radios = el.querySelectorAll('input[type=radio]');
      if (radios[value]) radios[value].checked = true;
    } else if (el.dataset && el.dataset.wxDatalist) {
      // combobox selection = the nth datalist option's text
      var dl = document.getElementById(el.dataset.wxDatalist);
      var opt = dl && dl.options[value];
      if (opt) el.value = opt.value;
    } else if (el.dataset && el.dataset.wxScrollbar) {
      // scrollbar thumb position (wxScrollBar::SetThumbPosition). Ignore
      // programmatic moves mid-drag — the user owns the thumb then.
      if (el._wxSb && !el._wxSb.dragging) {
        el._wxSb.pos = value;
        layoutScrollbar(el);
      }
    } else {
      el.value = value;
    }
  };

  window.wxDomGetIntValue = function (domId) {
    var el = inputs.get(domId) || controls.get(domId);
    if (!el) return 0;
    if (el.dataset && el.dataset.wxScrollbar) {
      return el._wxSb ? el._wxSb.pos : 0;
    }
    if (el.tagName === 'SELECT') return el.selectedIndex;
    if (el.dataset && el.dataset.wxRadioBox) {
      var radios = el.querySelectorAll('input[type=radio]');
      for (var i = 0; i < radios.length; i++) {
        if (radios[i].checked) return i;
      }
      return -1;
    }
    if (el.dataset && el.dataset.wxCheckList) {
      // index of the row whose checkbox last toggled (for wxEVT_CHECKLISTBOX)
      var t = parseInt(el.dataset.wxLastToggled, 10);
      return isNaN(t) ? -1 : t;
    }
    if (el.dataset && el.dataset.wxDatalist) {
      // combobox selection = index of the option matching the current text
      var dl = document.getElementById(el.dataset.wxDatalist);
      if (dl) {
        for (var j = 0; j < dl.options.length; j++) {
          if (dl.options[j].value === el.value) return j;
        }
      }
      return -1;
    }
    var v = parseInt(el.value, 10);
    return isNaN(v) ? 0 : v;
  };

  window.wxDomSetRange = function (domId, minVal, maxVal) {
    var el = inputs.get(domId) || controls.get(domId);
    if (!el) return;
    if (el.tagName === 'PROGRESS') {
      el.max = maxVal;
    } else {
      el.min = minVal;
      el.max = maxVal;
    }
  };

  // ========== Scrollbars (track + draggable thumb) ==========
  //
  // One shared widget backs both the standalone wxScrollBar and a wxWindow's
  // built-in gutters. C++ feeds (pos, thumb, range, page) + orientation via
  // wxDomSetScrollbar; drags report position + phase back through
  // wxDOM_EVENT_SCROLL (read with wxDomGetIntValue / wxDomGetScrollPhase).
  //
  // wx scrollbar semantics: `thumb` is the visible portion (the thumb's
  // proportion of the track is thumb/range), `pos` ranges 0..range-thumb,
  // and `page` is the track-click step. Auto-hide when thumb >= range.

  // Position the thumb for the current metrics; auto-hide when nothing scrolls.
  function layoutScrollbar(el) {
    var sb = el._wxSb;
    if (!sb) return;
    var track = el.querySelector('.wx-sb-track');
    var thumb = el.querySelector('.wx-sb-thumb');
    if (!track || !thumb) return;

    var trackPx = sb.vertical ? track.clientHeight : track.clientWidth;
    if (sb.range <= 0 || sb.thumb <= 0 || sb.thumb >= sb.range || trackPx <= 0) {
      thumb.style.display = 'none';
      return;
    }
    thumb.style.display = 'block';

    var thumbPx = Math.min(trackPx,
                           Math.max(12, Math.round(trackPx * sb.thumb / sb.range)));
    var scrollable = sb.range - sb.thumb;
    var pos = Math.max(0, Math.min(sb.pos, scrollable));
    var offsetPx = scrollable > 0
      ? Math.round((trackPx - thumbPx) * pos / scrollable) : 0;

    if (sb.vertical) {
      thumb.style.top = offsetPx + 'px';
      thumb.style.height = thumbPx + 'px';
    } else {
      thumb.style.left = offsetPx + 'px';
      thumb.style.width = thumbPx + 'px';
    }
  }

  // Map a thumb offset (px along the track) back to a scrollbar position.
  function scrollbarPosFromOffset(el, offsetPx) {
    var sb = el._wxSb;
    var track = el.querySelector('.wx-sb-track');
    var thumb = el.querySelector('.wx-sb-thumb');
    var trackPx = sb.vertical ? track.clientHeight : track.clientWidth;
    var thumbPx = sb.vertical ? thumb.offsetHeight : thumb.offsetWidth;
    var span = trackPx - thumbPx;
    var scrollable = sb.range - sb.thumb;
    if (span <= 0 || scrollable <= 0) return 0;
    return Math.max(0, Math.min(scrollable, Math.round(offsetPx / span * scrollable)));
  }

  function wireScrollbar(domId, el) {
    var sb = el._wxSb;
    var track = el.querySelector('.wx-sb-track');
    var thumb = el.querySelector('.wx-sb-thumb');

    thumb.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      sb.dragging = true;
      try { thumb.setPointerCapture(ev.pointerId); } catch (e) {}
      sb.dragStart = sb.vertical ? ev.clientY : ev.clientX;
      sb.dragStartOffset = sb.vertical ? thumb.offsetTop : thumb.offsetLeft;
    });
    thumb.addEventListener('pointermove', function (ev) {
      if (!sb.dragging) return;
      var delta = (sb.vertical ? ev.clientY : ev.clientX) - sb.dragStart;
      var newPos = scrollbarPosFromOffset(el, sb.dragStartOffset + delta);
      if (newPos !== sb.pos) {
        sb.pos = newPos;
        layoutScrollbar(el);
        sb.phase = 0; // thumbtrack
        dispatch(domId, EVT.SCROLL);
      }
    });
    var endDrag = function (ev) {
      if (!sb.dragging) return;
      sb.dragging = false;
      try { thumb.releasePointerCapture(ev.pointerId); } catch (e) {}
      sb.phase = 1; // thumbrelease
      dispatch(domId, EVT.SCROLL);
    };
    thumb.addEventListener('pointerup', endDrag);
    thumb.addEventListener('pointercancel', endDrag);

    // Track click outside the thumb = page step toward the click.
    track.addEventListener('pointerdown', function (ev) {
      if (ev.target === thumb || sb.range <= sb.thumb) return;
      var rect = track.getBoundingClientRect();
      var clickPos = sb.vertical ? (ev.clientY - rect.top) : (ev.clientX - rect.left);
      var thumbStart = sb.vertical ? thumb.offsetTop : thumb.offsetLeft;
      var dir = clickPos < thumbStart ? -1 : 1;
      var scrollable = sb.range - sb.thumb;
      var step = sb.page > 0 ? sb.page : sb.thumb;
      var newPos = Math.max(0, Math.min(scrollable, sb.pos + dir * step));
      if (newPos !== sb.pos) {
        sb.pos = newPos;
        layoutScrollbar(el);
        sb.phase = 2; // page step
        dispatch(domId, EVT.SCROLL);
      }
    });
  }

  // Push metrics from C++ (wxScrollBar / wxWindow built-in scrollbars).
  window.wxDomSetScrollbar = function (domId, pos, thumb, range, page) {
    var el = controls.get(domId);
    if (!el || !el._wxSb) return;
    var sb = el._wxSb;
    sb.thumb = thumb;
    sb.range = range;
    sb.page = page;
    if (!sb.dragging) sb.pos = pos; // the user owns the thumb mid-drag
    layoutScrollbar(el);
    scheduleScrollbarRegistry(domId, el);
  };

  // Phase of the last scroll interaction: 0 track, 1 release, 2 page.
  window.wxDomGetScrollPhase = function (domId) {
    var el = controls.get(domId);
    return el && el._wxSb ? (el._wxSb.phase | 0) : 0;
  };

  // Publish the thumb ('slider') and track ('slidertrack') to the e2e
  // registry so Playwright's dragSliderTo() can drag a scrollbar unchanged.
  // dragSliderTo reads screenX/screenY off the track, so map them explicitly
  // (rectInfo only carries x/y).
  function scheduleScrollbarRegistry(domId, el) {
    requestAnimationFrame(function () {
      var reg = window.wxElementRegistry;
      if (!reg || !el.isConnected || !el._wxSb) return;
      var stale = [];
      reg.renderedElements.forEach(function (info, key) {
        var k = String(key);
        if (k.indexOf(domId + ':slider:') === 0 ||
            k.indexOf(domId + ':slidertrack:') === 0) stale.push(key);
      });
      stale.forEach(function (key) { reg.unregisterRendered(key); });

      var track = el.querySelector('.wx-sb-track');
      var thumb = el.querySelector('.wx-sb-thumb');
      if (!track || !thumb || thumb.style.display === 'none') return;
      var sub = el._wxSb.vertical ? 'vertical' : 'horizontal';
      var tr = track.getBoundingClientRect();
      var th = thumb.getBoundingClientRect();
      registryRegister(domId + ':slidertrack:0', {
        elementType: 'slidertrack', subType: sub, label: '', tooltip: '',
        enabled: true, parentId: String(domId), index: 0,
        screenX: tr.x, screenY: tr.y, width: tr.width, height: tr.height,
        centerX: tr.x + tr.width / 2, centerY: tr.y + tr.height / 2
      });
      registryRegister(domId + ':slider:0', {
        elementType: 'slider', subType: sub, label: '', tooltip: '',
        enabled: true, parentId: String(domId), index: 0,
        screenX: th.x, screenY: th.y, width: th.width, height: th.height,
        centerX: th.x + th.width / 2, centerY: th.y + th.height / 2
      });
    });
  }

  // HTML radio exclusivity groups via the name attribute (wx groups are
  // defined by wxRB_GROUP chains; C++ passes a stable per-group name).
  window.wxDomSetGroupName = function (domId, name) {
    var el = inputs.get(domId);
    if (el) el.name = name;
  };

  // Item lists for select-likes and radiobox; items arrive \x1f-joined
  // (the unit separator can't occur in wx labels).
  window.wxDomSetItems = function (domId, joined) {
    var el = controls.get(domId);
    if (!el) return;
    var items = joined === '' ? [] : joined.split('\x1f');
    if (el.dataset.wxDatalist) {
      var dl = document.getElementById(el.dataset.wxDatalist);
      if (dl) {
        dl.textContent = '';
        items.forEach(function (it) {
          var o = document.createElement('option');
          o.value = it;
          dl.appendChild(o);
        });
      }
    } else if (el.dataset.wxCheckList) {
      el.textContent = '';
      items.forEach(function (it, idx) {
        var row = document.createElement('label');
        row.style.cssText =
          'display:flex;align-items:center;padding:0 2px;white-space:pre;';
        var inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.style.margin = '0 3px 0 0';
        inp.addEventListener('change', function () {
          el.dataset.wxLastToggled = String(idx);
          dispatch(domId, EVT.CHANGE);
        });
        var sp = document.createElement('span');
        sp.textContent = it;
        row.appendChild(inp);
        row.appendChild(sp);
        el.appendChild(row);
      });
    } else if (el.tagName === 'SELECT') {
      el.textContent = '';
      items.forEach(function (it) {
        var o = document.createElement('option');
        o.textContent = it;
        el.appendChild(o);
      });
    } else if (el.dataset.wxRadioBox) {
      Array.prototype.forEach.call(el.querySelectorAll('label'), function (r) {
        r.remove();
      });
      items.forEach(function (it) {
        var row = document.createElement('label');
        row.style.cssText =
          'display:flex;align-items:center;margin:1px 4px;white-space:pre;';
        var inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = 'wxradiobox-' + domId;
        inp.style.margin = '0 3px 0 0';
        inp.addEventListener('change', function () {
          dispatch(domId, EVT.CHANGE);
        });
        var sp = document.createElement('span');
        sp.textContent = it;
        row.appendChild(inp);
        row.appendChild(sp);
        el.appendChild(row);
      });
    }
  };

  // Multi-selection (listbox) / per-item checked state (checklistbox):
  // per-index boolean; "selected" indices returned comma-joined.
  window.wxDomSetItemSelected = function (domId, index, on) {
    var el = controls.get(domId);
    if (!el) return;
    if (el.dataset.wxCheckList) {
      var boxes = el.querySelectorAll('input[type=checkbox]');
      if (boxes[index]) boxes[index].checked = !!on;
    } else if (el.tagName === 'SELECT' && el.options[index]) {
      el.options[index].selected = !!on;
    }
  };

  // wxListBox::HitTest: the row index under a point given in the control's
  // own client coordinates (CSS px from its top-left), -1 for none. Rows are
  // the <option>s of a <select multiple> or the row elements of a checklist;
  // geometry comes from the live layout, so scrolling is accounted for.
  window.wxDomListHitTest = function (domId, x, y) {
    var el = controls.get(domId);
    if (!el) return -1;
    var base = el.getBoundingClientRect();
    var px = base.left + x;
    var py = base.top + y;
    if (px < base.left || py < base.top ||
        px >= base.right || py >= base.bottom) {
      return -1;
    }
    var rows = el.dataset.wxCheckList ? el.children : el.options;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (px >= r.left && px < r.right && py >= r.top && py < r.bottom) {
        return i;
      }
    }
    return -1;
  };

  window.wxDomGetSelectedIndices = function (domId) {
    var el = controls.get(domId);
    if (!el) return '';
    var out = [];
    var i;
    if (el.dataset.wxCheckList) {
      var boxes = el.querySelectorAll('input[type=checkbox]');
      for (i = 0; i < boxes.length; i++) {
        if (boxes[i].checked) out.push(i);
      }
    } else if (el.tagName === 'SELECT') {
      for (i = 0; i < el.options.length; i++) {
        if (el.options[i].selected) out.push(i);
      }
    }
    return out.join(',');
  };

  // Bitmap content as a PNG data URL: <img> roots directly; buttons get a
  // leading <img> child (note: wxDomSetText replaces children — C++ must
  // set the image after the label). Explicit w/h from the wx bitmap size:
  // images load asynchronously, so without them the measurement clone (and
  // hence DoGetBestSize) would see a 0x0 image.
  window.wxDomSetImage = function (domId, dataUrl, w, h) {
    var el = controls.get(domId);
    if (!el) return;
    var img;
    if (el.tagName === 'IMG') {
      img = el;
    } else {
      img = el.querySelector('img.wx-btn-img');
      if (!img) {
        img = document.createElement('img');
        img.className = 'wx-btn-img';
        // keep the bitmap from being squashed inside the flex button
        img.style.flexShrink = '0';
        el.insertBefore(img, el.firstChild);
      }
    }
    if (w > 0) { img.width = w; img.style.width = w + 'px'; }
    if (h > 0) { img.height = h; img.style.height = h + 'px'; }
    img.src = dataUrl;
  };

  window.wxDomSetEnabled = function (domId, enabled) {
    var root = controls.get(domId);
    var el = inputs.get(domId) || root;
    if (!el) return;
    if ('disabled' in el) el.disabled = !enabled;
    if (root) root.style.opacity = enabled ? '' : '0.5';
  };

  window.wxDomSetReadOnly = function (domId, readOnly) {
    var el = inputs.get(domId) || controls.get(domId);
    if (el) el.readOnly = !!readOnly;
  };

  window.wxDomSetShown = function (domId, shown) {
    var el = controls.get(domId);
    if (el) el.style.display = shown ? (el.dataset.wxDisplay || '') : 'none';
  };

  window.wxDomFocus = function (domId) {
    var el = inputs.get(domId) || controls.get(domId);
    if (el && document.activeElement !== el) el.focus();
  };

  // Counterpart of wxDomFocus for wx focus moving to a canvas-drawn window
  // (wxWindowWasm::SetFocus): drop browser focus from the wx-dom control that
  // still has it, so keys go back to wx. Controls outside wx-dom (the host
  // page's own inputs) are never touched.
  window.wxDomBlurActive = function () {
    var ae = document.activeElement;
    if (ae && ae !== document.body && ae.closest && ae.closest('.wx-dom-control')) {
      ae.blur();
    }
  };

  window.wxDomSetFont = function (domId, cssFont) {
    var el = controls.get(domId);
    if (el && cssFont) el.style.font = cssFont;
  };

  window.wxDomSetAriaLabel = function (domId, label) {
    var el = controls.get(domId);
    if (el) el.setAttribute('aria-label', label);
  };

  window.wxDomSetTooltip = function (domId, tip) {
    var el = controls.get(domId);
    if (el) el.title = tip;
  };

  // Insets in CSS px relative to the element's own box; all <= 0 clears.
  // clip-path does not affect layout and clips hit-testing too, so rows
  // scrolled out of a pane neither paint nor catch clicks.
  window.wxDomSetClip = function (domId, top, right, bottom, left) {
    var el = controls.get(domId);
    if (!el) return;
    if (top <= 0 && right <= 0 && bottom <= 0 && left <= 0) {
      if (el.style.clipPath) el.style.clipPath = '';
    } else {
      el.style.clipPath = 'inset(' + Math.max(0, top) + 'px ' +
                          Math.max(0, right) + 'px ' +
                          Math.max(0, bottom) + 'px ' +
                          Math.max(0, left) + 'px)';
    }
  };

  // ========== Menus & toolbars ==========

  // The open menu popups, root first: a menubar menu or a context menu at
  // level 0, then one cascaded submenu per level. menuChainDismiss is the
  // cancel hook of a blocking context menu (settles its Promise with -1).
  var menuChain = [];
  var menuChainDismiss = null;

  function closeMenuFrom(level) {
    var reg = window.wxElementRegistry;
    while (menuChain.length > level) {
      var p = menuChain.pop();
      p.remove();
      // the rows are gone from the DOM, so is their registry geometry
      if (reg && reg.unregisterRenderedByParent)
        reg.unregisterRenderedByParent(p.dataset.wxRegistryParent);
    }
  }

  function closeMenuPopup() {
    var dismiss = menuChainDismiss;
    menuChainDismiss = null;
    closeMenuFrom(0);
    if (dismiss) dismiss();
  }

  function inMenuChain(target) {
    return menuChain.some(function (p) { return p.contains(target); });
  }

  // Capture phase: a control that stops mousedown propagation still closes
  // the menus. Mousedown so the click on another control still lands. A
  // menubar title toggles its own menu, except over a context menu.
  document.addEventListener('mousedown', function (ev) {
    if (!menuChain.length || inMenuChain(ev.target)) return;
    var inTitle = ev.target.closest && ev.target.closest('.wx-menu-title');
    if (!inTitle || menuChainDismiss) closeMenuPopup();
  }, true);

  document.addEventListener('keydown', function (ev) {
    if (menuChain.length && ev.key === 'Escape') {
      ev.stopPropagation();
      ev.preventDefault();
      closeMenuPopup();
    }
  }, true);

  function registryRegister(id, info) {
    var reg = window.wxElementRegistry;
    if (reg && reg.registerRendered) reg.registerRendered(id, info);
  }

  function rectInfo(el) {
    var r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height,
             centerX: r.x + r.width / 2, centerY: r.y + r.height / 2 };
  }

  // A popup at `level` of the chain, closing any at that level or deeper.
  // place(pop) positions it once it is in the document (sized).
  function openMenuLevel(level, items, registryParent, font, onChoose, place) {
    closeMenuFrom(level);
    var pop = document.createElement('div');
    pop.className = 'wx-menu-popup';
    pop.dataset.wxRegistryParent = registryParent;
    pop.style.cssText =
      'position:fixed;z-index:10000;background:#d4d0c8;' +
      'border:1px solid #808080;box-shadow:2px 2px 4px rgba(0,0,0,.3);' +
      'padding:2px;white-space:pre;min-width:120px;left:0;top:0;';
    if (font) pop.style.font = font;
    buildMenuItemRows(pop, items, registryParent, level, font, onChoose);
    document.body.appendChild(pop);
    menuChain.push(pop);
    place(pop);
    return pop;
  }

  // Places a popup wanted at (x, y) inside the viewport: altX / altY are
  // where it goes when it overflows the right / bottom edge (a context menu
  // flips to the other side of the pointer, a submenu to the left of its
  // parent and up to the bottom edge).
  function clampMenu(pop, x, y, altX, altY) {
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var L = x, T = y;
    if (L + w > window.innerWidth) L = Math.max(0, altX);
    if (T + h > window.innerHeight) T = Math.max(0, altY);
    pop.style.left = L + 'px';
    pop.style.top = T + 'px';
  }

  // Builds the item rows of a menu popup into `pop` (shared by the menubar
  // popups, the context menu and their submenus). items:
  // [{id,label,kind:'normal'|'separator'|'check'|'radio'|'submenu',
  //   checked,enabled,items}]. onChoose(id) fires for a leaf row click at
  // any depth. Hovering a submenu row cascades its items beside the row at
  // level + 1; hovering any other row closes the deeper levels. Each row is
  // published to the e2e registry under registryParent as 'menuitem'.
  function buildMenuItemRows(pop, items, registryParent, level, font, onChoose) {
    items.forEach(function (it, idx) {
      if (it.kind === 'separator') {
        var sep = document.createElement('div');
        sep.style.cssText = 'border-top:1px solid #808080;margin:2px 4px;';
        pop.appendChild(sep);
        return;
      }
      var row = document.createElement('div');
      row.textContent = (it.checked ? '✓ ' : '   ') + it.label +
                        (it.kind === 'submenu' ? '  ▸' : '');
      row.style.cssText = 'padding:2px 14px 2px 6px;cursor:default;' +
                          (it.enabled ? '' : 'color:#808080;');
      var subParent = registryParent + ':sub:' + idx;
      function openSub() {
        var child = menuChain[level + 1];
        if (child && child.dataset.wxRegistryParent === subParent) return;
        openMenuLevel(level + 1, it.items || [], subParent, font, onChoose,
          function (sub) {
            var r = row.getBoundingClientRect();
            var pr = pop.getBoundingClientRect();
            clampMenu(sub, pr.right - 2, r.top - 3, pr.left - sub.offsetWidth + 2,
                      window.innerHeight - sub.offsetHeight);
          });
      }
      row.addEventListener('mouseenter', function () {
        if (!it.enabled) {
          closeMenuFrom(level + 1);
          return;
        }
        row.style.background = '#000080';
        row.style.color = '#ffffff';
        if (it.kind === 'submenu') openSub();
        else closeMenuFrom(level + 1);
      });
      row.addEventListener('mouseleave', function () {
        row.style.background = '';
        row.style.color = '';
      });
      if (it.enabled) {
        row.addEventListener('click', function (ev) {
          ev.stopPropagation();
          // a click (touch, no hover) opens the submenu too
          if (it.kind === 'submenu') {
            openSub();
            return;
          }
          onChoose(it.id);
        });
      }
      pop.appendChild(row);
      // register popup items for the e2e registry (canvas parity)
      requestAnimationFrame(function () {
        if (!pop.isConnected) return;
        registryRegister(registryParent + ':menuitem:' + idx, Object.assign({
          elementType: 'menuitem',
          subType: it.kind === 'check' || it.kind === 'radio' ? it.kind :
                   it.kind === 'submenu' ? 'submenu' : 'normal',
          label: it.label, tooltip: '', enabled: !!it.enabled,
          parentId: registryParent, index: idx
        }, rectInfo(row)));
      });
    });
  }

  // Builds and shows the popup for one menubar menu's items below `anchor`.
  function showMenuPopup(domId, anchor, items, registryParent) {
    closeMenuPopup();
    openMenuLevel(0, items, registryParent,
      anchor.style.font || getComputedStyle(anchor).font,
      function (id) {
        var bar = controls.get(domId);
        if (bar) bar.dataset.wxLastCommand = String(id);
        closeMenuPopup();
        dispatch(domId, EVT.MENU);
      },
      function (pop) {
        var a = anchor.getBoundingClientRect();
        clampMenu(pop, a.left, a.bottom, window.innerWidth - pop.offsetWidth,
                  window.innerHeight - pop.offsetHeight);
      });
  }

  // ========== Context menu (wxWindow::PopupMenu -> DoPopupMenu) ==========
  //
  // Shows a standalone popup at a viewport point and BLOCKS the synchronous
  // C++ DoPopupMenu: the EM_ASYNC_JS wxDomPopupMenuModal in
  // src/wasm/window.cpp awaits the returned Promise, which resolves with the
  // chosen command id (-1 = cancelled). The top-level tick keeps dispatching
  // and painting while the opener's chain is parked. json: the wxMenu
  // serialized by wxMenu::WasmItemsToJson(). x/y in viewport px, or -1
  // (wxDefaultCoord) to use the last pointer position (the KiCad canvas
  // right-click case).
  Module['wxShowContextMenu'] = function (json, invokerDomId, x, y) {
    var items;
    try {
      items = JSON.parse(json);
    } catch (e) {
      console.error('wxShowContextMenu: bad JSON: ' + e.message);
      return Promise.resolve(-1);
    }

    var vx = x, vy = y;
    if (x === -1 || y === -1) {
      vx = lastPointerClientX;
      vy = lastPointerClientY;
    } else {
      var inv = controls.get(invokerDomId);
      if (inv) {
        var ir = inv.getBoundingClientRect();
        vx = ir.left + x; vy = ir.top + y;
      } else if (Module['canvas']) {
        var cr = Module['canvas'].getBoundingClientRect();
        vx = cr.left + x; vy = cr.top + y;
      }
    }

    closeMenuPopup(); // a context menu supersedes any open menubar popup

    var font = Module['canvas'] ? getComputedStyle(Module['canvas']).font : '';

    return new Promise(function (resolve) {
      var settled = false;
      function settle(id) {
        if (settled) return;
        settled = true;
        menuChainDismiss = null;
        closeMenuFrom(0);
        resolve(id);
      }

      openMenuLevel(0, items, 'popupmenu', font,
        function (id) { settle(id); },
        function (pop) {
          clampMenu(pop, vx, vy, vx - pop.offsetWidth, vy - pop.offsetHeight);
        });
      // outside mousedown and Escape (the chain's listeners) cancel
      menuChainDismiss = function () { settle(-1); };

      // NO popup pump (docs/features/async/17 S4): the top-level tick is the
      // sole dispatcher and keeps the app painting while DoPopupMenu's chain
      // is suspended. The menu itself is DOM, its events dispatch as fresh
      // entries.
    });
  };

  // structureJson: [{title, items:[...]}, ...] (schema above)
  window.wxDomMenuSetStructure = function (domId, structureJson) {
    var el = controls.get(domId);
    if (!el || !el.dataset.wxMenuBar) return;
    var menus;
    try {
      menus = JSON.parse(structureJson);
    } catch (e) {
      console.error('wxDomMenuSetStructure: bad JSON: ' + e.message);
      return;
    }
    el.textContent = '';
    closeMenuPopup();
    menus.forEach(function (m, idx) {
      var btn = document.createElement('button');
      btn.className = 'wx-menu-title';
      btn.textContent = m.title;
      btn.style.cssText =
        'border:none;background:transparent;padding:2px 8px;margin:0;' +
        'font:inherit;white-space:pre;';
      btn.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (menuChain.length) {
          closeMenuPopup();
        } else {
          showMenuPopup(domId, btn, m.items || [], domId + ':' + idx);
        }
      });
      el.appendChild(btn);
      requestAnimationFrame(function () {
        registryRegister(domId + ':menubartitle:' + idx, Object.assign({
          elementType: 'menuitem', subType: 'menubar',
          label: m.title, tooltip: '', enabled: true,
          parentId: String(domId), index: idx
        }, rectInfo(btn)));
      });
    });
  };

  // tools: [{id,label,tooltip,kind:'button'|'toggle'|'separator'|'control',
  //          toggled,enabled,img,imgW,imgH}]
  window.wxDomToolbarSetTools = function (domId, toolsJson, vertical, marginX, marginY) {
    var el = controls.get(domId);
    if (!el || !el.dataset.wxToolBar) return;
    var tools;
    try {
      tools = JSON.parse(toolsJson);
    } catch (e) {
      console.error('wxDomToolbarSetTools: bad JSON', e);
      return;
    }
    el.textContent = '';
    el.style.flexDirection = vertical ? 'column' : 'row';
    el.style.padding = (marginY || 0) + 'px ' + (marginX || 0) + 'px';
    tools.forEach(function (t, idx) {
      if (t.kind === 'control') {
        // This is only a layout slot. The wx control (which can be a
        // composite of several DOM/canvas children) keeps its native event
        // routing, ownership and position relative to the TLW container.
        var slot = document.createElement('div');
        slot.dataset.wxToolControl = String(t.id);
        slot.style.cssText = 'flex:0 0 auto;pointer-events:none;';
        slot.style.width = t.width + 'px';
        slot.style.height = t.height + 'px';
        el.appendChild(slot);
        return;
      }
      if (t.kind === 'separator') {
        var sep = document.createElement('div');
        sep.style.cssText = 'flex:0 0 auto;align-self:stretch;' + (vertical
          ? 'border-top:1px solid #808080;margin:3px 1px;'
          : 'border-left:1px solid #808080;margin:1px 3px;');
        el.appendChild(sep);
        return;
      }
      var btn = document.createElement('button');
      btn.className = 'wx-tool';
      // same look as every other tooltip (no native title attribute)
      tooltipHover(btn, function () { return t.tooltip || t.label || ''; });
      btn.style.cssText = 'padding:1px 3px;margin:1px;font:inherit;' +
                          'display:flex;align-items:center;flex:0 0 auto;';
      if (t.img) {
        var img = document.createElement('img');
        if (t.imgW > 0) { img.width = t.imgW; img.style.width = t.imgW + 'px'; }
        if (t.imgH > 0) { img.height = t.imgH; img.style.height = t.imgH + 'px'; }
        img.style.flexShrink = '0';
        img.src = t.img;
        btn.appendChild(img);
      } else {
        btn.textContent = t.label || '';
      }
      btn.disabled = !t.enabled;
      if (t.toggled) btn.style.background = '#b0c4de';
      // Styling hook only (dark theme CSS keys off it) — the light look
      // stays inline above.
      if (t.toggled) btn.dataset.wxToggled = '1';
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        el.dataset.wxLastCommand = String(t.id);
        dispatch(domId, EVT.TOOL);
      });
      el.appendChild(btn);
      requestAnimationFrame(function () {
        if (!btn.isConnected) return;
        registryRegister(domId + ':tool:' + idx, Object.assign({
          elementType: 'tool', subType: t.kind === 'toggle' ? 'toggle' : 'button',
          label: t.label || '', tooltip: t.tooltip || '', enabled: !!t.enabled,
          parentId: String(domId), index: idx, toggled: !!t.toggled
        }, rectInfo(btn)));
      });
    });
  };

  // Slot geometry in toolbar-client coordinates. C++ uses SetSize(), so
  // composite children, hit testing and clipping all follow the same rect.
  window.wxDomToolbarGetToolRect = function (domId, index, rect) {
    var el = controls.get(domId);
    var slot = el && el.children[index];
    if (!slot || !slot.dataset.wxToolControl) return 0;
    // Realize() also runs before a frame is shown. Measure a clone in that
    // case rather than replacing the wx control's size with a zero rect.
    var clone = null;
    if (!el.getClientRects().length) {
      clone = el.cloneNode(true);
      clone.style.display = 'flex';
      clone.style.visibility = 'hidden';
      clone.style.left = '-100000px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      el = clone;
      slot = el.children[index];
    }
    var box = slot.getBoundingClientRect();
    var parent = el.getBoundingClientRect();
    HEAP32[rect >> 2] = Math.round(box.left - parent.left);
    HEAP32[(rect >> 2) + 1] = Math.round(box.top - parent.top);
    HEAP32[(rect >> 2) + 2] = Math.round(box.width);
    HEAP32[(rect >> 2) + 3] = Math.round(box.height);
    if (clone) clone.remove();
    return 1;
  };

  // Command id of the last activated menu item / tool (set by the click
  // handlers above; read by wxMenuBar/wxToolBar OnDomEvent).
  window.wxDomGetLastCommandId = function (domId) {
    var el = controls.get(domId);
    var v = el ? parseInt(el.dataset.wxLastCommand, 10) : NaN;
    return isNaN(v) ? -1 : v;
  };

  // ========== Notebook tab strip ==========

  // (Re-)register the strip's tabs in the e2e registry: elementType 'tab',
  // subType 'selected'/'button' — the same contract the canvas port's
  // notebook keeps, so clickTab() works unchanged.
  function scheduleTabRegistry(domId, el) {
    requestAnimationFrame(function () {
      var reg = window.wxElementRegistry;
      if (!reg || !el.isConnected || !el._wxTabs) return;
      var stale = [];
      reg.renderedElements.forEach(function (info, key) {
        if (String(key).indexOf(domId + ':tab:') === 0) stale.push(key);
      });
      stale.forEach(function (key) { reg.unregisterRendered(key); });
      var buttons = el.querySelectorAll('.wx-tab-strip > button');
      el._wxTabs.forEach(function (tab, idx) {
        var btn = buttons[idx];
        if (!btn) return;
        registryRegister(domId + ':tab:' + idx, Object.assign({
          elementType: 'tab',
          subType: tab.selected ? 'selected' : 'button',
          label: tab.label, tooltip: '', enabled: true,
          parentId: String(domId), index: idx
        }, rectInfo(btn)));
      });
    });
  }

  // Mirror DOM-native controls the canvas port used to publish from its
  // paint hooks as "rendered elements": spin arrows ('spinbutton',
  // subType up/down) and text fields ('textctrl', subType
  // singleline/multiline). Keeps clickSpinUp()/findSingleLineTextCtrl()
  // and friends working against the same registry contract.
  function scheduleControlRegistry(domId, el) {
    requestAnimationFrame(function () {
      var reg = window.wxElementRegistry;
      if (!reg || !el.isConnected) return;
      var stale = [];
      reg.renderedElements.forEach(function (info, key) {
        var k = String(key);
        if (k.indexOf(domId + ':spinbutton:') === 0 ||
            k.indexOf(domId + ':textctrl:') === 0) stale.push(key);
      });
      stale.forEach(function (key) { reg.unregisterRendered(key); });

      if (el.dataset.wxSpin) {
        var arrows = [
          { sel: '.wx-spin-up', sub: 'up', idx: 0 },
          { sel: '.wx-spin-down', sub: 'down', idx: 1 }
        ];
        arrows.forEach(function (a) {
          var btn = el.querySelector(a.sel);
          if (!btn) return;
          registryRegister(domId + ':spinbutton:' + a.idx, Object.assign({
            elementType: 'spinbutton', subType: a.sub,
            label: '', tooltip: '', enabled: !btn.disabled,
            parentId: String(domId), index: a.idx
          }, rectInfo(btn)));
        });
        return;
      }

      // text fields: plain <input type=text|password> (a datalist combo
      // is not a textctrl) and <textarea>
      var isText = el.tagName === 'TEXTAREA' ||
                   (el.tagName === 'INPUT' &&
                    (el.type === 'text' || el.type === 'password') &&
                    !el.hasAttribute('list'));
      if (isText) {
        registryRegister(domId + ':textctrl:0', Object.assign({
          elementType: 'textctrl',
          subType: el.tagName === 'TEXTAREA' ? 'multiline' : 'singleline',
          label: el.getAttribute('aria-label') || '',
          tooltip: '', enabled: !el.disabled,
          parentId: String(domId), index: 0
        }, rectInfo(el)));
      }
    });
  }

  // tabsJson: [{label, selected}] — tab id == array index.
  window.wxDomNotebookSetTabs = function (domId, tabsJson) {
    var el = controls.get(domId);
    if (!el || !el.dataset.wxNotebook) return;
    var tabs;
    try {
      tabs = JSON.parse(tabsJson);
    } catch (e) {
      console.error('wxDomNotebookSetTabs: bad JSON: ' + e.message);
      return;
    }
    var strip = el.querySelector('.wx-tab-strip');
    if (!strip) return;
    strip.textContent = '';
    tabs.forEach(function (tab, idx) {
      var btn = document.createElement('button');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', tab.selected ? 'true' : 'false');
      btn.textContent = tab.label;
      btn.style.cssText =
        'font:inherit;margin:1px 0 0 1px;padding:2px 8px;' +
        'border:1px solid #808080;border-bottom:none;' +
        'border-radius:3px 3px 0 0;white-space:pre;' +
        'overflow:hidden;text-overflow:ellipsis;' +
        'flex:0 1 auto;min-width:0;cursor:default;' +
        (tab.selected
          ? 'background:#f5f4f2;font-weight:bold;position:relative;top:1px;'
          : 'background:#c8c4bc;');
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        el.dataset.wxLastCommand = String(idx);
        dispatch(domId, EVT.TAB);
      });
      strip.appendChild(btn);
    });
    el._wxTabs = tabs;
    scheduleTabRegistry(domId, el);
  };

  // Tab strip height for the C++ client-area math; clone-measured so it
  // works while the notebook (or an ancestor) is display:none.
  window.wxDomNotebookStripHeight = function (domId) {
    var el = controls.get(domId);
    if (!el) return 0;
    var strip = el.querySelector('.wx-tab-strip');
    if (!strip) return 0;
    var r = strip.getBoundingClientRect();
    if (r.height > 0) return Math.ceil(r.height);
    // hidden: measure a clone off-screen
    var clone = strip.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.left = '-100000px';
    clone.style.top = '0';
    clone.style.right = 'auto';
    clone.style.visibility = 'hidden';
    clone.style.display = 'flex';
    document.body.appendChild(clone);
    var h = clone.getBoundingClientRect().height;
    clone.remove();
    return Math.max(0, Math.ceil(h));
  };

  // Intrinsic (content-driven) size, packed (w << 16) | h for EM_ASM_INT.
  // Measured on a CLONE inside an always-rendered offscreen host: sizers run
  // DoGetBestSize before the frame is shown, when the element (or any
  // ancestor TLW div) is display:none and would measure 0x0.
  var measureHost = null;
  window.wxDomIntrinsicSize = function (domId) {
    var el = controls.get(domId);
    if (!el) return 0;

    if (!measureHost) {
      measureHost = document.createElement('div');
      measureHost.style.cssText =
        'position:absolute;left:-100000px;top:0;visibility:hidden;';
      document.body.appendChild(measureHost);
    }

    var clone = el.cloneNode(true); // copies inline styles incl. font
    clone.style.display = el.dataset.wxDisplay || 'block';
    clone.style.position = 'static';
    clone.style.width = 'auto';
    clone.style.height = 'auto';
    // shrink-to-fit so the width reflects the content, not the host
    clone.style.inlineSize = 'fit-content';
    measureHost.appendChild(clone);
    var rect = clone.getBoundingClientRect();
    clone.remove();

    var w = Math.min(0xffff, Math.max(1, Math.ceil(rect.width)));
    var h = Math.min(0xffff, Math.max(1, Math.ceil(rect.height)));
    return (w << 16) | h;
  };

  window.wxDomTextCtrlSizeFromText = function (domId, xlen, ylen) {
    var el = controls.get(domId);
    var css = el ? window.getComputedStyle(el) : null;
    function pixels(name) { return css ? (parseFloat(css[name]) || 0) : 0; }
    // Layout uses border-box; leave two additional CSS pixels for the caret
    // and avoid rounding a measured glyph into the border. Computed styles
    // are available even before the parent frame is shown.
    var width = Math.max(0, xlen) + pixels('paddingLeft') + pixels('paddingRight') +
                pixels('borderLeftWidth') + pixels('borderRightWidth') + 2;
    var height = Math.max(1, ylen) + pixels('paddingTop') + pixels('paddingBottom') +
                 pixels('borderTopWidth') + pixels('borderBottomWidth') + 2;
    width = Math.min(0xffff, Math.ceil(width));
    height = Math.min(0xffff, Math.ceil(height));
    return (width << 16) | height;
  };

  // ========== Tooltip layer ==========
  //
  // One port-rendered tooltip for everything: DOM-backed widgets AND
  // canvas-island widgets (which have no element to carry a title
  // attribute). Driven from C++ (src/wasm/tooltip.cpp) off the mouse
  // pipeline's hover hit-test; toolbar buttons/menu titles use the
  // JS-side tooltipHover() since they aren't wx windows.

  var tooltipEl = null;
  var tooltipHoverTimer = null;

  function ensureTooltipEl() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'wx-tooltip';
      tooltipEl.style.cssText =
        'position:fixed;z-index:20000;display:none;' +
        'background:#ffffe1;color:#000;border:1px solid #000;' +
        'padding:2px 4px;font:12px sans-serif;white-space:pre;' +
        'pointer-events:none;max-width:400px;';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // x/y: #canvas-relative (wx screen) coordinates.
  window.wxDomTooltipShow = function (text, x, y) {
    if (!text) return;
    var el = ensureTooltipEl();
    var c = Module['canvas'];
    var base = c ? c.getBoundingClientRect() : { left: 0, top: 0 };
    el.textContent = text;
    el.style.display = 'block';
    var px = base.left + x + 2;
    var py = base.top + y + 18;
    el.style.left = '0px';
    el.style.top = '0px';
    var r = el.getBoundingClientRect();
    if (px + r.width > window.innerWidth - 4) {
      px = Math.max(4, window.innerWidth - r.width - 4);
    }
    if (py + r.height > window.innerHeight - 4) {
      py = base.top + y - r.height - 6;
    }
    el.style.left = px + 'px';
    el.style.top = py + 'px';
  };

  window.wxDomTooltipHide = function () {
    if (tooltipEl) tooltipEl.style.display = 'none';
    if (tooltipHoverTimer) {
      clearTimeout(tooltipHoverTimer);
      tooltipHoverTimer = null;
    }
  };

  // Any press/keystroke/scroll dismisses the tooltip (capture phase so
  // stopPropagation in control listeners can't keep it alive).
  ['mousedown', 'keydown', 'wheel'].forEach(function (evName) {
    document.addEventListener(evName, function () {
      if (tooltipEl && tooltipEl.style.display !== 'none') {
        tooltipEl.style.display = 'none';
      }
    }, true);
  });

  // Hover tooltips for JS-built surfaces that aren't wx windows
  // (toolbar tool buttons). getText is read at fire time.
  function tooltipHover(el, getText) {
    el.addEventListener('mouseenter', function (ev) {
      if (tooltipHoverTimer) clearTimeout(tooltipHoverTimer);
      tooltipHoverTimer = setTimeout(function () {
        var text = getText();
        if (!text) return;
        var c = Module['canvas'];
        var base = c ? c.getBoundingClientRect() : { left: 0, top: 0 };
        window.wxDomTooltipShow(text,
                                Math.round(ev.clientX - base.left),
                                Math.round(ev.clientY - base.top));
      }, 600);
    });
    el.addEventListener('mouseleave', function () {
      window.wxDomTooltipHide();
    });
  }

  // ========== Input forwarding: DOM layer → wx pipeline ==========
  //
  // The wx mouse pipeline (hit-testing, ENTER/LEAVE hover synthesis,
  // wheel scrolling, capture) is fed by Emscripten callbacks on #canvas.
  // DOM controls swallow browser events before #canvas sees them, so the
  // pipeline goes blind whenever the pointer is over a DOM element.
  // These document-level listeners (bubble phase) forward the events wx
  // needs into wx_dom_mouse (src/wasm/domevents.cpp), which re-enters the
  // SAME C++ path.
  //
  // Invariants (prevent double dispatch):
  //  - events targeting #canvas take only the Emscripten path;
  //  - events targeting DOM controls take only this path;
  //  - LEFT clicks on interactive controls take only the native control
  //    path (their click listeners + wx_dom_event); we forward left
  //    clicks only for passive controls (dataset.wxPassive: statictext,
  //    gauge) and for controls whose wx contract includes them
  //    (dataset.wxForwardLeft: wxListBox — LEFT_DOWN + HitTest is how
  //    KiCad's filter popups accept a row), middle/right always.
  // NOTE: listeners that stopPropagation on mousedown (menubar titles)
  // intentionally opt out of forwarding.

  var canvasRect = null;
  window.addEventListener('resize', function () { canvasRect = null; });

  function wxForwardMouse(ev, kind, deltaY, deltaX) {
    var c = Module['canvas'];
    if (!c) return 0;
    if (!canvasRect) canvasRect = c.getBoundingClientRect();
    var mods = (ev.ctrlKey ? 1 : 0) | (ev.shiftKey ? 2 : 0) |
               (ev.altKey ? 4 : 0) | (ev.metaKey ? 8 : 0);
    try {
      return Module['ccall']('wx_dom_mouse', 'number',
        ['number', 'number', 'number', 'number',
         'number', 'number', 'number', 'number', 'number'],
        [kind,
         Math.round(ev.clientX - canvasRect.left),
         Math.round(ev.clientY - canvasRect.top),
         ev.button | 0, ev.buttons | 0, ev.detail | 0, mods, deltaY || 0,
         deltaX || 0]);
    } catch (e) {
      return 0;
    }
  }

  function forwardTarget(ev) {
    var t = ev.target;
    if (!t || t === Module['canvas'] || !t.closest) return null;
    if (t.closest('.wx-menu-popup')) return null;
    return t.closest('.wx-dom-control');
  }

  // Track the pointer everywhere (capture phase, including over the GAL
  // canvas where forwardTarget is null) so a "popup at the mouse" context
  // menu lands at the cursor.
  function trackPointer(ev) {
    lastPointerClientX = ev.clientX;
    lastPointerClientY = ev.clientY;
  }
  document.addEventListener('mousemove', trackPointer, true);
  document.addEventListener('mousedown', trackPointer, true);
  document.addEventListener('contextmenu', trackPointer, true);

  document.addEventListener('mousemove', function (ev) {
    if (forwardTarget(ev)) wxForwardMouse(ev, 1, 0);
  });

  function forwardsLeft(ctl) {
    return !!(ctl.dataset.wxPassive || ctl.dataset.wxForwardLeft);
  }

  document.addEventListener('mousedown', function (ev) {
    var ctl = forwardTarget(ev);
    if (!ctl) return;
    if (ev.button !== 0 || forwardsLeft(ctl)) wxForwardMouse(ev, 2, 0);
  });

  document.addEventListener('mouseup', function (ev) {
    var ctl = forwardTarget(ev);
    if (!ctl) return;
    if (ev.button !== 0 || forwardsLeft(ctl)) wxForwardMouse(ev, 3, 0);
  });

  document.addEventListener('wheel', function (ev) {
    var ctl = forwardTarget(ev);
    if (!ctl) return;
    // A natively scrollable element under the cursor (textarea, multi-
    // select, checklist) keeps its own wheel behavior, per axis scrolled.
    for (var n = ev.target; n; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (ev.deltaY && (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
          n.scrollHeight > n.clientHeight) {
        return;
      }
      if (ev.deltaX && (cs.overflowX === 'auto' || cs.overflowX === 'scroll') &&
          n.scrollWidth > n.clientWidth) {
        return;
      }
      if (n === ctl) break;
    }
    if (wxForwardMouse(ev, 4, ev.deltaY, ev.deltaX)) ev.preventDefault();
  }, { passive: false });

  document.addEventListener('contextmenu', function (ev) {
    var ctl = forwardTarget(ev);
    if (!ctl) return;
    var t = ev.target;
    var editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' ||
                         t.isContentEditable);
    // wx already received the right-click via the forwarded mousedown/up;
    // suppress the browser menu except over editables (keep native paste).
    if (!editable) ev.preventDefault();
  });
})();
// end include: /private/tmp/aven-wasm-spike/wxwidgets/build/wasm/wx-dom.js
// include: /Users/dariuszlubomski/.codex/worktrees/aven-webgl2/survex/tests/wasm-spike/pages/kataster-bootstrap.js
// Only the published scene selects these paths; fixture builds stay unchanged.
Module.avenStartup = {
  survey: '/external/kataster.3d',
  terrain: '/external/terrain.zip'
};
// end include: /Users/dariuszlubomski/.codex/worktrees/aven-webgl2/survex/tests/wasm-spike/pages/kataster-bootstrap.js
// include: /Users/dariuszlubomski/.codex/worktrees/aven-webgl2/survex/tests/wasm-spike/aven-bootstrap.js
// Runtime paths are MEMFS paths, independent of build-machine prefixes.
// This application export can suspend in a normal wx error dialog. Register
// it with the pinned scheduler as well as JSPI_EXPORTS, so its spill stack and
// resumed activation are released when the dialog and loader finish.
var avenPreviousRuntimeInit = Module.onRuntimeInitialized;
Module.onRuntimeInitialized = function () {
  if (avenPreviousRuntimeInit) avenPreviousRuntimeInit();
  __wxScheduler.installExportWraps(['aven_open_files']);
};
Module.preRun = Module.preRun || [];
Module.preRun.push(function () {
  ENV.SURVEXLIB = '/survex';
  ENV.SURVEXLANG = 'en';
  ENV.PROJ_DATA = '/proj';
  if (Module.avenStartup && !new URLSearchParams(location.search).has('fixture')) {
    ENV.AVEN_STARTUP_TERRAIN = Module.avenStartup.terrain;
  }
});
// A URL selects a bundled test file; File > Open remains the Aven file dialog.
var fixture = new URLSearchParams(location.search).get('fixture') || 'real-nordalpenschacht-205';
if (!['real-nordalpenschacht-205', 'bundled-passage', 'synthetic-2180'].includes(fixture)) {
  throw new Error('Unknown Aven fixture: ' + fixture);
}
Module.arguments = ['/fixtures/' + fixture + '.3d'];
if (Module.avenStartup && !new URLSearchParams(location.search).has('fixture')) {
  Module.arguments = [Module.avenStartup.survey];
}
// end include: /Users/dariuszlubomski/.codex/worktrees/aven-webgl2/survex/tests/wasm-spike/aven-bootstrap.js
// include: /var/folders/2w/cpt06jjj2hl9v89_bzgz8xvm0000gn/T/tmpj1yvbojw.js

    if (!Module['preRun']) throw 'Module.preRun should exist because file support used it; did a pre-js delete it?';
    necessaryPreJSTasks.forEach((task) => {
      if (Module['preRun'].indexOf(task) < 0) throw 'All preRun tasks that exist before user pre-js code should remain after; did you replace Module or modify Module.preRun?';
    });
  // end include: /var/folders/2w/cpt06jjj2hl9v89_bzgz8xvm0000gn/T/tmpj1yvbojw.js


var programArgs = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// In MODULARIZE mode _scriptName needs to be captured already at the very top of the page immediately when the page is parsed, so it is generated there
// before the page load. In non-MODULARIZE modes generate it here.
var _scriptName = globalThis.document?.currentScript?.src;

if (typeof __filename != 'undefined') { // Node
  _scriptName = __filename;
} else
if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  const isNode = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
  if (!isNode) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('node:fs');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  assert(Buffer.isBuffer(ret));
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  assert(binary ? Buffer.isBuffer(ret) : typeof ret == 'string');
  return ret;
};
// end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  programArgs = process.argv.slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else
if (ENVIRONMENT_IS_SHELL) {

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = console.log.bind(console);
var err = console.error.bind(console);

var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time (add `shell` to `-sENVIRONMENT` to enable)');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

if (!globalThis.WebAssembly) {
  err('no native wasm support detected');
}

// Wasm globals

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true; // Switch to false at runtime to disable logging at the right times

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug != 'undefined') return;
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) abort('Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)');
})();

function consumedModuleProp(prop) {
  var value = Module[prop];
  var msg = `Attempt to modify \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`;
  if (Array.isArray(value)) {
    value = new Proxy(value, {
      set(target, key, val) {
        abort(msg);
        return false;
      },
      defineProperty(target, key, descriptor) {
        abort(msg);
        return false;
      },
      deleteProperty(target, key) {
        abort(msg);
        return false;
      }
    });
  }
  Object.defineProperty(Module, prop, {
    configurable: true,
    get() { return value; },
    set() {
      abort(msg);
    }
  });
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);

}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_preloadFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

/**
 * Intercept access to a symbols in the global symbol.  This enables us to give
 * informative warnings/errors when folks attempt to use symbols they did not
 * include in their build, or no symbols that no longer exist.
 *
 * We don't define this in MODULARIZE mode since in that mode emscripten symbols
 * are never placed in the global scope.
 */
function hookGlobalSymbolAccess(sym, func) {
  if (!Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is no longer defined by emscripten. ${msg}`);
  });
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith('_')) {
      librarySymbol = '$' + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
    }
    warnOnce(msg);
  });

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      },
    });
  }
}

// end include: runtime_debug.js
// include: runtime_stack_check.js
const stackCookie1 = 0x02135467;
const stackCookie2 = 0x89BACDFE;

// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = stackCookie1;
  HEAPU32[(((max)+(4))>>2)] = stackCookie2;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function u32ToHexString(num) {
  return '0x' + (num >>> 0).toString(16).padStart(8, '0');
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var val1 = HEAPU32[((max)>>2)];
  var val2 = HEAPU32[(((max)+(4))>>2)];
  if (val1 != stackCookie1 || val2 != stackCookie2) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords ${u32ToHexString(stackCookie2)} and ${u32ToHexString(stackCookie1)}, but received ${u32ToHexString(val2)} ${u32ToHexString(val1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// Memory management

var runtimeInitialized = false;



// When ALLOW_MEMORY_GROWTH is enabled, the conversion from Wasm
// memory to ArrayBuffer requires some additional logic.
function getMemoryBuffer() {
  return wasmMemory.buffer;
}

function updateMemoryViews() {
  // If we already have a heap that is resizeable/growable buffer we don't
  // need to do anything in updateMemoryViews.
  if (HEAP8?.buffer?.resizable) return;
  var b = getMemoryBuffer();
  Module['HEAP8'] = HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  Module['HEAP32'] = HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set,
       'JS engine does not provide full typed array support');

function preRun() {
  var preRun = Module['preRun'];
  if (preRun) {
    if (typeof preRun == 'function') preRun = [preRun];
    onPreRuns.push(...preRun);
  }
  consumedModuleProp('preRun');
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  // Begin ATINITS hooks
  if (!Module['noFSInit'] && !FS.initialized) FS.init();
TTY.init();
PIPEFS.root = FS.mount(PIPEFS, {}, null);
  // End ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // Begin ATPOSTCTORS hooks
  FS.ignorePermissions = false;
  // End ATPOSTCTORS hooks

  checkStackCookie();
}

function postRun() {
  checkStackCookie();

  var postRun = Module['postRun'];
  if (postRun) {
    if (typeof postRun == 'function') postRun = [postRun];
    onPostRuns.push(...postRun);
  }
  consumedModuleProp('postRun');

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

/**
 * @param {string|number=} what
 */
function abort(what) {
  Module['onAbort']?.(what);

  what = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  // See above, in the meantime, we resort to wasm code for trapping.
  //
  // In case abort() is called before the module is initialized, wasmExports
  // and its exported '__trap' function is not available, in which case we throw
  // a RuntimeError.
  //
  // We trap instead of throwing RuntimeError to prevent infinite-looping in
  // Wasm EH code (because RuntimeError is considered as a foreign exception and
  // caught by 'catch_all'), but in case throwing RuntimeError is fine because
  // the module has not even been instantiated, even less running.
  if (runtimeInitialized) {
    ___trap();
  }
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

function createExportWrapper(name, func, nargs) {
  assert(func);
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return func(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile('aven.wasm');
}

function getBinarySync(file) {
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally advisable since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid instantiateStreaming() on Node.js environment for now, as while
      // Node.js v18.1.0 implements it, it does not have a full fetch()
      // implementation yet.
      //
      // Reference:
      //   https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // instrumenting imports is used in asyncify in two ways: to add assertions
  // that check for proper import use, and for JSPI we use them to set up
  // the Promise API on the import side.
  Asyncify.instrumentWasmImports(wasmImports);
  // prepare imports
  var imports = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance) {
    wasmExports = instance.exports;

    wasmExports = Asyncify.instrumentWasmExports(wasmExports);

    assignWasmExports(wasmExports);

    updateMemoryViews();

    return wasmExports;
  }

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  var instantiateWasm = Module['instantiateWasm'];
  if (instantiateWasm) {
    return new Promise((resolve) => {
      try {
        instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
      } catch(e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        throw e;
      }
    });
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  /** @type {!Int32Array} */
  var HEAP32;

  /** @type {!Int8Array} */
  var HEAP8;

  /** @type {!Uint32Array} */
  var HEAPU32;

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);

  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);


  var noExitRuntime = true;

  function ptrToString(ptr) {
      assert(typeof ptr === 'number', `ptrToString expects a number, got ${typeof ptr}`);
      // Convert to 32-bit unsigned value
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    }

  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.codePointAt(i);
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce(`Invalid Unicode code point ${ptrToString(u)} encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).`);
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
          // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
          // We need to manually skip over the second code unit for correct iteration.
          i++;
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  
  /** @type {!Uint8Array} */
  var HEAPU8;
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8 requires a third parameter that specifies the length of the output buffer');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var stringToNewUTF8 = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8(str, ret, size);
      return ret;
    };


  

  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  
  
    /**
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul
   * @return {number}
   */
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // As a tiny code save trick, compare idx against maxIdx using a negation,
      // so that maxBytesToRead=undefined/NaN means Infinity.
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    };
  
  
    /**
   * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
   * array that contains uint8 values, returns a copy of that string as a
   * Javascript String object.
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number=} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce(`Invalid UTF-8 leading byte ${ptrToString(u0)} encountered when deserializing a UTF-8 string in wasm memory to a JS string!`);
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  
    /**
   * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
   * emscripten HEAP, returns a copy of that string as a Javascript String object.
   *
   * @param {number} ptr
   * @param {number=} maxBytesToRead - An optional length that specifies the
   *   maximum number of bytes to read. You can omit this parameter to scan the
   *   string until the first 0 byte. If maxBytesToRead is passed, and the string
   *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
   *   string will cut short at that byte index.
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : '';
    };
  var ___assert_fail = (condition, filename, line, func) =>
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);

  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.slice(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
  basename:(path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
join:(...paths) => PATH.normalize(paths.join('/')),
join2:(l, r) => PATH.normalize(l + '/' + r),
};

var initRandomFill = () => {
    // This block is not needed on v19+ since crypto.getRandomValues is builtin
    if (ENVIRONMENT_IS_NODE) {
      var nodeCrypto = require('node:crypto');
      return (view) => (nodeCrypto.randomFillSync(view), 0);
    }

    return (view) => (crypto.getRandomValues(view), 0);
  };
var randomFill = (view) => (randomFill = initRandomFill())(view);



var PATH_FS = {
resolve:(...args) => {
      var resolvedPath = '',
        resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = (i >= 0) ? args[i] : FS.cwd();
        // Skip empty and invalid entries
        if (typeof path != 'string') {
          throw new TypeError('Arguments to path.resolve must be strings');
        } else if (!path) {
          return ''; // an invalid portion invalidates the whole thing
        }
        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)
      resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
      return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
    },
relative:(from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== '') break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== '') break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split('/'));
      var toParts = trim(to.split('/'));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push('..');
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join('/');
    },
};



var FS_stdin_getChar_buffer = [];


/** @type {function(string, boolean=, number=)} */
  var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          // For some reason we must suppress a closure warning here, even though
          // fd definitely exists on process.stdin, and is even the proper way to
          // get the fd of stdin,
          // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
          // This started to happen after moving this logic out of library_tty.js,
          // so it is related to the surrounding code in some unclear manner.
          /** @suppress {missingProperties} */
          var fd = process.stdin.fd;
  
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8');
          }
        } else
        if (globalThis.window?.prompt) {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && !bytesRead) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
  
  var alignMemory = (size, alignment) => {
      assert(alignment, 'alignment argument is required');
      return Math.ceil(size / alignment) * alignment;
    };
  var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (ptr) zeroMemory(ptr, size);
      return ptr;
    };
  
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // not supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          // The actual number of bytes used in the typed array, as opposed to
          // contents.length which gives the whole capacity.
          node.usedBytes = 0;
          // The byte data of the file is stored in a typed array.
          // Note: typed arrays are not resizable like normal JS arrays are, so
          // there is a small penalty involved for appending file writes that
          // continuously grow a file similar to std::vector capacity vs used.
          node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        assert(FS.isFile(node.mode), 'getFileDataAsTypedArray called on non-file');
        return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents.length;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very
        // small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for
        // large sizes, do a much more conservative size*1.125 increase to avoid
        // overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = MEMFS.getFileDataAsTypedArray(node);
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        node.contents.set(oldContents);
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize); // Allocate new storage.
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
        node.usedBytes = newSize;
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          for (const key of ['mode', 'atime', 'mtime', 'ctime']) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {}
          if (new_node) {
            if (FS.isDir(old_node.mode)) {
              // if we're overwriting a directory at new_name, make sure it's empty.
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
            FS.hashRemoveNode(new_node);
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  readdir(node) {
          return ['.', '..', ...Object.keys(node.contents)];
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          buffer.set(contents.subarray(position, position + size), offset);
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          assert(buffer.subarray, 'FS.write expects a TypedArray');
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
  
          if (canOwn) {
            assert(!position, 'canOwn must imply no weird position inside the file');
            node.contents = buffer.subarray(offset, offset + length);
            node.usedBytes = length;
          } else if (!node.usedBytes && !position) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
            node.contents = buffer.slice(offset, offset + length);
            node.usedBytes = length;
          } else {
            MEMFS.expandFileStorage(node, position+length);
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
            node.usedBytes = Math.max(node.usedBytes, position + length);
          }
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  var FS_modeStringToFlags = (str) => {
      if (typeof str != 'string') return str;
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_fileDataToTypedArray = (data) => {
      if (typeof data == 'string') {
        data = intArrayFromString(data, true);
      }
      if (!data.subarray) {
        data = new Uint8Array(data);
      }
      return data;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
  var strError = (errno) => UTF8ToString(_strerror(errno));
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  
  var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    };
  
  
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  
  var getUniqueRunDependency = (id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    };
  
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  
  
  var dependenciesPromiseResolve = null;
  
  var runDependencyTracking = {
  };
  
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
      runDependencies--;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'removeRunDependency requires an ID');
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id];
      if (!runDependencies) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        dependenciesPromiseResolve();
      }
    };
  
  
  
  
  var addRunDependency = (id) => {
      if (!runDependencies) {
        dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
      }
      runDependencies++;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'addRunDependency requires an ID')
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (!runDependencyWatcher && globalThis.setInterval) {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(() => {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err(`dependency: ${dep}`);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10000);
        // Prevent this timer from keeping the runtime alive if nothing
        // else is.
        runDependencyWatcher.unref?.()
      }
    };
  
  
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      for (var plugin of preloadPlugins) {
        if (plugin['canHandle'](fullname)) {
          assert(plugin['handle'].constructor.name === 'AsyncFunction', 'Filesystem plugin handlers must be async functions (See #24914)')
          return plugin['handle'](byteArray, fullname);
        }
      }
      // If no plugin handled this file then return the original/unmodified
      // byteArray.
      return byteArray;
    };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      addRunDependency(dep);
  
      try {
        var byteArray = url;
        if (typeof url == 'string') {
          byteArray = await asyncLoad(url);
        }
  
        byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
        preFinish?.();
        if (!dontCreateFile) {
          FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
        }
      } finally {
        removeRunDependency(dep);
      }
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
    };
  
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  filesystems:null,
  syncFSRequests:0,
  ErrnoError:class extends Error {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : '');
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
        // The per-inode readiness wait-queue. The node carries a Set of listener
        // entries {cb}; producers (SOCKFS, PIPEFS) call notifyListeners on a
        // readiness transition, and poll()/epoll consume it. It lives on the node
        // (not the fd) so dup'd fds share one queue. Only nodes that derive real
        // readiness (sockets, pipes, and an epoll's own node) ever use this -
        // always-ready types (regular files, ttys) never register or notify.
        addListener(cb, exclusive = false) {
          var entry = {cb, exclusive};
          var listeners = (this.listeners ??= new Set());
          listeners.add(entry);
          return {listeners, entry};
        }
        notifyListeners(flags) {
          // Iterates the set without copying, which is safe ONLY under a
          // load-bearing contract that every internal listener must honour:
          //   1. A listener must not run user code synchronously (a poll waiter only
          //      resolves a Promise; an epoll registration only re-lists +
          //      re-notifies; the epoll callback only schedules a tick). User code
          //      runs on a later tick, never inside this loop.
          //   2. A listener may delete entries only from ITS OWN waiter, never from
          //      a sibling node's set that may be mid-iteration. (Deleting an entry
          //      of the set being iterated here is fine - a Set tolerates removal of
          //      a not-yet-visited entry mid-iteration; mutating a *different* node's
          //      set is fine because that set is not being iterated.)
          // Violating either gives silently skipped wakeups that are near-impossible
          // to reproduce. Any new producer/listener must preserve it.
          if (!this.listeners) return;
          // Fire every non-exclusive listener. Among EPOLLEXCLUSIVE registrations
          // (one fd watched by several epolls) wake only one, rotating round-robin
          // per node, to avoid a thundering herd. (Only epoll registrations are ever
          // exclusive; poll waiters and a node's own consumers are not.)
          var excl;
          for (var entry of this.listeners) {
            if (entry.exclusive) (excl ||= []).push(entry);
            else entry.cb(flags);
          }
          if (excl) {
            var i = (this.exclTurn || 0) % excl.length;
            this.exclTurn = i + 1;
            excl[i].cb(flags);
          }
        }
      },
  lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true
  
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + '/' + path;
        }
  
        // limit max consecutive symlinks to SYMLOOP_MAX.
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          // split the absolute path
          var parts = path.split('/').filter((p) => !!p);
  
          // start at the root
          var current = FS.root;
          var current_path = '/';
  
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length-1);
            if (islast && opts.parent) {
              // stop resolving
              break;
            }
  
            if (parts[i] === '.') {
              continue;
            }
  
            if (parts[i] === '..') {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + '/' + parts.slice(i + 1).join('/');
                // We're making progress here, don't let many consecutive ..'s
                // lead to ELOOP
                nlinks--;
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
  
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              // if noent_okay is true, suppress a ENOENT in the last component
              // and return an object with an undefined node. This is needed for
              // resolving symlinks in the path when creating a file.
              if ((e?.errno === 44) && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
  
            // jump to the mount's root node if this is a mountpoint
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
  
            // by default, lookupPath will not follow a symlink if it is the final path component.
            // setting opts.follow = true will override this behavior.
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + '/' + link;
              }
              path = link + '/' + parts.slice(i + 1).join('/');
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        }
        if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        }
        if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else if (FS.isDir(node.mode)) {
          return 31;
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        }
        var mode = FS.flagsToPermissionString(flags);
        if (FS.isDir(node.mode)) {
          // opening for write
          // TODO: check for O_SEARCH? (== search for dir only)
          if (mode !== 'r' || (flags & (512 | 64))) {
            return 31;
          }
        }
        return FS.nodePermissions(node, mode);
      },
  checkOpExists(op, err) {
        if (!op) {
          throw new FS.ErrnoError(err);
        }
        return op;
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        assert(fd >= -1);
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63)
        try {
          setattr(arg, attr);
        } catch (e) {
          if (e instanceof RangeError) {
            throw new FS.ErrnoError(22);
          }
          throw e;
        }
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        for (var mount of mounts) {
          if (mount.type.syncfs) {
            mount.type.syncfs(mount, populate, done);
          } else {
            done(null);
          }
        }
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        for (var [hash, current] of Object.entries(FS.nameTable)) {
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        }
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === '.' || name === '..') {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
      },
  statfsStream(stream) {
        // We keep a separate statfsStream function because noderawfs overrides
        // it. In noderawfs, stream.node is sometimes null. Instead, we need to
        // look at stream.path.
        return FS.statfsNode(stream.node);
      },
  statfsNode(node) {
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values. Currently nodefs and rawfs replace these defaults,
        //       other file systems leave them alone.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += '/';
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  link(oldpath, newpath, flags) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // Hardlinks are only supported by filesystem backends that provide a
        // `link` node op (e.g. NODERAWFS backed by the host). NODEFS omits it:
        // a host hardlink cannot be confined to the mount root.
        if (!parent.node_ops.link) {
          throw new FS.ErrnoError(34);
        }
        return parent.node_ops.link(parent, newname, oldpath, flags);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
  fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63)
        return getattr(arg);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          ctime: Date.now(),
          dontFollow
        });
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
  doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
          // we ignore the uid / gid for now
        });
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
  doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
  utime(path, atime, mtime, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        FS.doSetAttr(null, lookup.node, {
          atime: atime,
          mtime: mtime,
          dontFollow
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === '') {
          throw new FS.ErrnoError(44);
        }
        flags = FS_modeStringToFlags(flags);
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == 'object') {
          node = path;
        } else {
          isDirPath = path.endsWith('/');
          // noent_okay makes it so that if the final component of the path
          // doesn't exist, lookupPath returns `node: undefined`. `path` will be
          // updated to point to the target of all symlinks.
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            // node doesn't exist, try to create it
            // Ignore the permission bits here to ensure we can `open` this new
            // file below. We use chmod below to apply the permissions once the
            // file is open.
            node = FS.mknod(path, mode | 0o777, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 0o777);
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        // The fd is going away: wake anything waiting on it (poll/epoll) with
        // POLLNVAL so a blocking wait unblocks and an epoll registration is evicted
        // on its next derive. Only sockets/pipes/epoll ever carry a wait-queue, so
        // for every other stream (incl. nodeless noderawfs stdio) this is a no-op.
        stream.node?.notifyListeners(32);
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        assert(buffer.subarray, 'FS.write expects a TypedArray');
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2)
            && !(flags & 2)
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags ?? 0;
        opts.encoding = opts.encoding ?? 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          abort(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags ?? 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        data = FS_fileDataToTypedArray(data);
        FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (!randomLeft) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.stream_ops = {
              llseek: MEMFS.stream_ops.llseek,
            };
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                  id: fd + 1,
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              },
              readdir() {
                return Array.from(FS.streams.entries())
                  .filter(([k, v]) => v)
                  .map(([k, v]) => k.toString());
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          data = FS_fileDataToTypedArray(data);
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && !bytesRead) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (globalThis.XMLHttpRequest) {
          abort('Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.');
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
            var datalength = Number(xhr.getResponseHeader('Content-length'));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes';
            var usesGzip = (header = xhr.getResponseHeader('Content-Encoding')) && header === 'gzip';
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
              if (to > datalength-1) abort(`only ${datalength} bytes available! programmer error!`);
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader('Range', `bytes=${from}-${to}`);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText ?? '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') abort('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out('LazyFiles on gzip forces download of the whole file when length is accessed');
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (globalThis.XMLHttpRequest) {
          if (!ENVIRONMENT_IS_WORKER) abort('Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc');
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        for (const [key, fn] of Object.entries(node.stream_ops)) {
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        }
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  };
  
  
  
  
  
  /** not-@type {!BigInt64Array} */
  var HEAP64;
  var SYSCALLS = {
  currentUmask:18,
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return dir + '/' + path;
      },
  writeStat(buf, stat) {
        HEAPU32[((buf)>>2)] = stat.dev;
        HEAPU32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAPU32[(((buf)+(12))>>2)] = stat.uid;
        HEAPU32[(((buf)+(16))>>2)] = stat.gid;
        HEAPU32[(((buf)+(20))>>2)] = stat.rdev;
        HEAP64[(((buf)+(24))>>3)] = BigInt(stat.size);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[(((buf)+(40))>>3)] = BigInt(Math.floor(atime / 1000));
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(56))>>3)] = BigInt(Math.floor(mtime / 1000));
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(72))>>3)] = BigInt(Math.floor(ctime / 1000));
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000 * 1000;
        HEAP64[(((buf)+(88))>>3)] = BigInt(stat.ino);
        return 0;
      },
  writeStatFs(buf, stats) {
        HEAPU32[(((buf)+(4))>>2)] = stats.bsize;
        HEAPU32[(((buf)+(60))>>2)] = stats.bsize;
        HEAP64[(((buf)+(8))>>3)] = BigInt(stats.blocks);
        HEAP64[(((buf)+(16))>>3)] = BigInt(stats.bfree);
        HEAP64[(((buf)+(24))>>3)] = BigInt(stats.bavail);
        HEAP64[(((buf)+(32))>>3)] = BigInt(stats.files);
        HEAP64[(((buf)+(40))>>3)] = BigInt(stats.ffree);
        HEAPU32[(((buf)+(48))>>2)] = stats.fsid;
        HEAPU32[(((buf)+(64))>>2)] = stats.flags;  // ST_NOSUID
        HEAPU32[(((buf)+(56))>>2)] = stats.namelen;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.subarray(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  function ___syscall_chdir(path) {
  try {
  
      path = SYSCALLS.getStr(path);
      FS.chdir(path);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_chmod(path, mode) {
  try {
  
      path = SYSCALLS.getStr(path);
      FS.chmod(path, mode);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_dup3(fd, newfd, flags) {
  try {
  
      if (fd === newfd) return -28;
      if (flags & ~524288) return -28;
      var old = SYSCALLS.getStreamFromFD(fd);
      // Check newfd is within range of valid open file descriptors.
      if (newfd < 0 || newfd >= FS.MAX_OPEN_FDS) return -8;
      var existing = FS.getStream(newfd);
      if (existing) FS.close(existing);
      var stream = FS.dupStream(old, newfd);
      if (flags & 524288) {
        stream.flags |= 524288;
      }
      return stream.fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_faccessat(dirfd, path, amode, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      assert(!flags || flags == 512);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (amode & ~7) {
        // need a valid mode
        return -28;
      }
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      if (!node) {
        return -44;
      }
      var perms = '';
      if (amode & 4) perms += 'r';
      if (amode & 2) perms += 'w';
      if (amode & 1) perms += 'x';
      if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
        return -2;
      }
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_fchmod(fd, mode) {
  try {
  
      FS.fchmod(fd, mode);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_fchown32(fd, owner, group) {
  try {
  
      FS.fchown(fd, owner, group);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != undefined);
      // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
      var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
      SYSCALLS.varargs += 4;
      return ret;
    };
  var syscallGetVarargP = syscallGetVarargI;
  
  
  
  /** @type {!Int16Array} */
  var HEAP16;
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = (stream.flags & ~mask) | (arg & mask);
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 13:
        case 14:
          // Pretend that the locking is successful. These are process-level locks,
          // and Emscripten programs are a single process. If we supported linking a
          // filesystem between programs, we'd need to do more here.
          // See https://github.com/emscripten-core/emscripten/issues/23697
          return 0;
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_fstat64(fd, buf) {
  try {
  
      return SYSCALLS.writeStat(buf, FS.fstat(fd));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  function ___syscall_ftruncate64(fd, length) {
    length = bigintToI53Checked(length);
  
  
  try {
  
      if (isNaN(length)) return -22;
      FS.ftruncate(fd, length);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  
  function ___syscall_getcwd(buf, size) {
  try {
  
      if (!size) return -28;
      var cwd = FS.cwd();
      var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
      if (size < cwdLengthInBytes) return -68;
      stringToUTF8(cwd, buf, size);
      return cwdLengthInBytes;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  
  
  
  function ___syscall_getdents64(fd, dirp, count) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd)
      stream.getdents ||= FS.readdir(stream.path);
  
      var struct_size = 280;
      var pos = 0;
      var off = FS.llseek(stream, 0, 1);
  
      var startIdx = Math.floor(off / struct_size);
      var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count/struct_size))
      for (var idx = startIdx; idx < endIdx; idx++) {
        var id;
        var type;
        var name = stream.getdents[idx];
        if (name === '.') {
          id = stream.node.id;
          type = 4;
        }
        else if (name === '..') {
          var lookup = FS.lookupPath(stream.path, { parent: true });
          id = lookup.node.id;
          type = 4;
        }
        else {
          var child;
          try {
            child = FS.lookupNode(stream.node, name);
          } catch (e) {
            // If the entry is not a directory, file, or symlink, nodefs
            // lookupNode will raise EINVAL. Skip these and continue.
            if (e?.errno === 28) {
              continue;
            }
            throw e;
          }
          id = child.id;
          type = FS.isChrdev(child.mode) ? 2 : // character device.
                 FS.isDir(child.mode) ? 4 :    // directory
                 FS.isLink(child.mode) ? 10 :   // symbolic link.
                 8;                            // regular file.
        }
        assert(id);
        HEAP64[((dirp + pos)>>3)] = BigInt(id);
        HEAP64[(((dirp + pos)+(8))>>3)] = BigInt((idx + 1) * struct_size);
        HEAP16[(((dirp + pos)+(16))>>1)] = 280;
        HEAP8[(dirp + pos)+(18)] = type;
        stringToUTF8(name, dirp + pos + 19, 256);
        pos += struct_size;
      }
      FS.llseek(stream, idx * struct_size, 0);
      return pos;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var ___syscall_geteuid32 = () => 0;

  var ___syscall_getuid32 = () => 0;

  
  
  
  
  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_lstat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.lstat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_mkdirat(dirfd, path, mode) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      mode &= ~SYSCALLS.currentUmask;
      FS.mkdir(path, mode, 0);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_newfstatat(dirfd, path, buf, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & (~6400);
      assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  var PIPEFS = {
  BUCKET_BUFFER_SIZE:8192,
  mount(mount) {
        // Do not pollute the real root directory or its child nodes with pipes
        // Looks like it is OK to create another pseudo-root node not linked to the FS.root hierarchy this way
        return FS.createNode(null, '/', 16384 | 0o777, 0);
      },
  createPipe() {
        var pipe = {
          buckets: [],
          // Open write ends. When it drops to 0 the reader sees EOF and poll must
          // report POLLHUP (Linux semantics). Buckets are freed once both counts
          // reach 0.
          writerCount: 1,
          writeClosed: false,
          // Open read ends. When it drops to 0 the writer sees POLLERR (a further
          // write would get EPIPE).
          readerCount: 1,
          readClosed: false,
          timestamp: new Date(),
        };
  
        pipe.buckets.push({
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: 0,
          roffset: 0
        });
  
        var rName = PIPEFS.nextname();
        var wName = PIPEFS.nextname();
        var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
        var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
  
        rNode.pipe = pipe;
        wNode.pipe = pipe;
        // The read end's node carries the reader poll wait-queue (writes wake it);
        // the write end's node carries the writer wait-queue (read-end close wakes it).
        pipe.readNode = rNode;
        pipe.writeNode = wNode;
  
        var readableStream = FS.createStream({
          path: rName,
          node: rNode,
          flags: 0,
          seekable: false,
          stream_ops: PIPEFS.stream_ops
        });
        rNode.stream = readableStream;
  
        var writableStream = FS.createStream({
          path: wName,
          node: wNode,
          flags: 1,
          seekable: false,
          stream_ops: PIPEFS.stream_ops
        });
        wNode.stream = writableStream;
  
        return {
          readable_fd: readableStream.fd,
          writable_fd: writableStream.fd
        };
      },
  stream_ops:{
  getattr(stream) {
          var node = stream.node;
          var timestamp = node.pipe.timestamp;
          return {
            dev: 14,
            ino: node.id,
            mode: 0o10600,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: 0,
            size: 0,
            atime: timestamp,
            mtime: timestamp,
            ctime: timestamp,
            blksize: 4096,
            blocks: 0,
          };
        },
  poll(stream) {
          var pipe = stream.node.pipe;
  
          if ((stream.flags & 2097155) === 1) {
            // Linux keeps the write end writable (the write itself fails with
            // EPIPE) while also signalling POLLERR once every read end is closed.
            var mask = 256 | 4;
            if (pipe.readClosed) {
              mask |= 8;
            }
            return mask;
          }
          var mask = 0;
          for (var bucket of pipe.buckets) {
            if (bucket.offset - bucket.roffset > 0) {
              mask = 64 | 1;
              break;
            }
          }
          // With every write end closed the read end is at EOF: readable (read
          // returns 0) and hung up.
          if (pipe.writeClosed) {
            mask |= 16 | 1;
          }
          return mask;
        },
  dup(stream) {
          var pipe = stream.node.pipe;
          if ((stream.flags & 2097155) === 1) {
            pipe.writerCount++;
          } else {
            pipe.readerCount++;
          }
        },
  ioctl(stream, request, argp) {
          if (request == 21531) {
            var pipe = stream.node.pipe;
            var currentLength = 0;
            for (var bucket of pipe.buckets) {
              currentLength += bucket.offset - bucket.roffset;
            }
            HEAP32[((argp)>>2)] = currentLength;
            return 0;
          }
          return 28;
        },
  fsync(stream) {
          return 28;
        },
  read(stream, buffer, offset, length, position /* ignored */) {
          var pipe = stream.node.pipe;
          var currentLength = 0;
  
          for (var bucket of pipe.buckets) {
            currentLength += bucket.offset - bucket.roffset;
          }
  
          assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
          var data = buffer.subarray(offset, offset + length);
  
          if (length <= 0) {
            return 0;
          }
          if (currentLength == 0) {
            // Behave as if the read end is always non-blocking
            throw new FS.ErrnoError(6);
          }
          var toRead = Math.min(currentLength, length);
  
          var totalRead = toRead;
          var toRemove = 0;
  
          for (var bucket of pipe.buckets) {
            var bucketSize = bucket.offset - bucket.roffset;
  
            if (toRead <= bucketSize) {
              var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
              if (toRead < bucketSize) {
                tmpSlice = tmpSlice.subarray(0, toRead);
                bucket.roffset += toRead;
              } else {
                toRemove++;
              }
              data.set(tmpSlice);
              break;
            } else {
              var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
              data.set(tmpSlice);
              data = data.subarray(tmpSlice.byteLength);
              toRead -= tmpSlice.byteLength;
              toRemove++;
            }
          }
  
          if (toRemove && toRemove == pipe.buckets.length) {
            // Do not generate excessive garbage in use cases such as
            // write several bytes, read everything, write several bytes, read everything...
            toRemove--;
            pipe.buckets[toRemove].offset = 0;
            pipe.buckets[toRemove].roffset = 0;
          }
  
          pipe.buckets.splice(0, toRemove);
  
          return totalRead;
        },
  write(stream, buffer, offset, length, position /* ignored */) {
          var pipe = stream.node.pipe;
  
          assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
          var data = buffer.subarray(offset, offset + length);
  
          var dataLen = data.byteLength;
          if (dataLen <= 0) {
            return 0;
          }
  
          var currBucket = null;
  
          if (pipe.buckets.length == 0) {
            currBucket = {
              buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
              offset: 0,
              roffset: 0
            };
            pipe.buckets.push(currBucket);
          } else {
            currBucket = pipe.buckets[pipe.buckets.length - 1];
          }
  
          assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
  
          var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
          if (freeBytesInCurrBuffer >= dataLen) {
            currBucket.buffer.set(data, currBucket.offset);
            currBucket.offset += dataLen;
            pipe.readNode.notifyListeners(64 | 1);
            return dataLen;
          } else if (freeBytesInCurrBuffer > 0) {
            currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
            currBucket.offset += freeBytesInCurrBuffer;
            data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
          }
  
          var numBuckets = (data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE) | 0;
          var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
  
          for (var i = 0; i < numBuckets; i++) {
            var newBucket = {
              buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
              offset: PIPEFS.BUCKET_BUFFER_SIZE,
              roffset: 0
            };
            pipe.buckets.push(newBucket);
            newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
            data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
          }
  
          if (remElements > 0) {
            var newBucket = {
              buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
              offset: data.byteLength,
              roffset: 0
            };
            pipe.buckets.push(newBucket);
            newBucket.buffer.set(data);
          }
  
          pipe.readNode.notifyListeners(64 | 1);
          return dataLen;
        },
  close(stream) {
          var pipe = stream.node.pipe;
          // When the last write end closes, wake any poll/epoll waiter on the read
          // end with POLLHUP so a reader blocked on the writer dropping unblocks.
          if ((stream.flags & 2097155) === 1) {
            if (!--pipe.writerCount) {
              pipe.writeClosed = true;
              pipe.readNode.notifyListeners(16 | 64 | 1);
            }
          } else if (!--pipe.readerCount) {
            // Mirror: when the last read end closes, wake any poll/epoll waiter on
            // the write end with POLLERR (a further write would get EPIPE).
            pipe.readClosed = true;
            pipe.writeNode.notifyListeners(8 | 256 | 4);
          }
          if (!pipe.readerCount && !pipe.writerCount) {
            pipe.buckets = null;
          }
        },
  },
  nextname() {
        if (!PIPEFS.nextname.current) {
          PIPEFS.nextname.current = 0;
        }
        return 'pipe[' + (PIPEFS.nextname.current++) + ']';
      },
  };
  
  function ___syscall_pipe2(fdPtr, flags) {
  try {
  
      if (fdPtr == 0) {
        throw new FS.ErrnoError(21);
      }
      var validFlags = 524288 | 2048;
      if (flags & ~validFlags) {
        throw new FS.ErrnoError(138);
      }
  
      var res = PIPEFS.createPipe();
  
      if (flags & 2048) {
        FS.getStream(res.readable_fd).flags |= 2048;
        FS.getStream(res.writable_fd).flags |= 2048;
      }
  
      HEAP32[((fdPtr)>>2)] = res.readable_fd;
      HEAP32[(((fdPtr)+(4))>>2)] = res.writable_fd;
  
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var pollOne = (fd, events) => {
      var stream = FS.getStream(fd);
      if (!stream) return 32;
      // Streams without a poll handler (regular files, incl. NODERAWFS/NODEFS
      // which leave stream_ops unset) are treated as always readable+writable.
      var flags = stream.stream_ops?.poll
        ? stream.stream_ops.poll(stream)
        : 5;
      return flags & (events | 8 | 16 | 32);
    };
  
  
  var doPollSync = (fds, nfds) => {
      var count = 0;
      for (var i = 0, pollfd = fds; i < nfds; i++, pollfd += 8) {
        var revents = pollOne(
          HEAP32[((pollfd)>>2)],
          HEAP16[(((pollfd)+(4))>>1)]);
        if (revents) count++;
        HEAP16[(((pollfd)+(6))>>1)] = revents;
      }
      return count;
    };
  
  
  
  
  var doPollAsync = (fds, nfds, timeout) => new Promise((resolve) => {
      var regs = [];
      var timer;
      var done = false;
      function derive() {
        var count = 0;
        for (var i = 0, pollfd = fds; i < nfds; i++, pollfd += 8) {
          var revents = pollOne(
            HEAP32[((pollfd)>>2)],
            HEAP16[(((pollfd)+(4))>>1)]);
          if (revents) count++;
          HEAP16[(((pollfd)+(6))>>1)] = revents;
        }
        return count;
      }
      function finish(count) {
        if (done) return;
        done = true;
        for (var r of regs) r.listeners.delete(r.entry);
        if (timer) clearTimeout(timer);
        resolve(count);
      }
      var count = derive();
      if (count || !timeout) {
        finish(count);
      } else {
        function recheck() {
          if (done) return;
          var c = derive();
          if (c) finish(c);
        }
        for (var i = 0, pollfd = fds; i < nfds; i++, pollfd += 8) {
          var stream = FS.getStream(HEAP32[((pollfd)>>2)]);
          if (stream) regs.push(stream.node.addListener(recheck));
        }
        if (timeout > 0) timer = setTimeout(() => finish(0), timeout);
      }
    });
  var ___syscall_poll = function(fds, nfds, timeout) {
    let innerFunc =  () => {
  
  try {
  
      const isAsyncContext = true;
      // When proxied from a worker (PTHREADS) or able to suspend (ASYNCIFY/JSPI),
      // block on the wait-queue. This must run for every timeout (including zero):
      // a proxied syscall's return is awaited by the caller thread, so it has to
      // be a Promise even for a probe.
      if (isAsyncContext) {
        return doPollAsync(fds, nfds, timeout);
      }
      var count = doPollSync(fds, nfds);
      if (!count && timeout != 0) warnOnce('non-zero poll() timeout not supported: ' + timeout)
      return count;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  
  };
    return Asyncify.handleAsync(innerFunc);
  }
  ;
  ___syscall_poll.isAsync = true;

  
  
  
  function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (bufsize <= 0) return -28;
      var ret = FS.readlink(path);
  
      var len = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf+len];
      stringToUTF8(ret, buf, bufsize+1);
      // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
      // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
      HEAP8[buf+len] = endChar;
      return len;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
  try {
  
      oldpath = SYSCALLS.getStr(oldpath);
      newpath = SYSCALLS.getStr(newpath);
      oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
      newpath = SYSCALLS.calculateAt(newdirfd, newpath);
      FS.rename(oldpath, newpath);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_rmdir(path) {
  try {
  
      path = SYSCALLS.getStr(path);
      FS.rmdir(path);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_stat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.stat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_umask(mask) {
  try {
  
      var old = SYSCALLS.currentUmask;
      SYSCALLS.currentUmask = mask;
      return old;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_unlinkat(dirfd, path, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (!flags) {
        FS.unlink(path);
      } else if (flags === 512) {
        FS.rmdir(path);
      } else {
        return -28;
      }
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  var readI53FromI64 = (ptr) => {
      return HEAPU32[((ptr)>>2)] + HEAP32[(((ptr)+(4))>>2)] * 4294967296;
    };
  
  
  function ___syscall_utimensat(dirfd, path, times, flags) {
  try {
  
      var nofollow = flags & 256;
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path, true);
      var now = Date.now(), atime, mtime;
      if (!times) {
        atime = now;
        mtime = now;
      } else {
        var seconds = readI53FromI64(times);
        var nanoseconds = HEAP32[(((times)+(8))>>2)];
        if (nanoseconds == 1073741823) {
          atime = now;
        } else if (nanoseconds == 1073741822) {
          atime = null;
        } else {
          atime = (seconds*1000) + (nanoseconds/(1000*1000));
        }
        times += 16;
        seconds = readI53FromI64(times);
        nanoseconds = HEAP32[(((times)+(8))>>2)];
        if (nanoseconds == 1073741823) {
          mtime = now;
        } else if (nanoseconds == 1073741822) {
          mtime = null;
        } else {
          mtime = (seconds*1000) + (nanoseconds/(1000*1000));
        }
      }
      // null here means UTIME_OMIT was passed. If both were set to UTIME_OMIT then
      // we can skip the call completely.
      if ((mtime ?? atime) !== null) {
        FS.utime(path, atime, mtime, nofollow);
      }
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var getCppExceptionTag = () => ___cpp_exception;
  
  
  var getCppExceptionThrownObjectFromWebAssemblyException = (ex) => {
      // In Wasm EH, the value extracted from WebAssembly.Exception is a pointer
      // to the unwind header. Convert it to the actual thrown value.
      var unwind_header = ex.getArg(getCppExceptionTag(), 0);
      return ___thrown_object_from_unwind_exception(unwind_header);
    };
  
  
  
  var stackSave = () => _emscripten_stack_get_current();
  
  var stackRestore = (val) => __emscripten_stack_restore(val);
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  
  
  var getExceptionMessageCommon = (ptr) => {
      var sp = stackSave();
      var type_addr_addr = stackAlloc(4);
      var message_addr_addr = stackAlloc(4);
      ___get_exception_message(ptr, type_addr_addr, message_addr_addr);
      var type_addr = HEAPU32[((type_addr_addr)>>2)];
      var message_addr = HEAPU32[((message_addr_addr)>>2)];
      var type = UTF8ToString(type_addr);
      _free(type_addr);
      var message;
      if (message_addr) {
        message = UTF8ToString(message_addr);
        _free(message_addr);
      }
      stackRestore(sp);
      return [type, message];
    };
  var getExceptionMessage = (ex) => {
      var ptr = getCppExceptionThrownObjectFromWebAssemblyException(ex);
      return getExceptionMessageCommon(ptr);
    };
  
  
  var decrementExceptionRefcount = (ex) => {
      var ptr = getCppExceptionThrownObjectFromWebAssemblyException(ex);
      ___cxa_decrement_exception_refcount(ptr);
    };
  
  
  var incrementExceptionRefcount = (ex) => {
      var ptr = getCppExceptionThrownObjectFromWebAssemblyException(ex);
      ___cxa_increment_exception_refcount(ptr);
    };
  var ___throw_exception_with_stack_trace = (ex) => {
      var e = new WebAssembly.Exception(getCppExceptionTag(), [ex], {traceStack: true});
      e.message = getExceptionMessage(e);
      throw e;
    };

  var __abort_js = () =>
      abort('native code called abort()');

  
  function __gmtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
  
  
      var date = new Date(time * 1000);
      if (isNaN(date.getTime())) {
        return 1;
      }
      HEAP32[((tmPtr)>>2)] = date.getUTCSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getUTCMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getUTCHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getUTCDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getUTCMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getUTCFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getUTCDay();
      var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = ((date.getTime() - start) / (1000 * 60 * 60 * 24))|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      return 0;
    ;
  }

  var isLeapYear = (year) => year%4 === 0 && (year%100 !== 0 || year%400 === 0);
  
  var MONTH_DAYS_LEAP_CUMULATIVE = [0,31,60,91,121,152,182,213,244,274,305,335];
  
  var MONTH_DAYS_REGULAR_CUMULATIVE = [0,31,59,90,120,151,181,212,243,273,304,334];
  var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1; // -1 since it's days since Jan 1
  
      return yday;
    };
  
  
  function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
  
  
      var date = new Date(time*1000);
      if (isNaN(date.getTime())) {
        return 1;
      }
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getFullYear()-1900;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
  
      var yday = ydayFromDate(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      HEAP32[(((tmPtr)+(36))>>2)] = -(date.getTimezoneOffset() * 60);
  
      // Attention: DST is in December in South, and some regions don't have DST at all.
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)] = dst;
      return 0;
    ;
  }

  
  
  var __mktime_js = function(tmPtr) {
  
  var ret = (() => { 
      var date = new Date(HEAP32[(((tmPtr)+(20))>>2)] + 1900,
                          HEAP32[(((tmPtr)+(16))>>2)],
                          HEAP32[(((tmPtr)+(12))>>2)],
                          HEAP32[(((tmPtr)+(8))>>2)],
                          HEAP32[(((tmPtr)+(4))>>2)],
                          HEAP32[((tmPtr)>>2)],
                          0);
      if (isNaN(date.getTime())) {
        return -1;
      }
  
      // There's an ambiguous hour when the time goes back; the tm_isdst field is
      // used to disambiguate it.  Date() basically guesses, so we fix it up if it
      // guessed wrong, or fill in tm_isdst with the guess if it's -1.
      var dst = HEAP32[(((tmPtr)+(32))>>2)];
      var guessedOffset = date.getTimezoneOffset();
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dstOffset = Math.min(winterOffset, summerOffset); // DST is in December in South
      if (dst < 0) {
        // Attention: some regions don't have DST at all.
        dst = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
      } else if ((dst > 0) != (dstOffset == guessedOffset)) {
        var nonDstOffset = Math.max(winterOffset, summerOffset);
        var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
        // Don't try setMinutes(date.getMinutes() + ...) -- it's messed up.
        date.setTime(date.getTime() + (trueOffset - guessedOffset)*60000);
        if (isNaN(date.getTime())) {
          return -1;
        }
      }
  
      HEAP32[(((tmPtr)+(32))>>2)] = dst;
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();
      var yday = ydayFromDate(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;
      // To match expected behavior, update fields from date
      HEAP32[((tmPtr)>>2)] = date.getSeconds();
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();
      HEAP32[(((tmPtr)+(20))>>2)] = date.getYear();
  
      // Return time in seconds
      return date.getTime() / 1000;
     })();
  return BigInt(ret);
  };

  
  
  
  
  
  
  
  function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      // musl's mmap doesn't allow values over a certain limit
      // see OFF_MASK in mmap.c.
      assert(!isNaN(offset));
      var stream = SYSCALLS.getStreamFromFD(fd);
      var res = FS.mmap(stream, len, offset, prot, flags);
      var ptr = res.ptr;
      HEAP32[((allocated)>>2)] = res.allocated;
      HEAPU32[((addr)>>2)] = ptr;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  
  function __munmap_js(addr, len, prot, flags, fd, offset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      if (prot & 2) {
        SYSCALLS.doMsync(addr, stream, len, flags, offset);
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  ;
  }

  
  
  
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for
      // daylight savings.  This code uses the fact that getTimezoneOffset returns
      // a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it
      // compares whether the output of the given date the same (Standard) or less
      // (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);
  
      var extractZone = (timezoneOffset) => {
        // Why inverse sign?
        // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        var sign = timezoneOffset >= 0 ? '-' : '+';
  
        var absOffset = Math.abs(timezoneOffset)
        var hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
        var minutes = String(absOffset % 60).padStart(2, '0');
  
        return `UTC${sign}${hours}${minutes}`;
      }
  
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert(winterName);
      assert(summerName);
      assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    };

  var _emscripten_get_now = () => performance.now();
  
  var _emscripten_date_now = () => Date.now();
  
  var nowIsMonotonic = 1;
  
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  
  
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
  
  
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      // all wasi clocks but realtime are monotonic
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      // "now" is in ms, and wasi times are in ns.
      var nsec = Math.round(now * 1000 * 1000);
      HEAP64[((ptime)>>3)] = BigInt(nsec);
      return 0;
    ;
  }

  var readEmAsmArgsArray = [];
  
  
  
  
  /** @type {!Float64Array} */
  var HEAPF64;
  
  var readEmAsmArgs = (sigPtr, buf) => {
      // Nobody should have mutated _readEmAsmArgsArray underneath us to be something else than an array.
      assert(Array.isArray(readEmAsmArgsArray));
      // The input buffer is allocated on the stack, so it must be stack-aligned.
      assert(buf % 16 == 0);
      readEmAsmArgsArray.length = 0;
      var ch;
      // Most arguments are i32s, so shift the buffer pointer so it is a plain
      // index into HEAP32.
      while (ch = HEAPU8[sigPtr++]) {
        var chr = String.fromCharCode(ch);
        var validChars = ['d', 'f', 'i', 'p'];
        // In WASM_BIGINT mode we support passing i64 values as bigint.
        validChars.push('j');
        assert(validChars.includes(chr), `Invalid character ${ch}("${chr}") in readEmAsmArgs! Use only [${validChars}], and do not specify "v" for void return argument.`);
        // Floats are always passed as doubles, so all types except for 'i'
        // are 8 bytes and require alignment.
        var wide = (ch != 105);
        wide &= (ch != 112);
        buf += wide && (buf % 8) ? 4 : 0;
        readEmAsmArgsArray.push(
          // Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
          ch == 112 ? HEAPU32[((buf)>>2)] :
          ch == 106 ? HEAP64[((buf)>>3)] :
          ch == 105 ?
            HEAP32[((buf)>>2)] :
            HEAPF64[((buf)>>3)]
        );
        buf += wide ? 8 : 4;
      }
      return readEmAsmArgsArray;
    };
  var runEmAsmFunction = (code, sigPtr, argbuf) => {
      var args = readEmAsmArgs(sigPtr, argbuf);
      assert(ASM_CONSTS.hasOwnProperty(code), `No EM_ASM constant found at address ${code}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.`);
      return ASM_CONSTS[code](...args);
    };
  var _emscripten_asm_const_int = (code, sigPtr, argbuf) => {
      return runEmAsmFunction(code, sigPtr, argbuf);
    };

  var _emscripten_asm_const_ptr = (code, sigPtr, argbuf) => {
      return runEmAsmFunction(code, sigPtr, argbuf);
    };


  var _emscripten_err = (str) => err(UTF8ToString(str));

  var _emscripten_get_device_pixel_ratio = () => {
      return globalThis.devicePixelRatio ?? 1.0;
    };

  var onExits = [];
  var addOnExit = (cb) => onExits.push(cb);
  var JSEvents = {
  removeAllEventListeners() {
        while (JSEvents.eventHandlers.length) {
          JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
        }
        JSEvents.deferredCalls = [];
      },
  inEventHandler:0,
  deferredCalls:[],
  deferCall(targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
          if (arrA.length != arrB.length) return false;
  
          for (var i = 0; i < arrA.length; i++) {
            if (arrA[i] != arrB[i]) return false;
          }
          return true;
        }
        // Test if the given call was already queued, and if so, don't add it again.
        for (var call of JSEvents.deferredCalls) {
          if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
            return;
          }
        }
        JSEvents.deferredCalls.push({
          targetFunction,
          precedence,
          argsList
        });
  
        JSEvents.deferredCalls.sort((x,y) => x.precedence - y.precedence);
      },
  removeDeferredCalls(targetFunction) {
        JSEvents.deferredCalls = JSEvents.deferredCalls.filter((call) => call.targetFunction != targetFunction);
      },
  canPerformEventHandlerRequests() {
        // Browsers that support navigator.userActivation.isActive: https://developer.mozilla.org/en-US/docs/Web/API/UserActivation/isActive
        if (navigator.userActivation) {
          // Verify against transient activation status from UserActivation API
          // whether it is possible to perform a request here without needing to defer. See
          // https://developer.mozilla.org/en-US/docs/Web/Security/User_activation#transient_activation
          // and https://caniuse.com/mdn-api_useractivation
          return navigator.userActivation.isActive;
        }
  
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
      },
  runDeferredCalls() {
        if (!JSEvents.canPerformEventHandlerRequests()) {
          return;
        }
        var deferredCalls = JSEvents.deferredCalls;
        JSEvents.deferredCalls = [];
        for (var call of deferredCalls) {
          call.targetFunction(...call.argsList);
        }
      },
  eventHandlers:[],
  removeAllHandlersOnTarget:(target, eventTypeString) => {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
          if (JSEvents.eventHandlers[i].target == target &&
            (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
             JSEvents._removeHandler(i--);
           }
        }
      },
  _removeHandler(i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1);
      },
  registerOrRemoveHandler(eventHandler) {
        if (!eventHandler.target) {
          err('registerOrRemoveHandler: the target element for event handler registration does not exist, when processing the following event handler registration:');
          console.dir(eventHandler);
          return -4;
        }
        if (eventHandler.callbackfunc) {
          eventHandler.eventListenerFunc = function(event) {
            // Increment nesting count for the event handler.
            ++JSEvents.inEventHandler;
            JSEvents.currentEventHandler = eventHandler;
            // Process any old deferred calls the user has placed.
            JSEvents.runDeferredCalls();
            // Process the actual event, calls back to user C code handler.
            eventHandler.handlerFunc(event);
            // Process any new deferred calls that were placed right now from this event handler.
            JSEvents.runDeferredCalls();
            // Out of event handler - restore nesting count.
            --JSEvents.inEventHandler;
          };
  
          eventHandler.target.addEventListener(eventHandler.eventTypeString,
                                               eventHandler.eventListenerFunc,
                                               eventHandler.useCapture);
          JSEvents.eventHandlers.push(eventHandler);
        } else {
          for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == eventHandler.target
             && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
               JSEvents._removeHandler(i--);
             }
          }
        }
        return 0;
      },
  removeSingleHandler(eventHandler) {
        let success = false;
        for (let i = 0; i < JSEvents.eventHandlers.length; ++i) {
          const handler = JSEvents.eventHandlers[i];
          if (handler.target === eventHandler.target
            && handler.eventTypeId === eventHandler.eventTypeId
            && handler.callbackfunc === eventHandler.callbackfunc
            && handler.userData === eventHandler.userData) {
            // in some very rare cases (ex: Safari / fullscreen events), there is more than 1 handler (eventTypeString is different)
            JSEvents._removeHandler(i--);
            success = true;
          }
        }
        return success ? 0 : -5;
      },
  getNodeNameForTarget(target) {
        if (target == window) return '#window';
        if (target == screen) return '#screen';
        return target?.nodeName ?? '';
      },
  fullscreenEnabled() {
        return document.fullscreenEnabled
        // Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitFullscreenEnabled.
        // TODO: If Safari at some point ships with unprefixed version, update the version check above.
        ?? document.webkitFullscreenEnabled
         ;
      },
  };
  
  
  
  function getFullscreenElement() {
      return document.fullscreenElement
             ?? document.webkitFullscreenElement
             ;
    }
  
  
  var fillFullscreenChangeEventData = (eventStruct) => {
      var fullscreenElement = getFullscreenElement();
      var isFullscreen = !!fullscreenElement;
      // Assigning a boolean to HEAP32 with expected type coercion.
      /** @suppress{checkTypes} */
      HEAP8[eventStruct] = isFullscreen;
      HEAP8[(eventStruct)+(1)] = JSEvents.fullscreenEnabled();
      // If transitioning to fullscreen, report info about the element that is now fullscreen.
      // If transitioning to windowed mode, report info about the element that just was fullscreen.
      var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
      var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
      var id = reportedElement?.id ?? '';
      stringToUTF8(nodeName, eventStruct + 2, 128);
      stringToUTF8(id, eventStruct + 130, 128);
      HEAP32[(((eventStruct)+(260))>>2)] = reportedElement?.clientWidth ?? 0;
      HEAP32[(((eventStruct)+(264))>>2)] = reportedElement?.clientHeight ?? 0;
      HEAP32[(((eventStruct)+(268))>>2)] = screen.width;
      HEAP32[(((eventStruct)+(272))>>2)] = screen.height;
      if (isFullscreen) {
        JSEvents.previousFullscreenElement = fullscreenElement;
      }
    };
  var _emscripten_get_fullscreen_status = (fullscreenStatus) => {
      if (!JSEvents.fullscreenEnabled()) return -1;
      fillFullscreenChangeEventData(fullscreenStatus);
      return 0;
    };

  var getHeapMax = () =>
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648;
  var _emscripten_get_heap_max = () => getHeapMax();


  
  
  var growMemory = (size) => {
      var oldHeapSize = wasmMemory.buffer.byteLength;
      var pages = ((size - oldHeapSize + 65535) / 65536) | 0;
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
        updateMemoryViews();
        return 1 /*success*/;
      } catch(e) {
        err(`growMemory: Attempted to grow heap from ${oldHeapSize} bytes to ${size} bytes, but got error: ${e}`);
      }
      // implicit 0 return to save code size (caller will cast 'undefined' into 0
      // anyhow)
    };
  
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
      assert(requestedSize > oldSize);
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = growMemory(newSize);
        if (replacement) {
  
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    };

  
  var maybeCStringToJsString = (cString) => {
      // 'cString > 2' checks if the input is a number, and isn't of the special
      // values we accept here, EMSCRIPTEN_EVENT_TARGET_* (which map to 0, 1, 2).
      // In other words, if cString > 2 then it's a pointer to a valid place in
      // memory, and points to a C string.
      return cString > 2 ? UTF8ToString(cString) : cString;
    };
  
  /** @type {Object} */
  var specialHTMLTargets = [0, globalThis.document ?? 0, globalThis.window ?? 0];
  var findEventTarget = (target) => {
      target = maybeCStringToJsString(target);
      var domElement = specialHTMLTargets[target] || globalThis.document?.querySelector(target);
      return domElement;
    };
  
  
  
  var wasmTableMirror = [];
  
  
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
        if (Asyncify.isAsyncExport(func)) {
          wasmTableMirror[funcPtr] = func = Asyncify.makeAsyncFunction(func);
        }
      }
      return func;
    };
  var registerFocusEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 256;
      JSEvents.focusEvent ||= _malloc(eventSize);
  
      var focusEventHandlerFunc = (e) => {
        var nodeName = JSEvents.getNodeNameForTarget(e.target);
        var id = e.target.id ?? '';
  
        var focusEvent = JSEvents.focusEvent;
        stringToUTF8(nodeName, focusEvent + 0, 128);
        stringToUTF8(id, focusEvent + 128, 128);
  
        if (getWasmTableEntry(callbackfunc)(eventTypeId, focusEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: focusEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_blur_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerFocusEventCallback(target, userData, useCapture, callbackfunc, 12, 'blur', targetThread);

  var _emscripten_set_focus_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerFocusEventCallback(target, userData, useCapture, callbackfunc, 13, 'focus', targetThread);

  
  
  
  
  
  
  
  var registerKeyEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 160;
      JSEvents.keyEvent ||= _malloc(eventSize);
  
      var keyEventHandlerFunc = (e) => {
        assert(e);
  
        var keyEventData = JSEvents.keyEvent;
        HEAPF64[((keyEventData)>>3)] = e.timeStamp;
  
        var idx = ((keyEventData)>>2);
  
        HEAP32[idx + 2] = e.location;
        HEAP8[keyEventData + 12] = e.ctrlKey;
        HEAP8[keyEventData + 13] = e.shiftKey;
        HEAP8[keyEventData + 14] = e.altKey;
        HEAP8[keyEventData + 15] = e.metaKey;
        HEAP8[keyEventData + 16] = e.repeat;
        HEAP32[idx + 5] = e.charCode;
        HEAP32[idx + 6] = e.keyCode;
        HEAP32[idx + 7] = e.which;
        stringToUTF8(e.key ?? '', keyEventData + 32, 32);
        stringToUTF8(e.code ?? '', keyEventData + 64, 32);
        stringToUTF8(e.char ?? '', keyEventData + 96, 32);
        stringToUTF8(e.locale ?? '', keyEventData + 128, 32);
  
        if (getWasmTableEntry(callbackfunc)(eventTypeId, keyEventData, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: keyEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_keydown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, 'keydown', targetThread);

  var _emscripten_set_keypress_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerKeyEventCallback(target, userData, useCapture, callbackfunc, 1, 'keypress', targetThread);

  var _emscripten_set_keyup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, 'keyup', targetThread);

  
  var getBoundingClientRect = (e) => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {'left':0,'top':0};
  
  
  
  
  var fillMouseEventData = (eventStruct, e, target) => {
      assert(eventStruct % 4 == 0);
      HEAPF64[((eventStruct)>>3)] = e.timeStamp;
      var idx = ((eventStruct)>>2);
      HEAP32[idx + 2] = e.screenX;
      HEAP32[idx + 3] = e.screenY;
      HEAP32[idx + 4] = e.clientX;
      HEAP32[idx + 5] = e.clientY;
      HEAP8[eventStruct + 24] = e.ctrlKey;
      HEAP8[eventStruct + 25] = e.shiftKey;
      HEAP8[eventStruct + 26] = e.altKey;
      HEAP8[eventStruct + 27] = e.metaKey;
      HEAP16[idx*2 + 14] = e.button;
      HEAP16[idx*2 + 15] = e.buttons;
      HEAP32[idx + 8] = e.movementX;
      HEAP32[idx + 9] = e.movementY;
  
      // Note: rect contains doubles (truncated to placate SAFE_HEAP, which is the same behaviour when writing to HEAP32 anyway)
      var rect = getBoundingClientRect(target);
      HEAP32[idx + 10] = e.clientX - (rect.left | 0);
      HEAP32[idx + 11] = e.clientY - (rect.top  | 0);
    };
  
  
  
  var registerMouseEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 64;
      JSEvents.mouseEvent ||= _malloc(eventSize);
      target = findEventTarget(target);
  
      var mouseEventHandlerFunc = (e) => {
        // TODO: Make this access thread safe, or this could update live while app is reading it.
        fillMouseEventData(JSEvents.mouseEvent, e, target);
  
        if (getWasmTableEntry(callbackfunc)(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString != 'mousemove' && eventTypeString != 'mouseenter' && eventTypeString != 'mouseleave', // Mouse move events do not allow fullscreen/pointer lock requests to be handled in them!
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: mouseEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_mousedown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, 'mousedown', targetThread);

  var _emscripten_set_mouseenter_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 33, 'mouseenter', targetThread);

  var _emscripten_set_mouseleave_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, 'mouseleave', targetThread);

  var _emscripten_set_mousemove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, 'mousemove', targetThread);

  var _emscripten_set_mouseup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, 'mouseup', targetThread);

  
  
  
  
  var registerUiEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 36;
      JSEvents.uiEvent ||= _malloc(eventSize);
  
      target = findEventTarget(target);
  
      var uiEventHandlerFunc = (e) => {
        if (e.target != target) {
          // Never take ui events such as scroll via a 'bubbled' route, but always from the direct element that
          // was targeted. Otherwise e.g. if app logs a message in response to a page scroll, the Emscripten log
          // message box could cause to scroll, generating a new (bubbled) scroll message, causing a new log print,
          // causing a new scroll, etc..
          return;
        }
        var b = document.body; // Take document.body to a variable, Closure compiler does not outline access to it on its own.
        if (!b) {
          // During a page unload 'body' can be null, with "Cannot read property 'clientWidth' of null" being thrown
          return;
        }
        var uiEvent = JSEvents.uiEvent;
        HEAP32[((uiEvent)>>2)] = 0; // always zero for resize and scroll
        HEAP32[(((uiEvent)+(4))>>2)] = b.clientWidth;
        HEAP32[(((uiEvent)+(8))>>2)] = b.clientHeight;
        HEAP32[(((uiEvent)+(12))>>2)] = innerWidth;
        HEAP32[(((uiEvent)+(16))>>2)] = innerHeight;
        HEAP32[(((uiEvent)+(20))>>2)] = outerWidth;
        HEAP32[(((uiEvent)+(24))>>2)] = outerHeight;
        HEAP32[(((uiEvent)+(28))>>2)] = pageXOffset | 0; // scroll offsets are float
        HEAP32[(((uiEvent)+(32))>>2)] = pageYOffset | 0;
        if (getWasmTableEntry(callbackfunc)(eventTypeId, uiEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: uiEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_resize_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerUiEventCallback(target, userData, useCapture, callbackfunc, 10, 'resize', targetThread);

  
  
  
  
  
  
  
  var registerTouchEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 1552;
      JSEvents.touchEvent ||= _malloc(eventSize);
  
      target = findEventTarget(target);
  
      var touchEventHandlerFunc = (e) => {
        assert(e);
        var t, touches = {}, et = e.touches;
        // To ease marshalling different kinds of touches that browser reports (all touches are listed in e.touches,
        // only changed touches in e.changedTouches, and touches on target at a.targetTouches), mark a boolean in
        // each Touch object so that we can later loop only once over all touches we see to marshall over to Wasm.
  
        for (let t of et) {
          // Browser might recycle the generated Touch objects between each frame (Firefox on Android), so reset any
          // changed/target states we may have set from previous frame.
          t.isChanged = t.onTarget = 0;
          touches[t.identifier] = t;
        }
        // Mark which touches are part of the changedTouches list.
        for (let t of e.changedTouches) {
          t.isChanged = 1;
          touches[t.identifier] = t;
        }
        // Mark which touches are part of the targetTouches list.
        for (let t of e.targetTouches) {
          touches[t.identifier].onTarget = 1;
        }
  
        var touchEvent = JSEvents.touchEvent;
        HEAPF64[((touchEvent)>>3)] = e.timeStamp;
        HEAP8[touchEvent + 12] = e.ctrlKey;
        HEAP8[touchEvent + 13] = e.shiftKey;
        HEAP8[touchEvent + 14] = e.altKey;
        HEAP8[touchEvent + 15] = e.metaKey;
        var idx = touchEvent + 16;
        var targetRect = getBoundingClientRect(target);
        var numTouches = 0;
        for (let t of Object.values(touches)) {
          var idx32 = ((idx)>>2); // Pre-shift the ptr to index to HEAP32 to save code size
          HEAP32[idx32 + 0] = t.identifier;
          HEAP32[idx32 + 1] = t.screenX;
          HEAP32[idx32 + 2] = t.screenY;
          HEAP32[idx32 + 3] = t.clientX;
          HEAP32[idx32 + 4] = t.clientY;
          HEAP32[idx32 + 5] = t.pageX;
          HEAP32[idx32 + 6] = t.pageY;
          HEAP8[idx + 28] = t.isChanged;
          HEAP8[idx + 29] = t.onTarget;
          HEAP32[idx32 + 8] = t.clientX - (targetRect.left | 0);
          HEAP32[idx32 + 9] = t.clientY - (targetRect.top  | 0);
  
          idx += 48;
  
          if (++numTouches > 31) {
            break;
          }
        }
        HEAP32[(((touchEvent)+(8))>>2)] = numTouches;
  
        if (getWasmTableEntry(callbackfunc)(eventTypeId, touchEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString == 'touchstart' || eventTypeString == 'touchend',
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: touchEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_touchcancel_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerTouchEventCallback(target, userData, useCapture, callbackfunc, 25, 'touchcancel', targetThread);

  var _emscripten_set_touchend_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerTouchEventCallback(target, userData, useCapture, callbackfunc, 23, 'touchend', targetThread);

  var _emscripten_set_touchmove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerTouchEventCallback(target, userData, useCapture, callbackfunc, 24, 'touchmove', targetThread);

  var _emscripten_set_touchstart_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerTouchEventCallback(target, userData, useCapture, callbackfunc, 22, 'touchstart', targetThread);

  
  
  
  
  
  var registerWheelEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 96;
      JSEvents.wheelEvent ||= _malloc(eventSize)
  
      // The DOM Level 3 events spec event 'wheel'
      var wheelHandlerFunc = (e) => {
        var wheelEvent = JSEvents.wheelEvent;
        fillMouseEventData(wheelEvent, e, target);
        HEAPF64[(((wheelEvent)+(64))>>3)] = e["deltaX"];
        HEAPF64[(((wheelEvent)+(72))>>3)] = e["deltaY"];
        HEAPF64[(((wheelEvent)+(80))>>3)] = e["deltaZ"];
        HEAP32[(((wheelEvent)+(88))>>2)] = e["deltaMode"];
        if (getWasmTableEntry(callbackfunc)(eventTypeId, wheelEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: true,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: wheelHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  
  var _emscripten_set_wheel_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
      target = findEventTarget(target);
      if (!target) return -4;
      if (typeof target.onwheel != 'undefined') {
        return registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, 'wheel', targetThread);
      } else {
        return -1;
      }
    };

  var GLctx;
  
  var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = (ctx) =>
      // Closure is expected to be allowed to minify the '.dibvbi' property, so not accessing it quoted.
      !!(ctx.dibvbi = ctx.getExtension('WEBGL_draw_instanced_base_vertex_base_instance'));
  
  var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = (ctx) => {
      // Closure is expected to be allowed to minify the '.mdibvbi' property, so not accessing it quoted.
      return !!(ctx.mdibvbi = ctx.getExtension('WEBGL_multi_draw_instanced_base_vertex_base_instance'));
    };
  
  var webgl_enable_EXT_polygon_offset_clamp = (ctx) =>
      !!(ctx.extPolygonOffsetClamp = ctx.getExtension('EXT_polygon_offset_clamp'));
  
  var webgl_enable_EXT_clip_control = (ctx) =>
      !!(ctx.extClipControl = ctx.getExtension('EXT_clip_control'));
  
  var webgl_enable_WEBGL_polygon_mode = (ctx) =>
      !!(ctx.webglPolygonMode = ctx.getExtension('WEBGL_polygon_mode'));
  
  var webgl_enable_WEBGL_multi_draw = (ctx) =>
      // Closure is expected to be allowed to minify the '.multiDrawWebgl' property, so not accessing it quoted.
      !!(ctx.multiDrawWebgl = ctx.getExtension('WEBGL_multi_draw'));
  
  var getEmscriptenSupportedExtensions = (ctx) => {
      // Restrict the list of advertised extensions to those that we actually
      // support.
      var supportedExtensions = [
        // WebGL 2 extensions
        'EXT_color_buffer_float',
        'EXT_conservative_depth',
        'EXT_disjoint_timer_query_webgl2',
        'EXT_texture_norm16',
        'NV_shader_noperspective_interpolation',
        'WEBGL_clip_cull_distance',
        // WebGL 1 and WebGL 2 extensions
        'EXT_clip_control',
        'EXT_color_buffer_half_float',
        'EXT_depth_clamp',
        'EXT_float_blend',
        'EXT_polygon_offset_clamp',
        'EXT_texture_compression_bptc',
        'EXT_texture_compression_rgtc',
        'EXT_texture_filter_anisotropic',
        'KHR_parallel_shader_compile',
        'OES_texture_float_linear',
        'WEBGL_blend_func_extended',
        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_lose_context',
        'WEBGL_multi_draw',
        'WEBGL_polygon_mode'
      ];
      // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
      return ctx.getSupportedExtensions()?.filter(ext => supportedExtensions.includes(ext)) ?? [];
    };
  
  
  
  
  var GL = {
  counter:1,
  buffers:[],
  programs:[],
  framebuffers:[],
  renderbuffers:[],
  textures:[],
  shaders:[],
  vaos:[],
  contexts:[],
  offscreenCanvases:{
  },
  queries:[],
  samplers:[],
  transformFeedbacks:[],
  syncs:[],
  stringCache:{
  },
  stringiCache:{
  },
  unpackAlignment:4,
  unpackRowLength:0,
  recordError:(errorCode) => {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },
  getNewId:(table) => {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },
  genObject:(n, buffers, createFunction, objectTable
        ) => {
        for (var i = 0; i < n; i++) {
          var buffer = GLctx[createFunction]();
          var id = buffer && GL.getNewId(objectTable);
          if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer;
          } else {
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
          }
          HEAP32[(((buffers)+(i*4))>>2)] = id;
        }
      },
  getSource:(shader, count, string, length) => {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var len = length ? HEAPU32[(((length)+(i*4))>>2)] : undefined;
          source += UTF8ToString(HEAPU32[(((string)+(i*4))>>2)], len);
        }
        return source;
      },
  createContext:(/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
  
        // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL
        // context on a canvas, calling .getContext() will always return that
        // context independent of which 'webgl' or 'webgl2'
        // context version was passed. See:
        //   https://webkit.org/b/222758
        // and:
        //   https://github.com/emscripten-core/emscripten/issues/13295.
        // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari
        // version field in above check.
        if (!canvas.getContextSafariWebGL2Fixed) {
          canvas.getContextSafariWebGL2Fixed = canvas.getContext;
          /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (Object|null)} */
          function fixedGetContext(ver, attrs) {
            var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
            return ((ver == 'webgl') == (gl instanceof WebGLRenderingContext)) ? gl : null;
          }
          canvas.getContext = fixedGetContext;
        }
  
        var ctx = canvas.getContext('webgl2', webGLContextAttributes);
  
        if (!ctx) return 0;
  
        var handle = GL.registerContext(ctx, webGLContextAttributes);
  
        return handle;
      },
  registerContext:(ctx, webGLContextAttributes) => {
        // without pthreads a context is just an integer ID
        var handle = GL.getNewId(GL.contexts);
  
        var context = {
          handle,
          attributes: webGLContextAttributes,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
  
        // Store the created context object so that we can access the context
        // given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault == 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
  
        return handle;
      },
  makeContextCurrent:(contextHandle) => {
  
        // Active Emscripten GL layer context object.
        GL.currentContext = GL.contexts[contextHandle];
        // Active WebGL context object.
        Module['ctx'] = GLctx = GL.currentContext?.GLctx;
        return !(contextHandle && !GLctx);
      },
  getContext:(contextHandle) => {
        return GL.contexts[contextHandle];
      },
  deleteContext:(contextHandle) => {
        if (GL.currentContext === GL.contexts[contextHandle]) {
          GL.currentContext = null;
        }
        if (typeof JSEvents == 'object') {
          // Release all JS event handlers on the DOM element that the GL context is
          // associated with since the context is now deleted.
          JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        }
        // Make sure the canvas object no longer refers to the context object so
        // there are no GC surprises.
        if (GL.contexts[contextHandle]?.GLctx.canvas) {
          GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        }
        GL.contexts[contextHandle] = null;
      },
  initExtensions:(context) => {
        // If this function is called without a specific context object, init the
        // extensions of the currently active context.
        context ||= GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        // Detect the presence of a few extensions manually, since the GL interop
        // layer itself will need to know if they exist.
  
        // Extensions that are available in both WebGL 1 and WebGL 2
        webgl_enable_WEBGL_multi_draw(GLctx);
        webgl_enable_EXT_polygon_offset_clamp(GLctx);
        webgl_enable_EXT_clip_control(GLctx);
        webgl_enable_WEBGL_polygon_mode(GLctx);
        // Extensions that are available from WebGL >= 2 (no-op if called on a WebGL 1 context active)
        webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
  
        // On WebGL 2, EXT_disjoint_timer_query is replaced with an alternative
        // that's based on core APIs, and exposes only the queryCounterEXT()
        // entrypoint.
        if (context.version >= 2) {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query_webgl2');
        }
  
        // However, Firefox exposes the WebGL 1 version on WebGL 2 as well and
        // thus we look for the WebGL 1 version again if the WebGL 2 version
        // isn't present. https://bugzil.la/1328882
        if (context.version < 2 || !GLctx.disjointTimerQueryExt)
        {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query');
        }
  
        for (var ext of getEmscriptenSupportedExtensions(GLctx)) {
          // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders
          // are not enabled by default.
          if (!ext.includes('lose_context') && !ext.includes('debug')) {
            // Call .getExtension() to enable that extension permanently.
            GLctx.getExtension(ext);
          }
        }
      },
  };
  
  var webglPowerPreferences = ["default","low-power","high-performance"];
  
  var findCanvasEventTarget = findEventTarget;
  
  
  
  var _emscripten_webgl_do_create_context = (target, attributes) => {
      assert(attributes);
      var attr32 = ((attributes)>>2);
      var powerPreference = HEAP32[attr32 + (8>>2)];
      var contextAttributes = {
        'alpha': !!HEAP8[attributes + 0],
        'depth': !!HEAP8[attributes + 1],
        'stencil': !!HEAP8[attributes + 2],
        'antialias': !!HEAP8[attributes + 3],
        'premultipliedAlpha': !!HEAP8[attributes + 4],
        'preserveDrawingBuffer': !!HEAP8[attributes + 5],
        'powerPreference': webglPowerPreferences[powerPreference],
        'failIfMajorPerformanceCaveat': !!HEAP8[attributes + 12],
        'desynchronized': !!HEAP8[attributes + 33],
        // The following are not predefined WebGL context attributes in the WebGL specification, so the property names can be minified by Closure.
        majorVersion: HEAP32[attr32 + (16>>2)],
        minorVersion: HEAP32[attr32 + (20>>2)],
        enableExtensionsByDefault: HEAP8[attributes + 24],
        explicitSwapControl: HEAP8[attributes + 25],
        proxyContextToMainThread: HEAP32[attr32 + (28>>2)],
        renderViaOffscreenBackBuffer: HEAP8[attributes + 32]
      };
  
      //  TODO: Make these into hard errors at some point in the future
      if (contextAttributes.majorVersion !== 1 && contextAttributes.majorVersion !== 2) {
        err(`Invalid WebGL version requested: ${contextAttributes.majorVersion}`);
      }
      if (contextAttributes.majorVersion !== 2) {
        err('WebGL 1 requested but only WebGL 2 is supported (MIN_WEBGL_VERSION is 2)');
      }
  
      var canvas = findCanvasEventTarget(target);
  
      if (!canvas) {
        return 0;
      }
  
      if (contextAttributes.explicitSwapControl) {
        return 0;
      }
  
      var contextHandle = GL.createContext(canvas, contextAttributes);
      return contextHandle;
    };
  var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;

  var _emscripten_webgl_destroy_context = (contextHandle) => {
      if (GL.currentContext == contextHandle) GL.currentContext = 0;
      GL.deleteContext(contextHandle);
    };

  var _emscripten_webgl_make_context_current = (contextHandle) => {
      var success = GL.makeContextCurrent(contextHandle);
      return success ? 0 : -5;
    };

  var ENV = {
  };
  
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        var lang = (globalThis.navigator?.language ?? 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  
  var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(envp))>>2)] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };

  
  
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    };

  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  
  
  function _fd_fdstat_get(fd, pbuf) {
  try {
  
      var rightsBase = 0;
      var rightsInheriting = 0;
      var flags = 0;
      {
        var stream = SYSCALLS.getStreamFromFD(fd);
        // All character devices are terminals (other things a Linux system would
        // assume is a character device, like the mouse, we have special APIs for).
        var type = stream.tty ? 2 :
                   FS.isDir(stream.mode) ? 3 :
                   FS.isLink(stream.mode) ? 7 :
                   4;
      }
      HEAP8[pbuf] = type;
      HEAP16[(((pbuf)+(2))>>1)] = flags;
      HEAP64[(((pbuf)+(8))>>3)] = BigInt(rightsBase);
      HEAP64[(((pbuf)+(16))>>3)] = BigInt(rightsInheriting);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        try {
          var curr = FS.read(stream, HEAP8, ptr, len, offset);
        } catch (e) {
          // On a non-blocking stream a subsequent read may would-block after we
          // already gathered data. POSIX readv is a single gather-read: return
          // what we have rather than failing the whole call.
          if (ret > 0 && e instanceof FS.ErrnoError &&
              (e.errno == 6 || e.errno == 6)) {
            break;
          }
          throw e;
        }
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[((newOffset)>>3)] = BigInt(stream.position);
      if (stream.getdents && !offset && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  var _fd_sync = function(fd) {
    let innerFunc =  () => {
  
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var rtn = stream.stream_ops?.fsync?.(stream);
      return new Promise((resolve) => {
        var mount = stream.node.mount;
        if (mount?.type.syncfs) {
          mount.type.syncfs(mount, false, (err) => resolve(err ? 29 : 0));
        } else {
          resolve(rtn);
        }
      });
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  
  };
    return Asyncify.handleAsync(innerFunc);
  }
  ;
  _fd_sync.isAsync = true;

  
  
  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      // Gather all iovecs into one contiguous buffer and issue a single
      // FS.write, matching POSIX writev's single gather-write semantics (as
      // __syscall_sendmsg already does). Per-iovec writes fragment a stream
      // socket send into multiple segments, breaking stream byte semantics.
      if (iovcnt == 1) {
        // Single iovec: write directly from HEAP8, no gather buffer needed.
        return FS.write(stream, HEAP8, HEAPU32[((iov)>>2)], HEAPU32[(((iov)+(4))>>2)], offset);
      }
      var total = 0;
      for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
        total += HEAPU32[(((p)+(4))>>2)];
      }
      var view = new Uint8Array(total);
      var voff = 0;
      for (var i = 0; i < iovcnt; i++, iov += 8) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        view.set(HEAPU8.subarray(ptr, ptr + len), voff);
        voff += len;
      }
      return FS.write(stream, view, 0, total, offset);
    };
  
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  var _emscripten_glActiveTexture = (x0) => GLctx.activeTexture(x0);
  var _glActiveTexture = _emscripten_glActiveTexture;

  var _emscripten_glAttachShader = (program, shader) => {
      GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
    };
  var _glAttachShader = _emscripten_glAttachShader;

  var _emscripten_glBindBuffer = (target, buffer) => {
  
      if (target == 0x88EB /*GL_PIXEL_PACK_BUFFER*/) {
        // In WebGL 2 glReadPixels entry point, we need to use a different WebGL 2
        // API function call when a buffer is bound to
        // GL_PIXEL_PACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelPackBufferBinding = buffer;
      } else if (target == 0x88EC /*GL_PIXEL_UNPACK_BUFFER*/) {
        // In WebGL 2 gl(Compressed)Tex(Sub)Image[23]D entry points, we need to
        // use a different WebGL 2 API function call when a buffer is bound to
        // GL_PIXEL_UNPACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelUnpackBufferBinding = buffer;
      }
      GLctx.bindBuffer(target, GL.buffers[buffer]);
    };
  var _glBindBuffer = _emscripten_glBindBuffer;

  var _emscripten_glBindTexture = (target, texture) => {
      GLctx.bindTexture(target, GL.textures[texture]);
    };
  var _glBindTexture = _emscripten_glBindTexture;

  var _emscripten_glBindVertexArray = (vao) => {
      GLctx.bindVertexArray(GL.vaos[vao]);
    };
  var _glBindVertexArray = _emscripten_glBindVertexArray;

  var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);
  var _glBlendFunc = _emscripten_glBlendFunc;

  
  var _emscripten_glBufferData = (target, size, data, usage) => {
  
      if (true) {
        // If size is zero, WebGL would interpret uploading the whole input
        // arraybuffer (starting from given offset), which would not make sense in
        // WebAssembly, so avoid uploading if size is zero. However we must still
        // call bufferData to establish a backing storage of zero bytes.
        if (data && size) {
          GLctx.bufferData(target, HEAPU8, usage, data, size);
        } else {
          GLctx.bufferData(target, size, usage);
        }
        return;
      }
    };
  var _glBufferData = _emscripten_glBufferData;

  var _emscripten_glClear = (x0) => GLctx.clear(x0);
  var _glClear = _emscripten_glClear;

  var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);
  var _glClearColor = _emscripten_glClearColor;

  var _emscripten_glColorMask = (red, green, blue, alpha) => {
      GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
    };
  var _glColorMask = _emscripten_glColorMask;

  var _emscripten_glCompileShader = (shader) => {
      GLctx.compileShader(GL.shaders[shader]);
    };
  var _glCompileShader = _emscripten_glCompileShader;

  var _emscripten_glCreateProgram = () => {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      // Store additional information needed for each shader program:
      program.name = id;
      // Lazy cache results of
      // glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
      program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
      program.uniformIdCounter = 1;
      GL.programs[id] = program;
      return id;
    };
  var _glCreateProgram = _emscripten_glCreateProgram;

  var _emscripten_glCreateShader = (shaderType) => {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
  
      return id;
    };
  var _glCreateShader = _emscripten_glCreateShader;

  var _emscripten_glDeleteShader = (id) => {
      if (!id) return;
      var shader = GL.shaders[id];
      if (!shader) {
        // glDeleteShader actually signals an error when deleting a nonexisting
        // object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteShader(shader);
      GL.shaders[id] = null;
    };
  var _glDeleteShader = _emscripten_glDeleteShader;

  var _emscripten_glDepthFunc = (x0) => GLctx.depthFunc(x0);
  var _glDepthFunc = _emscripten_glDepthFunc;

  var _emscripten_glDepthMask = (flag) => {
      GLctx.depthMask(!!flag);
    };
  var _glDepthMask = _emscripten_glDepthMask;

  var _emscripten_glDisable = (x0) => GLctx.disable(x0);
  var _glDisable = _emscripten_glDisable;

  var _emscripten_glDrawArrays = (mode, first, count) => {
  
      GLctx.drawArrays(mode, first, count);
  
    };
  var _glDrawArrays = _emscripten_glDrawArrays;

  var _emscripten_glEnable = (x0) => GLctx.enable(x0);
  var _glEnable = _emscripten_glEnable;

  var _emscripten_glEnableVertexAttribArray = (index) => {
      GLctx.enableVertexAttribArray(index);
    };
  var _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray;

  var _emscripten_glFlush = () => GLctx.flush();
  var _glFlush = _emscripten_glFlush;

  var _emscripten_glGenBuffers = (n, buffers) => {
      GL.genObject(n, buffers, 'createBuffer', GL.buffers
        );
    };
  var _glGenBuffers = _emscripten_glGenBuffers;

  var _emscripten_glGenTextures = (n, textures) => {
      GL.genObject(n, textures, 'createTexture', GL.textures
        );
    };
  var _glGenTextures = _emscripten_glGenTextures;

  var _emscripten_glGenVertexArrays = (n, arrays) => {
      GL.genObject(n, arrays, 'createVertexArray', GL.vaos
        );
    };
  var _glGenVertexArrays = _emscripten_glGenVertexArrays;

  var _emscripten_glGenerateMipmap = (x0) => GLctx.generateMipmap(x0);
  var _glGenerateMipmap = _emscripten_glGenerateMipmap;

  var _emscripten_glGetError = () => {
      var error = GLctx.getError() || GL.lastError;
      GL.lastError = 0/*GL_NO_ERROR*/;
      return error;
    };
  var _glGetError = _emscripten_glGetError;

  
  var readI53FromU64 = (ptr) => {
      return HEAPU32[((ptr)>>2)] + HEAPU32[(((ptr)+(4))>>2)] * 4294967296;
    };
  
  var writeI53ToI64 = (ptr, num) => {
      HEAPU32[((ptr)>>2)] = num;
      var lower = HEAPU32[((ptr)>>2)];
      HEAPU32[(((ptr)+(4))>>2)] = (num - lower)/4294967296;
      var deserialized = (num >= 0) ? readI53FromU64(ptr) : readI53FromI64(ptr);
      var offset = ((ptr)>>2);
      if (deserialized != num) warnOnce(`writeI53ToI64() out of range: serialized JS Number ${num} to Wasm heap as bytes lo=${ptrToString(HEAPU32[offset])}, hi=${ptrToString(HEAPU32[offset+1])}, which deserializes back to ${deserialized} instead!`);
    };
  
  
  var webglGetExtensions = () => {
      var exts = getEmscriptenSupportedExtensions(GLctx);
      exts = exts.concat(exts.map((e) => 'GL_' + e));
      return exts;
    };
  
  
  
  
  /** @type {!Float32Array} */
  var HEAPF32;
  var emscriptenWebGLGet = (name_, p, type) => {
      // Guard against user passing a null pointer.
      // Note that GLES2 spec does not say anything about how passing a null
      // pointer should be treated.  Testing on desktop core GL 3, the application
      // crashes on glGetIntegerv to a null pointer, but better to report an error
      // instead of doing anything random.
      if (!p) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var ret = undefined;
      switch (name_) { // Handle a few trivial GLES values
        case 0x8DFA: // GL_SHADER_COMPILER
          ret = 1;
          break;
        case 0x8DF8: // GL_SHADER_BINARY_FORMATS
          if (type != 0 && type != 1) {
            GL.recordError(0x500); // GL_INVALID_ENUM
          }
          // Do not write anything to the out pointer, since no binary formats are
          // supported.
          return;
        case 0x87FE: // GL_NUM_PROGRAM_BINARY_FORMATS
        case 0x8DF9: // GL_NUM_SHADER_BINARY_FORMATS
          ret = 0;
          break;
        case 0x86A2: // GL_NUM_COMPRESSED_TEXTURE_FORMATS
          // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete
          // since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be
          // queried for length), so implement it ourselves to allow C++ GLES2
          // code to get the length.
          var formats = GLctx.getParameter(0x86A3 /*GL_COMPRESSED_TEXTURE_FORMATS*/);
          ret = formats ? formats.length : 0;
          break;
  
        case 0x821D: // GL_NUM_EXTENSIONS
          if (GL.currentContext.version < 2) {
            // Calling GLES3/WebGL2 function with a GLES2/WebGL1 context
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
            return;
          }
          ret = webglGetExtensions().length;
          break;
        case 0x821B: // GL_MAJOR_VERSION
        case 0x821C: // GL_MINOR_VERSION
          if (GL.currentContext.version < 2) {
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          }
          ret = name_ == 0x821B ? 3 : 0; // return version 3.0
          break;
      }
  
      if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
          case 'number':
            ret = result;
            break;
          case 'boolean':
            ret = result ? 1 : 0;
            break;
          case 'string':
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          case 'object':
            if (result === null) {
              // null is a valid result for some (e.g., which buffer is bound -
              // perhaps nothing is bound), but otherwise can mean an invalid
              // name_, which we need to report as an error
              switch (name_) {
                case 0x8894: // ARRAY_BUFFER_BINDING
                case 0x8B8D: // CURRENT_PROGRAM
                case 0x8895: // ELEMENT_ARRAY_BUFFER_BINDING
                case 0x8CA6: // FRAMEBUFFER_BINDING or DRAW_FRAMEBUFFER_BINDING
                case 0x8CA7: // RENDERBUFFER_BINDING
                case 0x8069: // TEXTURE_BINDING_2D
                case 0x85B5: // WebGL 2 GL_VERTEX_ARRAY_BINDING, or WebGL 1 extension OES_vertex_array_object GL_VERTEX_ARRAY_BINDING_OES
                case 0x8F36: // COPY_READ_BUFFER_BINDING or COPY_READ_BUFFER
                case 0x8F37: // COPY_WRITE_BUFFER_BINDING or COPY_WRITE_BUFFER
                case 0x88ED: // PIXEL_PACK_BUFFER_BINDING
                case 0x88EF: // PIXEL_UNPACK_BUFFER_BINDING
                case 0x8CAA: // READ_FRAMEBUFFER_BINDING
                case 0x8919: // SAMPLER_BINDING
                case 0x8C1D: // TEXTURE_BINDING_2D_ARRAY
                case 0x806A: // TEXTURE_BINDING_3D
                case 0x8E25: // TRANSFORM_FEEDBACK_BINDING
                case 0x8C8F: // TRANSFORM_FEEDBACK_BUFFER_BINDING
                case 0x8A28: // UNIFORM_BUFFER_BINDING
                case 0x8514: { // TEXTURE_BINDING_CUBE_MAP
                  ret = 0;
                  break;
                }
                default: {
                  GL.recordError(0x500); // GL_INVALID_ENUM
                  return;
                }
              }
            } else if (result instanceof Float32Array ||
                       result instanceof Uint32Array ||
                       result instanceof Int32Array ||
                       result instanceof Array) {
              for (var i = 0; i < result.length; ++i) {
                switch (type) {
                  case 0: HEAP32[(((p)+(i*4))>>2)] = result[i]; break;
                  case 2: HEAPF32[(((p)+(i*4))>>2)] = result[i]; break;
                  case 4: HEAP8[(p)+(i)] = result[i] ? 1 : 0; break;
                }
              }
              return;
            } else {
              try {
                ret = result.name | 0;
              } catch(e) {
                GL.recordError(0x500); // GL_INVALID_ENUM
                err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
                return;
              }
            }
            break;
          default:
            GL.recordError(0x500); // GL_INVALID_ENUM
            err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof(result)}!`);
            return;
        }
      }
  
      switch (type) {
        case 1: writeI53ToI64(p, ret); break;
        case 0: HEAP32[((p)>>2)] = ret; break;
        case 2:   HEAPF32[((p)>>2)] = ret; break;
        case 4: HEAP8[p] = ret ? 1 : 0; break;
      }
    };
  
  var _emscripten_glGetFloatv = (name_, p) => emscriptenWebGLGet(name_, p, 2);
  var _glGetFloatv = _emscripten_glGetFloatv;

  
  var _emscripten_glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);
  var _glGetIntegerv = _emscripten_glGetIntegerv;

  
  var _emscripten_glGetProgramInfoLog = (program, maxLength, length, infoLog) => {
      var log = GLctx.getProgramInfoLog(GL.programs[program]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)] = numBytesWrittenExclNull;
    };
  var _glGetProgramInfoLog = _emscripten_glGetProgramInfoLog;

  
  var _emscripten_glGetProgramiv = (program, pname, p) => {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null
        // pointer. Since calling this function does not make sense if p == null,
        // issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      if (program >= GL.counter) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      program = GL.programs[program];
  
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(program);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)] = log.length + 1;
      } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        if (!program.maxUniformLength) {
          var numActiveUniforms = GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
          for (var i = 0; i < numActiveUniforms; ++i) {
            program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxUniformLength;
      } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        if (!program.maxAttributeLength) {
          var numActiveAttributes = GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/);
          for (var i = 0; i < numActiveAttributes; ++i) {
            program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxAttributeLength;
      } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
        if (!program.maxUniformBlockNameLength) {
          var numActiveUniformBlocks = GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/);
          for (var i = 0; i < numActiveUniformBlocks; ++i) {
            program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxUniformBlockNameLength;
      } else {
        HEAP32[((p)>>2)] = GLctx.getProgramParameter(program, pname);
      }
    };
  var _glGetProgramiv = _emscripten_glGetProgramiv;

  
  
  var _emscripten_glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)] = numBytesWrittenExclNull;
    };
  var _glGetShaderInfoLog = _emscripten_glGetShaderInfoLog;

  
  var _emscripten_glGetShaderiv = (shader, pname, p) => {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null
        // pointer. Since calling this function does not make sense if p == null,
        // issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        // The GLES2 specification says that if the shader has an empty info log,
        // a value of 0 is returned. Otherwise the log has a null char appended.
        // (An empty string is falsey, so we can just check that instead of
        // looking at log.length.)
        var logLength = log ? log.length + 1 : 0;
        HEAP32[((p)>>2)] = logLength;
      } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        // source may be a null, or the empty string, both of which are falsey
        // values that we report a 0 length for.
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[((p)>>2)] = sourceLength;
      } else {
        HEAP32[((p)>>2)] = GLctx.getShaderParameter(GL.shaders[shader], pname);
      }
    };
  var _glGetShaderiv = _emscripten_glGetShaderiv;

  
  
  var _emscripten_glGetString = (name_) => {
      var ret = GL.stringCache[name_];
      if (!ret) {
        switch (name_) {
          case 0x1F03 /* GL_EXTENSIONS */:
            ret = stringToNewUTF8(webglGetExtensions().join(' '));
            break;
          case 0x1F00 /* GL_VENDOR */:
          case 0x1F01 /* GL_RENDERER */:
          case 0x9245 /* UNMASKED_VENDOR_WEBGL */:
          case 0x9246 /* UNMASKED_RENDERER_WEBGL */:
            var s = GLctx.getParameter(name_);
            if (!s) {
              GL.recordError(0x500/*GL_INVALID_ENUM*/);
            }
            ret = s ? stringToNewUTF8(s) : 0;
            break;
  
          case 0x1F02 /* GL_VERSION */:
            var webGLVersion = GLctx.getParameter(0x1F02 /*GL_VERSION*/);
            // return GLES version string corresponding to the version of the WebGL context
            var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
            if (true) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
            ret = stringToNewUTF8(glVersion);
            break;
          case 0x8B8C /* GL_SHADING_LANGUAGE_VERSION */:
            var glslVersion = GLctx.getParameter(0x8B8C /*GL_SHADING_LANGUAGE_VERSION*/);
            // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
            var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
            var ver_num = glslVersion.match(ver_re);
            if (ver_num !== null) {
              if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + '0'; // ensure minor version has 2 digits
              glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`;
            }
            ret = stringToNewUTF8(glslVersion);
            break;
          default:
            GL.recordError(0x500/*GL_INVALID_ENUM*/);
            // fall through
        }
        GL.stringCache[name_] = ret;
      }
      return ret;
    };
  var _glGetString = _emscripten_glGetString;

  /** @suppress {checkTypes} */
  var jstoi_q = (str) => parseInt(str);
  
  /** @noinline */
  var webglGetLeftBracePos = (name) => name.slice(-1) == ']' && name.lastIndexOf('[');
  
  var webglPrepareUniformLocationsBeforeFirstUse = (program) => {
      var uniformLocsById = program.uniformLocsById, // Maps GLuint -> WebGLUniformLocation
        uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, // Maps name -> [uniform array length, GLuint]
        i, j;
  
      // On the first time invocation of glGetUniformLocation on this shader program:
      // initialize cache data structures and discover which uniforms are arrays.
      if (!uniformLocsById) {
        // maps GLint integer locations to WebGLUniformLocations
        program.uniformLocsById = uniformLocsById = {};
        // maps integer locations back to uniform name strings, so that we can lazily fetch uniform array locations
        program.uniformArrayNamesById = {};
  
        var numActiveUniforms = GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
        for (i = 0; i < numActiveUniforms; ++i) {
          var u = GLctx.getActiveUniform(program, i);
          var nm = u.name;
          var sz = u.size;
          var lb = webglGetLeftBracePos(nm);
          var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
  
          // Assign a new location.
          var id = program.uniformIdCounter;
          program.uniformIdCounter += sz;
          // Eagerly get the location of the uniformArray[0] base element.
          // The remaining indices >0 will be left for lazy evaluation to
          // improve performance. Those may never be needed to fetch, if the
          // application fills arrays always in full starting from the first
          // element of the array.
          uniformSizeAndIdsByName[arrayName] = [sz, id];
  
          // Store placeholder integers in place that highlight that these
          // >0 index locations are array indices pending population.
          for (j = 0; j < sz; ++j) {
            uniformLocsById[id] = j;
            program.uniformArrayNamesById[id++] = arrayName;
          }
        }
      }
    };
  
  
  
  var _emscripten_glGetUniformLocation = (program, name) => {
  
      name = UTF8ToString(name);
  
      if (program = GL.programs[program]) {
        webglPrepareUniformLocationsBeforeFirstUse(program);
        var uniformLocsById = program.uniformLocsById; // Maps GLuint -> WebGLUniformLocation
        var arrayIndex = 0;
        var uniformBaseName = name;
  
        // Invariant: when populating integer IDs for uniform locations, we must
        // maintain the precondition that arrays reside in contiguous addresses,
        // i.e. for a 'vec4 colors[10];', colors[4] must be at location
        // colors[0]+4.  However, user might call glGetUniformLocation(program,
        // "colors") for an array, so we cannot discover based on the user input
        // arguments whether the uniform we are dealing with is an array. The only
        // way to discover which uniforms are arrays is to enumerate over all the
        // active uniforms in the program.
        var leftBrace = webglGetLeftBracePos(name);
  
        // If user passed an array accessor "[index]", parse the array index off the accessor.
        if (leftBrace > 0) {
          arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0; // "index]", coerce parseInt(']') with >>>0 to treat "foo[]" as "foo[0]" and foo[-1] as unsigned out-of-bounds.
          uniformBaseName = name.slice(0, leftBrace);
        }
  
        // Have we cached the location of this uniform before?
        // A pair [array length, GLint of the uniform location]
        var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
  
        // If a uniform with this name exists, and if its index is within the
        // array limits (if it's even an array), query the WebGLlocation, or
        // return an existing cached location.
        if (sizeAndId && arrayIndex < sizeAndId[0]) {
          arrayIndex += sizeAndId[1]; // Add the base location of the uniform to the array index offset.
          if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
            return arrayIndex;
          }
        }
      }
      else {
        // N.b. we are currently unable to distinguish between GL program IDs that
        // never existed vs GL program IDs that have been deleted, so report
        // GL_INVALID_VALUE in both cases.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
      }
      return -1;
    };
  var _glGetUniformLocation = _emscripten_glGetUniformLocation;

  var _emscripten_glHint = (x0, x1) => GLctx.hint(x0, x1);
  var _glHint = _emscripten_glHint;

  var _emscripten_glLinkProgram = (program) => {
      program = GL.programs[program];
      GLctx.linkProgram(program);
      // Invalidate earlier computed uniform->ID mappings, those have now become stale
      program.uniformLocsById = 0; // Mark as null-like so that glGetUniformLocation() knows to populate this again.
      program.uniformSizeAndIdsByName = {};
  
    };
  var _glLinkProgram = _emscripten_glLinkProgram;

  var _emscripten_glPixelStorei = (pname, param) => {
      if (pname == 3317) {
        GL.unpackAlignment = param;
      } else if (pname == 3314) {
        GL.unpackRowLength = param;
      }
      GLctx.pixelStorei(pname, param);
    };
  var _glPixelStorei = _emscripten_glPixelStorei;

  var _emscripten_glPolygonOffset = (x0, x1) => GLctx.polygonOffset(x0, x1);
  var _glPolygonOffset = _emscripten_glPolygonOffset;

  var _emscripten_glReadBuffer = (x0) => GLctx.readBuffer(x0);
  var _glReadBuffer = _emscripten_glReadBuffer;

  
  
  
  
  /** @type {!Uint16Array} */
  var HEAPU16;
  
  
  
  var heapObjectForWebGLType = (type) => {
      // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
      // smaller values for the heap, for shorter generated code size.
      // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
      // (since most types are HEAPU16)
      type -= 0x1400;
      if (type == 0) return HEAP8;
  
      if (type == 1) return HEAPU8;
  
      if (type == 2) return HEAP16;
  
      if (type == 4) return HEAP32;
  
      if (type == 6) return HEAPF32;
  
      if (type == 5
        || type == 28922
        || type == 28520
        || type == 30779
        || type == 30782
        )
        return HEAPU32;
  
      return HEAPU16;
    };
  
  var toTypedArrayIndex = (pointer, heap) =>
      pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));
  
  var _emscripten_glReadPixels = (x, y, width, height, format, type, pixels) => {
      if (true) {
        if (GLctx.currentPixelPackBufferBinding) {
          GLctx.readPixels(x, y, width, height, format, type, pixels);
          return;
        }
        var heap = heapObjectForWebGLType(type);
        var target = toTypedArrayIndex(pixels, heap);
        GLctx.readPixels(x, y, width, height, format, type, heap, target);
        return;
      }
    };
  var _glReadPixels = _emscripten_glReadPixels;

  var _emscripten_glShaderSource = (shader, count, string, length) => {
      var source = GL.getSource(shader, count, string, length);
  
      GLctx.shaderSource(GL.shaders[shader], source);
    };
  var _glShaderSource = _emscripten_glShaderSource;

  var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
      function roundedToNextMultipleOf(x, y) {
        return (x + y - 1) & -y;
      }
      var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
      var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
      return height * alignedRowSize;
    };
  
  var colorChannelsInGlTextureFormat = (format) => {
      // Micro-optimizations for size: map format to size by subtracting smallest
      // enum value (0x1902) from all values first.  Also omit the most common
      // size value (1) from the list, which is assumed by formats not on the
      // list.
      var colorChannels = {
        // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
        // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
        5: 3,
        6: 4,
        // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
        8: 2,
        29502: 3,
        29504: 4,
        // 0x1903 /* GL_RED */ - 0x1902: 1,
        26917: 2,
        26918: 2,
        // 0x8D94 /* GL_RED_INTEGER */ - 0x1902: 1,
        29846: 3,
        29847: 4
      };
      return colorChannels[format - 0x1902]||1;
    };
  
  
  
  var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels) => {
      var heap = heapObjectForWebGLType(type);
      var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
      var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
      return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap));
    };
  
  
  
  var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
      if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
          GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
          return;
        }
        if (pixels) {
          var heap = heapObjectForWebGLType(type);
          var index = toTypedArrayIndex(pixels, heap);
          GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
          return;
        }
      }
      var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
    };
  var _glTexImage2D = _emscripten_glTexImage2D;

  var _emscripten_glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);
  var _glTexParameteri = _emscripten_glTexParameteri;

  
  var webglGetProgramUniformLocation = (program, location) => {
  
      if (program) {
        var webglLoc = program.uniformLocsById[location];
        // program.uniformLocsById[location] stores either an integer, or a
        // WebGLUniformLocation.
        // If an integer, we have not yet bound the location, so do it now. The
        // integer value specifies the array index we should bind to.
        if (typeof webglLoc == 'number') {
          program.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(program, program.uniformArrayNamesById[location] + (webglLoc > 0 ? `[${webglLoc}]` : ''));
        }
        // Else an already cached WebGLUniformLocation, return it.
        return webglLoc;
      } else {
        GL.recordError(0x502/*GL_INVALID_OPERATION*/);
      }
    };
  
  var webglGetUniformLocation = (location) => {
  
      return webglGetProgramUniformLocation(GLctx.currentProgram, location);
    };
  
  var _emscripten_glUniform1f = (location, v0) => {
      GLctx.uniform1f(webglGetUniformLocation(location), v0);
    };
  var _glUniform1f = _emscripten_glUniform1f;

  
  var _emscripten_glUniform1i = (location, v0) => {
      GLctx.uniform1i(webglGetUniformLocation(location), v0);
    };
  var _glUniform1i = _emscripten_glUniform1i;

  var _emscripten_glUniform1ui = (location, v0) => {
      GLctx.uniform1ui(webglGetUniformLocation(location), v0);
    };
  var _glUniform1ui = _emscripten_glUniform1ui;

  
  
  var _emscripten_glUniform4fv = (location, count, value) => {
  
      count && GLctx.uniform4fv(webglGetUniformLocation(location), HEAPF32, ((value)>>2), count*4);
    };
  var _glUniform4fv = _emscripten_glUniform4fv;

  
  
  var _emscripten_glUniformMatrix3fv = (location, count, transpose, value) => {
  
      count && GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, HEAPF32, ((value)>>2), count*9);
    };
  var _glUniformMatrix3fv = _emscripten_glUniformMatrix3fv;

  
  
  var _emscripten_glUniformMatrix4fv = (location, count, transpose, value) => {
  
      count && GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, ((value)>>2), count*16);
    };
  var _glUniformMatrix4fv = _emscripten_glUniformMatrix4fv;

  var _emscripten_glUseProgram = (program) => {
      program = GL.programs[program];
      GLctx.useProgram(program);
      // Record the currently active program so that we can access the uniform
      // mapping table of that program.
      GLctx.currentProgram = program;
    };
  var _glUseProgram = _emscripten_glUseProgram;

  var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
      GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    };
  var _glVertexAttribPointer = _emscripten_glVertexAttribPointer;

  var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);
  var _glViewport = _emscripten_glViewport;



  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
        }
      }
      quit_(1, e);
    };

  
  
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };



  var runAndAbortIfError = (func) => {
      try {
        return func();
      } catch (e) {
        abort(e);
      }
    };
  
  
  
  
  var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
  var callUserCallback = (func) => {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        return func();
      } catch (e) {
        handleException(e);
      } finally {
        maybeExit();
      }
    };
  
  var createNamedFunction = (name, func) => Object.defineProperty(func, 'name', { value: name });
  
  var runtimeKeepalivePush = () => {
      runtimeKeepaliveCounter += 1;
    };
  
  var runtimeKeepalivePop = () => {
      assert(runtimeKeepaliveCounter > 0);
      runtimeKeepaliveCounter -= 1;
    };
  var Asyncify = {
  instrumentWasmImports(imports) {
        assert('Suspending' in WebAssembly, 'JSPI not supported by current environment. Perhaps it needs to be enabled via flags?');
        var importPattern = /^(invoke_.*|__asyncjs__.*)$/;
  
        for (let [x, original] of Object.entries(imports)) {
          if (typeof original == 'function') {
            let isAsyncifyImport = original.isAsync || importPattern.test(x);
            // Wrap async imports with a suspending WebAssembly function.
            if (isAsyncifyImport) {
              imports[x] = original = new WebAssembly.Suspending(original);
            }
          }
        }
      },
  instrumentWasmExports(exports) {
        var exportPattern = /^(main|aven_open_files|wx_dom_event|wx_dom_mouse|wx_window_close|wx_window_move|wx_window_resize|ProcessEvents|wxWasmMailboxTick|wxWasmTopLevelTick|wxWasmJobTick|main|__main_argc_argv)$/;
        Asyncify.asyncExports = new Set();
        var ret = {};
        for (let [x, original] of Object.entries(exports)) {
          if (typeof original == 'function') {
            // Wrap all exports with a promising WebAssembly function.
            let isAsyncifyExport = exportPattern.test(x);
            if (isAsyncifyExport) {
              Asyncify.asyncExports.add(original);
              original = Asyncify.makeAsyncFunction(original);
            }
            ret[x] = original;
          } else {
            ret[x] = original;
          }
        }
        return ret;
      },
  asyncExports:null,
  isAsyncExport(func) {
        return Asyncify.asyncExports?.has(func);
      },
  handleAsync:async (startAsync) => {
        
        try {
          return await startAsync();
        } finally {
          
        }
      },
  handleSleep:(startAsync) => Asyncify.handleAsync(() => new Promise(startAsync)),
  makeAsyncFunction(original) {
        return WebAssembly.promising(original);
      },
  };




























































  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, `Cannot call unknown function ${ident}, make sure it is exported`);
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  
  
  
  
    /**
   * @param {string|null=} returnType
   * @param {Array=} argTypes
   * @param {Array=} args
   * @param {Object=} opts
   */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'return type should not be "array"');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (!stack) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack) stackRestore(stack);
        return convertReturnValue(ret);
      }
    var asyncMode = opts?.async;
  
      if (asyncMode) return ret.then(onDone);
  
      ret = onDone(ret);
      return ret;
    };



  var FS_createPath = (...args) => FS.createPath(...args);



  var FS_unlink = (...args) => FS.unlink(...args);

  var FS_createLazyFile = (...args) => FS.createLazyFile(...args);

  var FS_createDevice = (...args) => FS.createDevice(...args);



  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();;
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];

if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];
  // End ATMODULES hooks

  checkIncomingModuleAPI();

  if (Module['arguments']) programArgs = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['read'] == 'undefined', 'Module.read option was removed');
  assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
  assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
  assert(typeof Module['ENVIRONMENT'] == 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
  assert(typeof Module['STACK_SIZE'] == 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')
  // If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
  assert(typeof Module['wasmMemory'] == 'undefined', 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
  assert(typeof Module['INITIAL_MEMORY'] == 'undefined', 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

  var preInit = Module['preInit'];
  if (preInit) {
    if (typeof preInit == 'function') Module['preInit'] = preInit = [preInit];
    // Written as a loop so that preInit functions that themselves add more
    // preInit functions.  Is this actually needed?
    while (preInit.length > 0) {
      preInit.shift()();
    }
  }
  consumedModuleProp('preInit');
}

// Begin runtime exports
  Module['stackSave'] = stackSave;
  Module['stackRestore'] = stackRestore;
  Module['addRunDependency'] = addRunDependency;
  Module['removeRunDependency'] = removeRunDependency;
  Module['ccall'] = ccall;
  Module['FS_preloadFile'] = FS_preloadFile;
  Module['FS_unlink'] = FS_unlink;
  Module['FS_createPath'] = FS_createPath;
  Module['FS_createDevice'] = FS_createDevice;
  Module['FS'] = FS;
  Module['FS_createDataFile'] = FS_createDataFile;
  Module['FS_createLazyFile'] = FS_createLazyFile;
  var missingLibrarySymbols = [
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'getTempRet0',
  'setTempRet0',
  'withStackSave',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'runMainThreadEmAsm',
  'autoResumeAudioContext',
  'getDynCaller',
  'dynCall',
  'asmjsMangle',
  'HandleAllocator',
  'addOnInit',
  'addOnPostCtor',
  'addOnPreMain',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'cwrap',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'setValue',
  'getValue',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'registerFullscreenChangeEventCallback',
  'callCanvasResizedCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'currentFullscreenStrategy',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'getCallstack',
  'convertPCtoSourceLocation',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'safeSetTimeout',
  'setImmediateWrapped',
  'safeRequestAnimationFrame',
  'clearImmediateWrapped',
  'registerPostMainLoop',
  'registerPreMainLoop',
  'getPromise',
  'makePromise',
  'addPromise',
  'idsToPromises',
  'makePromiseCallback',
  'Browser_asyncPrepareDataCounter',
  'arraySum',
  'addDays',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'emscriptenWebGLGetUniform',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'emscriptenWebGLGetIndexed',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'demangle',
  'stackTrace',
  'getNativeTypeSize',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

  var unexportedSymbols = [
  'run',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmExports',
  'writeStackCookie',
  'checkStackCookie',
  'writeI53ToI64',
  'readI53FromI64',
  'readI53FromU64',
  'INT53_MAX',
  'INT53_MIN',
  'bigintToI53Checked',
  'HEAP16',
  'HEAPU16',
  'HEAPU32',
  'HEAPF32',
  'HEAPF64',
  'HEAP64',
  'HEAPU64',
  'stackAlloc',
  'createNamedFunction',
  'ptrToString',
  'zeroMemory',
  'exitJS',
  'getHeapMax',
  'growMemory',
  'ENV',
  'ERRNO_CODES',
  'strError',
  'DNS',
  'Protocols',
  'Sockets',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'readEmAsmArgs',
  'runEmAsmFunction',
  'jstoi_q',
  'getExecutableName',
  'handleException',
  'keepRuntimeAlive',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'wasmTable',
  'wasmMemory',
  'getUniqueRunDependency',
  'noExitRuntime',
  'addOnPreRun',
  'addOnExit',
  'addOnPostRun',
  'freeTableIndexes',
  'functionsInTableMap',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayFromString',
  'UTF16Decoder',
  'stringToNewUTF8',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'registerKeyEventCallback',
  'specialHTMLTargets',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillFullscreenChangeEventData',
  'restoreOldWindowedStyle',
  'registerTouchEventCallback',
  'UNWIND_CACHE',
  'ExitStatus',
  'getEnvStrings',
  'checkWasiClock',
  'doReadv',
  'doWritev',
  'initRandomFill',
  'randomFill',
  'emSetImmediate',
  'emClearImmediate_deps',
  'emClearImmediate',
  'promiseMap',
  'getExceptionMessageCommon',
  'getCppExceptionTag',
  'getCppExceptionThrownObjectFromWebAssemblyException',
  'incrementUncaughtExceptionCount',
  'decrementUncaughtExceptionCount',
  'incrementExceptionRefcount',
  'decrementExceptionRefcount',
  'getExceptionMessage',
  'Browser',
  'requestFullscreen',
  'setCanvasSize',
  'getUserMedia',
  'createContext',
  'getPreloadedImageData__data',
  'wget',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'isLeapYear',
  'ydayFromDate',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_fileDataToTypedArray',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS_readFile',
  'FS_root',
  'FS_mounts',
  'FS_devices',
  'FS_streams',
  'FS_nextInode',
  'FS_nameTable',
  'FS_currentPath',
  'FS_initialized',
  'FS_ignorePermissions',
  'FS_filesystems',
  'FS_syncFSRequests',
  'FS_lookupPath',
  'FS_getPath',
  'FS_hashName',
  'FS_hashAddNode',
  'FS_hashRemoveNode',
  'FS_lookupNode',
  'FS_createNode',
  'FS_destroyNode',
  'FS_isRoot',
  'FS_isMountpoint',
  'FS_isFile',
  'FS_isDir',
  'FS_isLink',
  'FS_isChrdev',
  'FS_isBlkdev',
  'FS_isFIFO',
  'FS_isSocket',
  'FS_flagsToPermissionString',
  'FS_nodePermissions',
  'FS_mayLookup',
  'FS_mayCreate',
  'FS_mayDelete',
  'FS_mayOpen',
  'FS_checkOpExists',
  'FS_nextfd',
  'FS_getStreamChecked',
  'FS_getStream',
  'FS_createStream',
  'FS_closeStream',
  'FS_dupStream',
  'FS_doSetAttr',
  'FS_chrdev_stream_ops',
  'FS_major',
  'FS_minor',
  'FS_makedev',
  'FS_registerDevice',
  'FS_getDevice',
  'FS_getMounts',
  'FS_syncfs',
  'FS_mount',
  'FS_unmount',
  'FS_lookup',
  'FS_mknod',
  'FS_statfs',
  'FS_statfsStream',
  'FS_statfsNode',
  'FS_create',
  'FS_mkdir',
  'FS_mkdev',
  'FS_symlink',
  'FS_link',
  'FS_rename',
  'FS_rmdir',
  'FS_readdir',
  'FS_readlink',
  'FS_stat',
  'FS_fstat',
  'FS_lstat',
  'FS_doChmod',
  'FS_chmod',
  'FS_lchmod',
  'FS_fchmod',
  'FS_doChown',
  'FS_chown',
  'FS_lchown',
  'FS_fchown',
  'FS_doTruncate',
  'FS_truncate',
  'FS_ftruncate',
  'FS_utime',
  'FS_open',
  'FS_close',
  'FS_isClosed',
  'FS_llseek',
  'FS_read',
  'FS_write',
  'FS_mmap',
  'FS_msync',
  'FS_ioctl',
  'FS_writeFile',
  'FS_cwd',
  'FS_chdir',
  'FS_createDefaultDirectories',
  'FS_createDefaultDevices',
  'FS_createSpecialDirectories',
  'FS_createStandardStreams',
  'FS_staticInit',
  'FS_init',
  'FS_quit',
  'FS_findObject',
  'FS_analyzePath',
  'FS_createFile',
  'FS_forceLoadFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_WEBGL_multi_draw',
  'webgl_enable_EXT_polygon_offset_clamp',
  'webgl_enable_EXT_clip_control',
  'webgl_enable_WEBGL_polygon_mode',
  'GL',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'webglGetProgramUniformLocation',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'runAndAbortIfError',
  'Asyncify',
  'Fibers',
  'SDL',
  'SDL_gfx',
  'webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance',
  'webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance',
  'print',
  'printErr',
  'jstoi_s',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);

  // End runtime exports
  // Begin JS library exports
  // End JS library exports

// end include: postlibrary.js

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
  ignoredModuleProp('logReadFiles');
  ignoredModuleProp('loadSplitModule');
  ignoredModuleProp('onMalloc');
  ignoredModuleProp('onRealloc');
  ignoredModuleProp('onFree');
  ignoredModuleProp('onSbrkGrow');
  ignoredModuleProp('onCOSCacheHit');
  ignoredModuleProp('onCOSCacheMiss');
  ignoredModuleProp('onCOSStore');
  ignoredModuleProp('GL_MAX_TEXTURE_IMAGE_UNITS');
  ignoredModuleProp('SDL_canPlayWithWebAudio');
  ignoredModuleProp('SDL_numSimultaneouslyQueuedBuffers');
  ignoredModuleProp('freePreloadedMediaOnUse');
  ignoredModuleProp('preinitializedWebGLContext');
  ignoredModuleProp('keyboardListeningElement');
  ignoredModuleProp('doNotCaptureKeyboard');
  ignoredModuleProp('extraStackTrace');
  ignoredModuleProp('preloadPlugins');
  ignoredModuleProp('preMainLoop');
  ignoredModuleProp('postMainLoop');
  ignoredModuleProp('forcedAspectRatio');
  ignoredModuleProp('mainScriptUrlOrBlob');
  ignoredModuleProp('onFullScreen');
  ignoredModuleProp('INITIAL_MEMORY');
  ignoredModuleProp('wasmMemory');
  ignoredModuleProp('wasmBinary');
}
var ASM_CONSTS = {
  11493072: () => { Module.avenGL=Module.avenGL||{}; Module.avenGL.bitmaps=(Module.avenGL.bitmaps||0)+1; },  
 11493161: () => { Module.avenGL=Module.avenGL||{}; Module.avenGL.nativeErrors=(Module.avenGL.nativeErrors||0)+1; },  
 11493260: () => { Module.avenGL=Module.avenGL||{}; Module.avenGL.adapterErrors=(Module.avenGL.adapterErrors||0)+1; },  
 11493361: ($0) => { Module.avenGL=Module.avenGL||{}; const d=Module.avenGL; d.draws=(d.draws||0)+1; d.vertices=(d.vertices||0)+$0; d.maxDrawVertices=Math.max(d.maxDrawVertices||0,$0); d.backend="WebGL2 shader/VBO"; },  
 11493560: () => { Module.avenReady = true; },  
 11493589: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) => { Module.avenTest = Module.avenTest || {}; Module.avenTest.camera = ({ pan: $0, tilt: $1, scale: $2, translation: [$3, $4, $5], width: $6, height: $7, names: !!$8, tubes: !!$9, terrain: !!$10, stations: [], stationCount: Module.avenTest.model.stations.length, highlighted: $11 }); },  
 11493872: ($0, $1, $2, $3) => { Module.avenTest.camera.stations.push({ name: UTF8ToString($0), screen: [$1, $2, $3] }); },  
 11493964: () => { if (!Module.avenRendered) { Module.avenRendered = true; window.dispatchEvent(new Event('aven-rendered')); } },  
 11494076: () => { Module.avenTest.frames = (Module.avenTest.frames || 0) + 1; },  
 11494140: ($0) => { Module.avenTest = Module.avenTest || {}; Module.avenTest.here = UTF8ToString($0); },  
 11494226: ($0) => { Module.avenTest = Module.avenTest || {}; Module.avenTest.there = UTF8ToString($0); },  
 11494313: () => { if (Module.avenTest) delete Module.avenTest.terrain; },  
 11494370: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) => { Module.avenTest = Module.avenTest || {}; Module.avenTest.terrain = ({ width: $0, height: $1, originLonLat: [$2, $3], spacing: [$4, $5], offset: [$6, $7, $8], crs: UTF8ToString($9), samples: [], sampleCount: 0, samplesTruncated: false, triangles: 0 }); },  
 11494626: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) => { const t = Module.avenTest.terrain; ++t.sampleCount; if (t.samples.length < 10000) t.samples.push({ column: $0, row: $1, source: [$2, $3, $4], world: [$5, $6, $7], local: [$8, $9, $10] }); else t.samplesTruncated = true; },  
 11494850: ($0) => { Module.avenTest.terrain.triangles = $0; const t = Module.avenTest.terrain; console.log('AVEN_WEB_TERRAIN ' + JSON.stringify({ width: t.width, height: t.height, crs: t.crs, samples: t.samples.length, triangles: t.triangles, centre: t.samples.find(p => p.column === Math.floor(t.width / 2) && p.row === Math.floor(t.height / 2)) })); },  
 11495186: ($0, $1, $2, $3, $4, $5) => { const message = UTF8ToString($1); if ($0 <= $2) console.error(message); else if ($0 === $3) console.warn(message); else if ($0 === $4 || $0 === $5) console.debug(message); else console.info(message); },  
 11495390: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) => { Module.avenTest = Module.avenTest || {}; Module.avenTest.model = ({ file: UTF8ToString($0), title: UTF8ToString($1), crs: UTF8ToString($2), offset: [$3, $4, $5], legs: $6, surfaceLegs: $7, xsects: $8, tubes: $9, stations: [] }); delete Module.avenTest.terrain; },  
 11495655: ($0, $1, $2, $3, $4, $5, $6, $7) => { Module.avenTest.model.stations.push({ name: UTF8ToString($0), world: [$1, $2, $3], local: [$4, $5, $6], flags: $7 }); },  
 11495777: () => { const m = Module.avenTest.model; console.log('AVEN_WEB_MODEL ' + JSON.stringify({ file: m.file, crs: m.crs, stations: m.stations.length, legs: m.legs, xsects: m.xsects, tubes: m.tubes })); },  
 11495970: () => { if (typeof GLImmediate !== 'undefined' && !GLImmediate.initted) { var oldUseWebGL = Browser.useWebGL; Browser.useWebGL = true; GLImmediate.init(); Browser.useWebGL = oldUseWebGL; } },  
 11496155: () => { return createGLCanvas(true); },  
 11496188: ($0, $1, $2, $3, $4) => { setGLCanvasRect($0, $1, $2, $3, $4); },  
 11496229: ($0) => { destroyGLCanvas($0); },  
 11496254: ($0, $1, $2, $3, $4) => { setGLCanvasRect($0, $1, $2, $3, $4); },  
 11496295: ($0, $1) => { setGLCanvasVisibility($0, $1); },  
 11496330: () => { if (typeof registerDragDropHandlers === 'function') { registerDragDropHandlers(); } },  
 11496418: () => { if (typeof document === 'undefined') return 0; var ae = document.activeElement; return (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) ? 1 : 0; },  
 11496631: () => { return mainWindow.offsetTop; },  
 11496664: ($0) => { destroyBitmap($0); },  
 11496687: ($0, $1) => { getBitmapData($0, $1); },  
 11496714: ($0, $1, $2, $3) => { return createBitmap($0, $1, $2, $3); },  
 11496755: ($0, $1, $2, $3, $4) => { setBitmapData($0, $1, $2, $3, $4); },  
 11496794: ($0) => { setCursor($0); },  
 11496813: ($0) => { setCursor($0); },  
 11496832: ($0, $1, $2, $3) => { setCursor($0, $1, $2, $3); },  
 11496863: () => { if (typeof mainWindow !== 'undefined' && mainWindow) { return mainWindow.offsetWidth; } return 1280; },  
 11496968: () => { if (typeof mainWindow !== 'undefined' && mainWindow) { return mainWindow.offsetHeight; } return 720; },  
 11497073: () => { return window.innerWidth; },  
 11497103: () => { return window.innerHeight - mainWindow.offsetTop; },  
 11497157: () => { if (globalThis.__wxScheduler) globalThis.__wxScheduler.shutdown("main loop exited"); },  
 11497246: ($0, $1) => { return measureText(UTF8ToString($0), UTF8ToString($1)); },  
 11497306: ($0, $1) => { var method = UTF8ToString($0); var message = UTF8ToString($1); if (method === "error") { console.error(message); } else if (method === "warn") { console.warn(message); } else if (method === "info") { console.info(message); } else if (method === "debug") { console.debug(message); } else { console.log(message); } },  
 11497623: ($0) => { destroyWindow($0); },  
 11497646: ($0, $1) => { return createWindow(-1, true, $0, UTF8ToString($1)); },  
 11497703: ($0, $1, $2, $3, $4) => { return setWindowRect($0, $1, $2, $3, $4); },  
 11497749: ($0, $1) => { setWindowVisibility($0, $1); },  
 11497782: ($0) => { raiseWindow($0); },  
 11497803: ($0) => { lowerWindow($0); },  
 11497824: ($0, $1, $2) => { createWindowTitlebar($0, UTF8ToString($1), $2); },  
 11497876: ($0, $1) => { createWindowResizeHandles($0, $1); },  
 11497915: () => { if (typeof window !== 'undefined' && typeof window.wxAppTopWindowClosed === 'function') { window.wxAppTopWindowClosed(); } },  
 11498042: ($0) => { setIcon($0); },  
 11498059: ($0) => { showFullscreen($0); },  
 11498083: ($0) => { document.title = UTF8ToString($0); },  
 11498122: ($0, $1) => { setWindowTitle($0, UTF8ToString($1)); },  
 11498164: () => { return lengthBytesUTF8(platformInfo.name); },  
 11498211: ($0, $1) => { stringToUTF8(platformInfo.name, $0, $1); },  
 11498256: () => { return lengthBytesUTF8(browserInfo.name); },  
 11498302: ($0, $1) => { stringToUTF8(browserInfo.name, $0, $1); },  
 11498346: () => { return lengthBytesUTF8(browserInfo.version); },  
 11498395: ($0, $1) => { stringToUTF8(browserInfo.version, $0, $1); },  
 11498442: () => { return lengthBytesUTF8(platformInfo.name); },  
 11498489: ($0, $1) => { stringToUTF8(platformInfo.name, $0, $1); },  
 11498534: () => { return lengthBytesUTF8(platformInfo.version); },  
 11498584: ($0, $1) => { stringToUTF8(platformInfo.version, $0, $1); },  
 11498632: () => { return lengthBytesUTF8(navigator.userAgent); },  
 11498681: ($0, $1) => { stringToUTF8(navigator.userAgent, $0, $1); },  
 11498728: () => { return lengthBytesUTF8(browserInfo.name); },  
 11498774: ($0, $1) => { stringToUTF8(browserInfo.name, $0, $1); },  
 11498818: () => { return lengthBytesUTF8(browserInfo.version); },  
 11498867: ($0, $1) => { stringToUTF8(browserInfo.version, $0, $1); },  
 11498914: ($0) => { openUrl(UTF8ToString($0)) },  
 11498944: ($0) => { var p = UTF8ToString($0); try { var data = FS.readFile(p); var ext = (p.split('.').pop() || '').toLowerCase(); var type = 'application/octet-stream'; if (ext == 'pdf') type = 'application/pdf'; else if (ext == 'html' || ext == 'htm') type = 'text/html'; else if (ext == 'txt') type = 'text/plain'; else if (ext == 'png') type = 'image/png'; else if (ext == 'jpg' || ext == 'jpeg') type = 'image/jpeg'; else if (ext == 'svg') type = 'image/svg+xml'; var blob = new Blob([data], ({ type: type })); openUrl(URL.createObjectURL(blob)); return 1; } catch (e) { return 0; } },  
 11499516: ($0) => { var ae = document.activeElement; return ae && ae.closest && ae.closest('[data-wx-dom-id="' + $0 + '"]') ? 1 : 0; },  
 11499633: ($0) => { var ae = document.activeElement; return ae && ae.closest && ae.closest('[data-wx-dom-id="' + $0 + '"]') ? 1 : 0; },  
 11499750: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) => { wxElementRegister( $0.toString(), UTF8ToString($1), UTF8ToString($2), UTF8ToString($3), $4, $5, $6, $7, $8 ? $8.toString() : null, $9 ? true : false, $10 ? true : false, $11 ? $11.toString() : null ); },  
 11499955: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) => { wxElementUpdate( $0.toString(), UTF8ToString($1), UTF8ToString($2), UTF8ToString($3), $4, $5, $6, $7, $8 ? $8.toString() : null, $9 ? true : false, $10 ? true : false, $11 ? $11.toString() : null ); },  
 11500158: ($0) => { wxElementUnregister($0.toString()); },  
 11500198: ($0) => { wxDomDestroyControl($0); },  
 11500227: ($0, $1, $2) => { return wxDomCreateControl($0, UTF8ToString($1), UTF8ToString($2)); },  
 11500298: ($0, $1) => { wxDomSetFont($0, UTF8ToString($1)); },  
 11500338: ($0, $1) => { wxDomSetEnabled($0, $1); },  
 11500367: ($0, $1) => { wxDomSetShown($0, $1); },  
 11500394: ($0, $1, $2, $3, $4) => { wxDomSetRect($0, $1, $2, $3, $4); },  
 11500432: ($0, $1, $2, $3, $4) => { wxDomSetClip($0, $1, $2, $3, $4); },  
 11500470: ($0) => { return wxDomGetIntValue($0); },  
 11500503: ($0) => { return wxDomGetScrollPhase($0); },  
 11500539: ($0, $1, $2, $3, $4) => { wxDomSetScrollbar($0, $1, $2, $3, $4); },  
 11500582: ($0, $1) => { wxDomSetIntValue($0, $1); },  
 11500612: ($0) => { wxDomFocus($0); },  
 11500632: () => { if (typeof wxDomBlurActive === 'function') wxDomBlurActive(); },  
 11500698: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) => { var id = $0.toString() + ':' + UTF8ToString($1) + ':' + $2; wxRenderedElementRegister( id, $0.toString(), UTF8ToString($1), UTF8ToString($3), UTF8ToString($4), UTF8ToString($5), $6, $7, $8, $9, $10 ? true : false, $2, $12 ? $11 : undefined ); },  
 11500945: ($0) => { wxRenderedElementUnregisterByParent($0.toString()); },  
 11501001: ($0, $1, $2, $3) => { wxDomSetImage($0, UTF8ToString($1), $2, $3); },  
 11501050: ($0, $1) => { wxDomSetText($0, UTF8ToString($1)); },  
 11501090: ($0, $1) => { wxDomSetBoolValue($0, $1); },  
 11501121: ($0) => { return wxDomGetBoolValue($0); },  
 11501155: ($0, $1) => { wxDomSetItems($0, UTF8ToString($1)); },  
 11501196: ($0, $1) => { wxDomSetValue($0, UTF8ToString($1)); },  
 11501237: ($0) => { return stringToNewUTF8(wxDomGetValue($0)); },  
 11501284: ($0) => { return wxDomIntrinsicSize($0); },  
 11501319: ($0, $1) => { wxDomMenuSetStructure($0, UTF8ToString($1)); },  
 11501368: ($0) => { return wxDomGetLastCommandId($0); },  
 11501406: ($0) => { return wxDomNotebookStripHeight($0); },  
 11501447: ($0, $1) => { wxDomNotebookSetTabs($0, UTF8ToString($1)); },  
 11501495: ($0, $1, $2) => { return wxDomTextCtrlSizeFromText($0, $1, $2); },  
 11501545: ($0, $1, $2) => { wxDomSetSelection($0, $1, $2); },  
 11501580: ($0) => { return wxDomGetSelectionStart($0); },  
 11501619: ($0) => { return wxDomGetSelectionEnd($0); },  
 11501656: ($0, $1) => { wxDomSetReadOnly($0, $1); },  
 11501686: ($0, $1, $2) => { wxDomTooltipShow(UTF8ToString($0), $1, $2); },  
 11501734: () => { wxDomTooltipHide(); },  
 11501758: ($0, $1) => { wxDomSetAriaLabel($0, UTF8ToString($1)); },  
 11501803: ($0, $1, $2, $3) => { clearRect($0, $1, $2, $3); },  
 11501834: ($0, $1, $2, $3, $4, $5, $6, $7) => { setPen($0, $1, $2, $3, $4, $5, $6, $7); },  
 11501878: ($0, $1, $2) => { setBrush($0, $1, $2); },  
 11501904: ($0, $1, $2, $3, $4) => { clipRect($0, $1, $2, $3, $4); },  
 11501938: ($0, $1, $2) => { clipRegion($0, $1, $2); },  
 11501966: ($0, $1, $2, $3, $4) => { clipRect($0, $1, $2, $3, $4); },  
 11502000: ($0) => { destroyClip($0); },  
 11502021: ($0, $1, $2) => { drawPoint($0, $1, $2); },  
 11502048: ($0, $1, $2, $3, $4) => { drawLine($0, $1, $2, $3, $4); },  
 11502082: ($0, $1, $2) => { drawLines($0, $1, $2); },  
 11502109: ($0, $1, $2, $3, $4, $5) => { drawPolygon($0, $1, $2, $3, $4, $5); },  
 11502150: ($0, $1, $2, $3, $4, $5, $6) => { drawRect($0, $1, $2, $3, $4, $5, $6); },  
 11502192: ($0, $1, $2, $3, $4, $5, $6, $7) => { drawRoundedRect($0, $1, $2, $3, $4, $5, $6, $7); },  
 11502245: ($0, $1, $2, $3, $4, $5, $6) => { drawEllipse($0, $1, $2, $3, $4, $5, $6); },  
 11502290: ($0, $1, $2, $3, $4, $5, $6, $7) => { drawArc($0, $1, $2, $3, $4, $5, $6, $7); },  
 11502335: ($0, $1, $2, $3, $4, $5, $6, $7, $8) => { drawEllipticArc($0, $1, $2, $3, $4, $5, $6, $7, $8); },  
 11502392: ($0, $1, $2, $3) => { drawBitmap($0, $1, $2, $3); },  
 11502424: ($0, $1, $2, $3, $4, $5, $6, $7) => { blit($0, $1, $2, $3, $4, $5, $6, $7); },  
 11502466: ($0, $1) => { setFont($0, UTF8ToString($1)); },  
 11502501: ($0, $1, $2, $3, $4, $5, $6) => { drawRect($0, $1, $2, $3, $4, $5, $6); },  
 11502543: ($0, $1, $2, $3, $4, $5, $6) => { drawText($0, UTF8ToString($1), $2, $3, $4, $5, $6); },  
 11502599: ($0, $1, $2, $3) => { rotateAtPoint($0, $1, $2, $3); },  
 11502634: ($0) => { clearRotation($0); },  
 11502657: ($0) => { destroyWindowContext($0); },  
 11502687: ($0, $1, $2, $3, $4, $5) => { return createWindowContext($0, $1, $2, $3, $4, $5); },  
 11502743: ($0, $1) => { return createMemoryContext($0, $1); },  
 11502783: ($0) => { destroyMemoryContext($0); },  
 11502813: ($0, $1, $2, $3, $4, $5) => { return createWindowContext($0, $1, $2, $3, $4, $5); },  
 11502869: ($0) => { destroyWindowContext($0); },  
 11502899: ($0, $1) => { wxDomSetGroupName($0, UTF8ToString($1)); },  
 11502944: ($0, $1, $2, $3, $4) => { wxDomToolbarSetTools($0, UTF8ToString($1), $2, $3, $4); },  
 11503004: ($0, $1, $2) => { return wxDomToolbarGetToolRect($0, $1, $2); },  
 11503052: ($0, $1, $2) => { wxDomSetRange($0, $1, $2); },  
 11503083: ($0, $1, $2) => { return wxDomListHitTest($0, $1, $2); },  
 11503124: ($0, $1, $2) => { wxDomSetItemSelected($0, $1, $2); },  
 11503162: ($0) => { return stringToNewUTF8(wxDomGetSelectedIndices($0)); },  
 11503219: ($0, $1) => { return getConfigGroupIndex(UTF8ToString($0), $1); },  
 11503273: ($0) => { return getConfigKeyLength($0); },  
 11503308: ($0, $1, $2) => { getConfigKey($0, $1, $2); },  
 11503338: ($0, $1) => { return getConfigEntryIndex(UTF8ToString($0), $1); },  
 11503392: ($0) => { return getConfigKeyLength($0); },  
 11503427: ($0, $1, $2) => { getConfigKey($0, $1, $2); },  
 11503457: ($0, $1) => { return getConfigEntryCount(UTF8ToString($0), $1); },  
 11503511: ($0) => { return getConfigGroupCount(UTF8ToString($0)); },  
 11503561: ($0) => { return hasConfigGroup(UTF8ToString($0)); },  
 11503606: ($0) => { return hasConfigEntry(UTF8ToString($0)); },  
 11503651: ($0) => { return getConfigEntryLength(UTF8ToString($0)); },  
 11503702: ($0, $1, $2) => { getConfigEntry(UTF8ToString($0), $1, $2); },  
 11503748: ($0, $1) => { setConfigEntry(UTF8ToString($0), UTF8ToString($1)); },  
 11503804: ($0, $1) => { renameConfigGroup(UTF8ToString($0), UTF8ToString($1)); },  
 11503863: ($0) => { removeConfigEntry(UTF8ToString($0)); },  
 11503904: ($0) => { return removeConfigGroup(UTF8ToString($0)); },  
 11503952: () => { clearConfig(); }
};
function wxWasmInstallEscapeGuard() { if (typeof window === 'undefined' || window.__wxEscapeGuard) return; window.__wxEscapeGuard = function (ev) { if (ev.key === 'Escape' && !ev.isComposing) ev.preventDefault(); }; window.addEventListener('keydown', window.__wxEscapeGuard, true); }
wxWasmInstallEscapeGuard.sig = 'v';
function wxWasmRemoveEscapeGuard() { if (typeof window === 'undefined' || !window.__wxEscapeGuard) return; window.removeEventListener('keydown', window.__wxEscapeGuard, true); window.__wxEscapeGuard = null; }
wxWasmRemoveEscapeGuard.sig = 'v';
function js_isClipboardAPIAvailable() { return typeof navigator !== 'undefined' && typeof navigator.clipboard !== 'undefined' && typeof navigator.clipboard.writeText === 'function'; }
js_isClipboardAPIAvailable.sig = 'i';
function js_writeTextToClipboardStart(token,text) { const finish = (v) => globalThis.__wxScheduler.resolveWait(token, v); if (typeof navigator === 'undefined' || typeof navigator.clipboard === 'undefined') { console.warn('[wxClipboard] Clipboard API not available'); Promise.resolve().then(() => finish(1)); return; } const textStr = UTF8ToString(text); const timeoutMs = 2000; const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error('Clipboard operation timed out')), timeoutMs); }); Promise.race([ navigator.clipboard.writeText(textStr), timeoutPromise ]).then(() => finish(0)).catch((err) => { if (err.name === 'NotAllowedError') { console.warn('[wxClipboard] Clipboard write permission denied: ' + err.message); return finish(2); } if (err.message && err.message.includes('timed out')) { console.warn('[wxClipboard] Clipboard write timed out'); return finish(4); } console.error('[wxClipboard] Clipboard write error: ' + err.message); finish(3); }); }
js_writeTextToClipboardStart.sig = 'vii';
function js_readTextFromClipboardStart(token) { const finish = (v) => globalThis.__wxScheduler.resolveWait(token, v); if (typeof navigator === 'undefined' || typeof navigator.clipboard === 'undefined') { console.warn('[wxClipboard] Clipboard API not available'); Promise.resolve().then(() => finish(0)); return; } const timeoutMs = 2000; const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error('Clipboard operation timed out')), timeoutMs); }); Promise.race([ navigator.clipboard.readText(), timeoutPromise ]).then((text) => { const len = lengthBytesUTF8(text) + 1; const ptr = _malloc(len); if (ptr === 0) { console.error('[wxClipboard] Failed to allocate memory for clipboard text'); return finish(0); } stringToUTF8(text, ptr, len); finish(ptr); }).catch((err) => { if (err.name === 'NotAllowedError') { console.warn('[wxClipboard] Clipboard read permission denied: ' + err.message); } else if (err.message && err.message.includes('timed out')) { console.warn('[wxClipboard] Clipboard read timed out'); } else { console.error('[wxClipboard] Clipboard read error: ' + err.message); } finish(0); }); }
js_readTextFromClipboardStart.sig = 'vi';
function js_clipboardHasTextStart(token) { const finish = (v) => globalThis.__wxScheduler.resolveWait(token, v); if (typeof navigator === 'undefined' || typeof navigator.clipboard === 'undefined') { Promise.resolve().then(() => finish(-1)); return; } const timeoutMs = 2000; const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error('Clipboard operation timed out')), timeoutMs); }); Promise.race([ navigator.clipboard.readText(), timeoutPromise ]).then((text) => { finish((text && text.length > 0) ? 1 : 0); }).catch((err) => { console.warn('[wxClipboard] Cannot check clipboard content: ' + err.message); finish(-1); }); }
function js_clearClipboardStart(token) { const finish = (v) => globalThis.__wxScheduler.resolveWait(token, v); if (typeof navigator === 'undefined' || typeof navigator.clipboard === 'undefined') { Promise.resolve().then(() => finish(1)); return; } const timeoutMs = 2000; const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error('Clipboard operation timed out')), timeoutMs); }); Promise.race([ navigator.clipboard.writeText(''), timeoutPromise ]).then(() => finish(0)).catch((err) => { console.warn('[wxClipboard] Failed to clear clipboard: ' + err.message); finish(1); }); }
js_clearClipboardStart.sig = 'vi';
function wxWasmMailboxJsEnabled() { return (typeof globalThis !== "undefined" && globalThis.__wxSchedulerInstalled && globalThis.__wxScheduler && globalThis.__wxScheduler.mailbox) ? 1 : 0; }
wxWasmMailboxJsEnabled.sig = 'i';
function wxWasmMailboxJsEnqueue(fn,arg,ms) { globalThis.__wxScheduler.enqueueAfter(fn, arg, ms); }
wxWasmMailboxJsEnqueue.sig = 'viii';
function wxWasmMailboxJsPending() { return globalThis.__wxScheduler.mailbox.length; }
wxWasmMailboxJsPending.sig = 'i';
function wxWasmMailboxJsPop(fnOut,argOut) { var m = globalThis.__wxScheduler.pop(); if (!m) return 0; HEAPU32[fnOut >> 2] = m.fn; HEAPU32[argOut >> 2] = m.arg; return 1; }
wxWasmMailboxJsPop.sig = 'iii';
function wxWasmBeginWaitJs(kind) { return globalThis.__wxScheduler.beginWait(UTF8ToString(kind)); }
wxWasmBeginWaitJs.sig = 'ii';
function __asyncjs__wxWasmYieldUntilJs(token) { return Asyncify.handleAsync(async () => { return await globalThis.__wxScheduler.waitPromise(token); }); }
__asyncjs__wxWasmYieldUntilJs.sig = 'ii';
function wxWasmResolveWaitJs(token,result) { globalThis.__wxScheduler.resolveWait(token, result); }
function wxWasmResolveTopWaitJs(kind,result) { globalThis.__wxScheduler.resolveTopWait(UTF8ToString(kind), result); }
wxWasmResolveTopWaitJs.sig = 'vii';
function wxWasmWaitEarlyResolvedJs(token) { return globalThis.__wxScheduler.waitEarlyResolved(token); }
wxWasmWaitEarlyResolvedJs.sig = 'ii';
function wxWasmTakeWaitResultJs(token) { return globalThis.__wxScheduler.takeWaitResult(token); }
wxWasmTakeWaitResultJs.sig = 'ii';
function wxWasmExitNestedLoop() { globalThis.__wxScheduler.resolveTopWait('nested', 0); }
wxWasmExitNestedLoop.sig = 'v';
function __asyncjs__wxWasmYieldToBrowser() { return Asyncify.handleAsync(async () => { await globalThis.__wxScheduler.frameYield(); }); }
__asyncjs__wxWasmYieldToBrowser.sig = 'v';
function wxWasmScheduleProcessEvents() { setTimeout(function () { var contain = function (e) { if (Module["_wx_dispatch_abandon"]) Module["_wx_dispatch_abandon"](); if (globalThis.__wxScheduler) { globalThis.__wxScheduler.resolveTopWait('nested', 0); globalThis.__wxScheduler.resolveTopWait('modal', 5101); } }; var p; try { p = Module["_wxWasmTopLevelTick"](); } catch (e) { contain(e); throw e; } Promise.resolve(p).catch(function (e) { contain(e); console.warn("[wx] top-level tick rejected: " + e); }); }, 0); }
wxWasmScheduleProcessEvents.sig = 'v';
function wxWasmOnPromisingActivationJs() { const S = globalThis.__wxScheduler; return (S && S._actStack && S._actStack.length > 0) ? 1 : 0; }
wxWasmOnPromisingActivationJs.sig = 'i';
function wxWasmArmJspiJobTickJs() { const S = globalThis.__wxScheduler; if (S.__jobTickArmed) return; S.__jobTickArmed = true; setTimeout(function () { S.__jobTickArmed = false; if (S.dead) return; var p = Module["_wxWasmJobTick"](); Promise.resolve(p).catch(function (e) { if (Module["_wx_dispatch_abandon"]) Module["_wx_dispatch_abandon"](); S.resolveTopWait('nested', 0); S.resolveTopWait('modal', 5101); console.warn("[wx-scheduler] job tick error: " + e); }); }, 0); }
wxWasmArmJspiJobTickJs.sig = 'v';
function js_isFontAccessAPIAvailable() { return typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function'; }
function js_enumerateFontsStart(token,fontNames,maxFonts,fixedWidthOnly) { const finish = (v) => globalThis.__wxScheduler.resolveWait(token, v); if (typeof window === 'undefined' || typeof window.queryLocalFonts !== 'function') { console.warn('[wxFontEnumerator] Local Font Access API not available'); Promise.resolve().then(() => finish(-1)); return; } const timeoutMs = 5000; const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error('Font enumeration timed out')), timeoutMs); }); Promise.race([ window.queryLocalFonts(), timeoutPromise ]).then((fonts) => { const familySet = new Set(); for (const font of fonts) { familySet.add(font.family); } const families = Array.from(familySet).sort(); const count = Math.min(families.length, maxFonts); for (let i = 0; i < count; i++) { const name = families[i]; const len = lengthBytesUTF8(name) + 1; const ptr = _malloc(len); if (ptr === 0) { console.error('[wxFontEnumerator] Failed to allocate memory for font name'); for (let j = 0; j < i; j++) { _free(HEAPU32[fontNames/4 + j]); } return finish(-1); } stringToUTF8(name, ptr, len); HEAPU32[fontNames/4 + i] = ptr; } finish(count); }).catch((err) => { if (err.name === 'NotAllowedError') { console.warn('[wxFontEnumerator] Font access permission denied'); } else if (err.message && err.message.includes('timed out')) { console.warn('[wxFontEnumerator] Font enumeration timed out'); } else { console.error('[wxFontEnumerator] Font enumeration error: ' + err.message); } finish(-1); }); }
function __asyncjs__wxDomPopupMenuModal(json,invokerDomId,x,y) { return Asyncify.handleAsync(async () => { return await globalThis.__wxScheduler.promiseYield( Module['wxShowContextMenu'](UTF8ToString(json), invokerDomId, x, y), 'popup'); }); }
__asyncjs__wxDomPopupMenuModal.sig = 'iiiii';

// Imports from the Wasm binary.
var _free = makeInvalidEarlyAccess('_free');
var _main = Module['_main'] = makeInvalidEarlyAccess('_main');
var _aven_open_files = Module['_aven_open_files'] = makeInvalidEarlyAccess('_aven_open_files');
var _strerror = makeInvalidEarlyAccess('_strerror');
var _malloc = makeInvalidEarlyAccess('_malloc');
var _OnDragEnter = Module['_OnDragEnter'] = makeInvalidEarlyAccess('_OnDragEnter');
var _OnDragLeave = Module['_OnDragLeave'] = makeInvalidEarlyAccess('_OnDragLeave');
var _OnFileDropped = Module['_OnFileDropped'] = makeInvalidEarlyAccess('_OnFileDropped');
var _wxWasmMailboxTick = Module['_wxWasmMailboxTick'] = makeInvalidEarlyAccess('_wxWasmMailboxTick');
var _wxWasmIdlePassCount = Module['_wxWasmIdlePassCount'] = makeInvalidEarlyAccess('_wxWasmIdlePassCount');
var _wx_dispatch_abandon = Module['_wx_dispatch_abandon'] = makeInvalidEarlyAccess('_wx_dispatch_abandon');
var _ProcessEvents = Module['_ProcessEvents'] = makeInvalidEarlyAccess('_ProcessEvents');
var _wxWasmTopLevelTick = Module['_wxWasmTopLevelTick'] = makeInvalidEarlyAccess('_wxWasmTopLevelTick');
var _wxWasmJobTick = Module['_wxWasmJobTick'] = makeInvalidEarlyAccess('_wxWasmJobTick');
var _wx_window_move = Module['_wx_window_move'] = makeInvalidEarlyAccess('_wx_window_move');
var _wx_window_close = Module['_wx_window_close'] = makeInvalidEarlyAccess('_wx_window_close');
var _wx_window_resize = Module['_wx_window_resize'] = makeInvalidEarlyAccess('_wx_window_resize');
var _wx_dom_event = Module['_wx_dom_event'] = makeInvalidEarlyAccess('_wx_dom_event');
var _wx_dom_mouse = Module['_wx_dom_mouse'] = makeInvalidEarlyAccess('_wx_dom_mouse');
var _fflush = makeInvalidEarlyAccess('_fflush');
var _emscripten_stack_get_end = makeInvalidEarlyAccess('_emscripten_stack_get_end');
var _emscripten_stack_get_base = makeInvalidEarlyAccess('_emscripten_stack_get_base');
var _htons = makeInvalidEarlyAccess('_htons');
var _emscripten_builtin_memalign = makeInvalidEarlyAccess('_emscripten_builtin_memalign');
var ___trap = makeInvalidEarlyAccess('___trap');
var _emscripten_stack_init = makeInvalidEarlyAccess('_emscripten_stack_init');
var _emscripten_stack_get_free = makeInvalidEarlyAccess('_emscripten_stack_get_free');
var __emscripten_stack_restore = makeInvalidEarlyAccess('__emscripten_stack_restore');
var __emscripten_stack_alloc = makeInvalidEarlyAccess('__emscripten_stack_alloc');
var _emscripten_stack_get_current = makeInvalidEarlyAccess('_emscripten_stack_get_current');
var ___cxa_decrement_exception_refcount = makeInvalidEarlyAccess('___cxa_decrement_exception_refcount');
var ___cxa_increment_exception_refcount = makeInvalidEarlyAccess('___cxa_increment_exception_refcount');
var ___thrown_object_from_unwind_exception = makeInvalidEarlyAccess('___thrown_object_from_unwind_exception');
var ___get_exception_message = makeInvalidEarlyAccess('___get_exception_message');
var memory = makeInvalidEarlyAccess('memory');
var __indirect_function_table = makeInvalidEarlyAccess('__indirect_function_table');
var ___cpp_exception = makeInvalidEarlyAccess('___cpp_exception');
var wasmMemory = makeInvalidEarlyAccess('wasmMemory');
var wasmTable = makeInvalidEarlyAccess('wasmTable');

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports['free'] != 'undefined', 'missing Wasm export: free');
  assert(typeof wasmExports['__main_argc_argv'] != 'undefined', 'missing Wasm export: __main_argc_argv');
  assert(typeof wasmExports['aven_open_files'] != 'undefined', 'missing Wasm export: aven_open_files');
  assert(typeof wasmExports['strerror'] != 'undefined', 'missing Wasm export: strerror');
  assert(typeof wasmExports['malloc'] != 'undefined', 'missing Wasm export: malloc');
  assert(typeof wasmExports['OnDragEnter'] != 'undefined', 'missing Wasm export: OnDragEnter');
  assert(typeof wasmExports['OnDragLeave'] != 'undefined', 'missing Wasm export: OnDragLeave');
  assert(typeof wasmExports['OnFileDropped'] != 'undefined', 'missing Wasm export: OnFileDropped');
  assert(typeof wasmExports['wxWasmMailboxTick'] != 'undefined', 'missing Wasm export: wxWasmMailboxTick');
  assert(typeof wasmExports['wxWasmIdlePassCount'] != 'undefined', 'missing Wasm export: wxWasmIdlePassCount');
  assert(typeof wasmExports['wx_dispatch_abandon'] != 'undefined', 'missing Wasm export: wx_dispatch_abandon');
  assert(typeof wasmExports['ProcessEvents'] != 'undefined', 'missing Wasm export: ProcessEvents');
  assert(typeof wasmExports['wxWasmTopLevelTick'] != 'undefined', 'missing Wasm export: wxWasmTopLevelTick');
  assert(typeof wasmExports['wxWasmJobTick'] != 'undefined', 'missing Wasm export: wxWasmJobTick');
  assert(typeof wasmExports['wx_window_move'] != 'undefined', 'missing Wasm export: wx_window_move');
  assert(typeof wasmExports['wx_window_close'] != 'undefined', 'missing Wasm export: wx_window_close');
  assert(typeof wasmExports['wx_window_resize'] != 'undefined', 'missing Wasm export: wx_window_resize');
  assert(typeof wasmExports['wx_dom_event'] != 'undefined', 'missing Wasm export: wx_dom_event');
  assert(typeof wasmExports['wx_dom_mouse'] != 'undefined', 'missing Wasm export: wx_dom_mouse');
  assert(typeof wasmExports['fflush'] != 'undefined', 'missing Wasm export: fflush');
  assert(typeof wasmExports['emscripten_stack_get_end'] != 'undefined', 'missing Wasm export: emscripten_stack_get_end');
  assert(typeof wasmExports['emscripten_stack_get_base'] != 'undefined', 'missing Wasm export: emscripten_stack_get_base');
  assert(typeof wasmExports['htons'] != 'undefined', 'missing Wasm export: htons');
  assert(typeof wasmExports['emscripten_builtin_memalign'] != 'undefined', 'missing Wasm export: emscripten_builtin_memalign');
  assert(typeof wasmExports['__trap'] != 'undefined', 'missing Wasm export: __trap');
  assert(typeof wasmExports['emscripten_stack_init'] != 'undefined', 'missing Wasm export: emscripten_stack_init');
  assert(typeof wasmExports['emscripten_stack_get_free'] != 'undefined', 'missing Wasm export: emscripten_stack_get_free');
  assert(typeof wasmExports['_emscripten_stack_restore'] != 'undefined', 'missing Wasm export: _emscripten_stack_restore');
  assert(typeof wasmExports['_emscripten_stack_alloc'] != 'undefined', 'missing Wasm export: _emscripten_stack_alloc');
  assert(typeof wasmExports['emscripten_stack_get_current'] != 'undefined', 'missing Wasm export: emscripten_stack_get_current');
  assert(typeof wasmExports['__cxa_decrement_exception_refcount'] != 'undefined', 'missing Wasm export: __cxa_decrement_exception_refcount');
  assert(typeof wasmExports['__cxa_increment_exception_refcount'] != 'undefined', 'missing Wasm export: __cxa_increment_exception_refcount');
  assert(typeof wasmExports['__thrown_object_from_unwind_exception'] != 'undefined', 'missing Wasm export: __thrown_object_from_unwind_exception');
  assert(typeof wasmExports['__get_exception_message'] != 'undefined', 'missing Wasm export: __get_exception_message');
  assert(typeof wasmExports['memory'] != 'undefined', 'missing Wasm export: memory');
  assert(typeof wasmExports['__indirect_function_table'] != 'undefined', 'missing Wasm export: __indirect_function_table');
  assert(typeof wasmExports['__cpp_exception'] != 'undefined', 'missing Wasm export: __cpp_exception');
  _free = createExportWrapper('free', wasmExports['free'], 1);
  _main = Module['_main'] = createExportWrapper('__main_argc_argv', wasmExports['__main_argc_argv'], 2);
  _aven_open_files = Module['_aven_open_files'] = createExportWrapper('aven_open_files', wasmExports['aven_open_files'], 2);
  _strerror = createExportWrapper('strerror', wasmExports['strerror'], 1);
  _malloc = createExportWrapper('malloc', wasmExports['malloc'], 1);
  _OnDragEnter = Module['_OnDragEnter'] = createExportWrapper('OnDragEnter', wasmExports['OnDragEnter'], 2);
  _OnDragLeave = Module['_OnDragLeave'] = createExportWrapper('OnDragLeave', wasmExports['OnDragLeave'], 0);
  _OnFileDropped = Module['_OnFileDropped'] = createExportWrapper('OnFileDropped', wasmExports['OnFileDropped'], 3);
  _wxWasmMailboxTick = Module['_wxWasmMailboxTick'] = createExportWrapper('wxWasmMailboxTick', wasmExports['wxWasmMailboxTick'], 0);
  _wxWasmIdlePassCount = Module['_wxWasmIdlePassCount'] = createExportWrapper('wxWasmIdlePassCount', wasmExports['wxWasmIdlePassCount'], 0);
  _wx_dispatch_abandon = Module['_wx_dispatch_abandon'] = createExportWrapper('wx_dispatch_abandon', wasmExports['wx_dispatch_abandon'], 0);
  _ProcessEvents = Module['_ProcessEvents'] = createExportWrapper('ProcessEvents', wasmExports['ProcessEvents'], 0);
  _wxWasmTopLevelTick = Module['_wxWasmTopLevelTick'] = createExportWrapper('wxWasmTopLevelTick', wasmExports['wxWasmTopLevelTick'], 0);
  _wxWasmJobTick = Module['_wxWasmJobTick'] = createExportWrapper('wxWasmJobTick', wasmExports['wxWasmJobTick'], 0);
  _wx_window_move = Module['_wx_window_move'] = createExportWrapper('wx_window_move', wasmExports['wx_window_move'], 3);
  _wx_window_close = Module['_wx_window_close'] = createExportWrapper('wx_window_close', wasmExports['wx_window_close'], 1);
  _wx_window_resize = Module['_wx_window_resize'] = createExportWrapper('wx_window_resize', wasmExports['wx_window_resize'], 5);
  _wx_dom_event = Module['_wx_dom_event'] = createExportWrapper('wx_dom_event', wasmExports['wx_dom_event'], 2);
  _wx_dom_mouse = Module['_wx_dom_mouse'] = createExportWrapper('wx_dom_mouse', wasmExports['wx_dom_mouse'], 9);
  _fflush = createExportWrapper('fflush', wasmExports['fflush'], 1);
  _emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'];
  _emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'];
  _htons = createExportWrapper('htons', wasmExports['htons'], 1);
  _emscripten_builtin_memalign = createExportWrapper('emscripten_builtin_memalign', wasmExports['emscripten_builtin_memalign'], 2);
  ___trap = wasmExports['__trap'];
  _emscripten_stack_init = wasmExports['emscripten_stack_init'];
  _emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'];
  __emscripten_stack_restore = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'];
  _emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'];
  ___cxa_decrement_exception_refcount = createExportWrapper('__cxa_decrement_exception_refcount', wasmExports['__cxa_decrement_exception_refcount'], 1);
  ___cxa_increment_exception_refcount = createExportWrapper('__cxa_increment_exception_refcount', wasmExports['__cxa_increment_exception_refcount'], 1);
  ___thrown_object_from_unwind_exception = createExportWrapper('__thrown_object_from_unwind_exception', wasmExports['__thrown_object_from_unwind_exception'], 1);
  ___get_exception_message = createExportWrapper('__get_exception_message', wasmExports['__get_exception_message'], 3);
  memory = wasmMemory = wasmExports['memory'];
  __indirect_function_table = wasmTable = wasmExports['__indirect_function_table'];
  ___cpp_exception = wasmExports['__cpp_exception'];
}

var wasmImports = {
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  __asyncjs__wxDomPopupMenuModal,
  /** @export */
  __asyncjs__wxWasmYieldToBrowser,
  /** @export */
  __asyncjs__wxWasmYieldUntilJs,
  /** @export */
  __syscall_chdir: ___syscall_chdir,
  /** @export */
  __syscall_chmod: ___syscall_chmod,
  /** @export */
  __syscall_dup3: ___syscall_dup3,
  /** @export */
  __syscall_faccessat: ___syscall_faccessat,
  /** @export */
  __syscall_fchmod: ___syscall_fchmod,
  /** @export */
  __syscall_fchown32: ___syscall_fchown32,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_fstat64: ___syscall_fstat64,
  /** @export */
  __syscall_ftruncate64: ___syscall_ftruncate64,
  /** @export */
  __syscall_getcwd: ___syscall_getcwd,
  /** @export */
  __syscall_getdents64: ___syscall_getdents64,
  /** @export */
  __syscall_geteuid32: ___syscall_geteuid32,
  /** @export */
  __syscall_getuid32: ___syscall_getuid32,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_lstat64: ___syscall_lstat64,
  /** @export */
  __syscall_mkdirat: ___syscall_mkdirat,
  /** @export */
  __syscall_newfstatat: ___syscall_newfstatat,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  __syscall_pipe2: ___syscall_pipe2,
  /** @export */
  __syscall_poll: ___syscall_poll,
  /** @export */
  __syscall_readlinkat: ___syscall_readlinkat,
  /** @export */
  __syscall_renameat: ___syscall_renameat,
  /** @export */
  __syscall_rmdir: ___syscall_rmdir,
  /** @export */
  __syscall_stat64: ___syscall_stat64,
  /** @export */
  __syscall_umask: ___syscall_umask,
  /** @export */
  __syscall_unlinkat: ___syscall_unlinkat,
  /** @export */
  __syscall_utimensat: ___syscall_utimensat,
  /** @export */
  __throw_exception_with_stack_trace: ___throw_exception_with_stack_trace,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _gmtime_js: __gmtime_js,
  /** @export */
  _localtime_js: __localtime_js,
  /** @export */
  _mktime_js: __mktime_js,
  /** @export */
  _mmap_js: __mmap_js,
  /** @export */
  _munmap_js: __munmap_js,
  /** @export */
  _tzset_js: __tzset_js,
  /** @export */
  clock_time_get: _clock_time_get,
  /** @export */
  emscripten_asm_const_int: _emscripten_asm_const_int,
  /** @export */
  emscripten_asm_const_ptr: _emscripten_asm_const_ptr,
  /** @export */
  emscripten_date_now: _emscripten_date_now,
  /** @export */
  emscripten_err: _emscripten_err,
  /** @export */
  emscripten_get_device_pixel_ratio: _emscripten_get_device_pixel_ratio,
  /** @export */
  emscripten_get_fullscreen_status: _emscripten_get_fullscreen_status,
  /** @export */
  emscripten_get_heap_max: _emscripten_get_heap_max,
  /** @export */
  emscripten_get_now: _emscripten_get_now,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  emscripten_set_blur_callback_on_thread: _emscripten_set_blur_callback_on_thread,
  /** @export */
  emscripten_set_focus_callback_on_thread: _emscripten_set_focus_callback_on_thread,
  /** @export */
  emscripten_set_keydown_callback_on_thread: _emscripten_set_keydown_callback_on_thread,
  /** @export */
  emscripten_set_keypress_callback_on_thread: _emscripten_set_keypress_callback_on_thread,
  /** @export */
  emscripten_set_keyup_callback_on_thread: _emscripten_set_keyup_callback_on_thread,
  /** @export */
  emscripten_set_mousedown_callback_on_thread: _emscripten_set_mousedown_callback_on_thread,
  /** @export */
  emscripten_set_mouseenter_callback_on_thread: _emscripten_set_mouseenter_callback_on_thread,
  /** @export */
  emscripten_set_mouseleave_callback_on_thread: _emscripten_set_mouseleave_callback_on_thread,
  /** @export */
  emscripten_set_mousemove_callback_on_thread: _emscripten_set_mousemove_callback_on_thread,
  /** @export */
  emscripten_set_mouseup_callback_on_thread: _emscripten_set_mouseup_callback_on_thread,
  /** @export */
  emscripten_set_resize_callback_on_thread: _emscripten_set_resize_callback_on_thread,
  /** @export */
  emscripten_set_touchcancel_callback_on_thread: _emscripten_set_touchcancel_callback_on_thread,
  /** @export */
  emscripten_set_touchend_callback_on_thread: _emscripten_set_touchend_callback_on_thread,
  /** @export */
  emscripten_set_touchmove_callback_on_thread: _emscripten_set_touchmove_callback_on_thread,
  /** @export */
  emscripten_set_touchstart_callback_on_thread: _emscripten_set_touchstart_callback_on_thread,
  /** @export */
  emscripten_set_wheel_callback_on_thread: _emscripten_set_wheel_callback_on_thread,
  /** @export */
  emscripten_webgl_create_context: _emscripten_webgl_create_context,
  /** @export */
  emscripten_webgl_destroy_context: _emscripten_webgl_destroy_context,
  /** @export */
  emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  exit: _exit,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_fdstat_get: _fd_fdstat_get,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_sync: _fd_sync,
  /** @export */
  fd_write: _fd_write,
  /** @export */
  glActiveTexture: _glActiveTexture,
  /** @export */
  glAttachShader: _glAttachShader,
  /** @export */
  glBindBuffer: _glBindBuffer,
  /** @export */
  glBindTexture: _glBindTexture,
  /** @export */
  glBindVertexArray: _glBindVertexArray,
  /** @export */
  glBlendFunc: _glBlendFunc,
  /** @export */
  glBufferData: _glBufferData,
  /** @export */
  glClear: _glClear,
  /** @export */
  glClearColor: _glClearColor,
  /** @export */
  glColorMask: _glColorMask,
  /** @export */
  glCompileShader: _glCompileShader,
  /** @export */
  glCreateProgram: _glCreateProgram,
  /** @export */
  glCreateShader: _glCreateShader,
  /** @export */
  glDeleteShader: _glDeleteShader,
  /** @export */
  glDepthFunc: _glDepthFunc,
  /** @export */
  glDepthMask: _glDepthMask,
  /** @export */
  glDisable: _glDisable,
  /** @export */
  glDrawArrays: _glDrawArrays,
  /** @export */
  glEnable: _glEnable,
  /** @export */
  glEnableVertexAttribArray: _glEnableVertexAttribArray,
  /** @export */
  glFlush: _glFlush,
  /** @export */
  glGenBuffers: _glGenBuffers,
  /** @export */
  glGenTextures: _glGenTextures,
  /** @export */
  glGenVertexArrays: _glGenVertexArrays,
  /** @export */
  glGenerateMipmap: _glGenerateMipmap,
  /** @export */
  glGetError: _glGetError,
  /** @export */
  glGetFloatv: _glGetFloatv,
  /** @export */
  glGetIntegerv: _glGetIntegerv,
  /** @export */
  glGetProgramInfoLog: _glGetProgramInfoLog,
  /** @export */
  glGetProgramiv: _glGetProgramiv,
  /** @export */
  glGetShaderInfoLog: _glGetShaderInfoLog,
  /** @export */
  glGetShaderiv: _glGetShaderiv,
  /** @export */
  glGetString: _glGetString,
  /** @export */
  glGetUniformLocation: _glGetUniformLocation,
  /** @export */
  glHint: _glHint,
  /** @export */
  glLinkProgram: _glLinkProgram,
  /** @export */
  glPixelStorei: _glPixelStorei,
  /** @export */
  glPolygonOffset: _glPolygonOffset,
  /** @export */
  glReadBuffer: _glReadBuffer,
  /** @export */
  glReadPixels: _glReadPixels,
  /** @export */
  glShaderSource: _glShaderSource,
  /** @export */
  glTexImage2D: _glTexImage2D,
  /** @export */
  glTexParameteri: _glTexParameteri,
  /** @export */
  glUniform1f: _glUniform1f,
  /** @export */
  glUniform1i: _glUniform1i,
  /** @export */
  glUniform1ui: _glUniform1ui,
  /** @export */
  glUniform4fv: _glUniform4fv,
  /** @export */
  glUniformMatrix3fv: _glUniformMatrix3fv,
  /** @export */
  glUniformMatrix4fv: _glUniformMatrix4fv,
  /** @export */
  glUseProgram: _glUseProgram,
  /** @export */
  glVertexAttribPointer: _glVertexAttribPointer,
  /** @export */
  glViewport: _glViewport,
  /** @export */
  js_clearClipboardStart,
  /** @export */
  js_isClipboardAPIAvailable,
  /** @export */
  js_readTextFromClipboardStart,
  /** @export */
  js_writeTextToClipboardStart,
  /** @export */
  proc_exit: _proc_exit,
  /** @export */
  wxWasmArmJspiJobTickJs,
  /** @export */
  wxWasmBeginWaitJs,
  /** @export */
  wxWasmExitNestedLoop,
  /** @export */
  wxWasmInstallEscapeGuard,
  /** @export */
  wxWasmMailboxJsEnabled,
  /** @export */
  wxWasmMailboxJsEnqueue,
  /** @export */
  wxWasmMailboxJsPending,
  /** @export */
  wxWasmMailboxJsPop,
  /** @export */
  wxWasmOnPromisingActivationJs,
  /** @export */
  wxWasmRemoveEscapeGuard,
  /** @export */
  wxWasmResolveTopWaitJs,
  /** @export */
  wxWasmScheduleProcessEvents,
  /** @export */
  wxWasmTakeWaitResultJs,
  /** @export */
  wxWasmWaitEarlyResolvedJs
};


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var calledRun;

async function callMain(args = []) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  args.unshift(thisProgram);

  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  for (var arg of args) {
    HEAPU32[((argv_ptr)>>2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  }
  HEAPU32[((argv_ptr)>>2)] = 0;

  try {

    var ret = entryFunction(argc, argv);

    // The current spec of JSPI returns a promise only if the function suspends
    // and a plain value otherwise. This will likely change:
    // https://github.com/WebAssembly/js-promise-integration/issues/11
    ret = await ret;
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

async function run(args = programArgs) {
  assert(!calledRun);
  calledRun = true;

  stackCheckInit();

  preRun();

  if (runDependencies) {
    await resolveRunDependencies();
  }

  var setStatus = Module['setStatus'];
  if (setStatus) {
    setStatus('Running...');
    // Yield to the event loop to allow the browser to paint "Running..."
    await new Promise((resolve) => setTimeout(resolve, 1));
    // Then we want to clear the status text, but only after the rest of this function runs.
    setTimeout(setStatus, 1, '');
  }

  if (ABORT) return;

  initRuntime();

  // No ATMAINS hooks

  Module['onRuntimeInitialized']?.();
  consumedModuleProp('onRuntimeInitialized');

  var noInitialRun = Module['noInitialRun'] || false;
  if (!noInitialRun) await callMain(args);

  postRun();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    for (var name of ['stdout', 'stderr']) {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty?.output?.length) {
        has = true;
      }
    }
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

var wasmExports;

// With async instantation wasmExports is assigned asynchronously when the
// instance is received.
createWasm().then(() => run());

// end include: postamble.js

