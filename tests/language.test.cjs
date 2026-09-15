// Run: npm ci && npm test
// Requires linkedom for a DOM-only integration test; no browser or AWS calls.
const fs = require('node:fs');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {parseHTML} = require('linkedom');
const missing = {en:new Set(), es:new Set()};
const esc = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function create(page, query, saved = {}, blocked = false) {
  const {window, document} = parseHTML(fs.readFileSync(page,'utf8'));
  // linkedom has no select.value setter; emulate the browser API used by the course.
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    configurable:true,
    get(){return [...this.options].find(option=>option.hasAttribute('selected'))?.value ?? this.options[0]?.value ?? ''},
    set(value){for(const option of this.options) option.toggleAttribute('selected', option.value===String(value))}
  });
  Object.defineProperty(window.HTMLInputElement.prototype, 'checked', {
    configurable:true, get(){return this.hasAttribute('checked')}, set(value){this.toggleAttribute('checked',Boolean(value))}
  });
  const storage = {...saved};
  const location = new URL(`https://example.test/rag-fieldguide/${page}${query}`);
  const ctx = {document, location, URL, navigator:{language:'en-US'}, console, setTimeout, clearTimeout,
    MutationObserver:window.MutationObserver, Event:window.Event,
    history:{state:null, replaceState(_,__,url){location.href=url}},
    localStorage:{getItem(key){if(blocked)throw Error('blocked');return storage[key]??null},setItem(key,value){if(blocked)throw Error('blocked');storage[key]=value}},
    addEventListener(){}, scrollTo(){}, Blob,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const run = code => vm.runInContext(code,ctx);
  for(const script of document.querySelectorAll('script[src]'))run(fs.readFileSync(script.getAttribute('src').split('?')[0],'utf8'));
  const source = page==='index.html'?'en':'es';
  const catalog=ctx.RAG_TRANSLATIONS[source];
  const pattern=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+Object.keys(catalog).sort((a,b)=>b.length-a.length).map(esc).join('|')+')(?![\\p{L}\\p{N}_])','gu');
  function audit(){
    ctx.RAGLanguage.set(source,false);
    function visit(element){
      if(element.nodeType!==1||element.matches('script,style,pre,code,textarea,[contenteditable],[data-no-translate]'))return;
      if(element.dataset.sourceLang&&element.dataset.sourceLang!==source)return;
      let text='';
      const check=()=>{const s=text.replace(/\s+/g,' ').trim();text='';if(!s||catalog[s])return;
        const rest=s.replace(pattern,'').replace(/\b(?:C\d|Q\d|RAG|FIELDGUIDE|Fieldguide|BM25|RRF|HNSW|FLAT|Redis|CloudFormation|Terraform|AWS|CDK|Python|Bedrock|Microsoft|GraphRAG|Self-RAG|Adaptive-RAG|TAG|TEXT|VECTOR|NUMERIC|KNN|Converse|Lambda|Titan|V2|Neptune|Analytics|OpenSearch|Serverless|S3|Step Functions|Harbor|Northstar|IDF|Recall|Amazon|HCL|YAML|top|k|N|b|tf|df)\b/g,'');
        if(/[\p{L}]{2,}/u.test(rest))missing[source].add(s);
      };
      for(const child of element.childNodes){if(child.nodeType===3)text+=child.data;else{check();visit(child)}}check();
      for(const name of ['aria-label','title','placeholder','alt']) if(element.hasAttribute(name)){text=element.getAttribute(name);check()}
    }
    visit(document.documentElement);
    ctx.RAGLanguage.set(source==='en'?'es':'en',false);
  }
  return {ctx,document,run,storage,audit};
}
(async()=>{
const main=create('index.html','?lang=es#lesson-1');
const {ctx,document:d,run}=main;
assert.equal(d.documentElement.lang,'es');
assert.equal(d.querySelector('#title').textContent,'La evidencia va primero');
assert.equal(d.querySelector('#basic-title'),null);
const course=run('JSON.stringify(COURSE)');
let pages=0;
for(let id=1;id<=12;id++){
 run(`go(${id})`);
 const total=run(`readingPages(${id}).length+5`);
 for(let p=0;p<total;p++){
  run(`lessonPagePositions[${id}]=${p};renderPracticalLesson()`);main.audit();pages++;
  if(d.querySelector('#aws-iac-method'))for(const tool of ['terraform','cloudformation','cdk']){const select=d.querySelector('#aws-iac-method');select.value=tool;select.onchange({target:select});main.audit()}
  if(d.querySelector('#aws-step-next'))for(let step=0;step<3;step++){d.querySelector('#aws-step-'+step).onclick();main.audit()}
  if(d.querySelector('#trace-next'))while(!d.querySelector('#trace-next').disabled){d.querySelector('#trace-next').onclick();main.audit()}
 }
 run(`changeTab('lab')`);main.audit();
 run(`changeTab('quiz')`);main.audit();
 for(const answer of d.querySelectorAll('[name=quiz]')){d.querySelectorAll('[name=quiz]').forEach(node=>node.checked=false);answer.checked=true;d.querySelector('#check-answer').onclick();main.audit();}
}
assert.equal(run('JSON.stringify(COURSE)'),course);
run("go(12);changeTab('lab')");ctx.RAGLanguage.refresh();
const notes=d.querySelector('#notes');notes.value='My text: evidencia & retrieval. C1 → C3';notes.oninput();
const stateBefore=run('JSON.stringify(state)');
const panel=d.querySelector('#panel'), noteBefore=notes.value;
ctx.RAGLanguage.set('en');ctx.RAGLanguage.set('es');ctx.RAGLanguage.set('en');
assert.equal(d.querySelector('#notes'),notes,'Switch preserves input node and event handlers');
assert.equal(notes.value,noteBefore,'User notes are unchanged');
assert.equal(d.querySelector('#panel'),panel);
assert.equal(run('JSON.stringify(state)'),stateBefore,'Progress and answers are unchanged');
assert.equal(d.querySelector('#notes').placeholder,'What is your retrieval flow? When do you expand the graph? What makes the system stop?');
run("go(1)");ctx.RAGLanguage.refresh();
d.querySelector('#aws-shortcut').onclick();d.querySelector('#page-next').onclick();ctx.RAGLanguage.refresh();
const codeBefore=[...d.querySelectorAll('pre,code')].map(x=>x.textContent).join('\n');
ctx.RAGLanguage.set('es');assert.equal([...d.querySelectorAll('pre,code')].map(x=>x.textContent).join('\n'),codeBefore);
// MutationObserver must localize newly generated UI without an explicit refresh.
run('go(2)');await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(d.querySelector('#title').textContent,ctx.RAG_TRANSLATIONS.en['BM25: the power of matching words']);
assert.equal(ctx.location.hash,'#lesson-2');
assert.equal(ctx.location.search,'?lang=es');
assert.equal(main.storage['rag-fieldguide-language'],'es');
const basic=create('basics.html','?lang=en#paso-1');
for(let page=1;page<=6;page++){
 basic.run(`basicGo(${page})`);basic.audit();
 if(page===1){basic.document.querySelector('#book-open').onclick();basic.audit()}
 if(page===2){basic.document.querySelector('#pipeline-answer').onclick();basic.audit()}
 if(page===3)for(let term=0;term<8;term++){basic.document.querySelector('#term-'+term).onclick();basic.audit()}
 if(page===4){
  for(const question of ['deadline','reopen','cost'])for(const selected of [['C6'],['C7'],['C4'],['C6','C7','C4']]){
   basic.run(`basicLab={question:${JSON.stringify(question)},selected:${JSON.stringify(selected)},answered:true};basicPractice()`);basic.audit();
  }
 }
 if(page===5)for(let i=0;i<3;i++){basic.document.querySelector('#scenario-'+i).onclick();for(const answer of ['yes','no']){basic.document.querySelector('#scenario-'+answer).onclick();basic.audit()}}
 if(page===6){basic.run('basicQuizAnswers={0:0,1:1,2:2}');basic.document.querySelector('#basic-quiz').onsubmit({preventDefault(){}});basic.audit()}
}
basic.run('basicGo(4);basicLab={question:"deadline",selected:["C6"],answered:true};basicPractice()');basic.ctx.RAGLanguage.refresh();
const sourceNode=basic.document.querySelector('#source-C6');const before=basic.run('JSON.stringify([basicState,basicLab,basicQuizAnswers,basicReadingMode])');
basic.ctx.RAGLanguage.set('es');basic.ctx.RAGLanguage.set('en');
assert.equal(sourceNode,basic.document.querySelector('#source-C6'));
assert.equal(before,basic.run('JSON.stringify([basicState,basicLab,basicQuizAnswers,basicReadingMode])'));
assert.match(basic.document.querySelector('#basic-answer').textContent,/30 days/);
assert.equal(basic.document.querySelector('#basic-counter').textContent,'STEP 4 OF 6');
assert.equal(basic.document.querySelector('#basic-question').value,'deadline');
assert(basic.document.querySelector('.sidebar a[href*="index.html"]').href.includes('lang=en'));
const persisted=create('basics.html','',{'rag-fieldguide-language':'es'});assert.equal(persisted.ctx.RAGLanguage.current,'es');
const override=create('basics.html','?lang=en',{'rag-fieldguide-language':'es'});assert.equal(override.ctx.RAGLanguage.current,'en');
const unavailable=create('index.html','?lang=es',{},true);unavailable.ctx.RAGLanguage.set('en');assert.equal(unavailable.document.documentElement.lang,'en');
const invalid=create('index.html','?lang=xx',{'rag-fieldguide-language':'es'});assert.equal(invalid.ctx.RAGLanguage.current,'es');
assert.deepEqual(Object.fromEntries(Object.entries(missing).map(([key,value])=>[key,[...value]])),{en:[],es:[]},'Rendered course text has translation coverage');
console.log(`PASS: ${pages} lesson pages, all 6 beginner steps, feedback, dynamic updates, code preservation, progress/notes, locale persistence, URL override and blocked storage.`);
console.log('Review unmatched text:',Object.fromEntries(Object.entries(missing).map(([k,v])=>[k,v.size])));
})().catch(error=>{console.error(error);process.exitCode=1});
