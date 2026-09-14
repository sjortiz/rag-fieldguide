# Bedrock baseline: attaches to prepared S3, IAM and OpenSearch resources.
# Read ../README.md before planning. Does not provision the backing vector store.
terraform {
  required_version = ">= 1.5.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.22"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_partition" "current" {}

variable "aws_region" {
  type        = string
  description = "Region of your prepared S3 source and OpenSearch collection."
}
variable "name" {
  type    = string
  default = "harbor-course"
}
variable "knowledge_base_role_arn" {
  type        = string
  description = "Existing Bedrock service role with source, model and vector-store access."
}
variable "source_bucket_arn" {
  type        = string
  description = "Existing S3 source bucket ARN; upload C1-C7 and metadata to source_prefix."
}
variable "source_prefix" {
  type    = string
  default = "harbor/"
}
variable "collection_arn" {
  type        = string
  description = "Existing OpenSearch Serverless vector collection ARN."
}
variable "vector_index_name" {
  type        = string
  description = "Existing dedicated index with 1024-dimensional float vectors and a faiss engine."
}
variable "vector_field" {
  type    = string
  default = "embedding"
}
variable "text_field" {
  type    = string
  default = "text"
}
variable "metadata_field" {
  type    = string
  default = "metadata"
}

resource "aws_bedrockagent_knowledge_base" "harbor" {
  name     = var.name
  role_arn = var.knowledge_base_role_arn
  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
      embedding_model_configuration {
        bedrock_embedding_model_configuration {
          dimensions = 1024
        }
      }
    }
  }
  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    opensearch_serverless_configuration {
      collection_arn    = var.collection_arn
      vector_index_name = var.vector_index_name
      field_mapping {
        vector_field   = var.vector_field
        text_field     = var.text_field
        metadata_field = var.metadata_field
      }
    }
  }
}

resource "aws_bedrockagent_data_source" "harbor" {
  knowledge_base_id    = aws_bedrockagent_knowledge_base.harbor.id
  name                 = "harbor-public-records"
  data_deletion_policy = "RETAIN"
  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn         = var.source_bucket_arn
      inclusion_prefixes = [var.source_prefix]
    }
  }
  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "NONE"
    }
  }
}

output "knowledge_base_id" {
  value = aws_bedrockagent_knowledge_base.harbor.id
}
output "data_source_id" {
  value = aws_bedrockagent_data_source.harbor.data_source_id
}
