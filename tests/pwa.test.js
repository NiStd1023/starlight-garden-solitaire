import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('dist/sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));

test('installable manifest uses a portable relative scope and all referenced icons exist', () => {
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));
  assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
  assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
  for(const icon of manifest.icons)assert.ok(fs.existsSync(`dist/${icon.src}`));
});

async function createWorker(path='/cards/'){
  const origin='https://example.test',scope=origin+path, handlers={}, data=new Map();
  const cache={
    async addAll(items){for(const item of items){const file=item==='./'?'index.html':item.replace(/^\.\//,'');assert.ok(fs.existsSync(`dist/${file}`),`missing cache asset: ${file}`);data.set(new URL(item,scope).href,{file});}},
    async match(request){return data.get(typeof request==='string'?new URL(request,scope).href:request.url)},
    async put(request,response){data.set(request.url,response)}
  };
  const deleted=[];
  const caches={open:async()=>cache,keys:async()=>['starlight-garden-v1.0.0','another-app'],delete:async key=>deleted.push(key)};
  const self={location:{origin},registration:{scope},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(type,fn)=>handlers[type]=fn};
  vm.runInNewContext(source,{self,caches,URL,fetch:async()=>{throw Error('offline')}});
  let promise; handlers.install({waitUntil:p=>promise=p}); await promise;
  return {handlers,deleted,data,scope,cache};
}

test('service worker caches the shell and serves game assets when offline under a subpath',async()=>{
  const worker=await createWorker();
  for(const path of ['index.html','app.js','engine.js','style.css','garden-bg.webp']){
    let response;worker.handlers.fetch({request:{url:worker.scope+path,method:'GET',mode:'cors'},respondWith:p=>response=p});
    assert.equal((await response).file,path);
  }
  let fallback;worker.handlers.fetch({request:{url:worker.scope+'some-route',method:'GET',mode:'navigate'},respondWith:p=>fallback=p});
  assert.equal((await fallback).file,'index.html');
});

test('updates delete only this game’s old caches and ignore other scopes',async()=>{
  const worker=await createWorker();let activation;worker.handlers.activate({waitUntil:p=>activation=p});await activation;
  assert.deepEqual(worker.deleted,['starlight-garden-v1.0.0']);
  let intercepted=false;worker.handlers.fetch({request:{url:'https://example.test/other/app.js',method:'GET'},respondWith:()=>intercepted=true});
  assert.equal(intercepted,false);
});
