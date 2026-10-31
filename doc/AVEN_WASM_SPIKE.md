# Praktyczny test Aven + wxWidgets + Emscripten

## Etap 4 — automatyczny Kataster i paczka GitHub Pages (2026-10-31)

Przygotowano [eksperymentalną stronę](https://dlubom.github.io/survex/), która po wejściu uruchamia rzeczywiste Aven z pełnym Katastrem Tatr Zachodnich i jego terenem. Nie wymaga wybierania plików. Pozostają menu, drzewo, etykiety i nawigacja Aven; dodatkowy pasek pozwala otworzyć własny `.3d`/DEM lokalnie oraz przywrócić domyślny zestaw. Źródła pozostają na izolowanej gałęzi `codex/aven-webgl2`, a publikacja statyczna używa `gh-pages`; scalenie do `master` nie jest wymagane.

Stan odbioru źródeł przed publikacją: poniższe testy lokalne PASS. Wynik konkretnego publicznego wdrożenia jest zapisywany osobno w [potwierdzeniu wdrożenia](https://dlubom.github.io/survex/verification/receipt.json), wraz z SHA źródeł i testowanego commitu strony. Pozwala to odróżnić build i odbiór od późniejszego zapisu dowodów.

### Zmiana i dowody

WASM uruchamia istniejące loadery Aven z preładowanymi ścieżkami. Nowy punkt wejścia `aven_open_files` przyjmuje ścieżki plików skopiowanych przez przeglądarkę do MEMFS; JSPI zachowuje zwykłe modalne komunikaty Aven. Po poprawnym odczycie nowej jaskini usuwany jest poprzedni DEM i jego zasięg. Desktop zachowuje dotychczasowy renderer i ładowanie; wspólna zmiana wydziela istniejącą obsługę DEM do metody. Kontrola niezdefiniowanych symboli pozostaje włączona.

| Kontrola na lokalnym pakiecie pod ścieżką projektu | Wynik |
| --- | --- |
| Start bez kliknięć i przywrócenie sceny | 18 539 rekordów stacji, 18 553 odcinki, 2 369 843 trójkąty, nazwy włączone |
| Obrót, pochylenie, przesuwanie, zoom w osadzonym Aven | PASS — rzeczywiste zdarzenia myszy |
| Własny `.3d`, potem `.3d` + ZIP DEM | PASS; stary teren usunięty, 0 żądań sieciowych podczas importu |
| Podstawowy scenariusz Aven | 11 działań PASS, w tym wybór stacji, drzewo, etykiety, LRUD, syntetyczny DEM i resize |
| Syntetyczny DEM | Wszystkie 4225 punktów, maks. błąd XY 1,87·10⁻⁹ m, Z 0 m; teren 10 m nad punktem wejścia |
| Zipped HGT pełnego Katastru | Wszystkie rekordy stacji; 10 000 próbek DEM, XY do 1,87·10⁻⁹ m, Z 0 m; liczniki pełnej siatki zgodne |
| Konsola / adapter / WebGL | 0 błędów i ostrzeżeń w zaakceptowanych przebiegach |
| Native | Bieżące źródła skompilowane; 8/8 zestawów PASS z właściwym `SURVEXLIB` |
| Brak JSPI lub brak pliku aplikacji | Czytelny komunikat; bez JSPI nie pobierano dużych plików aplikacji |

[Manifest i zakres dowodów](../tests/wasm-spike/evidence/stage4/manifest.json), [strona i import](../tests/wasm-spike/evidence/stage4/pages-local-results.json), [scenariusz Aven](../tests/wasm-spike/evidence/stage4/core-results.json), [syntetyczna geometria](../tests/wasm-spike/evidence/stage4/synthetic-verification.json), [Kataster/DEM](../tests/wasm-spike/evidence/stage4/kataster-verification.json). Zrzuty: [Kataster](../tests/wasm-spike/evidence/stage4/local-kataster.png), [lokalny plik](../tests/wasm-spike/evidence/stage4/local-upload.png), [wybór w drzewie](../tests/wasm-spike/evidence/stage4/station-tree.png), [LRUD](../tests/wasm-spike/evidence/stage4/lrud.png), [syntetyczna elewacja](../tests/wasm-spike/evidence/stage4/synthetic-elevation.png).

HGT 25 934 402 B spakowano bezstratnie do ZIP 10 631 135 B, bez resamplingu i korekty wysokości. Manifest paczki zawiera hashe i źródła danych. Minimalny pakiet strony ma około 47 MB przed dołączeniem archiwum źródeł. Zaobserwowana pamięć liniowa WASM: 271 843 328 B; nie jest to szczytowa pamięć procesu ani pomiar FPS. Strona działa lokalnie bez izolacji cross-origin i bez SharedArrayBuffer. Wszystkie zasoby są względne, aplikacja ma katalog zależny od hashy; test publiczny sprawdza rzeczywiste nagłówki i ścieżki GitHub Pages. [Instrukcja odtworzenia](../tests/wasm-spike/README.md#package-the-default-kataster-scene-for-static-hosting-stage-4).

Pierwszy natywny przebieg testów nie miał katalogu komunikatów `en.msg`; nawet `aven --help` otwierał komunikat i blokował test. To błąd konfiguracji stagingu, odtwarzalny bez `SURVEXLIB`. Powtórzenie z zasobami przypiętego wydania zakończyło się 8/8 PASS. Nie ponawiano pełnego natywnego GUI dla etapu 4; zrzuty etapu 3 pozostają dowodami tamtego binarium.

Nie potwierdzono innych silników przeglądarek, dotyku/HiDPI, długotrwałej wydajności ani pełnego parytetu obrazu z desktopem. Pliki użytkownika nie są zachowywane po odświeżeniu. Układ pionowy rzeczywistych źródeł nadal nie jest uzgodniony, trzy otwory są poza kaflem, a czytnik Walls ignoruje LRUD. Pakiet statyczny można przenieść na inny hosting, ale przygotowanie SDK/zależności nadal nie jest uniwersalnym instalatorem.

**Następny etap:** pomiar ładowania i płynności pełnego modelu na zwykłym laptopie, następnie powtarzalne budowanie całej paczki z przypiętych zależności. Nie rozszerzać deklaracji zgodności wysokościowej na podstawie samego obrazu.

---

## Etap 3 — rzeczywisty Kataster, teren HGT i poprawki wspólnego Aven (2026-10-31)

Poniżej zachowany raport etapu 3 (`5c34c8ea`); jego brak importu plików i lokalny zakres zostały rozszerzone w etapie 4.

**Pełny Kataster i surowy HGT działają w przeglądarce:** Aven wczytał 18 539 rekordów stacji i 18 553 odcinki oraz narysował **2 369 843 trójkąty terenu**. Zachowano menu, drzewo i renderer Aven. Nie podnoszono limitu pamięci WASM ani nie pomijano geometrii, aby uzyskać ten wynik. Zaobserwowana długość pamięci liniowej WASM wyniosła `253165568 B` (około 241,44 MiB); nie jest to pomiar szczytowego zużycia całej przeglądarki ani wydajności klatek.

Kontynuacja wychodzi z lokalnego commitu etapu 2 `c812392e`, na tej samej izolowanej gałęzi. Link pozostaje ścisły: WebGL2, `ERROR_ON_UNDEFINED_SYMBOLS=1`, bez `LEGACY_GL_EMULATION`. SDK, biblioteki oraz oryginalne pliki zewnętrzne `.3d`/HGT/BIL/ZIP pozostają poza repozytorium; skompresowane obserwacje zawierają pochodne współrzędne i próbki wysokości, a zrzuty przedstawiają te dane. [Autorstwo i zakres dowodów](../tests/wasm-spike/README.md#repeat-the-real-kataster--hgt-experiment). Instrukcja odtwarzania: [README](../tests/wasm-spike/README.md).

Końcowe przebiegi w Chromium `156.0.8078.74` przechodzą: [11 działań podstawowych](../tests/wasm-spike/evidence/stage3/core-results.json), [12 kontroli UI](../tests/wasm-spike/evidence/stage3/ui-results.json), [15 kontroli trybów](../tests/wasm-spike/evidence/stage3/modes-results.json), [trzy zestawy Kataster/DEM](../tests/wasm-spike/evidence/stage3/kataster-results.json), [odzyskanie terenu po braku pokrycia](../tests/wasm-spike/evidence/stage3/terrain-recovery-results.json) i [odrzucenie uszkodzonego HGT](../tests/wasm-spike/evidence/stage3/malformed-hgt-results.json). **0 błędów i ostrzeżeń przeglądarki oraz 0 zarejestrowanych błędów adaptera/WebGL.** Ponowiono podstawowe `.3d`, LRUD i syntetyczny DEM; działania odbywają się przez istniejący interfejs, a `Module.avenTest` służy tylko do obserwacji.

### Naprawione przyczyny

| Problem odtworzony przed zmianą | Zmiana i zakres potwierdzenia |
| --- | --- |
| Pierwsze kółko po DEM nadpisywało skalę starą wartością | Usunięto drugą kopię skali w `GfxCore`; kamera i obsługa kółka używają `GLACanvas::GetScale()`. Test rzeczywistych klas Aven zawiódł przed zmianą i przechodzi po niej, również dla kółka wstecz i granic zoomu. Test przeglądarkowy zmierzył ciągły pierwszy krok po DEM: stosunek skali około 1,32272. |
| Klik dokładnie na stacji czasem jej nie wybierał | Siatka hit-testu przeszukuje wszystkie komórki przecinające promień kliknięcia. Poprzednio pozycja stacji w `double` i klik w pikselach całkowitych mogły trafić po przeciwnych stronach granicy kubełka. Potwierdzono konkretną wcześniej pomijaną stację. |
| Pola narzędzi nachodziły na ikony, statusbar wychodził poza okno, Enter i utrata fokusu nie zatwierdzały zmian | [Patch przypiętego forka wx](../tests/wasm-spike/patches/README.md) rezerwuje miejsce dla `AddControl`, mierzy pola tekstowe i spin, liczy wysokość toolbaru raz oraz przekazuje Return i utratę fokusu. W przeglądarce sprawdzono wyszukiwanie, Z-stretch, Tab/blur, zmianę rozmiaru i ArrowUp → Enter w drzewie. |
| Siatka surowego HGT była ściśnięta do `1/N` stopnia | HGT ma próbki punktowe wraz z oboma brzegami kafla; odstęp to `1/(N−1)`. Dla Czarnej stary odczyt miał błąd XY do 29,54 m i błędne liczniki próbek/trójkątów. Po poprawce zgodność z natywnym PROJ osiąga `1,87e−9 m`. Odrzucane są też nieparzyste długości i niepoprawne wymiary HGT. |
| Komunikat o braku pokrycia DEM otwierał modal podczas zapisu listy renderera | Błąd jest pokazywany przez `CallAfter`, po zakończeniu zapisu. Scenariusz: syntetyczny DEM → Czarna poza jego zasięgiem → normalny komunikat → prawidłowy HGT. Przywrócenie terenu sprawdzono oddzielnie. |
| Pełny teren przekraczał pamięć przy przechowywaniu i odtwarzaniu poleceń | Geometria list używa bloków zwartych poleceń zamiast osobnej funkcji na każdy atrybut/wierzchołek. Trójkąty są odtwarzane porcjami po najwyżej 12 288 wierzchołków, z zachowaniem stanu, granic prymitywów i kolejności. Pełna geometria terenu jest nadal rysowana. |
| Native startup wywracał się przed `wxEntry` | Użyto leniwego akcesora `wxConvFile` zamiast bezpośredniego dereferencjonowania nieutworzonego `wxConvFileName`. Minimalny reproducer wykazuje SIGSEGV przed zmianą i sukces po niej. |

Poprawki skali, wyboru stacji, HGT i wyświetlania błędu dotyczą wspólnego Aven. Adapter pozostaje ograniczony do `__EMSCRIPTEN__`, a desktop nadal korzysta z natywnego OpenGL. Dodatkowo przełączanie mgły i wygładzania linii odświeża widok; usunięto niepoprawny profil ICC z tekstury bez zmiany pikseli. Końcowy scenariusz przełącza te tryby i potwierdza odświeżenie klatek bez błędów. Nie jest to porównanie pikselowe z desktopem.

### Rzeczywiste dane i wynik georeferencji

Źródłem jest czysty lokalny checkout `Jaskiniowy-Kataster-Tatr-Zachodnich`, commit `3f865414d1dacaa15cd5477e567b0f852c43b32d`. `KATASTER.wpj` skompilowano na nowo natywnym Survex 1.4.24: 0 ostrzeżeń i 0 błędów. Nie używano wcześniejszego `.3d` leżącego w repozytorium danych i nie zmieniano pomiarów. Układ modelu: EPSG:32634. Podzbiór Czarnej utworzono natywnym `survexport`; zweryfikowano identyczność geometrii i flag punktów względem odfiltrowanego pełnego pliku. Eksport usuwa zewnętrzny prefiks `Czarna` oraz nie zachowuje wszystkich nazw/stylów odcinków i `ERROR_INFO`; pełny Kataster jest podstawą testu metadanych.

DEM `N49E019_VF1.hgt` to niezmienione 25 934 402 bajty, 3601×3601 próbek `int16` big endian. Próbki skrajne leżą w 19°E, 50°N i 20°E, 49°N. SHA-256: `d2afeb74d418f197cbeea16a08e660f81d5f2e09e83e81a68263d5451250d645`. Mniejszy BIL dla Czarnej jest dokładnym wycinkiem `[kolumna 3100, wiersz 2680, szerokość 107, wysokość 72]`; nie wykonywano resamplingu, reprojekcji rastra ani przesunięcia wysokości. Pochodzenie i wartości kontrolne zapisano w [referencji](../tests/wasm-spike/kataster-reference.json).

| Kontrola | Czarna + surowy HGT | Pełny Kataster + surowy HGT |
| --- | ---: | ---: |
| Rekordy stacji porównane z natywnym `dump3d` | 464 | 18 539 (w tym 12 110 nazwanych) |
| Odcinki modelu | 509 | 18 553 |
| Próbki terenu zachowane przez promień Aven | 5031 | 1 186 869 |
| Trójkąty: przeglądarka i niezależne zliczenie siatki | 9826 | 2 369 843 |
| Próbki z kontrolą źródłowego indeksu, XY i Z | **5031 — wszystkie zachowane** | **10 000 — ograniczona obserwacja** |
| Maks. różnica XY względem natywnego `cs2cs` | 1,8636e−9 m | 1,8636e−9 m w sprawdzonej próbce |
| Z oraz odjęcie wspólnego środka modelu | 0 m różnicy | 0 m różnicy w sprawdzonej próbce |

Kontrola pełnego modelu porównuje wszystkie 18 539 rekordów stacji, ich współrzędne, nazwy i flagi z natywnym odczytem `.3d`. Limit 10 000 dotyczy wyłącznie obserwacji wierzchołków terenu. Liczniki całej siatki pochodzą niezależnie z surowego HGT, promienia Aven i natywnego PROJ. Liczba 18 651 z końcowego komunikatu `cavern` dotyczy odcinków sieci przed reprezentacją wynikowego `.3d`; nie należy jej zastępować licznikiem 18 553 rysowanych rekordów `LEG`.

[Walidator](../tests/wasm-spike/verify-kataster-terrain.py) sprawdza też SHA źródła, siatkę `1/(N−1)`, brak NODATA w próbkach, wspólny offset modelu i terenu oraz błędy GL. Zapisane wyniki: [błąd przed poprawką HGT](../tests/wasm-spike/evidence/stage3/czarna-hgt-before-verification.json), [Czarna — końcowy surowy HGT](../tests/wasm-spike/evidence/stage3/czarna-final-verification.json), [pełny Kataster — końcowy przebieg](../tests/wasm-spike/evidence/stage3/full-final-verification.json), [niezależne zliczenie siatki](../tests/wasm-spike/evidence/stage3/kataster-mesh-count.json).

Osobno powtórzono BIL 107×72: wszystkie 5031 zachowanych próbek, 9826 trójkątów, maks. różnica XY `2,8091e−9 m`, różnica Z `0 m`. [Wynik wycinka](../tests/wasm-spike/evidence/stage3/crop-final-verification.json). Zrzuty końcowe: [Czarna + HGT](../tests/wasm-spike/evidence/stage3/kataster-czarna-final.png), [Czarna + BIL](../tests/wasm-spike/evidence/stage3/kataster-czarnaCrop-final.png), [pełny Kataster + HGT](../tests/wasm-spike/evidence/stage3/kataster-full-final.png). Każdy z trzech wariantów przeszedł obrót, pochylenie, przesuwanie, zoom i włączenie nazw.

Nieznany pozostaje **układ pionowy rzeczywistego DEM i wspólny układ wysokości wszystkich źródeł jaskiniowych**. Potwierdzono zachowanie wartości Z, nie geodezyjną zgodność datum wysokościowego. Nie dopasowywano powierzchni do otworów. Trzy wschodnie otwory (`Koszowa:0`, `SzczelinaNadLejem:0`, `WyzKoszowaDziura:0`) leżą poza kaflem HGT. To ograniczenie pokrycia danych. Świeży import Walls nie zawiera rekordów LRUD, ponieważ czytnik Survex je parsuje, ale ignoruje; nie wynika z tego brak pomiarów LRUD w źródłach. Test LRUD nadal korzysta z zestawu bundled/syntetycznego z etapu 2.

### Regresje adaptera i desktop

Test [odtwarzania rzeczywistego adaptera](../tests/wasm-spike/adapter-replay-test.cc) wykonał dwa przebiegi po 2 369 843 trójkąty i sprawdził 14 219 058 wierzchołków w przechwytującym odbiorniku GL. Obejmuje dziedziczenie atrybutów, zagnieżdżone i redefiniowane listy, kolejność macierzy, flat shading, bitmapy, obrys i wygładzanie linii. Wynik: 1158 wywołań rysowania, maksymalnie 12 288 wierzchołków w porcji, pamięć liniowa 216 858 624 B. To test CPU/WASM poleceń; dowodem rasteryzacji jest oddzielny przebieg prawdziwej przeglądarki. [Wynik i polecenia](../tests/wasm-spike/evidence/stage3/adapter-replay.json).

Końcowy natywny build jest zgodny z końcowymi źródłami: **8/8 istniejących zestawów testów PASS**, uruchomionych szeregowo, oraz PASS regresji rzeczywistych klas i obsługi kółka. [Podsumowanie, hashe i polecenia](../tests/wasm-spike/evidence/stage3/native-summary.json). SHA-256 binarium: `c342e2884bc3e96743b2a852efbf33808036139817cbf9176192ad8da23754f6`.

Rzeczywiste natywne GUI uruchomiono z Czarną, surowym HGT, nazwami i drzewem; potwierdzono wybór `BorowiecGorna:52` i widok elewacji. [Końcowy zrzut natywnego Aven](../tests/wasm-spike/evidence/stage3/native-final-czarna-dem.png). Obrót, zoom i Z-stretch=2 sprawdzono wcześniej na binarium `382b9276…`; po zastąpieniu go końcowym buildem ponowiono powyższy test otwarcia, terenu i wyboru. Natywny stderr zawiera ostrzeżenie macOS `sandbox_extension`, dlatego brak błędów konsoli WWW nie oznacza pustych wszystkich logów systemowych. Nie deklarujemy pełnego porównania pikselowego desktop/WWW.

### Zakres pozostały do następnego etapu

[Znane ograniczenia](../tests/wasm-spike/KNOWN_LIMITATIONS.md) rozdzielają usunięte reprodukcje od nieprzetestowanych zachowań. Nadal brak importera dowolnych plików użytkownika: przygotowane dane są preładowane w MEMFS. Nie potwierdzono Safari/Firefox, dotyku/HiDPI, odtwarzania po utracie kontekstu, pełnego parytetu opcjonalnych trybów ani wszystkich CRS i siatek. GDAL, FFmpeg, eksport, druk i filmy nie są częścią tego buildu.

**Rekomendacja:** dodać import plików użytkownika i trwałe przechowywanie danych, przygotować powtarzalny pakiet zależności, a następnie sprawdzić inne przeglądarki. Przy tej pracy mierzyć czas ładowania, klatki i pamięć. Sukces pełnego Katasteru usuwa konkretną barierę pamięci, ale nie zastępuje benchmarku ani kontroli zgodności pionowej rzeczywistych danych.

---

## Etap 2 — zachowany raport: rzeczywiste Aven w WebGL2 (2026-10-31)

Poniższy zapis opisuje stan etapu 2. Wymienione tu otwarte problemy skali, wx i natywnego startu zostały następnie podjęte w etapie 3 powyżej.

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
