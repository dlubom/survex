# Local fixes for the pinned wxWidgets WASM fork

`wx-wasm-controls-layout-and-enter.patch` applies to
`PCBJam/wxWidgets` commit `01b74ea19a09968277f59475f8919f2d2a4ff00e`.
It changes only the WASM backend and its DOM glue:

- Reserve toolbar slots for `AddControl()` items and position their wx controls
  from the measured layout. This supports generic composite controls such as
  `wxSearchCtrl` and `wxSpinCtrlDouble`, not only controls with one DOM node.
  Rebuilds and size events update positions; hidden frames use a measured clone.
  Toolbar margins and horizontal/vertical orientation are included.
- Implement WASM `wxTextCtrl::DoGetSizeFromTextSize()` using the requested text
  extent plus the DOM input's border/padding and caret space. Generic spin
  controls need this API to size their formatted range; the inherited stub
  returned `(-1, -1)`. Toolbar slots respect an updated effective minimum after
  changes to the numeric range or precision.
- Count toolbar space once in `wxFrame::GetClientAreaOrigin()`, matching the
  single subtraction in `DoGetClientSize()` and keeping the statusbar in frame.
- Generate `wxEVT_CHAR` for unhandled Return/Keypad Enter through the existing
  keyboard dispatch path. Deferred dispatch suppresses the browser's default
  for non-printable Enter, so relying on a later `keypress` loses the event.
- Deliver `wxEVT_KILL_FOCUS` when browser navigation leaves a DOM control for
  an element outside wx focus routing. Generic spin controls commit edited
  numbers through this event. Guards avoid duplicate delivery after wx
  `SetFocus()` and stale delivery after browser focus has returned.

Apply before building wxWidgets:

```sh
bash tests/wasm-spike/scripts/apply-wx-patches.sh /private/tmp/aven-wasm-spike/wxwidgets
```

The script also accepts `WX_SOURCE`, or `TASK_ROOT` containing `wxwidgets`.
It requires the pinned Git revision, succeeds without changes when the complete
patch is already applied, and refuses a conflicting or partial patch. It does
not reset files or touch the earlier PCRE/Expat `config.sub` adjustments.

Rebuild the prepared `wx-build`, then rebuild/relink Aven; `wx-dom.js` is included
at link time. Applying the patch without rebuilding libraries is insufficient.
The normal dependency build can also apply it before configure/make.

The original failures are documented in `../KNOWN_LIMITATIONS.md`. Browser
acceptance must check toolbar input sizing, typed numeric values committed by
Tab/blur, and clicks after resizing, visible station
status text, and tree ArrowUp followed by Enter. Compilation and patch-application
checks alone do not establish that these UI cases pass.
