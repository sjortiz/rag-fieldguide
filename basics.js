const basicEl = selector => document.querySelector(selector);
const basicEscape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASIC_PAGES = [
  ['¿Qué es RAG?', 'Un asistente que consulta antes de responder', 'RAG significa generación aumentada por recuperación: buscar información útil y dársela a un modelo para que prepare una respuesta.'],
  ['El recorrido', 'Dos momentos, una respuesta', 'Primero organizas los documentos. Después buscas los fragmentos que sirven para contestar cada pregunta.'],
  ['Palabras esenciales', 'Las piezas de un sistema RAG', 'Comprende la función de cada componente y explora después sus términos con ejemplos.'],
  ['Tu primer RAG', 'Qué permite afirmar una fuente', 'Aprende a distinguir un documento relacionado de una evidencia que realmente responde la pregunta.'],
  ['Cuándo usarlo', 'Elige la herramienta para cada necesidad', 'RAG resulta útil cuando la respuesta necesita información de una fuente que el asistente debe consultar.'],
  ['Comprueba tu base', 'Una base para seguir aprendiendo', 'Repasa los conceptos y abre “Ejemplo y práctica” para comprobarlos con tres preguntas.']
];
let basicState = {page:1,visited:[],complete:false};
try {
  const saved = JSON.parse(localStorage.getItem('rag-fieldguide-basics') || '{}');
  basicState.page = Number.isInteger(saved.page) && saved.page>=1 && saved.page<=6 ? saved.page : 1;
  basicState.visited = Array.isArray(saved.visited) ? [...new Set(saved.visited.filter(n=>Number.isInteger(n)&&n>=1&&n<=6))] : [];
  basicState.complete = saved.complete===true;
} catch {}
let basicPage = basicHashPage() || basicState.page;
let basicReadingMode = 'theory';
let basicBookOpen = false, basicPipeline = 'prepare', basicTerm = 0;
let basicLab = {question:'deadline',selected:[],answered:false};
let basicScenario = 0, basicScenarioAnswers = {}, basicQuizAnswers = {};
function basicHashPage(){const match=location.hash.match(/^#paso-([1-6])$/);return match?Number(match[1]):null}
function basicSave(){basicState.page=basicPage;try{localStorage.setItem('rag-fieldguide-basics',JSON.stringify(basicState))}catch{}}
function basicGo(page){if(page<1||page>6)return;basicReadingMode='theory';basicPage=page;location.hash=`paso-${page}`;renderBasics();basicEl('#basic-main').focus();window.scrollTo({top:0,behavior:'instant'})}
function basicDiagram(nodes, caption){return `<figure class="concept-diagram"><div class="diagram-flow">${nodes.map(([name,detail],i)=>`${i?'<span class="diagram-arrow" aria-hidden="true">→</span>':''}<div class="diagram-stage"><div class="diagram-node"><strong>${basicEscape(name)}</strong><span>${basicEscape(detail)}</span></div></div>`).join('')}</div><figcaption>${basicEscape(caption)}</figcaption></figure>`}
function basicSources(){return `<details class="basic-sources"><summary>Para seguir leyendo</summary><p><a href="https://aws.amazon.com/what-is/retrieval-augmented-generation/" target="_blank" rel="noopener noreferrer">Introducción a RAG de AWS ↗</a></p><p><a href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener noreferrer">Artículo original de Lewis y colaboradores (2020) ↗</a></p></details>`}
function renderBasics(){
  if(!basicState.visited.includes(basicPage))basicState.visited.push(basicPage);
  basicSave();
  document.title=`${BASIC_PAGES[basicPage-1][0]} · RAG desde cero`;
  basicEl('#basic-title').textContent=BASIC_PAGES[basicPage-1][1];
  basicEl('#basic-intro').textContent=BASIC_PAGES[basicPage-1][2];
  basicEl('#basic-counter').textContent=`PASO ${basicPage} DE 6`;
  basicEl('#basic-progress-label').textContent=basicState.complete?'Base completada ✓':`${basicState.visited.length} de 6 páginas exploradas`;
  basicEl('#basic-progress').value=basicState.visited.length;
  basicEl('#basic-nav').innerHTML=BASIC_PAGES.map((p,i)=>`<a class="lesson-link ${basicPage===i+1?'active':''}" href="#paso-${i+1}" ${basicPage===i+1?'aria-current="step"':''}><span class="lesson-num">${String(i+1).padStart(2,'0')}</span>${basicEscape(p[0])}</a>`).join('');
  basicEl('#basic-prev').disabled=basicPage===1;
  basicEl('#basic-next').textContent=basicPage===6?'Ir a la lección 1 →':'Siguiente →';
  const theory = BASIC_THEORY[basicPage-1];
  basicEl('#basic-content').innerHTML=`<div class="basic-reading-tabs" role="tablist" aria-label="Forma de aprender"><button id="basic-theory-tab" role="tab" aria-controls="basic-theory">Explicación</button><button id="basic-activity-tab" role="tab" aria-controls="basic-activity">Ejemplo y práctica</button></div><section id="basic-theory" role="tabpanel" aria-labelledby="basic-theory-tab"><article class="paper basic-theory-paper"><h2>${basicEscape(theory.title)}</h2>${theory.sections.map(([title,text])=>`<h3>${basicEscape(title)}</h3><p>${basicEscape(text)}</p>`).join('')}</article>${basicDiagram(theory.diagram,theory.caption)}<div class="page-keyidea"><span class="eyebrow">LA IDEA QUE DEBES RECORDAR</span><p>${basicEscape(theory.takeaway)}</p></div>${basicSources()}<button id="basic-try" class="primary basic-try">Ver el ejemplo y practicar →</button></section><section id="basic-activity" role="tabpanel" aria-labelledby="basic-activity-tab"></section>`;
  [basicWelcome,basicFlow,basicGlossary,basicPractice,basicUseCases,basicCheckpoint][basicPage-1]();
  const setMode = mode => {
    basicReadingMode=mode;
    ['theory','activity'].forEach(name=>{basicEl('#basic-'+name).hidden=name!==mode;basicEl('#basic-'+name+'-tab').setAttribute('aria-selected',String(name===mode));basicEl('#basic-'+name+'-tab').tabIndex=name===mode?0:-1});
  };
  basicEl('#basic-theory-tab').onclick=()=>setMode('theory');
  basicEl('#basic-activity-tab').onclick=()=>setMode('activity');
  basicEl('#basic-try').onclick=()=>{setMode('activity');basicEl('#basic-activity-tab').focus();basicEl('#basic-activity-tab').scrollIntoView({block:'start'})};
  ['theory','activity'].forEach(name=>basicEl('#basic-'+name+'-tab').onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'theory':e.key==='End'?'activity':name==='theory'?'activity':'theory';setMode(next);basicEl('#basic-'+next+'-tab').focus()}});
  setMode(basicReadingMode);
}
function basicWelcome(){
  basicEl('#basic-activity').innerHTML=`<div class="basic-card"><span class="eyebrow">PIENSA EN UN EXAMEN CON MATERIAL DE CONSULTA</span><h2>«¿Cuántos días tengo para reclamar una factura?»</h2><p>El asistente sabe redactar. Para conocer el plazo de esta organización necesita consultar su política.</p><div class="choice-buttons"><button class="secondary" id="book-closed" aria-pressed="${!basicBookOpen}">Sin consultar la política</button><button class="secondary" id="book-open" aria-pressed="${basicBookOpen}">Consultar la política</button></div><div id="book-result" class="result" aria-live="polite"></div><p class="hint">Ejemplo simulado. Un modelo también puede reconocer que no sabe; aquí vemos por qué consultar una fuente ayuda.</p></div><div class="page-keyidea"><span class="eyebrow">LA IDEA CENTRAL</span><p>RAG combina <strong>buscar evidencia</strong> y <strong>redactar una respuesta</strong>. La información recuperada se entrega al modelo como contexto; no hace falta reentrenarlo para cada documento.</p></div>${basicSources()}`;
  const update=()=>{basicEl('#book-closed').setAttribute('aria-pressed',String(!basicBookOpen));basicEl('#book-open').setAttribute('aria-pressed',String(basicBookOpen));basicEl('#book-result').innerHTML=basicBookOpen?'<span class="eyebrow">DOCUMENTO C6</span><p>«Los clientes deben reportar una disputa de factura dentro de 30 días».</p><hr><strong>Respuesta con apoyo:</strong><p>Tienes 30 días para reportarla. [C6]</p>':'<span class="eyebrow">FALTA LA FUENTE</span><p>No tengo la política de esta organización. No puedo confirmar su plazo.</p>'};
  basicEl('#book-closed').onclick=()=>{basicBookOpen=false;update()};basicEl('#book-open').onclick=()=>{basicBookOpen=true;update()};update();
}
function basicFlow(){
  basicEl('#basic-activity').innerHTML=`<div class="choice-buttons" role="group" aria-label="Momentos del sistema"><button id="pipeline-prepare" class="secondary">1. Preparar la biblioteca</button><button id="pipeline-answer" class="secondary">2. Responder una pregunta</button></div><div id="pipeline-result" aria-live="polite"></div><details class="basic-card"><summary>¿Por qué dividir los documentos?</summary><p>Un manual puede tener muchas páginas. Si alguien pregunta por el plazo de una reclamación, normalmente conviene recuperar el apartado que lo explica. Ese fragmento debe conservar su fuente y suficiente contexto para entenderlo.</p></details>${basicSources()}`;
  const update=()=>{basicEl('#pipeline-prepare').setAttribute('aria-pressed',String(basicPipeline==='prepare'));basicEl('#pipeline-answer').setAttribute('aria-pressed',String(basicPipeline==='answer'));basicEl('#pipeline-result').innerHTML=basicPipeline==='prepare'?basicDiagram([['Documentos','Políticas y reportes'],['Fragmentos','Pasajes con su fuente'],['Índice','Organizados para buscar']],'Esta preparación se repite cuando cambian las fuentes. El índice puede usar palabras, representaciones de significado o ambas.')+'<div class="page-keyidea"><p>Ejemplo: el apartado sobre reclamaciones se guarda con el identificador <strong>C6</strong>, para poder encontrarlo y citarlo.</p></div>':basicDiagram([['Pregunta','¿Cuál es el plazo?'],['Recuperar','Encontrar C6'],['Generar','Redactar con C6'],['Verificar','¿C6 apoya la respuesta?']],'La búsqueda selecciona evidencia; el modelo redacta a partir del contexto recibido.')+'<div class="page-keyidea"><p>Actualizar un documento no basta si el índice todavía conserva una versión anterior. Hay que mantener ambas partes sincronizadas.</p></div>'};
  basicEl('#pipeline-prepare').onclick=()=>{basicPipeline='prepare';update()};basicEl('#pipeline-answer').onclick=()=>{basicPipeline='answer';update()};update();
}
const BASIC_TERMS=[
 ['LLM / modelo de lenguaje','El componente que interpreta y genera texto.','Redacta la explicación del plazo usando el fragmento que le entregamos.'],
 ['Fuente / documento','El material del que obtenemos información verificable.','La política de reclamaciones es una fuente.'],
 ['Chunk / fragmento','Una parte del documento que conservamos junto con su origen.','El párrafo que contiene el plazo de 30 días.'],
 ['Índice','Una estructura que ayuda a encontrar información entre los documentos.','Permite localizar pasajes sobre facturas sin entregarle todo el archivo al modelo.'],
 ['Embedding / vector','Una lista de números que representa aspectos del contenido y permite comparar similitud.','Puede ayudar a relacionar “desacuerdo de cobro” con “disputa de factura”. La similitud no prueba que el dato sea correcto.'],
 ['Retrieval / recuperación','Buscar y seleccionar los fragmentos relevantes para una pregunta.','Elegir C6 cuando la pregunta pide el plazo de reclamación.'],
 ['Contexto','La información disponible para el modelo en esa interacción.','La pregunta, las instrucciones y los fragmentos seleccionados.'],
 ['Cita / referencia','Un vínculo o identificador que permite volver a la fuente.','[C6] indica dónde comprobar el plazo. Una cita debe realmente apoyar lo que se afirma.']
];
function basicGlossary(){
  basicEl('#basic-activity').innerHTML=`<div class="basic-glossary"><div class="basic-term-buttons" role="group" aria-label="Vocabulario">${BASIC_TERMS.map((t,i)=>`<button class="secondary" id="term-${i}" aria-pressed="${basicTerm===i}">${basicEscape(t[0])}</button>`).join('')}</div><div class="result" id="term-detail" aria-live="polite"></div></div><div class="page-keyidea"><span class="eyebrow">ANTES DE SEGUIR</span><p>Quédate con esta diferencia: <strong>recuperar</strong> es encontrar el material; <strong>generar</strong> es redactar con él. No son la misma operación.</p></div>`;
  const update=()=>{BASIC_TERMS.forEach((_,i)=>basicEl('#term-'+i).setAttribute('aria-pressed',String(basicTerm===i)));const t=BASIC_TERMS[basicTerm];basicEl('#term-detail').innerHTML=`<h2>${basicEscape(t[0])}</h2><p>${basicEscape(t[1])}</p><span class="eyebrow">EN NUESTRO EJEMPLO</span><p>${basicEscape(t[2])}</p>`};
  BASIC_TERMS.forEach((_,i)=>basicEl('#term-'+i).onclick=()=>{basicTerm=i;update()});update();
}
const BASIC_DOCUMENTS=[['C6','Política de facturas','Los clientes deben reportar una disputa de factura dentro de 30 días.'],['C7','Reapertura del muelle','El muelle 4 reabrió el 14 de mayo después de las reparaciones.'],['C4','Pieza de repuesto','Northstar suministró un sello de repuesto para la grúa 7 el 13 de mayo.']];
function basicEvidenceAnswer(question, selected){
  if(question==='deadline'&&selected.includes('C6'))return {supported:true,text:'Tienes 30 días para reportar la disputa de factura. [C6]',reason:'C6 contiene el plazo. Los demás documentos no hacen falta para responder esta pregunta.'};
  if(question==='reopen'&&selected.includes('C7'))return {supported:true,text:'El muelle 4 reabrió el 14 de mayo. [C7]',reason:'C7 da la fecha solicitada. C4 habla de una pieza; no establece la reapertura.'};
  return {supported:false,text:question==='cost'?'Los documentos seleccionados no indican cuánto costó la avería.':'No puedo confirmar ese dato con los documentos seleccionados.',reason:question==='cost'?'No hay ningún importe en estos tres documentos. Encontrar una pieza de repuesto no permite inventar su precio.':'Vuelve a buscar: necesitas el documento que contiene la respuesta, no solo uno que trata un tema parecido.'};
}
function basicPractice(){
  basicEl('#basic-activity').innerHTML=`<div class="basic-card"><label for="basic-question">1. Elige qué quieres saber</label><select id="basic-question"><option value="deadline">¿Cuántos días tengo para reclamar una factura?</option><option value="reopen">¿Cuándo reabrió el muelle 4?</option><option value="cost">¿Cuánto costó la avería de la grúa?</option></select><fieldset class="basic-documents"><legend>2. Selecciona la evidencia para el asistente</legend>${BASIC_DOCUMENTS.map(([id,title,text])=>`<label class="record"><span class="check-label"><input type="checkbox" id="source-${id}" value="${id}" ${basicLab.selected.includes(id)?'checked':''}><span><strong>${id} · ${basicEscape(title)}</strong><br>${basicEscape(text)}</span></span></label>`).join('')}</fieldset><button id="basic-generate" class="primary">3. Ver la respuesta con estas fuentes</button><div id="basic-answer" aria-live="polite"></div><p class="hint">Simulación guiada: tú seleccionas los documentos. Los textos resumen el caso ficticio Harbor; no se llama a un modelo real.</p></div><details class="basic-code"><summary>Ver la idea en pseudocódigo sencillo</summary><pre><code data-localize-code>pregunta = recibir_pregunta()
fragmentos = buscar_documentos_permitidos(pregunta)
si los fragmentos apoyan una respuesta:
    responder_con_citas(pregunta, fragmentos)
si no:
    explicar_qué_información_falta()</code></pre><p>En un sistema real hay que implementar y comprobar la búsqueda y la revisión del apoyo. Esta condición no se resuelve sola.</p></details>`;
  basicEl('#basic-question').value=basicLab.question;
  const update=()=>{basicEl('#basic-generate').disabled=basicLab.selected.length===0;if(!basicLab.answered){basicEl('#basic-answer').innerHTML='<p class="hint">Selecciona al menos una fuente y pide la respuesta. Después prueba la pregunta sobre el costo.</p>';return}const a=basicEvidenceAnswer(basicLab.question,basicLab.selected);basicEl('#basic-answer').innerHTML=`<div class="feedback ${a.supported?'good':'warn'}"><strong>${basicEscape(a.text)}</strong><p>${basicEscape(a.reason)}</p></div>`};
  basicEl('#basic-question').onchange=e=>{basicLab.question=e.target.value;basicLab.answered=false;update()};
  BASIC_DOCUMENTS.forEach(([id])=>basicEl('#source-'+id).onchange=e=>{basicLab.selected=e.target.checked?[...new Set([...basicLab.selected,id])]:basicLab.selected.filter(x=>x!==id);basicLab.answered=false;update()});
  basicEl('#basic-generate').onclick=()=>{if(!basicLab.selected.length)return;basicLab.answered=true;update()};update();
}
const BASIC_SCENARIOS=[
 ['Un asistente responde preguntas sobre el manual interno que cambia cada mes.',true,'RAG encaja: necesita consultar el manual vigente. Hay que actualizar el índice y respetar los permisos de acceso.'],
 ['Quieres reescribir con un tono más amable un párrafo que ya pegaste en el mensaje.',false,'El texto necesario ya está en el contexto. Puedes empezar sin una búsqueda adicional.'],
 ['Quieres saber el estado actual de un pedido guardado en una base de datos operativa.',false,'Empieza por una consulta autorizada a la API o a la base de datos. No supongas que una copia indexada refleja el estado actual. Puedes combinar esa consulta con documentos si la pregunta lo requiere.']
];
function basicUseCases(){
  basicEl('#basic-activity').innerHTML=`<div class="basic-card"><div class="choice-buttons" role="group" aria-label="Escenarios">${BASIC_SCENARIOS.map((_,i)=>`<button class="secondary" id="scenario-${i}" aria-pressed="${basicScenario===i}">Caso ${i+1}</button>`).join('')}</div><h2 id="scenario-question"></h2><p>¿Empezarías por RAG sobre documentos?</p><div class="choice-buttons"><button class="secondary" id="scenario-yes">Sí, necesito consultar documentos</button><button class="secondary" id="scenario-no">Empezaría de otra forma</button></div><div id="scenario-feedback" aria-live="polite"></div></div><div class="basic-limits"><h2>Tres cosas que RAG no garantiza</h2><details><summary>Que todos los datos sean correctos</summary><p>Una fuente puede estar desactualizada o equivocada. También puedes recuperar el fragmento incorrecto. Comprueba la fuente y su vigencia.</p></details><details><summary>Que la respuesta esté bien apoyada</summary><p>El modelo puede interpretar mal el contexto. Revisa que las citas sostengan cada afirmación y que reconozca lo que falta.</p></details><details><summary>Que todo documento sea accesible para todos</summary><p>La aplicación debe aplicar permisos antes de entregar información al modelo. Que un documento esté en el índice no significa que cualquier usuario pueda verlo.</p></details></div><details><summary>¿RAG y fine-tuning son lo mismo?</summary><p>No. RAG proporciona información durante la consulta. El fine-tuning ajusta el modelo mediante entrenamiento. Pueden combinarse, pero añadir documentos a un índice no equivale a entrenar el modelo.</p></details>`;
  const update=()=>{const s=BASIC_SCENARIOS[basicScenario];BASIC_SCENARIOS.forEach((_,i)=>basicEl('#scenario-'+i).setAttribute('aria-pressed',String(basicScenario===i)));basicEl('#scenario-question').textContent=s[0];const a=basicScenarioAnswers[basicScenario];basicEl('#scenario-yes').setAttribute('aria-pressed',String(a===true));basicEl('#scenario-no').setAttribute('aria-pressed',String(a===false));basicEl('#scenario-feedback').innerHTML=a===undefined?'':`<div class="feedback ${a===s[1]?'good':'warn'}"><strong>${a===s[1]?'Buena elección.':'Revisa qué información falta.'}</strong><p>${basicEscape(s[2])}</p></div>`};
  BASIC_SCENARIOS.forEach((_,i)=>basicEl('#scenario-'+i).onclick=()=>{basicScenario=i;update()});basicEl('#scenario-yes').onclick=()=>{basicScenarioAnswers[basicScenario]=true;update()};basicEl('#scenario-no').onclick=()=>{basicScenarioAnswers[basicScenario]=false;update()};update();
}
const BASIC_QUIZ=[
 ['¿Qué aporta la recuperación en RAG?',['Elige información relevante para la pregunta.','Garantiza que el modelo nunca se equivoque.','Reentrena el modelo con cada consulta.'],0,'Recuperar significa seleccionar evidencia. El modelo todavía necesita usarla correctamente.'],
 ['Un documento menciona una reparación, pero no su precio. ¿Qué debería responder el asistente si le preguntan el costo?',['Un precio probable.','Que el importe no está establecido por esas fuentes.','Que cualquier número con una cita es válido.'],1,'La mención de una reparación no establece cuánto costó. Hay que reconocer el dato que falta.'],
 ['¿Qué diferencia hay entre el buscador y el modelo que genera texto?',['Ambos son siempre el mismo componente.','El modelo de texto guarda necesariamente todos los documentos.','El buscador selecciona fragmentos; el modelo redacta con el contexto.'],2,'Son funciones distintas, aunque un servicio pueda ofrecerlas juntas.']
];
function basicCheckpoint(){
  basicEl('#basic-activity').innerHTML=`<form id="basic-quiz">${BASIC_QUIZ.map((q,i)=>`<fieldset class="basic-card"><legend>${i+1}. ${basicEscape(q[0])}</legend>${q[1].map((answer,j)=>`<label class="quiz-option"><input type="radio" name="basic-q-${i}" value="${j}" ${basicQuizAnswers[i]===j?'checked':''}><span>${basicEscape(answer)}</span></label>`).join('')}</fieldset>`).join('')}<button class="primary" type="submit">Comprobar mis respuestas</button></form><div id="basic-quiz-result" aria-live="polite">${basicState.complete?'<div class="feedback good">Ya completaste esta comprobación. Puedes repetirla para repasar.</div>':''}</div><div class="basic-next-path"><h2>Tu ruta a partir de aquí</h2><a href="index.html#lesson-1"><strong>1. Evidencia y respuestas</strong><span>Profundiza en lo que hace confiable una respuesta.</span></a><a href="index.html#lesson-2"><strong>2. Buscar por palabras y significado</strong><span>Continúa con BM25, vectores y la combinación de resultados.</span></a><a href="index.html#lesson-1"><strong>3. Construir en AWS</strong><span>En cada lección, abre “Construir en AWS”. Podrás elegir Terraform, CloudFormation o CDK en Python.</span></a><p class="hint">Tanto esta introducción como el curso completo están disponibles en español e inglés. Cambia el idioma en el menú superior.</p></div>`;
  BASIC_QUIZ.forEach((_,i)=>document.querySelectorAll(`[name="basic-q-${i}"]`).forEach(input=>input.onchange=()=>{basicQuizAnswers[i]=Number(input.value);basicEl('#basic-quiz-result').innerHTML=''}));
  basicEl('#basic-quiz').onsubmit=e=>{e.preventDefault();if(BASIC_QUIZ.some((_,i)=>!Object.hasOwn(basicQuizAnswers,i))){basicEl('#basic-quiz-result').innerHTML='<div class="feedback warn">Selecciona una respuesta para cada pregunta antes de comprobarlas.</div>';return}const score=BASIC_QUIZ.filter((q,i)=>basicQuizAnswers[i]===q[2]).length;if(score===3){basicState.complete=true;basicSave();basicEl('#basic-progress-label').textContent='Base completada ✓'}basicEl('#basic-quiz-result').innerHTML=`<div class="feedback ${score===3?'good':'warn'}"><strong>${score} de 3 respuestas correctas.</strong><p>${score===3?'Ya tienes una base para entrar al curso completo.':'Revisa las explicaciones y vuelve a intentarlo.'}</p>${BASIC_QUIZ.map((q,i)=>`<p><strong>${i+1}. ${basicQuizAnswers[i]===q[2]?'Correcta':'Para repasar'}:</strong> ${basicEscape(q[3])}</p>`).join('')}${score===3?'<a href="index.html#lesson-1">Continuar a la lección 1 →</a>':''}</div>`};
}
basicEl('#basic-prev').onclick=()=>basicGo(basicPage-1);
basicEl('#basic-next').onclick=()=>{if(basicPage<6)basicGo(basicPage+1);else location.href=window.RAGLanguage?window.RAGLanguage.href('index.html#lesson-1'):'index.html#lesson-1'};
window.addEventListener('hashchange',()=>{const p=basicHashPage()||1;if(p!==basicPage){basicReadingMode='theory';basicPage=p;renderBasics();basicEl('#basic-main').focus();window.scrollTo({top:0,behavior:'instant'})}});
renderBasics();
