// Each trace is a worked example, not an execution of Redis or an LLM.
const PRACTICAL = [
  {
    use: 'A support assistant that answers from company policies.',
    question: '“How long do I have to challenge a bill?”',
    outcome: '“Report an invoice dispute within 30 days.” [C6]',
    flow: ['Find evidence', 'Write an answer', 'Attach the source'],
    code: [
      'question = user_question',
      'evidence = retrieve(question, allowed_sources)',
      'draft = generate(question, evidence)',
      'if claims_supported(draft, evidence):',
      '    return draft_with_citations(draft, evidence)',
      'else: return explain_missing_evidence()'
    ],
    trace: [[0,'Input: a billing question. The answer must come from this company’s policy.'],[1,'Retrieved: C6, the invoice-dispute policy.'],[2,'Draft: “You have 30 days to report a dispute.”'],[3,'Support check: C6 explicitly gives the 30-day deadline.'],[4,'Output: the answer plus a citation to C6.']],
    takeaway: 'Retrieve the source before writing the answer.',
    lab: 'Select the evidence yourself'
  },
  {
    use: 'Find maintenance records by equipment name or error code.',
    question: '“Crane 7 inspection”',
    outcome: 'A shortlist containing the inspection record, C3.',
    flow: ['Match terms', 'Score documents', 'Keep top results'],
    code: [
      'terms = tokenize(query)',
      'candidates = inverted_index.match_any(terms)',
      'for doc in candidates:',
      '    score[doc] = sum(IDF(term) *',
      '        tf(term, doc) * (k1 + 1) /',
      '        (tf(term, doc) + k1 * (1 - b + b * len(doc)/avglen))',
      '        for term in terms)',
      'return top_k(score, descending=True)'
    ],
    trace: [[0,'Break the question into searchable terms.'],[1,'Use the inverted index to find records containing those terms.'],[3,'Rare terms get more weight through IDF.'],[5,'Frequency saturates; document length affects the denominator.'],[7,'Return the highest-scoring candidates. The score is not truth confidence.']],
    takeaway: 'Exact identifiers are useful search anchors. Tune scores on real questions.',
    lab: 'Change the BM25 parameters'
  },
  {
    use: 'Find a policy when the customer uses different wording.',
    question: '“Can I challenge a charge?”',
    outcome: 'The “invoice dispute” policy is a useful candidate.',
    flow: ['Embed the query', 'Find neighbors', 'Read the evidence'],
    code: [
      'query_vector = embed_query(question)',
      'neighbors = vector_index.knn(',
      '    query_vector, k=5, filter=allowed_scope)',
      'chunks = load_sources(neighbors.ids)',
      'return keep_answer_bearing_chunks(question, chunks)'
    ],
    trace: [[0,'Use the query encoder compatible with the indexed document embeddings.'],[1,'Search for nearby vectors in the permitted scope.'],[3,'Load the source text: similarity alone does not answer the question.'],[4,'In this example, C6 supplies the policy and its deadline.']],
    takeaway: 'Semantic similarity finds candidates; source text establishes the answer.',
    lab: 'Explore vector distances'
  },
  {
    use: 'Combine exact-name search with paraphrase search.',
    question: 'Lexical: A → B → C. Semantic: B → D → A.',
    outcome: 'With RRF constant 60: B → A → D → C.',
    flow: ['Two result lists', 'Add rank contributions', 'One shortlist'],
    code: [
      'scores = default_map(0)',
      'for ranking in [lexical_results, vector_results]:',
      '    for rank, id in enumerate(unique(ranking), start=1):',
      '        scores[id] += 1 / (60 + rank)',
      'return sort_by_score(scores, descending=True)'
    ],
    trace: [[0,'Start with zero for every candidate.'],[1,'The lexical list contributes once; the vector list contributes once.'],[3,'B gets 1/62 + 1/61 = 0.032522.'],[3,'A gets 1/61 + 1/63 = 0.032266. B narrowly leads.'],[4,'Final order: B, A, D, C. No raw similarity scores were added.']],
    takeaway: 'Use the same candidate IDs in both lists. An absent candidate contributes zero.',
    lab: 'Change the rankings'
  },
  {
    use: 'Search a case archive with text, vectors, and access filters.',
    question: '“What caused Harbor’s May 12 delay?”',
    outcome: 'A fused shortlist containing only permitted Harbor records.',
    flow: ['Apply scope', 'Run both searches', 'Fuse results'],
    code: [
      'scope = case("harbor") AND readable_by(current_user)',
      'lexical = redis.text_search(question, filter=scope)',
      'semantic = redis.vector_search(embed(question), filter=scope)',
      'candidates = rrf([lexical, semantic])',
      'return load_chunks(candidates.take(5))'
    ],
    trace: [[0,'Scope includes the case and reader permissions; C8 is excluded.'],[1,'The lexical branch matches words inside that scope.'],[2,'The vector branch searches the same permitted records.'],[3,'Combine the two lists. Compatible Redis versions can fuse server-side with FT.HYBRID.'],[4,'Load the shortlist for the answer stage.']],
    takeaway: 'These are conceptual calls. A keyword-filtered KNN query is not automatically RRF.',
    lab: 'Compare the three search plans'
  },
  {
    use: 'Send questions to the workflow most likely to answer them.',
    question: '“What patterns recur across the incident reports?”',
    outcome: 'Choose the global-summary route.',
    flow: ['Inspect intent', 'Choose a route', 'Retrieve evidence'],
    code: [
      'if missing_scope(question): return ask_clarification()',
      'if exact_fact(question): route = "hybrid"',
      'else if whole_corpus_question(question): route = "global"',
      'else if connected_facts(question): route = "graph_local"',
      'else: route = llm_choose(allowed_routes, question)',
      'return execute(route, question, allowed_scope)'
    ],
    trace: [[0,'The question has enough scope: all incident reports.'],[1,'It asks for patterns, not a single exact fact.'],[2,'The whole-corpus rule selects global summaries.'],[5,'Run that route. The LLM tie-breaker is not needed for this example.']],
    takeaway: 'Use rules for clear cases and an LLM for unresolved choices.',
    lab: 'Route four questions'
  },
  {
    use: 'Trace an incident to the equipment problem behind it.',
    question: '“What equipment problem led to the May 12 delay?”',
    outcome: 'Delay → dock unavailable → failed inspection → hydraulic leak.',
    flow: ['Find a starting point', 'Follow relevant edges', 'Collect sources'],
    code: [
      'frontier = entities_in(initial_evidence)',
      'visited = set(frontier)',
      'for hop in range(2):',
      '    edges = relevant_readable_edges(frontier, question)',
      '    evidence += source_chunks(edges)',
      '    frontier = targets(edges) - visited',
      '    visited.update(frontier)',
      'return evidence_within_budget(evidence)'
    ],
    trace: [[0,'Start at Dock 4 being unavailable, documented in C1.'],[3,'Hop 1: follow the reason for the unavailable dock.'],[4,'C2 identifies the failed inspection of Crane 7.'],[3,'Hop 2: follow the reason for the inspection failure.'],[4,'C3 identifies the hydraulic leak.'],[7,'Keep C1, C2, and C3, including their source references.']],
    takeaway: 'Follow typed, source-backed relationships. A connection alone does not imply causation.',
    lab: 'Expand the graph yourself'
  },
  {
    use: 'Summarize recurring issues across many reports.',
    question: '“What caused the delays across Harbor’s reports?”',
    outcome: 'Cover both equipment disruption and transport delays.',
    flow: ['Build community reports', 'Answer per report', 'Combine themes'],
    code: [
      '# Before questions arrive',
      'graph = extract_entities_and_relations(documents)',
      'reports = summarize(detect_communities(graph))',
      '# At question time',
      'partial_answers = [answer(question, r) for r in reports]',
      'answer = combine_supported_points(partial_answers)',
      'return answer_with_source_provenance(answer)'
    ],
    trace: [[1,'Organize source-backed entities and relationships before querying.'],[2,'The example has equipment and transport reports. Real GraphRAG computes communities.'],[4,'The equipment report contributes May 12; the transport report contributes May 20.'],[5,'Combine those points without dropping either theme.'],[6,'Retain the links back to C1–C3 and C5.']],
    takeaway: 'Community summaries help with corpus-wide questions. One date lookup rarely needs them.',
    lab: 'Remove a report and compare'
  },
  {
    use: 'Catch unsupported claims before an assistant sends an answer.',
    question: 'Draft: “Northstar caused the failure. Dock 4 reopened May 14.”',
    outcome: 'Keep the reopening date; flag supplier responsibility as unestablished.',
    flow: ['Split the claims', 'Check source support', 'Revise or retrieve'],
    code: [
      'claims = split_into_claims(draft)',
      'for claim in claims:',
      '    verdict = check_against_sources(claim, evidence)',
      '    if verdict == "supported": keep(claim)',
      '    else: record_evidence_gap(claim)',
      'return answer_with_explicit_gaps()'
    ],
    trace: [[0,'Split the draft into supplier responsibility and reopening date.'],[2,'C4 records a replacement delivery after the failure. It does not establish responsibility.'],[4,'Record the missing causal evidence instead of presenting the claim as fact.'],[2,'C7 explicitly gives May 14 as the reopening date.'],[3,'Keep that claim with citation C7.'],[5,'Answer with the supported date and an explicit gap about responsibility.']],
    takeaway: 'Self-RAG-inspired application logic. The paper’s method also trains reflection tokens.',
    lab: 'Audit three claims'
  },
  {
    use: 'Spend extra retrieval effort only when a question needs it.',
    question: '“When did Dock 4 reopen?”',
    outcome: 'A single source lookup retrieves C7.',
    flow: ['Assess the need', 'Select effort', 'Check the result'],
    code: [
      'strategy = classifier(question)',
      'if needs_case_facts(question) AND strategy == "none":',
      '    strategy = "single"',
      'result = run(strategy, question, allowed_scope)',
      'if insufficient(result): return bounded_recovery(result)',
      'return result'
    ],
    trace: [[0,'The initial strategy selector considers the question.'],[1,'Our application policy requires retrieval for case-specific facts, even short questions.'],[2,'Choose at least a single retrieval step.'],[3,'C7 supplies the reopening date.'],[4,'The answer is supported, so recovery is unnecessary.'],[5,'Return May 14 with its source.']],
    takeaway: 'Adaptive-RAG trains a strategy classifier. The case-fact override here is a course design choice.',
    lab: 'Choose retrieval effort'
  },
  {
    use: 'Let an incident assistant search again without looping forever.',
    question: 'The first search finds C1, but the equipment cause is still missing.',
    outcome: 'Two targeted searches add C2 and C3, then the system stops.',
    flow: ['Name the gap', 'Change the search', 'Stop on support or limits'],
    code: [
      'for retry in range(2):',
      '    if enough_evidence(evidence): break',
      '    gap = identify_missing_fact(question, evidence)',
      '    new = retrieve(rewrite_for(gap), allowed_scope)',
      '    useful = new_relevant_sources(new, evidence)',
      '    if not useful: break',
      '    evidence += useful',
      'return supported_answer_or_gap(evidence)'
    ],
    trace: [[2,'Gap 1: why was Dock 4 unavailable?'],[3,'A targeted maintenance search retrieves C2.'],[6,'Add C2: the crane failed inspection.'],[2,'Gap 2: why did the inspection fail?'],[3,'The inspection search retrieves C3: hydraulic leak.'],[7,'The two-retry budget is exhausted, but the full chain is now supported. Return it.']],
    takeaway: 'Stop early when a retry adds no useful evidence. Never widen access as a retry.',
    lab: 'Try the recovery scenario'
  },
  {
    use: 'Decide whether a more complex RAG design earns its extra cost.',
    question: 'Does graph expansion improve our assistant enough to keep it?',
    outcome: 'Compare source coverage, answer quality, and latency on the same questions.',
    flow: ['Freeze test questions', 'Compare systems', 'Inspect tradeoffs'],
    code: [
      'systems = [bm25_only, hybrid, hybrid_plus_graph]',
      'for system in systems:',
      '    for question in held_out_questions:',
      '        result = system.answer(question)',
      '        log(evidence_recall(result), claim_support(result),',
      '            answer_completeness(result), latency(result))',
      'compare_by_question_type(logs)',
      'inspect_failures_before_choosing()'
    ],
    trace: [[0,'Use identical documents, questions, and compatible evaluation settings.'],[2,'Held-out questions were not used to tune the design.'],[4,'A relevant first passage can still leave a multi-hop answer incomplete. Measure coverage.'],[5,'Count unsupported claims and the cost of extra work.'],[6,'If graphs help multi-hop questions but slow date lookups, try selective routing.'],[7,'Review failures before deciding which architecture to keep.']],
    takeaway: 'No invented benchmark winner: run the comparison on your own corpus.',
    lab: 'Write your capstone plan'
  }
];

const escapeLessonText = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const LESSON_DIAGRAMS = [
  {caption:'The answer is only as well grounded as the evidence used to write it.', stages:[[['Question','Challenge a bill?']],[['Retrieve','Policy C6']],[['Generate','30-day deadline']],[['Verify + cite','Supported by C6']]]},
  {caption:'The index finds matches. BM25 scores those candidates using term statistics.', stages:[[['Query terms','Crane · 7 · inspection']],[['Inverted index','Find matching records']],[['BM25 score','Rarity + frequency + length']],[['Ranked records','Read the top candidates']]]},
  {caption:'Use compatible query and document encoders. Nearness is a retrieval signal, not proof.', stages:[[['Question','Query embedding'],['Documents','Stored embeddings']],[['Vector space','Compare distances']],[['Nearest neighbors','FLAT or HNSW']],[['Source text','Does it answer the question?']]]},
  {caption:'Both branches contribute ranks to the same candidate IDs. Higher fused scores come first.', stages:[[['BM25','A → B → C'],['Vectors','B → D → A']],[['RRF','Add 1 / (60 + rank)']],[['Fused ranking','B → A → D → C']]]},
  {caption:'Scope constrains both branches. Fusion combines the rankings; your application checks the answer.', stages:[[['Permitted scope','Harbor · readable records']],[['TEXT','Lexical ranking'],['VECTOR','Semantic ranking']],[['RRF fusion','In Redis or your app']],[['Source chunks','Answer with evidence']]]},
  {caption:'Route selection chooses a workflow. Reranking would instead reorder retrieved passages.', stages:[[['Question','What kind of evidence?']],[['Rules / selector','Choose a destination']],[['Hybrid','A specific fact'],['Local graph','Connected facts'],['Global summaries','Patterns across reports']]]},
  {caption:'Each causal link needs its own source. Keep the event and dates attached.', stages:[[['Delay','C1 · May 12']],[['Dock unavailable','C1–C2 · Dock 4']],[['Failed inspection','C2–C3 · Crane 7']],[['Hydraulic leak','C3 · inspection record']]]},
  {caption:'Community reports are prepared before questions arrive, then combined for corpus-wide answers.', stages:[[['Documents','Original source material']],[['Entity graph','Source-backed relations']],[['Communities','Equipment · transport']],[['Reports → answer','Cover both themes']]]},
  {caption:'This is the application-level claim audit. The Self-RAG paper learns reflection tokens during training.', stages:[[['Draft answer','Separate factual claims']],[['Check support','Compare with sources']],[['Supported','Keep + cite'],['Not established','State the gap / retrieve']]]},
  {caption:'Choose an initial strategy, then check the evidence it actually returns.', stages:[[['Question','Assess retrieval need']],[['Strategy selector','Complexity classifier']],[['No retrieval','Use supplied context'],['Single step','Find one source'],['Multiple steps','Connect several facts']]]},
  {caption:'A retry must address a specific gap. Stop when evidence is enough, unchanged, or the budget ends.', stages:[[['Evidence gap','Name the missing fact']],[['Targeted retrieval','Change the search']],[['New useful evidence?','Add it and check again'],['No progress / limit','Return a supported partial answer']]]},
  {caption:'Compare the same questions across systems, then inspect quality and cost by question type.', stages:[[['Held-out questions','Keep the test set fixed']],[['BM25 only','Baseline'],['Hybrid','Add fusion'],['Hybrid + graph','Add connected evidence']],[['Compare','Coverage · support · latency']]]}
];

const lessonPagePositions = {};
const readingPageCache = {};

function readingPages(id) {
  if (readingPageCache[id]) return readingPageCache[id];
  const template = document.createElement('template');
  template.innerHTML = COURSE[id-1].html;
  const pages = []; let pieces = []; let words = 0;
  const flush = () => { if (pieces.length) pages.push(pieces.join('\n')); pieces = []; words = 0; };
  for (const block of template.content.children) {
    const count = block.textContent.trim().split(/\s+/).length;
    // Never split a table, code block, or numbered list. Keep short labels with their example.
    if (words > 80 && words + count > 210) flush();
    pieces.push(block.outerHTML); words += count;
  }
  flush();
  return readingPageCache[id] = pages;
}

function lessonDiagram(id) {
  const d = LESSON_DIAGRAMS[id-1];
  return `<figure class="concept-diagram"><div class="diagram-flow" aria-label="${escapeLessonText(short[id-1])} process">${d.stages.map((nodes,i)=>`${i?'<span class="diagram-arrow" aria-hidden="true">→</span>':''}<div class="diagram-stage">${nodes.map(([title,detail])=>`<div class="diagram-node"><strong>${escapeLessonText(title)}</strong><span>${escapeLessonText(detail)}</span></div>`).join('')}</div>`).join('')}</div><figcaption>${escapeLessonText(d.caption)}</figcaption></figure>`;
}

function renderPracticalLesson() {
  const id = lesson, item = PRACTICAL[id-1], readings = readingPages(id);
  const pages = [
    {name:'The big picture',type:'diagram'},
    {name:'The concept',type:'reading',html:readings[0]},
    {name:'Practical application',type:'application'},
    {name:'Pseudocode walkthrough',type:'code'},
    {name:'Build on AWS · Architecture',type:'aws-architecture'},
    {name:'Build on AWS · Implementation',type:'aws-build'},
    ...readings.slice(1).map((html,i)=>({name:`Examples & reading ${i+1}`,type:'reading',html}))
  ];
  let page = Math.min(lessonPagePositions[id] || 0, pages.length-1);
  const changePage = next => { lessonPagePositions[id] = next; renderPracticalLesson(); $('#page-heading').focus(); };
  const current = pages[page];
  $('#panel').innerHTML = `<div class="reading-navigation"><label for="reading-page">Within this lesson</label><select id="reading-page">${pages.map((p,i)=>`<option value="${i}" ${i===page?'selected':''}>${i+1}. ${escapeLessonText(p.name)}</option>`).join('')}</select><span class="page-counter">${page+1} / ${pages.length}</span><button id="aws-shortcut" class="secondary aws-shortcut">Build on AWS ↗</button></div><div class="reading-page-heading"><h2 id="page-heading" tabindex="-1">${escapeLessonText(current.name)}</h2><span class="eyebrow">${current.type.startsWith('aws-')?'AWS BUILD GUIDE':current.type==='reading'?'FULL LESSON':'WORKED EXAMPLE'}</span></div><div id="reading-content"></div><div class="reading-pagination"><button id="page-back" class="secondary" ${page===0?'disabled':''}>← Previous page</button><button id="page-next" class="primary">${page===pages.length-1?'Try the experiment →':'Next page →'}</button></div>`;
  const content = $('#reading-content');
  if (current.type === 'diagram') {
    content.innerHTML = `${lessonDiagram(id)}<div class="page-keyidea"><span class="eyebrow">THE IDEA TO KEEP</span><p>${escapeLessonText(item.takeaway)}</p></div>`;
  } else if (current.type === 'reading') {
    content.innerHTML = `<article class="paper">${current.html}</article>`;
  } else if (current.type === 'application') {
    content.innerHTML = `<div class="application-card"><span class="eyebrow">WHERE YOU WOULD USE THIS</span><h2>${escapeLessonText(item.use)}</h2><div class="example-pair"><div><span class="example-label">INPUT</span><p>${escapeLessonText(item.question)}</p></div><div><span class="example-label">DESIRED OUTPUT</span><p>${escapeLessonText(item.outcome)}</p></div></div></div><ol class="mini-flow">${item.flow.map((s,i)=>`<li><span>${i+1}</span>${escapeLessonText(s)}</li>`).join('')}</ol><p class="hint">The next page walks through the pseudocode. The Experiment tab lets you make the decisions yourself.</p>`;
  } else if (current.type.startsWith('aws-')) {
    renderAwsPage(id, current.type, content);
  } else {
    let step = -1;
    content.innerHTML = `<section class="walkthrough"><div class="walkthrough-heading"><p>Pseudocode · illustrative trace, not live model calls</p><span id="trace-count" class="badge">Ready</span></div><div class="code-lines" role="region" aria-label="Illustrative pseudocode" tabindex="0">${item.code.map((line,i)=>`<div class="code-line" data-code-line="${i}"><span class="line-number" aria-hidden="true">${i+1}</span><code>${escapeLessonText(line)}</code></div>`).join('')}</div><div class="trace-panel"><p id="trace-explanation" aria-live="polite">Step through the example to see what each operation contributes.</p><div class="trace-controls"><button id="trace-back" class="secondary" disabled>← Back</button><button id="trace-next" class="primary lime">Step through →</button><button id="trace-reset" class="quiet" disabled>Reset</button></div></div></section>`;
    const update = () => {
      document.querySelectorAll('[data-code-line]').forEach(line => line.classList.toggle('current-line',step>=0 && +line.dataset.codeLine === item.trace[step][0]));
      $('#trace-count').textContent = step < 0 ? 'Ready' : `${step+1} / ${item.trace.length}`;
      $('#trace-explanation').textContent = step < 0 ? 'Step through the example to see what each operation contributes.' : item.trace[step][1];
      $('#trace-back').disabled = step < 0; $('#trace-reset').disabled = step < 0;
      $('#trace-next').disabled = step === item.trace.length-1;
      $('#trace-next').textContent = step < 0 ? 'Step through →' : step === item.trace.length-1 ? 'Example complete ✓' : 'Next step →';
    };
    $('#trace-back').onclick=()=>{if(step>=0)step--;update()};
    $('#trace-next').onclick=()=>{if(step<item.trace.length-1)step++;update()};
    $('#trace-reset').onclick=()=>{step=-1;update()};
  }
  $('#aws-shortcut').onclick=()=>changePage(4);
  $('#reading-page').onchange=e=>changePage(+e.target.value);
  $('#page-back').onclick=()=>{if(page>0)changePage(page-1)};
  $('#page-next').onclick=()=>page<pages.length-1?changePage(page+1):changeTab('lab');
}
