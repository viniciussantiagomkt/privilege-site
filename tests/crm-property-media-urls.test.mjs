import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const file=fileURLToPath(new URL('../lib/property-media.ts',import.meta.url)),m=new Module(file);
m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const {normalizePropertyImageUrl:normalize,attachPropertyImages:attach}=m.exports;
const path='/api/property-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp';
const old='https://privilege-site-old123-viniciussantiagomkts-projects.vercel.app';
test('first-party photos use the current origin instead of a protected previous preview',()=>{
 for(const origin of [old,'https://www.privilegeimoveispb.com.br','https://privilegeimoveispb.com.br'])assert.equal(normalize(origin+path),path);
 assert.equal(normalize(path),path);
});
test('foreign hosts, credentials, ports, tokens and other route families are never rewritten',()=>{
 for(const url of ['https://external.invalid'+path,old.replace('.vercel.app','.vercel.app.evil.invalid')+path,old.replace('https://','https://user:secret@')+path,old+':8443'+path,old+path+'?token=private',old+path+'#private',old+'/api/presentation-media/private/photo',old+path.replace('22222222','%2e%2e'),old.replace('https:','http:')+path])assert.equal(normalize(url),url);
});
test('cover, gallery and legacy arrays normalize before deduplication without changing property identity',()=>{
 const property={id:77,main_image_url:old+path,images:[path,old+path,'https://external.invalid/public.webp'],title:'Fixture'};
 const gallery=[{property_id:77,url:old+path,is_main:true,sort_order:0}];
 const [result]=attach([property],gallery);assert.equal(result.main_image_url,path);assert.deepEqual(result.images,[path,'https://external.invalid/public.webp']);
 assert.equal(result.id,77);assert.equal(property.main_image_url,old+path);assert.equal(gallery[0].url,old+path);
});
test('gallery main and empty media keep their original selection semantics',()=>{
 const [result]=attach([{id:77,images:[]}],[{property_id:77,url:old+path,is_main:true,sort_order:0}]);assert.equal(result.main_image_url,path);
 const [empty]=attach([{id:78,images:[]}]);assert.equal(empty.main_image_url,null);assert.deepEqual(empty.images,[]);
});
