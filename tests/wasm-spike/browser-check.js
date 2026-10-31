// Run this function with Playwright's run-code command, against the local server.
// It drives the real Aven menus and mouse handlers; diagnostics are read-only.
async (page) => {
  const errors = [], warnings = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('pageerror', e => errors.push(String(e)));
  const result = {browser: page.context().browser().version(), actions: {}};
  const state = () => page.evaluate(() => ({
    model: Module.avenTest.model, camera: Module.avenTest.camera,
    frames: Module.avenTest.frames, here: Module.avenTest.here,
    there: Module.avenTest.there, gl: Module.avenGL
  }));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const menu = async (group, item) => {
    await page.getByRole('button', {name:group, exact:true}).click();
    await page.getByText(new RegExp('^(?:✓)?\\s*' + item.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$')).click();
  };
  const open = async (item, path) => {
    await menu('File', item);
    await page.getByRole('textbox').last().fill(path);
    await page.getByRole('button', {name:'OK',exact:true}).click();
  };
  const drag = async (button, dx, dy) => {
    const b = await page.locator('#glcanvas-1').boundingBox();
    const x=b.x+b.width*.45, y=b.y+b.height*.45;
    await page.mouse.move(x,y); await page.mouse.down({button});
    await page.mouse.move(x+dx,y+dy,{steps:8}); await page.mouse.up({button});
    await page.waitForTimeout(100);
  };
  const screenshot = name => page.screenshot({path:'.playwright-mcp/'+name+'.png'});
  await page.setViewportSize({width:1200,height:802});
  await page.goto('http://127.0.0.1:8766/aven.html');
  await page.waitForFunction(() => window.Module?.avenTest?.frames>0,null,{timeout:15000});
  result.actions.loaded = await state();
  check(result.actions.loaded.model.legs===17 && result.actions.loaded.model.stations.length===20,'real .3d counts');
  await menu('View','Station Names');
  await page.waitForFunction(() => Module.avenTest.camera.names,null,{timeout:3000});
  await drag('left',90,0); result.actions.rotate=await state();
  check(result.actions.rotate.camera.pan!==result.actions.loaded.camera.pan,'rotation did not change');
  await drag('middle',0,60); result.actions.tilt=await state();
  check(result.actions.tilt.camera.tilt!==-90,'tilt did not change');
  await drag('right',50,35); result.actions.pan=await state();
  check(result.actions.pan.camera.translation.some(v=>Math.abs(v)>.01),'translation did not change');
  await page.mouse.wheel(0,-120); await page.waitForTimeout(100); result.actions.zoomOut=await state();
  await page.mouse.wheel(0,120); await page.waitForTimeout(100); result.actions.zoomIn=await state();
  check(result.actions.zoomOut.camera.scale<result.actions.zoomIn.camera.scale,'zoom directions');
  const pos=await page.evaluate(()=>{
    const b=document.getElementById('glcanvas-1').getBoundingClientRect(),c=Module.avenTest.camera;
    const s=c.stations.find(s=>s.name==='205.2.17');
    return {x:b.x+s.screen[0]*b.width/c.width,y:b.y+(c.height-s.screen[1])*b.height/c.height};
  });
  await page.mouse.click(pos.x,pos.y); await page.waitForTimeout(100);
  result.actions.selection=await state();
  check(result.actions.selection.there==='205.2.17','station picking failed');
  await screenshot('final-real-names-tree-selection');
  // wxTreeCtrl is canvas-painted. At the fixed viewport, selecting station 17
  // expands survey 205.2; row 16 lies 179px below the notebook origin.
  // Double-click this visible tree row through the ordinary mouse handler.
  const tree=await page.locator('[data-wx-notebook]').boundingBox();
  await page.mouse.dblclick(tree.x+60,tree.y+179);
  await page.waitForTimeout(100); result.actions.tree=await state();
  check(result.actions.tree.there==='205.2.16','tree station activation');
  await screenshot('final-tree-activated');
  await open('Open...','/fixtures/bundled-passage.3d');
  await page.waitForFunction(()=>Module.avenTest.model.file.endsWith('bundled-passage.3d'),null,{timeout:5000});
  await page.waitForTimeout(200);
  await menu('View','Passage Tubes');
  await page.waitForFunction(()=>Module.avenTest.camera.tubes,null,{timeout:3000});
  await drag('middle',0,80); result.actions.lrud=await state();
  check(result.actions.lrud.model.xsects===14 && result.actions.lrud.model.tubes===5,'LRUD counts');
  await screenshot('final-passage-lrud');
  await open('Open...','/fixtures/synthetic-2180.3d');
  await page.waitForFunction(()=>Module.avenTest.model.crs==='EPSG:2180',null,{timeout:5000});
  await page.waitForTimeout(200);
  await open('Open Terrain...','/fixtures/synthetic-terrain.zip');
  await page.waitForFunction(()=>Module.avenTest.terrain?.triangles===8192,null,{timeout:10000});
  await page.waitForTimeout(200);
  await menu('Orientation','Elevation');
  await page.waitForFunction(()=>Math.abs(Module.avenTest.camera.tilt)<.01,null,{timeout:5000});
  const b=await page.locator('#glcanvas-1').boundingBox();
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);
  // Existing Aven keeps a separate requested scale when terrain expands the
  // viewing volume. Use the normal wheel control to frame the cave in section.
  await page.mouse.wheel(0,1400); await page.waitForTimeout(150);
  result.actions.terrain=await state();
  result.terrain=await page.evaluate(()=>{
    const t=Module.avenTest.terrain,c=t.samples.find(s=>s.row===32&&s.column===32);
    const a=Module.avenTest.model.stations.find(s=>s.name==='synthetic.a');
    return {width:t.width,height:t.height,samples:t.samples.length,triangles:t.triangles,
      centre:c,entrance:a,delta:c.world.map((v,i)=>v-a.world[i])};
  });
  check(result.terrain.samples===4225 && Math.hypot(...result.terrain.delta.slice(0,2))<.01 && result.terrain.delta[2]===10,'terrain registration/height');
  await screenshot('final-synthetic-dem-elevation');
  await page.setViewportSize({width:1000,height:720});
  await page.waitForFunction(()=>Module.avenTest.camera.width<900,null,{timeout:5000});
  result.actions.resize=await state();
  await screenshot('final-resized');
  await page.setViewportSize({width:1200,height:802});
  await page.waitForTimeout(100);
  result.console={errors,warnings};
  await page.evaluate(r=>window.avenAcceptance=r,result);
  const gl=result.actions.resize.gl;
  check(!(gl.adapterErrors||gl.nativeErrors),'GL error counters');
  check(errors.length===0,'browser console errors: '+errors.join('\n'));
  return {browser:result.browser,actions:Object.keys(result.actions),terrain:result.terrain,console:result.console,gl};
}
