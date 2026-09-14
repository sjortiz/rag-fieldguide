# Build the RAG Fieldguide on AWS

Every lesson now includes **Build on AWS · Architecture** and **Build on AWS · Implementation** pages. Use the **Build on AWS** button within a lesson to jump there. Build steps are interactive; expand the code and verification panels as you go.

These are educational deployment instructions. The public course does not connect to AWS. The Python starter calls an existing knowledge base and model when you run `ask`; `prepare` only creates local files. The guide was checked against official documentation in September 2026.

## Choose a path

| Path | Components | What you learn |
| --- | --- | --- |
| Managed baseline | S3 → Bedrock Knowledge Bases → OpenSearch Serverless → Retrieve + Converse | Ingestion, retrieval, citations |
| Custom retrieval | S3 + Bedrock embeddings + OpenSearch + Lambda | BM25, vector search and explicit RRF |
| Redis alternative | Redis Cloud on AWS + Bedrock + your backend | The Redis TEXT/TAG/VECTOR pattern |
| Connected evidence | Neptune Analytics + source resolver | Bounded graph expansion and provenance |
| Adaptive pipeline | Lambda + Step Functions + Bedrock | Routing, claim checks and recovery |

Use the managed baseline first. Custom-search lessons use a separate application-owned index; do not modify a knowledge base's managed index to run a different schema experiment.

## First working example

### 1. Prepare the public Harbor records

Download [aws-starter.py](aws-starter.py). Use Python 3.9 or later:

```sh
python3 aws-starter.py prepare --output harbor-data
```

This writes seven text files and seven `.metadata.json` sidecars. It refuses to overwrite those files. C8 is excluded. Each sidecar sets `case_id=harbor`, `access_group=public`, and the matching `chunk_id`.

Create an S3 bucket/prefix for the exercise and upload **all 14 files** together. For example, after substituting your own bucket name:

```sh
aws s3 sync harbor-data/ s3://YOUR_BUCKET/harbor/
```

See [Bedrock metadata](https://docs.aws.amazon.com/en_en/bedrock/latest/userguide/kb-metadata.html) for source metadata and filtering.

### 2. Create a Bedrock knowledge base

In a Region supporting your selected models and services:

1. Create a knowledge base **with a vector store**, using the S3 prefix as its data source.
2. Select Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`). For this example use 1,024 dimensions.
3. Use an OpenSearch Serverless vector store. The vector index must match the embedding dimensions; hybrid retrieval also needs a filterable text field. Follow the console's supported quick-create flow or the documented existing-store configuration.
4. Configure the knowledge base service role, S3 permissions, model permissions, and OpenSearch data/network access. A reachable endpoint alone does not grant data access.
5. Sync the data source. Wait for ingestion to finish and investigate any failed documents before testing.

References: [create a knowledge base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-create.html), [vector-store setup](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html), [search strategy configuration](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html).

### 3. Configure your local caller

Use your organization's normal AWS CLI profile or role authentication. On AWS, attach an execution role instead of storing credentials in code. The starter uses the SDK's default credential chain.

The caller needs `bedrock:Retrieve` on your knowledge base and the relevant model invocation permissions, including `bedrock:InvokeModel`, for your chosen generation model or inference profile. The ingestion service role is separate. Check additional model/profile permissions and access requirements for your selection.

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install boto3

export AWS_REGION="YOUR_SUPPORTED_REGION"
export KNOWLEDGE_BASE_ID="YOUR_KNOWLEDGE_BASE_ID"
export BEDROCK_MODEL_ID="YOUR_CONVERSE_MODEL_OR_INFERENCE_PROFILE_ID"
# If using a named local AWS profile:
export AWS_PROFILE="YOUR_PROFILE_NAME"
```

Replace the placeholders. Select a **Converse-compatible text generation model**; the Titan embedding model is not the generation model. Model availability and inference-profile requirements depend on the model and Region.

### 4. Retrieve, then generate

```sh
python3 aws-starter.py ask "How long do customers have to report an invoice dispute?"
python3 aws-starter.py ask "Why was Harbor's May 12 delivery delayed?"
python3 aws-starter.py ask "How much did the May 12 disruption cost?"
```

Expected checks:

- Deadline: retrieve C6 and answer **30 days**, with the matching source label.
- Cause: require C1, C2 and C3 to support the entire causal chain. If one is missing, proceed to the graph/recovery lessons rather than pretending the evidence is complete.
- Cost: the public corpus has no amount. The answer should say the cost is unknown.

The script prints the retrieved text and locations so you can inspect support. Its source labels (`S1`, `S2`, …) refer to retrieval results; their `chunk_id` values map to the course's C1–C7 records. It is a baseline, without an automated claim critic or graph expansion.

If your store does not support HYBRID, configure the documented store/field requirements or use an explicit semantic-only comparison:

```sh
python3 aws-starter.py ask "What is a billing disagreement?" --search-type SEMANTIC
```

Do not silently treat that run as hybrid. See the [Retrieve API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html) and [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html).

## The next builds

| Lesson | AWS build | Verify |
| --- | --- | --- |
| 1 · Foundations | S3 + Bedrock knowledge base + Python starter | C6 supports the deadline |
| 2 · BM25 | OpenSearch text index and scoped match query | Record exact-name retrieval ranks |
| 3 · Vectors | Titan V2 embeddings and a compatible vector index | Retrieve paraphrased wording |
| 4 · RRF | Lambda fuses two lists by stable chunk ID | Sample fusion puts C2 first |
| 5 · Redis | Redis Cloud on AWS, scoped TEXT/TAG/VECTOR queries | Restricted evidence never enters context |
| 6 · Routing | Rules/Bedrock selector with a validated route allowlist | Choose an evidence workflow correctly |
| 7 · Graph expansion | Custom Neptune event graph with source IDs | C1 → C2 → C3 supports the cause |
| 8 · GraphRAG | Managed Bedrock + Neptune, or a paper-style indexing job | Cover both equipment and transport themes |
| 9 · Self-RAG | A separate claim-support audit | Reject an invented cost |
| 10 · Adaptive-RAG | Route-specific retrieval budgets | Compare quality and total work |
| 11 · Recovery | Step Functions gap/stop decisions | Recover once useful; terminate when stuck |
| 12 · Capstone | Evaluation dataset + monitoring + cleanup | Select the simplest sufficient system |

The course pages contain each architecture, build sequence, code example, verification task and sources.

## Important implementation distinctions

- **RRF:** the custom backend uses the stated formula. A Bedrock HYBRID response does not establish the exact fusion algorithm or constant used internally.
- **Redis versus Valkey:** current ElastiCache docs list full-text, TAG, vector and hybrid search for **Valkey 9.0+ node-based clusters**. Validate supported commands before porting a Redis example. See [ElastiCache search features](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/search-features-limits.html).
- **GraphRAG:** the [managed Bedrock/Neptune path](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-build-graphs-build.html) is an AWS implementation option, not a guarantee of the exact Microsoft community-report algorithm.
- **Self-RAG / Adaptive-RAG:** prompt-based critics and routers are application prototypes inspired by the papers. They do not reproduce the papers' trained models.
- **Recovery:** use a workflow decision for missing evidence, and operational retry handling for transient service errors.

## Permissions, evaluation and cleanup

A public GitHub Pages client must never contain AWS secret keys. Put service calls in an authenticated backend; derive the allowed case and access filters there. Apply authorization again when resolving graph source IDs. The starter's fixed public filter is only a teaching example.

Use a fixed test set and compare required-source coverage, unsupported claims, latency and usage. Bedrock RAG evaluation supports documented knowledge-base and supplied-inference workflows; format your dataset accordingly. See [RAG evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-evaluation-create-randg.html).

These services and model calls can incur charges. Set a budget before provisioning. After exporting results, delete unused model-facing resources and their backing stores, plus any S3 data/logs you no longer need. Search collections, graph resources and Redis deployments may remain billable after deleting a knowledge base. Review the actual resource inventory in your account.
