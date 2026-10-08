import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch({headless:true,channel:"chromium"});
const page = await browser.newPage();
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
const results=[];
try {
 for (const path of ["/","/imoveis","/contato","/login"]) {
  const response=await page.goto("http://127.0.0.1:3000"+path);
  results.push({name:"public route "+path,passed:response.status()===200,status:response.status()});
 }
 for(const path of ["/admin","/admin/leads","/admin/crm","/admin/corretores"]) {
  await page.goto("http://127.0.0.1:3000"+path);
  await page.waitForURL("**/login");
  results.push({name:"anonymous redirects "+path,passed:new URL(page.url()).pathname==="/login"});
 }
 const response=await page.goto("http://127.0.0.1:3000/apresentacao/synthetic-missing");
 const missing=await page.getByText("This page could not be found.").isVisible();
 results.push({name:"missing presentation renders not-found",passed:missing && [200,404].includes(response.status()),status:response.status()});
 results.push({name:"no browser runtime exceptions",passed:errors.length===0,errors});
 await writeFile("tests/crm-browser-results.json",JSON.stringify({environment:"local connected to staging",authentication:"anonymous",results},null,2)+"\n");
 console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed)},null,2));
 assert.ok(results.every(x=>x.passed));
} finally {await browser.close();}

