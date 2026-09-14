# Terraform, CloudFormation or AWS CDK (Python)

Select a tool on any **Build on AWS** page. The choice stays in this browser and changes the template example, resource reference and deployment instructions. Application algorithms and verification tasks are the same for all three tools.

## What the baseline provisions

All three downloads create the same two resources: a Bedrock vector knowledge base and its S3 data source. They use Titan V2 with 1,024 dimensions and keep each short Harbor source file as one chunk. Ingestion is a separate step after deployment. These are templates for prepared infrastructure, not a full account/network bootstrap.

Before deploying, prepare:

- An S3 bucket in your selected Region with C1–C7 and metadata under `harbor/` (use the course Python starter).
- An OpenSearch Serverless VECTORSEARCH collection and a **dedicated, existing** index using a faiss engine, 1,024-dimensional float vectors, and the vector/text/metadata fields supplied as inputs. Make the text field filterable for HYBRID retrieval. Do not point two differently managed knowledge bases at the same index.
- An IAM service role trusting `bedrock.amazonaws.com`, with appropriately scoped S3 read/list permissions, permission to invoke the embedding model, and access to the vector collection. The OpenSearch data access policy must allow that role the required index operations; network policy must allow Bedrock to reach the collection.
- A deployment identity with permissions to create/manage these Bedrock resources and pass that service role (`iam:PassRole`). Choose a supported Region/model and use your normal AWS authentication.

Follow the [vector-store setup](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html) and [service-role instructions](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-permissions.html). Wait for the index and permissions to be ready before deploying the knowledge base.

Use **one** tool to own these resources. To switch ownership of existing resources, plan an explicit import/migration; applying another template is not a conversion.

## Terraform

Use Terraform 1.5+ and the AWS provider constraint included in `main.tf`. In the downloaded folder:

```sh
cp terraform.tfvars.example terraform.tfvars
# Fill in every placeholder and the actual field names.
terraform init
terraform fmt -check
terraform validate
terraform plan -out=harbor.tfplan
# Inspect the plan, then deploy it in your AWS account:
terraform apply harbor.tfplan
terraform output
```

Set `KNOWLEDGE_BASE_ID` and `DATA_SOURCE_ID` from the outputs. Use the same AWS Region when running ingestion or the Python starter. Keep Terraform state, plan files and local variables private; configure a suitable remote state backend for team use. Commit the generated provider lockfile in your own infrastructure project.

References: [Terraform knowledge base](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrockagent_knowledge_base), [Terraform data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrockagent_data_source).

## CloudFormation

Use the AWS CLI with your selected Region and authenticated profile. In the downloaded folder:

```sh
cp parameters.example.json parameters.json
# Fill in every placeholder and the actual field names.
aws cloudformation validate-template --template-body file://bedrock.yaml
aws cloudformation create-change-set \
  --stack-name harbor-course --change-set-name first-build \
  --change-set-type CREATE --template-body file://bedrock.yaml \
  --parameters file://parameters.json
aws cloudformation wait change-set-create-complete \
  --stack-name harbor-course --change-set-name first-build
aws cloudformation describe-change-set \
  --stack-name harbor-course --change-set-name first-build
# Inspect the changes, then deploy them in your AWS account:
aws cloudformation execute-change-set \
  --stack-name harbor-course --change-set-name first-build
aws cloudformation wait stack-create-complete --stack-name harbor-course
aws cloudformation describe-stacks --stack-name harbor-course \
  --query 'Stacks[0].Outputs'
```

This template consumes an existing role; it does not create IAM resources. For later changes, use an UPDATE change set with a new name and the matching update wait command. Validation alone does not verify access to the index, Region availability or service quotas.

References: [CloudFormation knowledge base](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-bedrock-knowledgebase.html), [CloudFormation data source](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-bedrock-datasource.html).

## AWS CDK (Python)

Use Python 3.10+ and a Node.js version supported by the AWS CDK CLI. The downloadable app uses Python constructs to generate the equivalent CloudFormation baseline.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npx aws-cdk synth
```

Inspect `cdk.out/harbor-course.template.json`. Replace the placeholders below with the same prerequisite values used by the other tools. You may also pass `VectorField`, `TextField`, `MetadataField` and `SourcePrefix` parameters if your prepared index/source use different names.

```sh
npx aws-cdk diff harbor-course --no-change-set \
  --parameters KnowledgeBaseRoleArn=YOUR_BEDROCK_SERVICE_ROLE_ARN \
  --parameters SourceBucketArn=YOUR_SOURCE_BUCKET_ARN \
  --parameters CollectionArn=YOUR_COLLECTION_ARN \
  --parameters VectorIndexName=YOUR_INDEX_NAME
npx aws-cdk deploy harbor-course \
  --parameters KnowledgeBaseRoleArn=YOUR_BEDROCK_SERVICE_ROLE_ARN \
  --parameters SourceBucketArn=YOUR_SOURCE_BUCKET_ARN \
  --parameters CollectionArn=YOUR_COLLECTION_ARN \
  --parameters VectorIndexName=YOUR_INDEX_NAME
```

Use your authenticated AWS profile and the same Region as the prerequisite resources. CDK deployments normally require a bootstrapped target environment; if needed, run `npx aws-cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION` first. Bootstrapping provisions shared deployment resources in your account. Local synthesis of this app does not require AWS credentials or deploy anything.

Read the knowledge base and data source IDs from the stack outputs. CDK manages a CloudFormation stack: use CDK to update it consistently, and review `npx aws-cdk destroy harbor-course` before cleanup. The same retained-data and prerequisite-resource rules below apply. Lock Python/CLI versions in your own project for repeatable builds.

References: [CDK Python knowledge base](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_bedrock/CfnKnowledgeBase.html), [CDK Python data source](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_bedrock/CfnDataSource.html), [CDK getting started](https://docs.aws.amazon.com/cdk/v2/guide/hello-world.html).

## Ingest and ask (all three tools)

Export `KNOWLEDGE_BASE_ID` and `DATA_SOURCE_ID` from the selected tool's outputs. With your AWS CLI Region matching the stack/provider Region:

```sh
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KNOWLEDGE_BASE_ID" --data-source-id "$DATA_SOURCE_ID"
# Use the returned ingestionJobId to check until status is COMPLETE:
aws bedrock-agent get-ingestion-job \
  --knowledge-base-id "$KNOWLEDGE_BASE_ID" --data-source-id "$DATA_SOURCE_ID" \
  --ingestion-job-id YOUR_INGESTION_JOB_ID
```

Inspect failure counts before running `aws-starter.py ask`. Follow the main AWS guide to set `AWS_REGION` and a Converse-compatible `BEDROCK_MODEL_ID`. Deployment does not upload documents, invoke a generation model, or implement the later lessons' algorithms.

## Later lessons

The dropdown also shows focused Terraform, CloudFormation and CDK Python **excerpts** for the component discussed in each lesson. These excerpts are not standalone stacks: declare the displayed inputs, add roles/network/policies and package the actual handler or state-machine definition as described. Download the baseline to learn the complete input/resource/output pattern, then extend your own project. The website does not apply templates.

## Cleanup

AWS resources and calls can incur charges. Budget before deployment. The data source uses `RETAIN`, so removing its definition preserves ingested vectors; it does not erase your S3 data or delete the prepared collection, index or IAM role. Remove retained data and backing resources deliberately after the exercise.

For the Terraform-owned baseline, review a destroy plan before applying it. For a CloudFormation-owned baseline, inspect the stack resources before deleting that stack. Neither approach cleans up the prerequisite resources it did not create. Never switch tools just to delete resources managed by the other tool.
