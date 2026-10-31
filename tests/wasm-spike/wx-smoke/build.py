from pathlib import Path
import json, shlex, subprocess, sys
R=Path(__file__).resolve().parent
B=R.parent/'wx-build'
W=R.parent/'wxwidgets'
C=R.parent/'emsdk/upstream/emscripten/em++'
config=B/'wx-config'
cflags=shlex.split(subprocess.check_output([str(config),'--cxxflags'],text=True))
lflags=shlex.split(subprocess.check_output([str(config),'--libs','core,gl'],text=True))
# Per upstream PCBJam recipe: the GUI runs on the main browser thread.
# -lSM is host X11 detection contamination from wx configure, not a WASM dependency.
removed=[x for x in cflags+lflags if x in ['-pthread','-lSM']]
cflags=[x for x in cflags if x!='-pthread']
lflags=[x for x in lflags if x not in ['-pthread','-lSM']]
# wx's inplace config omits the cross suffix; map direct archive paths to actual files.
for i,flag in enumerate(lflags):
    if flag.endswith('.a') and not Path(flag).exists():
        suffixed=Path(flag).with_name(Path(flag).stem+'-wasm32-unknown-emscripten.a')
        if suffixed.exists(): lflags[i]=str(suffixed)
common=['-std=c++17','-O0','-g3','-fwasm-exceptions','-sSUPPORT_LONGJMP=wasm','-sWASM_LEGACY_EXCEPTIONS=1']
compile_cmd=[str(C),*common,*cflags,'-c',str(R/'smoke.cpp'),'-o',str(R/'smoke.o')]
link_cmd=[str(C),*common,str(R/'smoke.o'),*lflags,
 '-sJSPI=1',
 '-sJSPI_EXPORTS=main,wx_dom_event,wx_dom_mouse,wx_window_close,wx_window_move,wx_window_resize,ProcessEvents,wxWasmMailboxTick,wxWasmTopLevelTick,wxWasmJobTick',
 "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAP8','HEAP32','ccall','stackSave','stackRestore']",
 '-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$stringToNewUTF8',
 '-sALLOW_MEMORY_GROWTH=1','-sMAX_WEBGL_VERSION=2','-sASSERTIONS=1','-sERROR_ON_UNDEFINED_SYMBOLS=1',
 '--pre-js',str(R.parent/'support/jspi-scheduler.js'),
 '--pre-js',str(W/'build/wasm/wx.js'),
 '--pre-js',str(W/'build/wasm/wx-dom.js'),
 '--shell-file',str(W/'build/wasm/template.html'),'-o',str(R/'smoke.html')]
# No LEGACY_GL_EMULATION: the diagnostic uses only ES2 shaders, VBO, drawArrays.
(R/'build-commands.json').write_text(json.dumps({'removed_flags':removed,'compile':compile_cmd,'link':link_cmd},indent=2)+'\n')
with (R/'build.log').open('w') as log:
    log.write('Filtered host/thread flags: '+repr(removed)+'\n')
    for stage,cmd in [('compile',compile_cmd),('link',link_cmd)]:
        log.write('\n'+stage+': '+shlex.join(cmd)+'\n');log.flush()
        result=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
        log.write(f'\n{stage} exit: {result.returncode}\n');log.flush()
        print(f'{stage} exit: {result.returncode}',flush=True)
        if result.returncode:raise SystemExit(result.returncode)
print('Built smoke.html + smoke.js + smoke.wasm (not yet browser-tested).')
