'use strict';
// The packager supplies a relative, content-addressed app URL.
const appURL = 'app/4a250868147388f8b85d/aven.html';
const frame = document.getElementById('aven');
const loading = document.getElementById('loading');
const progress = document.getElementById('progress');
const failure = document.getElementById('failure');
const openButton = document.getElementById('open-files');
const restoreButton = document.getElementById('restore');
const input = document.getElementById('local-files');
const status = document.getElementById('file-status');
let poll, deadline, uploadNumber = 0;

function showFailure(message) {
  clearInterval(poll);
  clearTimeout(deadline);
  loading.hidden = false;
  progress.textContent = 'Nie udało się uruchomić widoku.';
  failure.textContent = message;
  failure.hidden = false;
}

function start() {
  loading.hidden = false;
  failure.hidden = true;
  progress.textContent = 'Pobieranie modelu i terenu…';
  status.textContent = '';
  openButton.disabled = restoreButton.disabled = true;
  clearInterval(poll);
  clearTimeout(deadline);
  frame.src = appURL;
  deadline = setTimeout(() => showFailure('Uruchamianie trwa zbyt długo. Sprawdź połączenie i odśwież stronę.'), 300000);
  poll = setInterval(() => {
    const win = frame.contentWindow, module = win?.Module;
    if (module?.avenRendered) {
      clearInterval(poll);
      clearTimeout(deadline);
      loading.hidden = true;
      openButton.disabled = restoreButton.disabled = false;
      return;
    }
    const element = win?.document.getElementById('progress-text');
    if (element?.style.color === 'red') {
      showFailure(element.textContent);
      return;
    }
    const text = element?.textContent;
    if (text && !/complete|Running/.test(text)) progress.textContent = text;
  }, 150);
}

frame.addEventListener('load', () => {
  if (!frame.contentWindow.Module) {
    showFailure('Nie udało się pobrać aplikacji. Odśwież stronę, aby spróbować ponownie.');
    return;
  }
  frame.contentWindow.addEventListener('error', e => showFailure(e.message));
  frame.contentWindow.addEventListener('unhandledrejection', e => showFailure(String(e.reason)));
});
restoreButton.addEventListener('click', start);
openButton.addEventListener('click', () => input.click());
input.addEventListener('change', async () => {
  const files = Array.from(input.files);
  if (!files.length) return;
  openButton.disabled = restoreButton.disabled = true;
  try {
    const surveys = files.filter(f => /\.3d$/i.test(f.name));
    const terrain = files.filter(f => /\.(hgt|zip)$/i.test(f.name));
    if (surveys.length > 1 || terrain.length > 1 || surveys.length + terrain.length !== files.length) {
      throw new Error('Wybierz jeden plik .3d i opcjonalnie jeden DEM (.hgt lub .zip z HGT/BIL). Możesz też wybrać sam DEM.');
    }
    const module = frame.contentWindow.Module;
    if (!module?.avenReady) throw new Error('Poczekaj na uruchomienie Aven.');
    status.textContent = 'Otwieranie plików lokalnych…';
    const dir = '/uploads/' + (++uploadNumber);
    module.FS.mkdirTree(dir);
    for (const file of files) {
      // Browser File names are basenames; reject path separators explicitly.
      if (/[\\/]/.test(file.name)) throw new Error('Nieprawidłowa nazwa pliku.');
      module.FS.writeFile(dir + '/' + file.name, new Uint8Array(await file.arrayBuffer()));
    }
    const path = file => file ? dir + '/' + file.name : '';
    const opened = await module.ccall('aven_open_files', 'number', ['string','string'],
      [path(surveys[0]), path(terrain[0])], {async:true});
    if (!opened) throw new Error('Aven nie otworzył pliku. Sprawdź komunikat w oknie programu.');
    status.textContent = files.map(f => f.name).join(' + ') + ' — otwarte lokalnie; pliki nie są wysyłane.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    input.value = '';
    openButton.disabled = restoreButton.disabled = false;
  }
});

if (typeof WebAssembly === 'undefined' || typeof WebAssembly.Suspending !== 'function' || typeof WebAssembly.promising !== 'function') {
  showFailure('Ta przeglądarka nie obsługuje wymaganego mechanizmu WebAssembly. Wypróbuj aktualne Chrome lub Edge.');
} else {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) showFailure('WebGL2 jest niedostępny. Sprawdź obsługę grafiki w przeglądarce.');
  else { gl.getExtension('WEBGL_lose_context')?.loseContext(); start(); }
}
