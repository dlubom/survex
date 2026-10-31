// Regresses a known-length odd HGT read and verifies normal DEM loading after it.
// Browser input uses the existing dialogs; Module fields are observations only.
async (page) => {
  const base = new URL(page.url()).origin;
  const errors = [], warnings = [];
  const log = m => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  };
  const pageError = e => errors.push(String(e));
  const openTerrain = async path => {
    await page.getByRole('button', {name:'File', exact:true}).click();
    await page.getByText('Open Terrain...', {exact:true}).click();
    await page.getByRole('textbox').last().fill(path);
    await page.getByRole('button', {name:'OK', exact:true}).click();
  };
  page.on('console', log);
  page.on('pageerror', pageError);
  try {
    await page.goto(base + '/aven.html?fixture=synthetic-2180');
    await page.waitForFunction(() => window.Module?.avenTest?.frames > 0);
    await openTerrain('/fixtures/malformed-hgt/N49E019.hgt');
    await page.getByText('Terrain data has an odd byte count', {exact:true})
      .waitFor({state:'visible'});
    await page.screenshot({path:'.playwright-mcp/malformed-hgt-rejected.png'});
    await page.getByRole('button', {name:'OK', exact:true}).click();
    const rejected = await page.evaluate(() => ({
      file: Module.avenTest.model.file,
      terrain: !!Module.avenTest.camera.terrain,
      generatedTerrain: !!Module.avenTest.terrain
    }));
    await openTerrain('/fixtures/synthetic-terrain.zip');
    await page.waitForFunction(() => Module.avenTest.terrain?.triangles === 8192);
    const recovered = await page.evaluate(() => ({
      file: Module.avenTest.model.file,
      triangles: Module.avenTest.terrain.triangles,
      gl: Module.avenGL
    }));
    const result = {
      expectedDialog: true, rejected, recovered, errors, warnings,
      pass: !rejected.terrain && !rejected.generatedTerrain &&
        rejected.file === recovered.file && !errors.length && !warnings.length &&
        !recovered.gl.adapterErrors && !recovered.gl.nativeErrors
    };
    await page.evaluate(r => { window.avenMalformedHGT = r; }, result);
    return result;
  } finally {
    page.off('console', log);
    page.off('pageerror', pageError);
  }
}
