# wxWidgets/WASM toolkit diagnostic — NOT Aven

This scratch app isolates the wx toolkit/browser path from Aven's renderer. It contains a real wxFrame, wxTreeCtrl, wxStaticText and wxGLCanvas. It draws a three-colour triangle using ES2-compatible vertex/fragment shaders, a vertex buffer and `glDrawArrays`. It does not use display lists, GLU, legacy immediate mode, cave data, terrain, PROJ or Aven code.

The UI is intentionally labelled **TOOLKIT DIAGNOSTIC - NOT AVEN**. Selecting **Warm triangle** in the wx tree changes the shader's tint and the status text. Selecting **RGB triangle** restores the original tint. Resizing requests repaint. The OpenGL paint handler reads the centre pixel and reports the actual framebuffer result; it does not substitute a canned screenshot or mock renderer.

## Build

The build uses the shared wx libraries already compiled by the root agent. It does not install dependencies or modify wx source or the Emscripten SDK.

```sh
source /private/tmp/aven-wasm-spike/emsdk/emsdk_env.sh
python3 /private/tmp/aven-wasm-spike/wx-smoke/build.py
```

`build-commands.json` contains the exact compiler/link argv. `build.log` contains compiler/link output and exit codes. Native WASM exceptions, JSPI, the supplied scheduler, both wx pre-js files and the wx shell template are used. Undefined symbols remain fatal (`ERROR_ON_UNDEFINED_SYMBOLS=1`). No missing symbols are stubbed.

The wx-config `-pthread` flag is filtered for the main-thread DOM recipe. `-lSM` is filtered because root identified host X11 session-manager autodetection contamination; X11 is not used by this browser backend. The upstream `-sUSE_LIBPNG=1` is retained. `LEGACY_GL_EMULATION` is deliberately absent because this application calls only the modern shader/VBO APIs. This diagnostic therefore does not establish legacy OpenGL compatibility.

## Browser verification

The parent agent executed the following checks in Chromium 156 through the actual pointer and viewport APIs; see `../evidence/browser-results.json` and the console log:

1. The diagnostic title, genuine wx tree, labels and a visible RGB triangle.
2. Clicking **Warm triangle** changes both status text and triangle tint; clicking **RGB triangle** restores them.
3. Resizing preserves a visible correctly positioned triangle.
4. No runtime/GL errors in the console.

Console markers are `WX_SMOKE_APP_CREATED`, `WX_SMOKE_GL_INITIALIZED`, `WX_SMOKE_TREE_SELECTION` and `WX_SMOKE_FRAME`. The first three frame logs include viewport size, the centre RGBA pixel and GL error. A successful centre pixel should contain non-background triangle colour and GL error 0.

For an already-authorized debug inspector, `globalThis.wxSmoke` reports app identity, frame count, selection count, physical canvas size, last centre pixel, GL error, tint mode and any initialization error. These values come from the actual C++ frame/tree/GL handlers.

A successful result supports only the frame/tree/canvas/toolkit path. It cannot be cited as a working Aven port, successful `.3d` rendering, LRUD, PROJ, terrain or export.

## Completed build status

Compilation and strict linking both finished with exit code 0. The generated WASM magic/version header was verified. `artifacts.json` records artifact sizes and SHA-256. Browser execution completed: RGB/warm tree interaction changed and restored framebuffer pixels; resizing produced a new frame; all recorded frames had GL error 0. Only a favicon HTTP 404 appeared in the console. This is still not an Aven runtime test.
