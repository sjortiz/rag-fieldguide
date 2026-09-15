# RAG Fieldguide

An interactive, self-paced course on retrieval-augmented generation.

**[Open the course](https://sjortiz.github.io/rag-fieldguide/)**

## Start from zero

**[RAG desde cero](https://sjortiz.github.io/rag-fieldguide/basics.html)** is a Spanish beginner track with six short pages: the core idea, the retrieval pipeline, a glossary, a source-selection exercise, use cases, and a three-question checkpoint. It needs no programming or AWS account. Each page starts with a developed explanation; a separate “Ejemplo y práctica” tab contains the interactive activity. Its local progress is separate from the technical course. The existing 12-lesson course remains in English.

## What you can learn

12 lessons cover RAG foundations, BM25, vector retrieval, Reciprocal Rank Fusion, Redis hybrid search, routing, graph expansion, Microsoft GraphRAG, Self-RAG, Adaptive-RAG, recovery paths, and evaluation.

Every lesson opens with its original explanation in consecutive reading pages. “Read full explanation” displays all of the lesson text together, including its original sources and exercises. Separate shortcuts lead to diagrams/examples and AWS implementation. Supporting pages include: a process diagram, the full explanation, a practical application, a step-through pseudocode example, and the remaining exercises and readings. The original lesson text and sources are retained in full. Each lesson also includes two **Build on AWS** pages: an architecture diagram and interactive implementation steps with code, verification tasks and primary sources.

Each lesson has three sections: **Understand**, **Experiment**, and **Check yourself**. The experiments include adjustable scoring models, source selection, graph traversal, claim audits, and a capstone checklist with exportable notes.

The Harbor case file is fictional. Retrieval outputs in the labs are teaching simulations, not live Redis or LLM responses. Research papers and official documentation are linked in the lessons. The full written course is available in [course.md](course.md).

## AWS companion

Start with [aws-guide.md](aws-guide.md) and [aws-starter.py](aws-starter.py). The starter prepares the public Harbor corpus locally, then can query your own existing Bedrock knowledge base and generation model. It does not provision AWS resources. No AWS calls run from this static website.

The **Build with** dropdown offers **Terraform**, **CloudFormation** and **AWS CDK (Python)** across all AWS pages. It remembers the selected tool, updates code and instructions, and links to matching baseline templates. These require prepared S3, IAM and OpenSearch resources; see [infrastructure/README.md](infrastructure/README.md). Later lesson excerpts describe their additional dependencies.

## Progress and notes

Progress and capstone notes are stored in your browser's local storage. They are not sent to a server and do not sync across browsers or origins. Export notes from the capstone experiment to retain a separate copy.

## Run locally

This site uses HTML, CSS, and JavaScript with no build step.

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 in a browser. Google Fonts are optional; the interface falls back to system fonts.

## Publish

GitHub Pages serves the root of the `main` branch. Changes pushed there publish automatically. `.nojekyll` keeps the site as plain static assets.

## Files

- `index.html`: page shell and navigation
- `basics.html`, `basics.js`, `basics.css`, `basic-theory.js`: Spanish beginner track and guided exercises
- `style.css`: responsive styling
- `content.js`: complete lesson content
- `practical.js`: paginated lessons, applications and pseudocode walkthroughs
- `iac.js`: infrastructure tool selection and lesson-specific examples
- `infrastructure/`: equivalent Terraform, CloudFormation and CDK Python baseline downloads
- `aws.js`: AWS architectures, interactive build steps and source references
- `aws-guide.md`: downloadable AWS setup and implementation guide
- `aws-starter.py`: local fixture generator and Bedrock Retrieve/Converse starter
- `app.js`: course navigation and browser-local progress
- `labs.js`: interactive experiments, quizzes, and capstone
- `course.md`: downloadable written course

Optional WebMCP hooks are feature-detected and do not affect ordinary browser use. Their specialized browser runtime support has not been verified.
