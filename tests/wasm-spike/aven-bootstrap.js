// Runtime paths are MEMFS paths, independent of build-machine prefixes.
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
