"""Harbor baseline. Uses prepared S3, IAM and OpenSearch resources; see README.md."""
from aws_cdk import App, Stack, CfnParameter, CfnOutput, aws_bedrock as bedrock

app = App()
stack = Stack(app, "harbor-course", description="Harbor Bedrock baseline with prepared infrastructure")


def parameter(name, description, default=None):
    options = {"type": "String", "description": description}
    if default is not None:
        options["default"] = default
    return CfnParameter(stack, name, **options).value_as_string


name = parameter("Name", "Knowledge base name", "harbor-course")
role_arn = parameter("KnowledgeBaseRoleArn", "Existing Bedrock service role ARN")
bucket_arn = parameter("SourceBucketArn", "Existing source bucket ARN")
prefix = parameter("SourcePrefix", "Prefix containing C1-C7 and metadata", "harbor/")
collection_arn = parameter("CollectionArn", "Existing OpenSearch Serverless collection ARN")
index_name = parameter("VectorIndexName", "Existing dedicated 1024-dimensional faiss index")
vector_field = parameter("VectorField", "Vector field name", "embedding")
text_field = parameter("TextField", "Filterable text field name", "text")
metadata_field = parameter("MetadataField", "Metadata field name", "metadata")

kb = bedrock.CfnKnowledgeBase(
    stack, "KnowledgeBase", name=name, role_arn=role_arn,
    knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
        type="VECTOR",
        vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
            embedding_model_arn=stack.format_arn(
                service="bedrock", account="", resource="foundation-model",
                resource_name="amazon.titan-embed-text-v2:0",
            ),
            embedding_model_configuration=bedrock.CfnKnowledgeBase.EmbeddingModelConfigurationProperty(
                bedrock_embedding_model_configuration=bedrock.CfnKnowledgeBase.BedrockEmbeddingModelConfigurationProperty(
                    dimensions=1024,
                ),
            ),
        ),
    ),
    storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
        type="OPENSEARCH_SERVERLESS",
        opensearch_serverless_configuration=bedrock.CfnKnowledgeBase.OpenSearchServerlessConfigurationProperty(
            collection_arn=collection_arn, vector_index_name=index_name,
            field_mapping=bedrock.CfnKnowledgeBase.OpenSearchServerlessFieldMappingProperty(
                vector_field=vector_field, text_field=text_field, metadata_field=metadata_field,
            ),
        ),
    ),
)
source = bedrock.CfnDataSource(
    stack, "HarborSource", name="harbor-public-records",
    knowledge_base_id=kb.attr_knowledge_base_id, data_deletion_policy="RETAIN",
    data_source_configuration=bedrock.CfnDataSource.DataSourceConfigurationProperty(
        type="S3", s3_configuration=bedrock.CfnDataSource.S3DataSourceConfigurationProperty(
            bucket_arn=bucket_arn, inclusion_prefixes=[prefix],
        ),
    ),
    vector_ingestion_configuration=bedrock.CfnDataSource.VectorIngestionConfigurationProperty(
        chunking_configuration=bedrock.CfnDataSource.ChunkingConfigurationProperty(
            chunking_strategy="NONE",
        ),
    ),
)
CfnOutput(stack, "KnowledgeBaseId", value=kb.attr_knowledge_base_id)
CfnOutput(stack, "DataSourceId", value=source.attr_data_source_id)
app.synth()
