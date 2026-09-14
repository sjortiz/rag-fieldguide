// AWS companion pages. These are learning materials; the static site makes no AWS calls.
const AWS_LESSONS = [
  {
    path:'Managed starting point', title:'Your first grounded answer on Bedrock',
    goal:'Build a small question-answering service over the Harbor records. Start here before adding custom retrieval logic.',
    stages:[[['Amazon S3','C1–C7 + metadata']],[['Bedrock Knowledge Base','Embed → OpenSearch Serverless']],[['Retrieve + Converse','Evidence → cited answer']]],
    boundary:'The knowledge base handles ingestion and retrieval. Your Python application passes retrieved passages to a Bedrock generation model and displays their sources.',
    steps:[
      ['Prepare the case file','Download the starter below. Run its prepare command to create seven text files and their metadata sidecars. Upload the harbor-data folder to an S3 prefix in your chosen AWS Region.'],
      ['Create and sync a knowledge base','In Amazon Bedrock, create a knowledge base with a vector store and that S3 data source. Select Titan Text Embeddings V2 and an OpenSearch Serverless vector store. Use a filterable text field for hybrid search; match the vector field to the embedding dimensions. Grant the knowledge base service role access to this source and store, then sync.'],
      ['Ask from your backend','Set AWS_REGION, KNOWLEDGE_BASE_ID and BEDROCK_MODEL_ID for a Converse-compatible model available to your account and Region. Authenticate using an AWS profile or execution role. Run the starter’s ask command. It retrieves scoped passages, then asks the model for an answer with source labels.']
    ],
    codeLabel:'Python SDK · core request (full runnable version below)',
    code:`retriever = boto3.client("bedrock-agent-runtime")
result = retriever.retrieve(
    knowledgeBaseId=KNOWLEDGE_BASE_ID,
    retrievalQuery={"text": question},
    retrievalConfiguration={"vectorSearchConfiguration": {
        "numberOfResults": 5,
        "overrideSearchType": "HYBRID"
    }}
)
# Pass result["retrievalResults"] to Bedrock Converse.`,
    check:'Ask “How long do customers have to report an invoice dispute?” Find C6 among the retrieved sources and confirm the answer says 30 days with a matching citation. A missing C6 is a retrieval issue to inspect before changing the generation prompt.',
    links:[['Create a knowledge base','https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-create.html'],['Retrieve API','https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html'],['Converse API','https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html']]
  },
  {
    path:'Custom retrieval path', title:'Make BM25 your measurable baseline',
    goal:'Search incident reports for exact names such as “Crane 7” before adding semantic retrieval.',
    stages:[[['S3 records','Text + stable chunk IDs']],[['OpenSearch index','Analyzed text → BM25']],[['Lambda backend','Return IDs, scores, text']]],
    boundary:'Use OpenSearch’s lexical ranking for the baseline. A Bedrock knowledge base HYBRID request combines retrieval methods; it is not an isolated BM25 experiment.',
    steps:[
      ['Index the records','Create a text field for content and keyword fields for chunk_id, case_id and access_group. Load C1–C7 with stable IDs. Keep this custom index separate from a Bedrock-managed index.'],
      ['Issue a lexical query','From an authenticated backend, send the query below to OpenSearch. The match clause scores text; filter clauses constrain scope without contributing relevance scores. Use your application’s trusted authorization scope.'],
      ['Inspect ranking errors','Try “Crane 7 inspection,” then “equipment that did not pass the check.” Record whether C2 and C3 appear in the top five. This gives the vector lesson a concrete baseline to improve.']
    ],
    codeLabel:'OpenSearch Query DSL · POST /harbor/_search',
    code:`{
  "size": 5,
  "query": {"bool": {
    "must": [{"match": {"content": "Crane 7 inspection"}}],
    "filter": [
      {"term": {"case_id": "harbor"}},
      {"term": {"access_group": "public"}}
    ]
  }}
}`,
    check:'Save the ordered chunk IDs for each query. Keep the corpus and filters identical when comparing this baseline with vector retrieval and fusion.',
    links:[['Search with OpenSearch','https://docs.aws.amazon.com/opensearch-service/latest/developerguide/searching.html'],['Lexical and hybrid search in Serverless','https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-configure-neural-search.html']]
  },
  {
    path:'Custom retrieval path', title:'Embed the question and the documents',
    goal:'Find “invoice dispute” when someone asks about a “billing disagreement.”',
    stages:[[['Bedrock Titan V2','Embed chunks once']],[['OpenSearch vectors','Store 1,024 dimensions']],[['Query embedding','Same model → nearest neighbors']]],
    boundary:'Bedrock produces the embeddings. The vector store indexes and compares them. Keep the same model, dimension count and normalization settings at ingestion and query time.',
    steps:[
      ['Choose an embedding contract','Use amazon.titan-embed-text-v2:0 with 1,024 dimensions and normalization enabled for this exercise. Configure the vector field to the same size and choose a supported distance metric. Record those settings with the index version.'],
      ['Embed and index','Send each chunk to Titan and store its returned vector beside the original text, metadata and chunk ID. Re-embed the corpus if you change the model or dimensions.'],
      ['Embed the query','Embed the question with the identical settings, then request nearest neighbors under the same authorization filters used for BM25. Compare C6’s rank for “billing disagreement.”']
    ],
    codeLabel:'Python SDK · embedding fragment',
    code:`runtime = boto3.client("bedrock-runtime")
response = runtime.invoke_model(
    modelId="amazon.titan-embed-text-v2:0",
    contentType="application/json", accept="application/json",
    body=json.dumps({
        "inputText": text,
        "dimensions": 1024, "normalize": True
    })
)
vector = json.loads(response["body"].read())["embedding"]
assert len(vector) == 1024`,
    check:'Check the stored vector length, then retrieve C6 using a paraphrase. A good vector distance still needs a source-text check before the answer is accepted.',
    links:[['Titan embedding models','https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html'],['OpenSearch vector search','https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vector-search.html']]
  },
  {
    path:'Custom retrieval path', title:'Own the fusion step in Lambda',
    goal:'Combine lexical and vector rankings while keeping the RRF calculation visible and testable.',
    stages:[[['OpenSearch BM25','Ranked chunk IDs'],['OpenSearch KNN','Ranked chunk IDs']],[['Lambda RRF','Sum 1 / (60 + rank)']],[['Bedrock generation','Top fused source passages']]],
    boundary:'This version implements RRF in your application. Do not assume a Bedrock HYBRID result uses this exact fusion formula or the same constant.',
    steps:[
      ['Retrieve two lists','Run lexical and vector searches over the same corpus version and allowed scope. Fetch enough candidates from each branch for your experiment, such as 20. Keep scores and ranks for diagnostics.'],
      ['Fuse by chunk ID','Run the Python function below in your backend. Ranks start at 1, missing documents contribute zero, and each document appears once per branch. Use a stable tie-break for repeatability.'],
      ['Compare the shortlist','Fetch the source text for the top fused IDs. Measure required-source coverage before generation; compare BM25, vectors and fusion on the same held-out questions.']
    ],
    codeLabel:'Python · executable fusion function',
    code:`def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        unique_ids = dict.fromkeys(ranking)
        for rank, chunk_id in enumerate(unique_ids, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (k + rank)
    return sorted(scores, key=lambda doc: (-scores[doc], doc))

rrf([["C2", "C3", "C1"], ["C1", "C2", "C6"]])
# ["C2", "C1", "C3", "C6"]`,
    check:'Confirm C2 wins the sample fusion. Then change the candidate depth and k separately to see whether required-source coverage improves enough to justify added latency.',
    links:[['RRF original paper','https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf'],['Bedrock search strategy settings','https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html']]
  },
  {
    path:'Redis option on AWS', title:'Keep the Redis search engine in the design',
    goal:'Deploy the same TEXT, TAG and VECTOR pattern from this lesson while using Bedrock for embeddings and generation.',
    stages:[[['Lambda in a VPC','Query + trusted scope']],[['Redis Cloud on AWS','TEXT · TAG · VECTOR']],[['Bedrock','Embeddings + generation']]],
    boundary:'For the Redis APIs taught here, choose Redis Cloud on AWS with Search enabled. ElastiCache for Valkey is a separate option: current AWS docs list full-text, TAG, vector and hybrid search for Valkey 9.0+ node-based clusters. Verify its supported commands; do not assume Redis command parity.',
    steps:[
      ['Select and connect the engine','Choose a Redis Cloud AWS region and plan supporting your required Search features and connectivity. Connect the backend through the supported private network setup; keep credentials in Secrets Manager. Check TLS and connectivity before indexing.'],
      ['Create the lesson schema','Define TEXT for content, TAG for case/access fields, and VECTOR for the embedding. Match dimensions and numeric format to the encoder; Titan’s JSON array must be encoded as the binary vector format expected by the Redis client command.'],
      ['Run both scoped searches','Apply the allowed case and access filters to lexical and KNN branches. Fuse in the application using the previous lesson, or use a supported native fusion API only after checking the deployed Redis version.']
    ],
    codeLabel:'Pseudocode · Redis adapter in your backend',
    code:`secret = secrets_manager.get(redis_secret_id)
redis = connect_tls(secret, private_endpoint)
vector = bedrock.embed(question)
query_bytes = encode_float32(vector)
scope = authorized_scope(current_user)
lexical = redis.search_text(question, scope)
semantic = redis.search_knn(query_bytes, scope)
candidates = rrf([lexical.ids, semantic.ids])
return fetch_allowed_chunks(candidates[:5], scope)`,
    check:'Ask a question that would need C8. Ensure it is excluded before fusion and never appears in the model context. If switching to ElastiCache, verify schema and query compatibility on the actual engine version.',
    links:[['Redis Cloud on AWS','https://redis.io/docs/latest/integrate/aws-redis-cloud/'],['ElastiCache search features and limits','https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/search-features-limits.html'],['Redis vector search','https://redis.io/docs/latest/develop/ai/search-and-query/query/vector-search/']]
  },
  {
    path:'Orchestration', title:'Route to a retrieval workflow',
    goal:'Send a specific fact to hybrid retrieval, a connected question to a graph, and a broad question to community reports.',
    stages:[[['Lambda selector','Rules → Bedrock if ambiguous']],[['Hybrid search','One fact'],['Neptune expansion','Connected facts'],['Report retrieval','Corpus-wide themes']],[['Evidence gate','Generate or recover']]],
    boundary:'Your router chooses a retrieval workflow. Model selection inside a managed model router is a different decision and does not implement this retrieval policy.',
    steps:[
      ['Define the destinations','Expose three backend functions with input/output contracts. Each returns permitted evidence with source IDs. Start with explicit rules for obvious requests, such as an invoice deadline versus causes across all reports.'],
      ['Use Bedrock for ambiguity','If the rules are inconclusive, ask a Converse-compatible model to choose from an allowlist of route names. Parse and validate its output. Invalid output falls back to hybrid retrieval; it must not become an arbitrary tool or query.'],
      ['Dispatch and audit','Use a Step Functions Choice state or a backend switch to select the function. Log route, reason, latency and downstream source coverage. A valid route label alone does not prove the selected evidence is enough.']
    ],
    codeLabel:'Pseudocode · constrained workflow selection',
    code:`allowed = {"hybrid", "local_graph", "global_reports"}
route = rule_based_route(question)
if route is None:
    prediction = bedrock_classify(question, allowed)
    route = validate_route(prediction, default="hybrid")
evidence = workflows[route](question, authorized_scope)
if evidence_is_sufficient(question, evidence):
    return grounded_answer(evidence)
return recovery_workflow(question, evidence)`,
    check:'Test three questions: “What is the dispute deadline?”, “Why was the May 12 delivery delayed?”, and “What caused delays across the reports?” Inspect both the chosen route and the evidence returned.',
    links:[['Bedrock Converse','https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html'],['Step Functions Choice states','https://docs.aws.amazon.com/step-functions/latest/dg/state-choice.html']]
  },
  {
    path:'Connected evidence', title:'Follow source-backed relationships in Neptune',
    goal:'Use the initial C1 match to discover C2 and C3, including the cause the original question never named.',
    stages:[[['Hybrid search','Find the May 12 event']],[['Neptune Analytics','Bounded relationship traversal']],[['Source resolver','Read C1 → C2 → C3']]],
    boundary:'This is your own graph schema and traversal policy. Store provenance on every relationship, then fetch original passages to support the final answer.',
    steps:[
      ['Create a small provenance graph','In Neptune Analytics, model the May 12 delay, Dock 4 unavailability, Crane 7 inspection failure and hydraulic leak as event-scoped nodes. Link them with CAUSED_BY edges carrying source_id, case_id and access_group. Keep the May 20 event separate.'],
      ['Expand from a retrieved seed','Resolve C1 to the May 12 delay node. Use a parameterized openCypher query with a fixed hop limit and filters on every traversed relationship. Treat queries below as examples for this custom schema, not the internal schema of managed GraphRAG.'],
      ['Resolve evidence and stop','Deduplicate edge source IDs, fetch permitted text from the source store, and check dates and causality. Stop at a small hop/evidence budget; a path without a source is not enough to state a cause.']
    ],
    codeLabel:'openCypher · custom event schema, parameters supplied separately',
    code:`MATCH p=(seed:Event {id: $seed})-[:CAUSED_BY*1..3]->(cause)
WHERE all(rel IN relationships(p)
  WHERE rel.case_id = $case_id
    AND rel.access_group = $access_group)
RETURN cause.id AS cause_id,
       [rel IN relationships(p) | rel.source_id] AS source_ids
LIMIT 20`,
    check:'Seed the May 12 event and verify the path resolves to C1, C2 and C3. Confirm that the May 20 truck delay is not used to explain the May 12 equipment failure.',
    links:[['Neptune Analytics query API','https://docs.aws.amazon.com/neptune-analytics/latest/userguide/query-APIs-execute-query.html'],['Accessing Neptune Analytics','https://docs.aws.amazon.com/neptune-analytics/latest/userguide/gettingStarted-accessing.html']]
  },
  {
    path:'Connected evidence', title:'Choose managed GraphRAG or reproduce the paper',
    goal:'Build graph-backed retrieval on AWS while keeping Microsoft’s community-summary method distinct from the managed AWS feature.',
    stages:[[['S3 documents','Source collection']],[['Graph construction','Bedrock + Neptune Analytics']],[['Graph-backed retrieval','Evidence → Bedrock answer']]],
    boundary:'Bedrock Knowledge Bases offers GraphRAG with Neptune Analytics. Its managed graph construction and retrieval do not guarantee the exact community-detection, report generation and global query procedure from Microsoft’s paper.',
    steps:[
      ['Try the managed route','Create a Bedrock knowledge base using the documented Neptune Analytics GraphRAG flow. Connect the S3 source, choose supported embedding and graph-construction models, grant the service role permissions, and sync. Check model and feature availability in your Region first.'],
      ['Decide whether paper fidelity matters','To study the Microsoft approach itself, run its reference indexing pipeline in an AWS compute job such as an ECS task. Configure supported model adapters and persist outputs in S3. Verify those adapters; Bedrock is not automatically a drop-in endpoint for every upstream configuration.'],
      ['Compare broad and local answers','For the paper-style path, prepare community reports offline, then use map/reduce-style query synthesis over those reports. Compare equipment and transport theme coverage against the managed route and plain top-k retrieval.']
    ],
    codeLabel:'Pseudocode · explicit Microsoft-style learning path',
    code:`# Offline indexing job; each claim retains source references.
graph = extract_entities_and_relations(source_chunks)
communities = hierarchical_community_detection(graph)
reports = summarize_communities(communities, source_chunks)
s3.save_versioned(reports)

# Query-time global answering; enforce report access scope.
partials = [answer_over_report(question, r) for r in allowed_reports]
answer = synthesize_supported_partials(partials)`,
    check:'Ask “What kinds of problems caused delivery delays?” Check that the answer includes equipment failure and late transport, with appropriate source references. Seven chunks demonstrate the flow; use a larger corpus to evaluate community retrieval meaningfully.',
    links:[['Build GraphRAG with Bedrock and Neptune','https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs-build.html'],['Microsoft GraphRAG reference implementation','https://github.com/microsoft/graphrag'],['Original GraphRAG paper','https://arxiv.org/abs/2404.16130']]
  },
  {
    path:'Evidence checks', title:'Add a claim critic after generation',
    goal:'Catch an answer that invents a disruption cost even when the rest of the explanation is correct.',
    stages:[[['Bedrock draft','Answer + citations']],[['Claim audit','Compare each claim to sources']],[['Supported','Publish cited answer'],['Missing support','Retrieve or qualify']]],
    boundary:'This application-level critic is inspired by Self-RAG. A separate Bedrock prompt does not reproduce Self-RAG’s trained reflection tokens or its training method.',
    steps:[
      ['Request structured claims','Ask the generator to return an answer with factual claims and the source IDs supporting each. Validate the structure and require every cited ID to exist in the retrieved evidence. Treat source text as data, including any instructions embedded in it.'],
      ['Audit support','Give a separate critic call the claims and their cited text. Classify support as supported, contradicted or not established. Pair the model judgment with deterministic checks for missing citations; audit a sample with humans.'],
      ['Handle gaps explicitly','If a necessary claim lacks support, route a targeted evidence request to recovery. If evidence stays unavailable, remove or qualify the claim. Do not turn the critic’s own confidence into evidence.']
    ],
    codeLabel:'Pseudocode · application-level claim audit',
    code:`draft = bedrock_generate(question, sources)
claims = parse_and_validate_claims(draft)
for claim in claims:
    if not citations_exist(claim, sources):
        claim.status = "not_established"
    else:
        claim.status = bedrock_check_support(claim, cited_text(claim))
if any_required_claim_lacks_support(claims):
    return recover_or_qualify(question, claims)
return render_with_verified_source_links(claims)`,
    check:'Insert “The delay cost $40,000” into a draft based only on C1–C7. The audit should mark it not established. A fluent model explanation cannot replace the missing cost record.',
    links:[['Self-RAG paper','https://arxiv.org/abs/2310.11511'],['Bedrock Converse API','https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html']]
  },
  {
    path:'Adaptive retrieval', title:'Spend retrieval effort where the question needs it',
    goal:'Give a simple definition, a document lookup and a multi-hop causal question different execution budgets.',
    stages:[[['Lambda classifier','No / single / multi-step']],[['Supplied context','No retrieval'],['Knowledge base','One retrieval'],['Step Functions','Bounded multi-step']],[['Quality gate','Check evidence coverage']]],
    boundary:'A prompted selector is a practical prototype. Adaptive-RAG’s paper learns a complexity classifier; matching that research method requires its training and evaluation procedure.',
    steps:[
      ['Label representative questions','Create examples for supplied-context answers, one-source lookups and multi-source questions. A no-retrieval path is appropriate only when the permitted supplied context is sufficient; do not use it for unknown company facts.'],
      ['Implement a selector','Begin with rules or a constrained Bedrock classification prompt. Validate the output and default ambiguous requests to retrieval. Keep routing labels separate from answer confidence.'],
      ['Set per-route budgets','Give the single-step path one retrieval, and the multi-step path a fixed evidence and iteration budget. Record route accuracy, source coverage, model tokens and elapsed time. Increase effort only when the evidence check finds a concrete gap.']
    ],
    codeLabel:'Pseudocode · routing policy, not a trained paper reproduction',
    code:`strategy = classify_complexity(question, supplied_context)
if strategy == "none" and context_is_sufficient:
    return answer_from_supplied_context()
if strategy == "single":
    evidence = retrieve_once(question)
    if coverage_passes(question, evidence):
        return grounded_answer(evidence)
return multi_step_workflow(
    question, max_retrieval_rounds=3, max_source_chunks=12
)`,
    check:'Use a supplied definition of RAG, the C6 invoice deadline, and the May 12 causal chain as three test cases. Compare a fixed multi-step policy against your adaptive policy for quality and total work.',
    links:[['Adaptive-RAG paper','https://arxiv.org/abs/2403.14403'],['Step Functions Choice states','https://docs.aws.amazon.com/step-functions/latest/dg/state-choice.html'],['Bedrock monitoring','https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html']]
  },
  {
    path:'Recovery workflow', title:'Make “I need more evidence” a bounded loop',
    goal:'Recover from C1’s missing cause by targeting the inspection record, then stop if the needed information is unavailable.',
    stages:[[['Assess evidence','Name one missing fact']],[['Choice state','Enough / gap / stop']],[['Targeted retrieval','New sources → assess'],['Final response','Supported answer or partial']]],
    boundary:'Use Step Functions Choice states for semantic evidence gaps. Retry/Catch handles operational errors such as throttling; repeating an unchanged query is not a semantic recovery strategy.',
    steps:[
      ['Define workflow state','Carry the question, allowed scope, current source IDs, missing fact, iteration count and budget through the workflow. Put large evidence payloads in S3 and pass references instead of growing state indefinitely.'],
      ['Implement assessment and retrieval tasks','Use Lambda tasks for Bedrock calls and your retrieval adapters. The assessor returns enough, gap or no_progress with a specific missing fact. A Choice state sends only actionable gaps into a changed query or graph expansion.'],
      ['Add terminal states','Stop when coverage passes, no useful source was added, or the round budget is exhausted. Use bounded backoff for transient service failures. Return the supported portion and name what remains unknown.']
    ],
    codeLabel:'Pseudocode · state-machine behavior',
    code:`for round in range(3):
    assessment = assess(question, evidence)
    if assessment.enough:
        return answer_with_citations(evidence)
    query = target_missing_fact(assessment.gap)
    new_sources = retrieve(query, authorized_scope)
    if not adds_useful_evidence(new_sources, evidence):
        break
    evidence = merge_deduplicate(evidence, new_sources)
return supported_partial_answer(evidence, remaining_gap)`,
    check:'Test both a recoverable gap (C1 → C2 → C3) and an unavailable fact (the disruption cost). Confirm the cost case terminates with uncertainty and does not keep calling the model.',
    links:[['Step Functions Choice','https://docs.aws.amazon.com/step-functions/latest/dg/state-choice.html'],['Retries and error handling','https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html'],['Bedrock service integration','https://docs.aws.amazon.com/step-functions/latest/dg/connect-bedrock.html']]
  },
  {
    path:'Capstone', title:'Build, measure and clean up your AWS system',
    goal:'Ship a small backend experiment, then decide which extra stages earn their latency, complexity and cost.',
    stages:[[['S3 test set','Questions + expected evidence']],[['Backend variants','BM25 / hybrid / graph']],[['Evaluation + CloudWatch','Quality · latency · usage']]],
    boundary:'The course runs entirely in your browser. Deploy the AWS backend separately, then connect an authenticated client if needed. Keep AWS credentials out of the public GitHub repository and browser JavaScript.',
    steps:[
      ['Establish the first working version','Use the starter from lesson 1. If adding a web client, place API Gateway and an authenticated Lambda backend in front of the AWS services. Give the execution role only the required model, retrieval and data permissions. Derive access filters on the backend.'],
      ['Compare three variants','Run a fixed held-out dataset through BM25, hybrid and hybrid-plus-graph. Store answers, source IDs, latency and usage in S3. Score source coverage and claim support. Bedrock RAG evaluations can evaluate supported knowledge bases or supplied inference outputs; use a compatible dataset format.'],
      ['Review cost and teardown','Inspect CloudWatch metrics and model usage alongside answer quality. Set an AWS Budget for your experiment. After exporting results, remove unused knowledge bases, search collections or domains, graph resources, data, functions and workflows; deleting a knowledge base alone is not a cleanup plan for every backing resource.']
    ],
    codeLabel:'Pseudocode · reproducible comparison',
    code:`for question in held_out_dataset:
    for variant in [bm25, hybrid, hybrid_plus_graph]:
        run = measured_call(variant, question)
        save_result(
            question_id=question.id, variant=variant.name,
            answer=run.answer, source_ids=run.source_ids,
            latency_ms=run.latency_ms, usage=run.usage
        )
compare_by_question_type(results)
review_unsupported_claims_and_access_violations(results)`,
    check:'Choose the simplest variant that meets your quality target. Keep graph expansion only if it helps connected questions in the measured results; keep recovery only if it closes gaps within your budget.',
    links:[['Bedrock RAG evaluation','https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-evaluation-create-randg.html'],['Bedrock monitoring','https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html'],['OpenSearch Serverless network controls','https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html']]
  }
];

function awsSetup() {
  return `<details class="aws-setup"><summary>Before you build · account, data and permissions</summary><p>Use one AWS account and choose a Region supporting your selected services and models. Start with the fictional public records C1–C7; the starter excludes restricted C8. Provisioning and model calls can incur charges, so set a budget and remove resources after the exercise.</p><p>Use an authenticated AWS profile locally or an execution role on AWS. Keep credentials in the backend. Give the knowledge base service role access to the S3 prefix, embedding model and vector store. OpenSearch network reachability, IAM permissions and data access policies are separate checks.</p><p>Use metadata filters from trusted application scope on every retrieval path. The starter uses a fixed public teaching scope; a production backend must derive it from the authenticated user.</p><p><a href="aws-starter.py" download>Download Python starter ↗</a> · <a href="aws-guide.md" download>Setup and run instructions ↗</a></p></details>`;
}

function renderAwsPage(id, type, content) {
  const item = AWS_LESSONS[id-1], esc = escapeLessonText;
  const links = `<nav class="aws-sources" aria-label="AWS lesson sources"><span class="eyebrow">OFFICIAL DOCS & PRIMARY SOURCES</span>${item.links.map(([title,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`).join('')}</nav>`;
  if (type === 'aws-architecture') {
    content.innerHTML = `<div class="aws-intro"><span class="aws-path">${esc(item.path)}</span><h3>${esc(item.title)}</h3><p>${esc(item.goal)}</p></div><figure class="concept-diagram aws-diagram"><div class="diagram-flow" aria-label="AWS architecture for ${esc(short[id-1])}">${item.stages.map((nodes,i)=>`${i?'<span class="diagram-arrow" aria-hidden="true">→</span>':''}<div class="diagram-stage">${nodes.map(([title,detail])=>`<div class="diagram-node"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`).join('')}</div>`).join('')}</div><figcaption>${esc(item.boundary)}</figcaption></figure>${awsSetup()}${links}`;
  } else {
    let step = 0;
    content.innerHTML = `<div class="aws-intro"><span class="aws-path">${esc(item.path)}</span><h3>${esc(item.title)}</h3></div><section class="aws-build"><div class="aws-step-tabs" role="group" aria-label="Build steps">${item.steps.map((s,i)=>`<button class="secondary" data-aws-step="${i}" id="aws-step-${i}" aria-pressed="${i===0}">${i+1}. ${esc(s[0])}</button>`).join('')}</div><div class="aws-step-detail" aria-live="polite"><span class="eyebrow" id="aws-step-count"></span><h3 id="aws-step-title"></h3><p id="aws-step-text"></p></div><div class="action-row"><button id="aws-step-back" class="secondary">← Previous step</button><button id="aws-step-next" class="primary">Next step →</button></div></section><details class="aws-code"><summary>${esc(item.codeLabel)}</summary><pre tabindex="0"><code>${esc(item.code)}</code></pre></details><details class="aws-check"><summary>Verify it · what should happen?</summary><p>${esc(item.check)}</p></details>${awsSetup()}${links}`;
    const update = () => {
      $('#aws-step-count').textContent = `STEP ${step+1} OF ${item.steps.length}`;
      $('#aws-step-title').textContent = item.steps[step][0];
      $('#aws-step-text').textContent = item.steps[step][1];
      item.steps.forEach((_,i)=>$('#aws-step-'+i).setAttribute('aria-pressed', String(i===step)));
      $('#aws-step-back').disabled = step===0;
      $('#aws-step-next').disabled = step===item.steps.length-1;
      $('#aws-step-next').textContent = step===item.steps.length-1 ? 'Now open “Verify it” below ↓' : 'Next step →';
    };
    item.steps.forEach((_,i)=>$('#aws-step-'+i).onclick=()=>{step=i;update()});
    $('#aws-step-back').onclick=()=>{if(step>0)step--;update()};
    $('#aws-step-next').onclick=()=>{if(step<item.steps.length-1)step++;update()};
    update();
  }
}
