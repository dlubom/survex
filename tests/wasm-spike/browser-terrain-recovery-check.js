// Requires AVEN_EXTRA_DATA with the locally prepared Kataster assets.
async (page) => {
  const base=new URL(page.url()).origin,errors=[],warnings=[];
  const log=m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());};
  page.on('console',log);
  const open=async(item,path)=>{
    await page.getByRole('button',{name:'File',exact:true}).click();
    await page.getByText(item,{exact:true}).click();
    await page.getByRole('textbox').last().fill(path);
    await page.getByRole('button',{name:'OK',exact:true}).click();
  };
  await page.goto(base+'/aven.html?fixture=synthetic-2180');
  await page.waitForFunction(()=>window.Module?.avenTest?.frames>0);
  await open('Open Terrain...','/fixtures/synthetic-terrain.zip');
  await page.waitForFunction(()=>Module.avenTest.terrain?.triangles===8192);
  // Retained DEM has no coverage near the next survey. Aven must show its
  // real diagnostic after list recording, and remain able to load valid DEM.
  await open('Open...','/external/czarna.3d');
  const message=page.getByText('No terrain data near area of survey',{exact:true});
  await message.waitFor({state:'visible'});
  await page.screenshot({path:'.playwright-mcp/terrain-no-coverage-dialog.png'});
  await page.getByRole('button',{name:'OK',exact:true}).click();
  await open('Open Terrain...','/external/N49E019_VF1.hgt');
  await page.waitForFunction(()=>Module.avenTest.terrain?.triangles===9826,null,{timeout:60000});
  const state=await page.evaluate(()=>({file:Module.avenTest.model.file,triangles:Module.avenTest.terrain.triangles,gl:Module.avenGL}));
  const result={expectedDialog:true,state,errors,warnings,
    pass:!errors.length&&!warnings.length&&!state.gl.adapterErrors&&!state.gl.nativeErrors};
  await page.screenshot({path:'.playwright-mcp/terrain-recovered.png'});
  await page.evaluate(r=>window.avenTerrainRecovery=r,result);
  page.off('console',log);
  return result;
}
