// Runtime paths are MEMFS paths, independent of build-machine prefixes.
Module.preRun = Module.preRun || [];
Module.preRun.push(function () {
  ENV.SURVEXLIB = '/survex';
  ENV.SURVEXLANG = 'en';
  ENV.PROJ_DATA = '/proj';
});
// A URL selects a bundled test file; File > Open remains the Aven file dialog.
var fixture = new URLSearchParams(location.search).get('fixture') || 'real-nordalpenschacht-205';
if (!['real-nordalpenschacht-205', 'bundled-passage', 'synthetic-2180'].includes(fixture)) {
  throw new Error('Unknown Aven fixture: ' + fixture);
}
Module.arguments = ['/fixtures/' + fixture + '.3d'];
