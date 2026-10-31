# Praktyczny test Aven + wxWidgets + Emscripten

Data: 2026-10-31. **Wynik: biblioteki i wszystkie 33 jednostki kompilacji Aven zbudowano do WASM, ale kompletnej aplikacji nie uzyskano. Ścisłe linkowanie zatrzymało się na 21 brakujących funkcjach OpenGL/GLU.** Sam fork wxWidgets działa w przetestowanej przeglądarce z prawdziwym WebGL2 i interakcją.

To wynik wykonanych kompilacji i prób, nie dalsza analiza dokumentacji. Diagnostyczna aplikacja wx nie jest Aven i nie wyświetla modelu jaskini. Nie zastosowano atrap GL ani transformacji, nie wyłączono kontroli niezdefiniowanych symboli.

## Sprawdzony stos

| Komponent | Wersja / przypięcie |
| --- | --- |
| Survex / Aven | 1.4.24, `25aa2cf2eb99899b7a5f2a38aaae6fb6959e6174` |
| PCBJam/wxWidgets | `wasm-port`, `01b74ea19a09968277f59475f8919f2d2a4ff00e` |
| PCBJam scheduler JSPI | `46652150aef774bb5565739f6e716b983d12df17` |
| Emscripten | 6.0.6, SDK release `833aa203ba2283fc2b6adb504a79a3a0d692df81` |
| PROJ / SQLite | 9.7.0 / 3.49.1, rzeczywiste biblioteki WASM i `proj.db` |
| Narzędzia bootstrap | Autoconf 2.72, Automake 1.17, zbudowane lokalnie |
| Host / przeglądarka | macOS arm64 / Chromium 156.0.0.0 |

Biblioteki używają native WASM exceptions, `SUPPORT_LONGJMP=wasm` i `WASM_LEGACY_EXCEPTIONS=1`. Runtime GUI używa JSPI oraz `wx.js`, `wx-dom.js` i schedulera PCBJam. Nie instalowano nic globalnie. Docker nie został użyty; narzędzia i buildy są w `/private/tmp/aven-wasm-spike` (około 2,8 GB po próbie).

## Co faktycznie przeszło

| Próba | Wynik | Granica dowodu |
| --- | --- | --- |
| Budowanie forka wxWidgets | Konfiguracja, PCRE i biblioteki: exit 0 | Dla przypiętego forka i ustawień tej próby |
| Kompilacja Aven | Wszystkie 33 obiekty `aven-*.o` powstały | To nie jest działająca aplikacja; końcowy link nie przeszedł |
| Ścisły link Aven | **FAIL, exit 1: 21 unikatowych brakujących symboli GL/GLU** | Główna przeszkoda dla niezmienionego renderera |
| PROJ/SQLite WASM | Build i uruchomienie w Node: PASS | Jedna transformacja EPSG:4326 ↔ EPSG:2180, nie pełna macierz CRS |
| Diagnostyczne wxFrame + wxTreeCtrl + wxGLCanvas | Build i ścisły link: exit 0; uruchomienie w przeglądarce: PASS | Osobny program z trójkątem shader/VBO, bez kodu Aven |
| Zmiana elementu drzewa | Rzeczywisty klik zmienił etykietę oraz kolor pikseli WebGL; powrót przywrócił kolor | Dowód dostarczenia zdarzenia do C++ i ponownego rysowania |
| Zmiana rozmiaru | Canvas z 916×726 do 676×564, kolejna klatka, GL error 0 | Jedna przeglądarka i dwa rozmiary, nie test urządzeń mobilnych |
| Modele kontrolne i DEM | Native cavern/dump3d, geometria i ZIP: PASS | **Nie otwarto ich w przeglądarkowym Aven** |

W teście wx środkowy piksel zmienił się z `[98,121,136,255]` na `[98,67,34,255]` i wrócił do wartości początkowej. Wszystkie cztery zapisane klatki miały `glGetError() == 0`. Jedyny błąd konsoli to brak nieużywanej ikony `favicon.ico` (HTTP 404). [Dane testu przeglądarkowego](../tests/wasm-spike/evidence/browser-results.json), [konsola](../tests/wasm-spike/evidence/browser-console.log), [zrzut po weryfikacji](../tests/wasm-spike/evidence/wx-smoke-verified.png).

PROJ WASM odczytał prawdziwą bazę CRS: lon=20°, lat=50° → E=571644.938966461 m, N=237447.417271959 m; odwrotna transformacja dała 20°/50°. Wynik porównano z natywnym PROJ z tolerancją <1 mm, odwrotny <1e-9°. Baza przeszła `PRAGMA quick_check`. [Log](../tests/wasm-spike/evidence/proj-smoke-run.log).

## Co zatrzymało Aven

Końcowy link wszystkich obiektów Aven z rzeczywistymi bibliotekami wx/PROJ używał `LEGACY_GL_EMULATION=1`, `MAX_WEBGL_VERSION=2`, `ERROR_ON_UNDEFINED_SYMBOLS=1` i nieograniczonej listy błędów linkera. Nadal brakowało:

| Obszar | Brakujące funkcje |
| --- | --- |
| Listy wyświetlania | `glGenLists`, `glNewList`, `glEndList`, `glCallList`, `glDeleteLists`, `glListBase`, `glCallLists` |
| Fonty i pozycja rastra | `glBitmap`, `glRasterPos2d` |
| Stan starego OpenGL | `glGetDoublev`, `glPushAttrib`, `glPopAttrib`, `glColorMaterial`, `glMaterialf`, `glLineStipple`, `glVertex3d` |
| Narzędzia GLU | `gluNewQuadric`, `gluDeleteQuadric`, `gluDisk`, `gluPartialDisk`, `gluBuild2DMipmaps` |

Błędy pochodzą z `aven-gla-gl.o` oraz `aven-glbitmapfont.o`. Osobny minimalny program wywołujący kluczowe funkcje Aven również nie przeszedł ścisłego linku. Dodatkowo źródło Emscripten oznacza `glPolygonMode` jako pustą implementację TODO: nawet usunięcie błędów linkowania nie dowodzi zgodności obrazu. [Pełny log linkowania](../tests/wasm-spike/evidence/aven-link-strict.log), [zestawienie](../tests/wasm-spike/evidence/aven-link-summary.json), [mała próba GL](../tests/wasm-spike/evidence/gl-capabilities.log), [Emscripten 6.0.6](https://github.com/emscripten-core/emscripten/blob/6.0.6/src/lib/libglemu.js).

## Adaptacje i ograniczenia konfiguracji

- W `configure.ac` dodano jawne `--without-gdal`, zachowując istniejące ścieżki Aven bez GDAL, oraz poprawiono obsługę wyniku `none required` przy szukaniu GL/GLU. **W tej próbie nie ma nakładek GDAL, SHP ani FFmpeg.** Nie jest to konfiguracja pełnej funkcjonalności.
- W wx zaktualizowano pomocnicze `config.sub` dołączonych PCRE/Expat, aby rozpoznawały Emscripten; dodano aliasy nazw zbudowanych archiwów, których oczekuje `wx-config`.
- `wx-config` wykrył natywną bibliotekę X11 `-lSM`; przy linkowaniu ją odfiltrowano. Odfiltrowano też `-pthread` z końcowego linku GUI zgodnie z receptą testowego programu działającego na głównym wątku DOM. Nie uruchamiano go przez `PROXY_TO_PTHREAD`.
- Bootstrap pochodzi z bieżącego checkoutu. Font i wygenerowane nagłówki/komunikaty pobrano z oficjalnego archiwum Survex 1.4.24. Pliki `.cc`/`.c` Aven nie zostały przepisane ani zastąpione.
- PROJ zbudowano bez TIFF/CURL, więc wynik nie potwierdza wszystkich siatek transformacji ani pobierania sieciowego. Moduł korzystał z własnej bazy `proj.db`.
- Pierwszy link przez `make` trafił na brak aliasu biblioteki wx; usunięto tę przeszkodę i wykonano opisany wyżej właściwy link. Nie klasyfikowano błędu aliasu jako ograniczenia Aven.

Nie sprawdzono: jaskini/LRUD/terenu w Aven WWW, natywnego UI Aven po uruchomieniu, pomiarów i filtrów Aven, obliczania źródeł `cavern`, `extend`, eksportów, druku, filmów, wydajności dużych modeli, Safari ani Firefox. Sukces programu diagnostycznego nie jest sukcesem tych funkcji.

## Dane i powtórzenie

Przygotowano rzeczywisty przykład Nordalpenschacht z oficjalnego pakietu Survex, bundled `passage` do LRUD oraz osobny, jawnie syntetyczny model EPSG:2180 i DEM BIL/HDR 65×65. Pochodzenie, ostrzeżenia historycznej składni i liczniki znajdują się w [opisie fixture](../tests/wasm-spike/fixtures/README.md). Dane pomiarowe nie zostały skorygowane.

[Katalog eksperymentu](../tests/wasm-spike/README.md) zachowuje użyte skrypty, źródło programu diagnostycznego, przypięcia, logi i zrzut. To materiał badawczy poza główną gałęzią, nie wdrożenie portu. Wygenerowane biblioteki/SDK/HTML/WASM pozostają w scratch; skrypty zakładają opisane lokalne środowisko i przygotowane zależności.

## Wniosek po wykonaniu próby

**Nie jest to gotowy port uzyskiwany samą zmianą kompilatora. Jednocześnie nie ma podstaw, aby odrzucać zachowanie GUI wxWidgets.** Toolkit działa w przeglądarce, źródła Aven kompilują się, a obecna blokada jest skoncentrowana w backendzie graficznym.

Rekomendowany następny eksperyment: zachować GUI i model Aven, zastąpić listy wyświetlania oraz rysowanie fontów backendem zgodnym z WebGL2, a następnie doprowadzić do otwarcia tych samych `.3d` i DEM. To odrębna praca implementacyjna; w tej próbie jej nie wykonano. Alternatywą jest pełna warstwa zgodności starego GL, ale samo dostarczenie pustych funkcji ukryłoby problem i nie zachowałoby funkcjonalności.
