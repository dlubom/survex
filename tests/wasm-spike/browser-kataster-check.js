// Requires AVEN_EXTRA_DATA prepared by prepare-kataster.py. UI actions only;
// Module observations describe the real Aven parser, camera and submitted mesh.
async (page) => {
  const base=new URL(page.url()).origin, errors=[],warnings=[],checks=[];
  const log=m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());};
  const fail=e=>errors.push(String(e));
  const menu=async(group,item)=>{
    await page.getByRole('button',{name:group,exact:true}).click();
    await page.getByText(new RegExp('^(?:✓)?\\s*'+item.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')).click();
  };
  const open=async(item,path)=>{await menu('File',item);await page.getByRole('textbox').last().fill(path);await page.getByRole('button',{name:'OK',exact:true}).click();};
  const snapshots={};
  page.on('console',log);page.on('pageerror',fail);
  try {
    await page.setViewportSize({width:1200,height:802});
    for(const [name,model,terrain,triangles] of [
      ['czarna','czarna.3d','N49E019_VF1.hgt',9826],
      ['czarnaCrop','czarna.3d','czarna-terrain.zip',9826],
      ['full','kataster.3d','N49E019_VF1.hgt',2369843]
    ]) {
      await page.goto(base+'/aven.html');
      await page.waitForFunction(()=>window.Module?.avenTest?.frames>0);
      await open('Open...','/external/'+model);
      await page.waitForFunction(f=>Module.avenTest.model.file.endsWith(f),model);
      await open('Open Terrain...','/external/'+terrain);
      await page.waitForFunction(n=>Module.avenTest.terrain?.triangles===n,triangles,{timeout:30000});
      await page.waitForTimeout(200);
      await menu('View','Station Names');
      const before=await page.evaluate(()=>Module.avenTest.camera);
      const b=await page.locator('#glcanvas-1').boundingBox();
      for(const [button,dx,dy] of [['left',65,0],['middle',0,65],['right',30,20]]) {
        await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);
        await page.mouse.down({button});await page.mouse.move(b.x+b.width*.5+dx,b.y+b.height*.5+dy,{steps:5});await page.mouse.up({button});
      }
      await page.mouse.wheel(0,120);await page.waitForTimeout(100);
      snapshots[name]=await page.evaluate(()=>({state:Module.avenTest,gl:Module.avenGL,heapBytes:HEAPU8.length}));
      const after=snapshots[name].state.camera;
      const pass=after.pan!==before.pan&&after.tilt!==before.tilt&&after.scale!==before.scale&&after.translation.some((v,i)=>v!==before.translation[i])&&after.names&&!snapshots[name].gl.adapterErrors&&!snapshots[name].gl.nativeErrors;
      checks.push({name,pass,triangles,heapBytes:snapshots[name].heapBytes,before:{pan:before.pan,tilt:before.tilt,scale:before.scale,translation:before.translation},after:{pan:after.pan,tilt:after.tilt,scale:after.scale,translation:after.translation}});
      await page.screenshot({path:'.playwright-mcp/kataster-'+name+'-final.png'});
    }
    const result={checks,errors,warnings,pass:checks.every(c=>c.pass)&&!errors.length&&!warnings.length};
    await page.evaluate(v=>{window.avenKatasterAcceptance=v.result;window.avenKatasterSnapshots=v.snapshots;},{result,snapshots});
    return result;
  } finally {page.off('console',log);page.off('pageerror',fail);}
}
