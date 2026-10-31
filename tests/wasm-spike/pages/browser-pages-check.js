// Run on the packaged Pages URL. Test files are passed to the browser's local
// file input; network assertions ensure this path performs no server upload.
async (page, fixtureDirectory = 'tests/wasm-spike/fixtures') => {
  const errors=[],warnings=[],requests=[],checks=[];
  const log=m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());};
  const fail=e=>errors.push(String(e)), request=r=>requests.push({method:r.method(),url:r.url()});
  const check=(ok,name,observed)=>{checks.push({name,pass:!!ok,observed});if(!ok)throw new Error(name);};
  const fixture=fixtureDirectory.replace(/\/$/,'')+'/';
  const state=()=>page.locator('#aven').evaluate(e=>{
    const m=e.contentWindow.Module,t=m.avenTest;
    return {file:t.model.file,legs:t.model.legs,stations:t.model.stations.length,
      triangles:t.terrain?.triangles,terrain:t.camera.terrain,names:t.camera.names,
      pan:t.camera.pan,tilt:t.camera.tilt,scale:t.camera.scale,translation:t.camera.translation,
      gl:m.avenGL,heapBytes:m.HEAPU8.length};
  });
  const ready=()=>page.waitForFunction(()=>document.querySelector('#aven').contentWindow.Module?.avenRendered&&document.querySelector('#loading').hidden,null,{timeout:60000});
  page.on('console',log);page.on('pageerror',fail);page.on('request',request);
  try {
    await page.setViewportSize({width:1280,height:900});
    await page.reload();await ready();
    const initial=await state();
    check(initial.file==='/external/kataster.3d'&&initial.legs===18553&&initial.stations===18539&&initial.triangles===2369843&&initial.terrain&&initial.names,'automatic Kataster and HGT',initial);
    const child=page.frames().find(f=>f.url().includes('/app/'));
    const b=await child.locator('#glcanvas-1').boundingBox();
    for(const [button,dx,dy] of [['left',50,0],['middle',0,40],['right',30,20]]) {
      await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down({button});
      await page.mouse.move(b.x+b.width*.5+dx,b.y+b.height*.5+dy,{steps:5});await page.mouse.up({button});
    }
    await page.mouse.wheel(0,120);await page.waitForTimeout(100);
    const moved=await state();
    check(moved.pan!==initial.pan&&moved.tilt!==initial.tilt&&moved.scale!==initial.scale&&moved.translation.some((v,i)=>v!==initial.translation[i]),'iframe rotation tilt pan zoom',moved);
    await page.screenshot({path:'.playwright-mcp/pages-default.png'});
    const requestStart=requests.length;
    await page.locator('#local-files').setInputFiles(fixture+'real-nordalpenschacht-205.3d');
    await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('otwarte lokalnie'));
    await page.waitForTimeout(100);
    const local=await state();
    check(local.legs===17&&local.stations===20&&!local.terrain&&!local.triangles,'local .3d replaces scene and removes old terrain',local);
    await page.screenshot({path:'.playwright-mcp/pages-local-cave.png'});
    await page.locator('#local-files').setInputFiles([fixture+'synthetic-2180.3d',fixture+'synthetic-terrain.zip']);
    await page.waitForFunction(()=>document.querySelector('#aven').contentWindow.Module?.avenTest?.terrain?.triangles===8192);
    const synthetic=await state();
    check(synthetic.legs===6&&synthetic.terrain,'local .3d and zipped DEM',synthetic);
    check(requests.slice(requestStart).length===0,'local files produce no network requests',requests.slice(requestStart));
    await page.screenshot({path:'.playwright-mcp/pages-local-dem.png'});
    await page.getByRole('button',{name:'Kataster + teren',exact:true}).click();await ready();
    const restored=await state();
    check(restored.legs===18553&&restored.triangles===2369843,'restore default scene',restored);
    check(!restored.gl.adapterErrors&&!restored.gl.nativeErrors&&!errors.length&&!warnings.length,'console and GL errors',{errors,warnings,gl:restored.gl});
    const result={url:page.url(),browser:page.context().browser().version(),checks,errors,warnings,pass:checks.every(c=>c.pass)};
    await page.evaluate(r=>window.avenPagesAcceptance=r,result);
    return result;
  } finally {page.off('console',log);page.off('pageerror',fail);page.off('request',request);}
}
