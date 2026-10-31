// Exercise the actual modal path of the browser import export, including the
// scheduler's activation lifetime. A successful file never suspends here.
async (page, fixtureDirectory = 'tests/wasm-spike/fixtures') => {
  const errors=[], warnings=[];
  const log=m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());};
  const fail=e=>errors.push(String(e));
  page.on('console',log);page.on('pageerror',fail);
  try {
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('#loading').hidden,null,{timeout:60000});
    const child=page.frames().find(f=>f.url().includes('/app/'));
    const fixture=fixtureDirectory.replace(/\/$/,'')+'/';
    await page.locator('#local-files').setInputFiles(fixture+'invalid-browser-input.3d');
    await child.getByRole('button',{name:'OK',exact:true}).waitFor();
    const parked=await child.evaluate(()=>__wxScheduler.dump());
    await page.screenshot({path:'.playwright-mcp/invalid-file-dialog.png'});
    await child.getByRole('button',{name:'OK',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#open-files').disabled);
    const after=await child.evaluate(()=>({dump:__wxScheduler.dump(),live:__wxScheduler._windowLive?.kind||null}));
    await page.locator('#local-files').setInputFiles(fixture+'real-nordalpenschacht-205.3d');
    await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('otwarte lokalnie'));
    const recovered=await child.evaluate(()=>({file:Module.avenTest.model.file,legs:Module.avenTest.model.legs,gl:Module.avenGL}));
    const pass=parked.suspendedActivations.some(a=>a.kind==='aven_open_files') &&
      after.live!=='untracked' && !after.dump.suspendedActivations.some(a=>a.kind==='aven_open_files') &&
      !after.dump.ring.some(e=>e[1]==='forceClearWindow') && recovered.legs===17 &&
      !recovered.gl.adapterErrors&&!recovered.gl.nativeErrors&&!errors.length&&!warnings.length;
    const result={url:page.url(),parked,after,recovered,errors,warnings,pass};
    await page.evaluate(r=>window.avenFileErrorAcceptance=r,result);
    if(!pass) throw new Error('Browser file error activation was not tracked/finished cleanly; see window.avenFileErrorAcceptance');
    return result;
  } finally {page.off('console',log);page.off('pageerror',fail);}
}
