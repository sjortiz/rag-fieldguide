// Local teaching examples; selecting a tool never calls AWS.
const AWS_IAC_BASELINE = {
  "terraform": "# Bedrock baseline: attaches to prepared S3, IAM and OpenSearch resources.\n# Read ../README.md before planning. Does not provision the backing vector store.\nterraform {\n  required_version = \">= 1.5.0, < 2.0.0\"\n  required_providers {\n    aws = {\n      source  = \"hashicorp/aws\"\n      version = \"~> 6.22\"\n    }\n  }\n}\n\nprovider \"aws\" {\n  region = var.aws_region\n}\n\ndata \"aws_partition\" \"current\" {}\n\nvariable \"aws_region\" {\n  type        = string\n  description = \"Region of your prepared S3 source and OpenSearch collection.\"\n}\nvariable \"name\" {\n  type    = string\n  default = \"harbor-course\"\n}\nvariable \"knowledge_base_role_arn\" {\n  type        = string\n  description = \"Existing Bedrock service role with source, model and vector-store access.\"\n}\nvariable \"source_bucket_arn\" {\n  type        = string\n  description = \"Existing S3 source bucket ARN; upload C1-C7 and metadata to source_prefix.\"\n}\nvariable \"source_prefix\" {\n  type    = string\n  default = \"harbor/\"\n}\nvariable \"collection_arn\" {\n  type        = string\n  description = \"Existing OpenSearch Serverless vector collection ARN.\"\n}\nvariable \"vector_index_name\" {\n  type        = string\n  description = \"Existing dedicated index with 1024-dimensional float vectors and a faiss engine.\"\n}\nvariable \"vector_field\" {\n  type    = string\n  default = \"embedding\"\n}\nvariable \"text_field\" {\n  type    = string\n  default = \"text\"\n}\nvariable \"metadata_field\" {\n  type    = string\n  default = \"metadata\"\n}\n\nresource \"aws_bedrockagent_knowledge_base\" \"harbor\" {\n  name     = var.name\n  role_arn = var.knowledge_base_role_arn\n  knowledge_base_configuration {\n    type = \"VECTOR\"\n    vector_knowledge_base_configuration {\n      embedding_model_arn = \"arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0\"\n      embedding_model_configuration {\n        bedrock_embedding_model_configuration {\n          dimensions = 1024\n        }\n      }\n    }\n  }\n  storage_configuration {\n    type = \"OPENSEARCH_SERVERLESS\"\n    opensearch_serverless_configuration {\n      collection_arn    = var.collection_arn\n      vector_index_name = var.vector_index_name\n      field_mapping {\n        vector_field   = var.vector_field\n        text_field     = var.text_field\n        metadata_field = var.metadata_field\n      }\n    }\n  }\n}\n\nresource \"aws_bedrockagent_data_source\" \"harbor\" {\n  knowledge_base_id    = aws_bedrockagent_knowledge_base.harbor.id\n  name                 = \"harbor-public-records\"\n  data_deletion_policy = \"RETAIN\"\n  data_source_configuration {\n    type = \"S3\"\n    s3_configuration {\n      bucket_arn         = var.source_bucket_arn\n      inclusion_prefixes = [var.source_prefix]\n    }\n  }\n  vector_ingestion_configuration {\n    chunking_configuration {\n      chunking_strategy = \"NONE\"\n    }\n  }\n}\n\noutput \"knowledge_base_id\" {\n  value = aws_bedrockagent_knowledge_base.harbor.id\n}\noutput \"data_source_id\" {\n  value = aws_bedrockagent_data_source.harbor.data_source_id\n}\n",
  "cloudformation": "AWSTemplateFormatVersion: '2010-09-09'\nDescription: Harbor Bedrock baseline using prepared S3, IAM and OpenSearch resources.\nParameters:\n  Name:\n    Type: String\n    Default: harbor-course\n  KnowledgeBaseRoleArn:\n    Type: String\n    Description: Existing Bedrock service role with source, model and vector-store access.\n  SourceBucketArn:\n    Type: String\n    Description: Existing S3 bucket containing C1-C7 and their metadata sidecars.\n  SourcePrefix:\n    Type: String\n    Default: harbor/\n  CollectionArn:\n    Type: String\n    Description: Existing OpenSearch Serverless vector collection ARN.\n  VectorIndexName:\n    Type: String\n    Description: Existing dedicated index with 1024-dimensional float vectors and a faiss engine.\n  VectorField:\n    Type: String\n    Default: embedding\n  TextField:\n    Type: String\n    Default: text\n  MetadataField:\n    Type: String\n    Default: metadata\nResources:\n  KnowledgeBase:\n    Type: AWS::Bedrock::KnowledgeBase\n    Properties:\n      Name: !Ref Name\n      RoleArn: !Ref KnowledgeBaseRoleArn\n      KnowledgeBaseConfiguration:\n        Type: VECTOR\n        VectorKnowledgeBaseConfiguration:\n          EmbeddingModelArn: !Sub arn:${AWS::Partition}:bedrock:${AWS::Region}::foundation-model/amazon.titan-embed-text-v2:0\n          EmbeddingModelConfiguration:\n            BedrockEmbeddingModelConfiguration:\n              Dimensions: 1024\n      StorageConfiguration:\n        Type: OPENSEARCH_SERVERLESS\n        OpensearchServerlessConfiguration:\n          CollectionArn: !Ref CollectionArn\n          VectorIndexName: !Ref VectorIndexName\n          FieldMapping:\n            VectorField: !Ref VectorField\n            TextField: !Ref TextField\n            MetadataField: !Ref MetadataField\n  HarborSource:\n    Type: AWS::Bedrock::DataSource\n    Properties:\n      Name: harbor-public-records\n      KnowledgeBaseId: !Ref KnowledgeBase\n      DataDeletionPolicy: RETAIN\n      DataSourceConfiguration:\n        Type: S3\n        S3Configuration:\n          BucketArn: !Ref SourceBucketArn\n          InclusionPrefixes:\n            - !Ref SourcePrefix\n      VectorIngestionConfiguration:\n        ChunkingConfiguration:\n          ChunkingStrategy: NONE\nOutputs:\n  KnowledgeBaseId:\n    Value: !Ref KnowledgeBase\n  DataSourceId:\n    Value: !GetAtt HarborSource.DataSourceId\n",
  "cdk": "\"\"\"Harbor baseline. Uses prepared S3, IAM and OpenSearch resources; see README.md.\"\"\"\nfrom aws_cdk import App, Stack, CfnParameter, CfnOutput, aws_bedrock as bedrock\n\napp = App()\nstack = Stack(app, \"harbor-course\", description=\"Harbor Bedrock baseline with prepared infrastructure\")\n\n\ndef parameter(name, description, default=None):\n    options = {\"type\": \"String\", \"description\": description}\n    if default is not None:\n        options[\"default\"] = default\n    return CfnParameter(stack, name, **options).value_as_string\n\n\nname = parameter(\"Name\", \"Knowledge base name\", \"harbor-course\")\nrole_arn = parameter(\"KnowledgeBaseRoleArn\", \"Existing Bedrock service role ARN\")\nbucket_arn = parameter(\"SourceBucketArn\", \"Existing source bucket ARN\")\nprefix = parameter(\"SourcePrefix\", \"Prefix containing C1-C7 and metadata\", \"harbor/\")\ncollection_arn = parameter(\"CollectionArn\", \"Existing OpenSearch Serverless collection ARN\")\nindex_name = parameter(\"VectorIndexName\", \"Existing dedicated 1024-dimensional faiss index\")\nvector_field = parameter(\"VectorField\", \"Vector field name\", \"embedding\")\ntext_field = parameter(\"TextField\", \"Filterable text field name\", \"text\")\nmetadata_field = parameter(\"MetadataField\", \"Metadata field name\", \"metadata\")\n\nkb = bedrock.CfnKnowledgeBase(\n    stack, \"KnowledgeBase\", name=name, role_arn=role_arn,\n    knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(\n        type=\"VECTOR\",\n        vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(\n            embedding_model_arn=stack.format_arn(\n                service=\"bedrock\", account=\"\", resource=\"foundation-model\",\n                resource_name=\"amazon.titan-embed-text-v2:0\",\n            ),\n            embedding_model_configuration=bedrock.CfnKnowledgeBase.EmbeddingModelConfigurationProperty(\n                bedrock_embedding_model_configuration=bedrock.CfnKnowledgeBase.BedrockEmbeddingModelConfigurationProperty(\n                    dimensions=1024,\n                ),\n            ),\n        ),\n    ),\n    storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(\n        type=\"OPENSEARCH_SERVERLESS\",\n        opensearch_serverless_configuration=bedrock.CfnKnowledgeBase.OpenSearchServerlessConfigurationProperty(\n            collection_arn=collection_arn, vector_index_name=index_name,\n            field_mapping=bedrock.CfnKnowledgeBase.OpenSearchServerlessFieldMappingProperty(\n                vector_field=vector_field, text_field=text_field, metadata_field=metadata_field,\n            ),\n        ),\n    ),\n)\nsource = bedrock.CfnDataSource(\n    stack, \"HarborSource\", name=\"harbor-public-records\",\n    knowledge_base_id=kb.attr_knowledge_base_id, data_deletion_policy=\"RETAIN\",\n    data_source_configuration=bedrock.CfnDataSource.DataSourceConfigurationProperty(\n        type=\"S3\", s3_configuration=bedrock.CfnDataSource.S3DataSourceConfigurationProperty(\n            bucket_arn=bucket_arn, inclusion_prefixes=[prefix],\n        ),\n    ),\n    vector_ingestion_configuration=bedrock.CfnDataSource.VectorIngestionConfigurationProperty(\n        chunking_configuration=bedrock.CfnDataSource.ChunkingConfigurationProperty(\n            chunking_strategy=\"NONE\",\n        ),\n    ),\n)\nCfnOutput(stack, \"KnowledgeBaseId\", value=kb.attr_knowledge_base_id)\nCfnOutput(stack, \"DataSourceId\", value=source.attr_data_source_id)\napp.synth()\n"
};
const AWS_IAC_TOOLS = {
  terraform: {name:'Terraform', language:'HCL', download:'infrastructure/terraform.zip',
    setup:'Fill in terraform.tfvars from the example, then initialize, validate and review a saved plan. Apply that plan in your account, read the outputs, and start ingestion.',
    commands:'terraform init\nterraform validate\nterraform plan -out=harbor.tfplan\n# Review the plan before applying:\nterraform apply harbor.tfplan\nterraform output'},
  cloudformation: {name:'CloudFormation', language:'YAML', download:'infrastructure/cloudformation.zip',
    setup:'Fill in parameters.json from the example. Validate the template, create and inspect a CREATE change set, then execute it. Read stack outputs and start ingestion. The download includes the complete command sequence.',
    commands:'aws cloudformation validate-template --template-body file://bedrock.yaml\naws cloudformation create-change-set \\\n  --stack-name harbor-course --change-set-name first-build \\\n  --change-set-type CREATE --template-body file://bedrock.yaml \\\n  --parameters file://parameters.json\n# Wait, inspect, then execute (full sequence in README).'},
  cdk: {name:'AWS CDK (Python)', language:'Python', download:'infrastructure/cdk.zip',
    setup:'Create a Python virtual environment, install requirements, and synthesize the CloudFormation template. Review it before deploying with the required stack parameters. The download includes the Python app and full setup instructions.',
    commands:'python3 -m venv .venv\nsource .venv/bin/activate\npython -m pip install -r requirements.txt\n# AWS CDK CLI also requires a supported Node.js installation.\nnpx aws-cdk synth\n# Supply your stack parameters when running cdk diff / deploy.'}
};
const AWS_IAC_COMPONENTS = {
  search: {
    title:'Custom search collection',
    needs:'Add an encryption policy for this collection name, a private network policy and an application data-access policy. Then create the index mapping and ingest documents. Reuse the same custom index for the BM25/vector comparison; keep it separate from the managed baseline.',
    terraform:`# Excerpt: encryption policy is defined elsewhere in your project.
resource "aws_opensearchserverless_collection" "search" {
  name = "harbor-custom-search"
  type = "VECTORSEARCH"
  depends_on = [aws_opensearchserverless_security_policy.encryption]
}
# Add network/data policies and create the text + vector index.`,
    cloudformation:`# Excerpt under Resources; define EncryptionPolicy separately.
SearchCollection:
  Type: AWS::OpenSearchServerless::Collection
  DependsOn: EncryptionPolicy
  Properties:
    Name: harbor-custom-search
    Type: VECTORSEARCH
# Add network/data policies and create the text + vector index.`,
    cdk:`from aws_cdk import aws_opensearchserverless as aoss

# Excerpt: stack and encryption_policy are defined in your app.
collection = aoss.CfnCollection(
    stack, "SearchCollection",
    name="harbor-custom-search", type="VECTORSEARCH",
)
collection.add_dependency(encryption_policy)
# Add network/data policies and create the text + vector index.`,
    refs:['opensearchserverless_collection','opensearchserverless-collection','aws_opensearchserverless.CfnCollection']
  },
  worker: {
    title:'A backend function for this lesson',
    needs:'Package the lesson algorithm as app.handler in an S3 ZIP artifact. Supply the artifact bucket/key and a Lambda execution role with logs and only the needed Bedrock/search permissions. Add VPC connectivity for private stores. The template provisions the function; the pseudocode below explains the handler you must implement.',
    terraform:`# Excerpt: declare these inputs in your project.
resource "aws_lambda_function" "worker" {
  function_name = "harbor-lesson-worker"
  role          = var.execution_role_arn
  runtime       = "python3.12"
  handler       = "app.handler"
  s3_bucket     = var.artifact_bucket
  s3_key        = var.artifact_key
  timeout       = 60
  memory_size   = 512
}`, 
    cloudformation:`# Excerpt under Resources; declare the referenced Parameters.
Worker:
  Type: AWS::Lambda::Function
  Properties:
    Role: !Ref ExecutionRoleArn
    Runtime: python3.12
    Handler: app.handler
    Timeout: 60
    MemorySize: 512
    Code:
      S3Bucket: !Ref ArtifactBucket
      S3Key: !Ref ArtifactKey`,
    cdk:`from aws_cdk import aws_lambda as lambda_

# Excerpt: supply stack, role ARN and artifact bucket/key.
worker = lambda_.CfnFunction(
    stack, "Worker", role=execution_role_arn,
    runtime="python3.12", handler="app.handler",
    timeout=60, memory_size=512,
    code=lambda_.CfnFunction.CodeProperty(
        s3_bucket=artifact_bucket, s3_key=artifact_key,
    ),
)`,
    refs:['lambda_function','lambda-function','aws_lambda.CfnFunction']
  },
  redis: {
    title:'A reference to Redis credentials',
    needs:'Provision Redis Cloud on AWS separately using its supported provisioning tools. This excerpt creates an empty Secrets Manager entry; populate it securely outside the template and grant your backend scoped read access. It does not create a Redis database or configure network connectivity.',
    terraform:`resource "aws_secretsmanager_secret" "redis" {
  name_prefix             = "harbor-redis-"
  description             = "Redis connection credentials for the Harbor backend"
  recovery_window_in_days = 7
}
# Set the value outside Terraform so it is not in this state file.
# Pass aws_secretsmanager_secret.redis.arn to your backend.`,
    cloudformation:`# Excerpt under Resources. No credentials in this template.
RedisCredentials:
  Type: AWS::SecretsManager::Secret
  Properties:
    Description: Redis connection credentials for the Harbor backend
# Populate the secret securely, then pass its ARN to your backend.`,
    cdk:`from aws_cdk import aws_secretsmanager as secretsmanager

# Excerpt: supply the containing stack.
secret = secretsmanager.CfnSecret(
    stack, "RedisCredentials",
    description="Redis connection credentials for the Harbor backend",
)
# Populate the value securely outside the app; pass secret.ref onward.`,
    refs:['secretsmanager_secret','secretsmanager-secret','aws_secretsmanager.CfnSecret']
  },
  graph: {
    title:'A Neptune Analytics graph',
    needs:'This creates graph capacity, not extracted entities or community reports. Add a private graph endpoint, reachable backend networking and IAM query access. Import the provenance graph separately. For managed GraphRAG, also follow the Bedrock graph configuration in the lesson. Disable deletion protection deliberately when cleaning up.',
    terraform:`resource "aws_neptunegraph_graph" "harbor" {
  graph_name          = "harbor-evidence"
  provisioned_memory  = 16
  replica_count       = 1
  public_connectivity = false
  deletion_protection = true
  vector_search_configuration {
    vector_search_dimension = 1024
  }
}`, 
    cloudformation:`# Excerpt under Resources.
EvidenceGraph:
  Type: AWS::NeptuneGraph::Graph
  Properties:
    GraphName: harbor-evidence
    ProvisionedMemory: 16
    ReplicaCount: 1
    PublicConnectivity: false
    DeletionProtection: true
    VectorSearchConfiguration:
      VectorSearchDimension: 1024`,
    cdk:`from aws_cdk import aws_neptunegraph as neptunegraph

# Excerpt: supply the containing stack.
graph = neptunegraph.CfnGraph(
    stack, "EvidenceGraph", graph_name="harbor-evidence",
    provisioned_memory=16, replica_count=1,
    public_connectivity=False, deletion_protection=True,
    vector_search_configuration=neptunegraph.CfnGraph.VectorSearchConfigurationProperty(
        vector_search_dimension=1024,
    ),
)`,
    refs:['neptunegraph_graph','neptunegraph-graph','aws_neptunegraph.CfnGraph']
  },
  workflow: {
    title:'The retrieval state machine',
    needs:'Write and validate an Amazon States Language definition containing the lesson’s Choice branches, task calls and stop budgets. Deploy the task handlers and give the workflow role permission to invoke them. Supply that role and definition to this excerpt; defining an empty workflow does not implement recovery.',
    terraform:`# Excerpt: role input and workflow.asl.json are required.
resource "aws_sfn_state_machine" "retrieval" {
  name       = "harbor-retrieval"
  role_arn   = var.workflow_role_arn
  type       = "STANDARD"
  definition = file("\${path.module}/workflow.asl.json")
}`, 
    cloudformation:`# Excerpt under Resources; upload your ASL file to S3 first.
RetrievalWorkflow:
  Type: AWS::StepFunctions::StateMachine
  Properties:
    RoleArn: !Ref WorkflowRoleArn
    StateMachineType: STANDARD
    DefinitionS3Location:
      Bucket: !Ref DefinitionBucket
      Key: !Ref DefinitionKey`,
    cdk:`from aws_cdk import aws_stepfunctions as sfn

# Excerpt: supply the stack, role and your complete ASL file.
with open("workflow.asl.json", encoding="utf-8") as source:
    definition = source.read()
workflow = sfn.CfnStateMachine(
    stack, "RetrievalWorkflow", role_arn=workflow_role_arn,
    state_machine_type="STANDARD", definition_string=definition,
)`,
    refs:['sfn_state_machine','stepfunctions-statemachine','aws_stepfunctions.CfnStateMachine']
  },
  logs: {
    title:'Bound the lifetime of evaluation logs',
    needs:'Create this group before its matching Lambda function first runs, and give the execution role write permissions. Use structured metrics for latency, source coverage and model usage. This log group does not create the evaluator or dataset; implement those in the capstone steps.',
    terraform:`# Excerpt: function_name matches your evaluator Lambda.
resource "aws_cloudwatch_log_group" "evaluation" {
  name              = "/aws/lambda/\${var.function_name}"
  retention_in_days = 30
}`, 
    cloudformation:`# Excerpt under Resources; FunctionName is a stack parameter.
EvaluationLogs:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: !Sub /aws/lambda/\${FunctionName}
    RetentionInDays: 30`,
    cdk:`from aws_cdk import aws_logs as logs

# Excerpt: supply stack and your evaluator's function name.
logs.CfnLogGroup(
    stack, "EvaluationLogs",
    log_group_name=f"/aws/lambda/{function_name}",
    retention_in_days=30,
)`,
    refs:['cloudwatch_log_group','logs-loggroup','aws_logs.CfnLogGroup']
  }
};
const AWS_IAC_LESSON_COMPONENT = [null,'search','search','worker','redis','worker','graph','graph','worker','workflow','workflow','logs'];
let awsIacMethod = 'terraform';
try {
  const stored = localStorage.getItem('rag-fieldguide-iac');
  if (Object.hasOwn(AWS_IAC_TOOLS, stored)) awsIacMethod = stored;
} catch {}

function awsMethodControls() {
  const esc = escapeLessonText;
  return `<div class="iac-selector"><label for="aws-iac-method">Build with</label><select id="aws-iac-method" aria-describedby="iac-selection-status">${Object.entries(AWS_IAC_TOOLS).map(([key,value])=>`<option value="${key}" ${key===awsIacMethod?'selected':''}>${esc(value.name)}</option>`).join('')}</select><span id="iac-selection-status" class="hint" role="status">${esc(AWS_IAC_TOOLS[awsIacMethod].name)} examples selected</span></div><div id="aws-iac-content"></div>`;
}

function mountAwsMethod(id, pageType) {
  const esc = escapeLessonText;
  const update = () => {
    const tool = AWS_IAC_TOOLS[awsIacMethod];
    const component = AWS_IAC_COMPONENTS[AWS_IAC_LESSON_COMPONENT[id-1]];
    const code = component ? component[awsIacMethod] : AWS_IAC_BASELINE[awsIacMethod];
    const ref = component ? component.refs : ['bedrockagent_knowledge_base','bedrock-knowledgebase','aws_bedrock.CfnKnowledgeBase'];
    const doc = awsIacMethod==='terraform' ? `https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/${ref[0]}` : awsIacMethod==='cloudformation' ? `https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-${ref[1]}.html` : `https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.${ref[2].replace('.', '/')}.html`;
    $('#iac-selection-status').textContent = `${tool.name} examples selected`;
    $('#aws-iac-content').innerHTML = `<details class="iac-card" ${pageType==='aws-build'?'open':''}><summary>Provision with ${esc(tool.name)}</summary><span class="eyebrow">${component?'LESSON INFRASTRUCTURE':'BEDROCK BASELINE'}</span><h3>${esc(component?.title || 'Define the knowledge base and its data source')}</h3><p>${esc(component?.needs || 'These templates attach a new knowledge base to a prepared S3 bucket, Bedrock service role, and OpenSearch Serverless collection/index. Supply their identifiers and field names first. Upload and sync the Harbor records after deployment.')}</p><details class="aws-code"><summary>${esc(tool.name)} · ${component?'resource excerpt':'baseline template'} (${esc(tool.language)})</summary>${component?'<p class="hint">Add this excerpt to your project with the dependencies described above. It is not a standalone stack.</p>':''}<pre tabindex="0"><code>${esc(code)}</code></pre><a href="${esc(doc)}" target="_blank" rel="noopener noreferrer">${esc(tool.name)} resource reference ↗</a></details><details class="iac-run"><summary>Set up the ${esc(tool.name)} baseline</summary><p>${esc(tool.setup)}</p><pre tabindex="0"><code>${esc(tool.commands)}</code></pre><p class="hint">The baseline creates the knowledge base and data source only. Later lesson components must be added separately. Use one tool to manage each resource.</p></details><div class="iac-downloads"><a href="${tool.download}" download>Download ${esc(tool.name)} baseline ↓</a><a href="infrastructure/README.md" target="_blank" rel="noopener noreferrer">Prerequisites & full instructions ↗</a></div></details>`;
  };
  $('#aws-iac-method').onchange = e => {
    if (!Object.hasOwn(AWS_IAC_TOOLS,e.target.value)) return;
    awsIacMethod = e.target.value;
    try { localStorage.setItem('rag-fieldguide-iac',awsIacMethod); } catch {}
    update();
  };
  update();
}
