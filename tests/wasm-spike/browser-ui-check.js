// Run with Playwright against the locally served Aven application.
// All mutations are ordinary browser input; Module fields are observations.
async (page) => {
  const base = page.url().startsWith('http') ? new URL(page.url()).origin : 'http://127.0.0.1:8766';
  const checks = [], errors = [], warnings = [];
  const onConsole = m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); };
  const onError = e => errors.push(String(e));
  page.on('console', onConsole); page.on('pageerror', onError);
  const check = (name, pass, observed) => checks.push({name, pass:!!pass, observed});
  const menu = async (group, item) => {
    await page.getByRole('button', {name:group, exact:true}).click();
    await page.getByText(new RegExp('^(?:✓)?\\s*' + item.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$')).click();
  };
  const layout = () => page.evaluate(() => {
    const rect = e => { const r=e.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
    const controls = [...document.querySelectorAll('input')].map(e=>({value:e.value,...rect(e)}));
    return {controls, lastTool:rect(document.querySelector('[data-wx-tool-bar] button:last-of-type')),
      canvas:rect(document.getElementById('glcanvas-1')), viewport:[innerWidth,innerHeight]};
  });
  const verifyLayout = async name => {
    const l=await layout();
    check(name+' controls follow tools', l.controls.length===2 && l.controls.every(c=>c.left>=l.lastTool.right && c.right<=l.viewport[0]), l);
    check(name+' statusbar space', l.canvas.bottom<=l.viewport[1]-15 && l.canvas.height>200, l.canvas);
  };
  await page.setViewportSize({width:1200,height:802});
  await page.goto(base+'/aven.html');
  await page.waitForFunction(()=>window.Module?.avenTest?.frames>0);
  await verifyLayout('initial');
  await menu('View','Station Names');
  await page.waitForFunction(()=>Module.avenTest.camera.names);
  const point=await page.evaluate(()=>{
    const c=Module.avenTest.camera,s=c.stations.find(s=>s.name==='205.2.17'),b=document.getElementById('glcanvas-1').getBoundingClientRect();
    return {x:b.x+s.screen[0]*b.width/c.width,y:b.y+(c.height-s.screen[1])*b.height/c.height};
  });
  await page.mouse.click(point.x,point.y,{delay:50});
  await page.waitForFunction(()=>Module.avenTest.there==='205.2.17');
  const tree=await page.locator('[data-wx-notebook]').boundingBox();
  await page.mouse.click(tree.x+60,tree.y+199);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const selected=await page.evaluate(()=>Module.avenTest.there);
  check('tree ArrowUp + Enter activates station 16',selected==='205.2.16',selected);
  await page.screenshot({path:'.playwright-mcp/ui-tree-keyboard.png'});
  const find=page.getByRole('textbox').first();
  await find.fill('205.2.17');
  await page.waitForFunction(()=>Module.avenTest.camera.highlighted===1);
  const searchBefore=await page.evaluate(()=>Module.avenTest.camera.translation);
  await find.press('Enter'); await page.waitForTimeout(100);
  const searchAfter=await page.evaluate(()=>Module.avenTest.camera.translation);
  check('search finds and centres station', searchAfter.some((v,i)=>Math.abs(v-searchBefore[i])>.01), {searchBefore,searchAfter});
  await find.fill('');
  await page.waitForFunction(()=>Module.avenTest.camera.highlighted===0);
  await menu('Orientation','Elevation');
  await page.waitForFunction(()=>Math.abs(Module.avenTest.camera.tilt)<.01);
  const span=()=>page.evaluate(()=>{const y=Module.avenTest.camera.stations.map(s=>s.screen[1]);return Math.max(...y)-Math.min(...y);});
  const zBefore=await span();
  await page.getByRole('button',{name:'▲',exact:true}).click();
  await page.waitForTimeout(100); const zAfter=await span();
  check('Z arrow applies 1.1 exaggeration', Math.abs(zAfter/zBefore-1.1)<1e-6, {zBefore,zAfter});
  const spin=page.getByRole('textbox').nth(1);
  await spin.fill('2.0'); await spin.press('Tab');
  await page.waitForTimeout(100); const zTyped=await span();
  check('typed Z value commits on Tab', Math.abs(zTyped/zBefore-2)<1e-6,{zBefore,zTyped});
  await spin.fill('1.0'); await spin.press('Tab');
  await page.waitForTimeout(100); const zBlur=await span();
  check('typed Z value commits on focus loss', Math.abs(zBlur/zBefore-1)<1e-6,{zBefore,zBlur});
  await page.setViewportSize({width:1000,height:720});
  await page.waitForTimeout(150); await verifyLayout('resized');
  await page.setViewportSize({width:1200,height:802});
  await page.goto(base+'/aven.html?fixture=synthetic-2180');
  await page.waitForFunction(()=>window.Module?.avenTest?.model?.crs==='EPSG:2180');
  await menu('File','Open Terrain...');
  await page.getByRole('textbox').last().fill('/fixtures/synthetic-terrain.zip');
  await page.getByRole('button',{name:'OK',exact:true}).click();
  await page.waitForFunction(()=>Module.avenTest.terrain?.triangles===8192);
  const distance = () => page.evaluate(()=>{
    const c=Module.avenTest.camera,a=c.stations.find(s=>s.name==='synthetic.a').screen,b=c.stations.find(s=>s.name==='synthetic.b').screen;
    return {pixels:Math.hypot(a[0]-b[0],a[1]-b[1]),scale:c.scale,frames:Module.avenTest.frames};
  });
  const before=await distance(), canvas=await page.locator('#glcanvas-1').boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.5);
  await page.mouse.wheel(0,120);
  await page.waitForFunction(f=>Module.avenTest.frames>f,before.frames);
  const after=await distance(),ratio=after.pixels/before.pixels;
  check('first DEM wheel zoom is continuous', ratio>.7 && ratio<1.5, {before,after,ratio});
  await page.screenshot({path:'.playwright-mcp/ui-dem-first-zoom.png'});
  check('console errors',errors.length===0,errors);
  check('console warnings',warnings.length===0,warnings);
  const result={browser:page.context().browser().version(),checks,pass:checks.every(c=>c.pass)};
  await page.evaluate(r=>window.avenUIAcceptance=r,result);
  page.off('console',onConsole); page.off('pageerror',onError);
  return result;
}
