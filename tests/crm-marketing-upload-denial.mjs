import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(url,'https://sdpqphiooiuglywcmkxv.supabase.co');assert.ok(key);
const directory=process.env.CRM_TEST_MEDIA_DIR;
assert.ok(directory,'Set CRM_TEST_MEDIA_DIR to a directory containing synthetic-photo.png, synthetic-material.pdf and synthetic-video.mp4');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const results=[];
for(const [name,mime,extension] of [['synthetic-photo.png','image/png','png'],['synthetic-material.pdf','application/pdf','pdf'],['synthetic-video.mp4','video/mp4','mp4']]) {
 const bytes=await readFile(`${directory}/${name}`);
 const path=`00000000-0000-4000-8000-000000099999/${randomUUID()}.${extension}`;
 const {data,error}=await client.storage.from('crm-marketing').upload(path,bytes,{contentType:mime,upsert:false});
 const denied=!!error&&([401,403].includes(Number(error.statusCode))||/row.level.security|unauthorized|not authorized/i.test(error.message));
 results.push({name:`anonymous ${mime} upload denied`,passed:!data&&denied,bytes:bytes.length,status:error?.statusCode,message:error?.message});
 if(data)throw new Error(`SECURITY FAILURE: anonymous upload succeeded at synthetic path ${path}. Preserve and investigate the test object before cleanup.`);
}
await writeFile('tests/crm-marketing-upload-denial-results.json',JSON.stringify({environment:'staging',authentication:'anonymous; NOT successful authorized upload',results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed)}));assert.ok(results.every(r=>r.passed));
