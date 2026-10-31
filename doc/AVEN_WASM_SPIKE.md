# Praktyczny test Aven + wxWidgets + Emscripten

## Etap 2 — rzeczywiste Aven w WebGL2 (2026-10-31)

**Cel eksperymentu osiągnięty:** rzeczywiste Aven otwiera `.3d`, rysuje jaskinię i etykiety, obsługuje drzewo oraz nawigację myszą, wyświetla LRUD i syntetyczny DEM. Test odbył się lokalnie w Chromium `156.0.8078.74`. To nadal eksperyment, z widocznymi ograniczeniami forka wx opisanymi poniżej; nie pełny port produkcyjny.

Baza tej kontynuacji: `164eb2c54efac39c7c3a30b792bc9cbbbeb35204` (poprzedni eksperyment), gałąź `codex/aven-webgl2`. Zależności wx/Emscripten/PROJ WASM są przypięte jak w etapie 1. Powstały **34 obiekty Aven** i komplet `aven.html/js/wasm/data`. Link używa `MIN_WEBGL_VERSION=2`, `MAX_WEBGL_VERSION=2` i `ERROR_ON_UNDEFINED_SYMBOLS=1`; **nie używa `LEGACY_GL_EMULATION`**. Nie ma atrap funkcji graficznych ani wyłączonej kontroli symboli. Zmiany nie zostały opublikowane, wypchnięte ani scalone.

### Wybór i zakres zmiany

Rozważono uzupełnienie 21 symboli nad emulacją Emscripten oraz osobny backend ograniczony do GLA Aven. Pierwsza droga pozostawiłaby m.in. pusty `glPolygonMode` i niepełne zachowanie innych operacji. Wybrano drugą: `aven-webgl.{h,cc}` mapuje wywołania wyłącznie w `gla-gl.cc` i `glbitmapfont.cc`, pod `__EMSCRIPTEN__`. Desktop nadal korzysta z natywnego OpenGL; model, wyliczanie LRUD, parser DEM i interfejs Aven pozostają wspólne. Takie ograniczenie zakresu odpowiada zaleceniu używania podzbioru zgodnego z WebGL w [dokumentacji Emscripten](https://emscripten.org/docs/porting/multimedia_and_graphics/OpenGL-support.html).

Backend zawiera:

- bufory wierzchołków i shadery GLSL ES 3.00; triangulację czworokątów, wielokątów i pasów; linie, punkty, tryb obrysu, kolory, normalne, światło, mgłę, kreskowanie i tekstury;
- listy przechowujące polecenia, z kopiowaniem danych bitmap/kolorów i odtwarzaniem dopiero podczas rysowania; zachowane unieważnianie list GLA;
- oryginalne bitmapy fontu Aven zamieniane na pikselowe czworokąty, z pozycją rastra, kolorem, clippingiem i przesunięciem znaków; etykiety nie są nakładką HTML;
- macierze CPU w `double` i projekcję/odwrotną projekcję dla wyboru stacji i przesuwania; trójkąty GLU dla wskaźników, generowanie mipmap;
- wygładzanie linii przez geometrię w ekranie, z przycięciem do sześciu płaszczyzn przed dzieleniem przez `w`.

Listy poleceń odtwarzają geometrię do bufora przy każdej klatce. Nie zmierzono wydajności dużych modeli. To ograniczony backend Aven, nie kompletna implementacja OpenGL. Opcjonalne tryby mają implementacje, lecz bez osobnych testów obrazu nie deklarujemy ich pełnej zgodności wizualnej.

### Wyniki rzeczywistych interakcji

[Odtwarzalny scenariusz Playwright](../tests/wasm-spike/browser-check.js) steruje menu i myszą; nie wywołuje metod rysowania ani ładowania przez testowe skróty. `AVEN_WEB_TEST` udostępnia tylko obserwacje z normalnego ładowania, renderowania i hit-testu. [Wyniki](../tests/wasm-spike/evidence/webgl2/browser-results.json), [pełna konsola](../tests/wasm-spike/evidence/webgl2/browser-console.log).

| Funkcja | Wynik i dowód |
| --- | --- |
| Rzeczywisty Nordalpenschacht `.3d` | PASS: 20 etykiet, 17 odcinków; parsowanie i widoczna geometria Aven |
| Nazwy stacji | PASS: przełączenie `View → Station Names`; widoczny oryginalny font |
| Obrót / pochylenie / przesuwanie | PASS: lewy / środkowy / prawy drag zmienia rzeczywistą kamerę |
| Przybliżanie i oddalanie | PASS: oba kierunki kółka; zmiany skali i klatek |
| Wybór stacji na modelu | PASS: klik wyliczonej pozycji `205.2.17` wybiera ten punkt i rozwija odpowiednią gałąź drzewa |
| Drzewo pomiarów | PASS: hierarchia i zaznaczenie; dwuklik w widoczny wiersz `205.2.16` zmienia wybraną stację |
| Zmiana pliku przez istniejące okno | PASS: `File → Open…` z prawdziwego przykładu do `bundled-passage.3d`, następnie `synthetic-2180.3d` |
| LRUD | PASS: bundled passage ma 14 przekrojów / 5 sekwencji; bryła widoczna i obracana. Syntetyczny model ma 7 przekrojów / 2 sekwencje |
| DEM przez istniejące okno | PASS: `File → Open Terrain… → /fixtures/synthetic-terrain.zip`, odczyt 65×65 i 8192 trójkąty |
| Zmiana rozmiaru | PASS: 1200×802 → 1000×720 → 1200×802, nowe klatki i wymiary kamery |
| Błędy | Końcowy scenariusz: **0 błędów JS/konsoli, 0 ostrzeżeń, 0 błędów adaptera i natywnego WebGL** |

Zrzuty: [jaskinia, nazwy i wybór](../tests/wasm-spike/evidence/webgl2/final-real-names-tree-selection.png), [aktywacja w drzewie](../tests/wasm-spike/evidence/webgl2/final-tree-activated.png), [LRUD](../tests/wasm-spike/evidence/webgl2/final-passage-lrud.png), [jaskinia pod DEM w elewacji](../tests/wasm-spike/evidence/webgl2/final-synthetic-dem-elevation.png), [mniejsze okno](../tests/wasm-spike/evidence/webgl2/final-resized.png).

### Wzajemne położenie jaskini i DEM

Weryfikacja korzysta z wierzchołków rzeczywiście przekształconych przez Aven/PROJ i przekazanych do geometrii terenu. Wszystkie **4225** porównano z niezależnym natywnym `cs2cs EPSG:4326 EPSG:2180` (PROJ 9.9.0). Maksymalna różnica XY: `1.87e-9 m`; Z: `0 m`. Sprawdzono również odejmowanie środka modelu dla wszystkich wierzchołków. Zachowano [surową obserwację](../tests/wasm-spike/evidence/webgl2/terrain-vertices.json.gz), [skrypt](../tests/wasm-spike/verify-browser-terrain.py) i [wynik](../tests/wasm-spike/evidence/webgl2/terrain-native-comparison.json).

| Punkt | E [m] | N [m] | Z [m] |
| --- | ---: | ---: | ---: |
| Środek DEM: 19.9°E, 49.25°N | 565478.1244262591 | 154000.0736753335 | 1510 |
| `synthetic.a` z `.3d` | 565478.12 | 154000.07 | 1500 |
| Różnica DEM − stacja | +0.0044262591 | +0.0036753335 | **+10** |

Wszystkie stacje mieszczą się pod centralnym plateau 1510 m. Odstępy pionowe: a/b/c/s = 10 m, d/e = 15 m, f = 22 m. To jawnie syntetyczne wysokości bez deklaracji rzeczywistego układu pionowego. Legenda kolorów na zrzucie jest legendą wysokości jaskini Aven.

### Usunięte przeszkody i pozostałe granice

Po przejściu linkowania naprawiono trzy konkretne problemy integracyjne, tylko dla WASM:

1. Fork uznaje pierwsze utworzone okno najwyższego poziomu za browser root. W Aven było nim ukryte okno logu: właściwy model wczytywał się, lecz canvas miał 20×20. Teraz najpierw powstaje główne okno, a potem zwykły log; początkowa geometria i układ są synchronizowane z viewportem.
2. `wxMenuItem::Enable/Check` zmienia stan C++, a DOM zachowuje poprzedni JSON. Po zmianie pliku menu LRUD pozostawało szare. `MainFrm::UpdateWindowUI` publikuje strukturę tylko po zmianie, zachowując normalne reguły dostępności.
3. `stderr` w shellu oznacza błąd konsoli także dla komunikatu wx `Debug: EndModal: 5100`. Log Aven przekazuje rzeczywisty poziom do odpowiedniej metody konsoli; błędy nie są filtrowane. Końcowy przebieg potwierdził brak błędów.

Nieprzetestowane: Safari/Firefox, dotyk i HiDPI, duże modele, utrata kontekstu, wszystkie CRS/siatki, Unicode spoza etykiet zestawu, pełny parytet opcjonalnego teksturowania/światła/mgły, eksport, druk, filmy, uruchamianie `cavern`/`extend` w WWW, import dowolnych lokalnych projektów. GDAL i FFmpeg pozostają poza buildem WASM. Picker przegląda MEMFS z przygotowanymi plikami; nie jest to jeszcze importer plików z dysku użytkownika.

Nadal widoczne ograniczenia UI: nakładanie pól wyszukiwania/Z na lewą część paska narzędzi; brak użytecznego paska statusu; Enter po zmianie wiersza drzewa strzałką nie aktywuje oczekiwanej stacji (dwuklik działa). Po dołączeniu DEM pierwsza zmiana zoomu może przeskoczyć skalę. Odtwarzalne kroki i przyczyny są w [znanych ograniczeniach](../tests/wasm-spike/KNOWN_LIMITATIONS.md). Te wady nie zostały ukryte ani zaliczone jako PASS.

### Kontrola desktopu i następny etap

Natywny Aven zbudowano z wxWidgets 3.3.4, PROJ 9.9.0, GDAL 3.13.3 i FFmpeg 9.0.2; **8/8 istniejących zestawów testów PASS**, uruchomionych szeregowo. [Dowody](../tests/wasm-spike/evidence/webgl2/native-summary.json). Test macierzy wykonał 144 kontrole skalarne, w tym 108 porównań z natywnym GLU: maks. różnica projekcji `4.05e-10`, odwrotnej projekcji `1.81e-7 m`. Test przycinania linii obejmuje kamerę, near/far i sześć płaszczyzn.

**Natywne GUI na tym hoście pozostaje zablokowane błędem już obecnym w bazie:** `wxConvFileName == nullptr` przed `wxEntry`; bazowy i zmieniony Aven kończą się SIGSEGV. Zachowano [minimalny reproducer](../tests/wasm-spike/wx-converter-repro.cc) i [wynik](../tests/wasm-spike/evidence/webgl2/wx-converter-repro.json). Nie przedstawiamy testów CLI jako sukcesu natywnego GUI ani pełnego porównania obrazów desktop/WWW.

**Rekomendacja:** kontynuować tę drogę. Następny etap powinien domknąć wymienione zachowania wxWidgets i skalę po DEM, dodać import lokalnych plików, a następnie zmierzyć większe modele przed przenoszeniem list na trwałe bufory GPU. Instrukcja lokalnego buildu i uruchomienia: [README eksperymentu](../tests/wasm-spike/README.md).

---

## Etap 1 — zachowany raport pierwotnej próby

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
