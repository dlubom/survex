// Rendering-mode smoke checks through the existing menus, with screenshots.
async (page) => {
  const base=new URL(page.url()).origin, errors=[], warnings=[], checks=[];
  const log=m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());};
  const fail=e=>errors.push(String(e));
  page.on('console',log);page.on('pageerror',fail);
  const menu=async(group,item)=>{
    await page.getByRole('button',{name:group,exact:true}).click();
    await page.getByText(new RegExp('^(?:✓)?\\s*'+item.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')).click();
    await page.waitForTimeout(100);
  };
  await page.goto(base+'/aven.html?fixture=bundled-passage');
  await page.waitForFunction(()=>window.Module?.avenTest?.frames>0);
  await menu('View','Passage Tubes');
  const b=await page.locator('#glcanvas-1').boundingBox();
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);
  await page.mouse.down({button:'middle'});
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5+75,{steps:8});
  await page.mouse.up({button:'middle'});
  for (const [item,slug] of [
    ['Station Names','names'],['Crosses','crosses'],['Highlight Fixed Points','fixed-points'],
    ['Perspective','perspective'],['Textured Walls','textured'],
    ['Fade Distant Objects','fog'],['Smoothed Survey Legs','smooth-lines']
  ]) {
    const before=await page.evaluate(()=>Module.avenTest.frames);
    await menu('View',item);
    await page.waitForFunction(f=>Module.avenTest.frames>f,before);
    const gl=await page.evaluate(()=>Module.avenGL);
    checks.push({item,pass:!(gl.adapterErrors||gl.nativeErrors),frames:await page.evaluate(()=>Module.avenTest.frames)});
    await page.screenshot({path:'.playwright-mcp/mode-'+slug+'.png'});
    await menu('View',item);
  }
  for (const item of ['Colour by Depth','Colour by Date','Colour by Gradient','Colour by Length','Colour by Survey','Colour by Style']) {
    await page.getByRole('button',{name:'View',exact:true}).click();
    await page.getByText(/^\s*Colour by\s*▸$/).hover();
    await page.getByText(new RegExp('^(?:✓)?\\s*'+item+'$')).click();
    await page.waitForTimeout(100);
    const gl=await page.evaluate(()=>Module.avenGL);
    checks.push({item,pass:!(gl.adapterErrors||gl.nativeErrors)});
  }
  await menu('Controls','Side Panel');
  await page.waitForTimeout(100);
  checks.push({item:'Side Panel hidden',pass:await page.locator('#glcanvas-1').evaluate(e=>e.getBoundingClientRect().x<10)});
  await menu('Controls','Side Panel');
  await page.waitForTimeout(100);
  checks.push({item:'Side Panel restored',pass:await page.locator('#glcanvas-1').evaluate(e=>e.getBoundingClientRect().x>200)});
  const result={browser:page.context().browser().version(),checks,errors,warnings,
    pass:checks.every(c=>c.pass)&&!errors.length&&!warnings.length};
  await page.evaluate(r=>window.avenModesAcceptance=r,result);
  page.off('console',log);page.off('pageerror',fail);
  return result;
}
