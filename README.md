# 🌌 Nexus RAG

**Enterprise-Grade Retrieval-Augmented Generation (RAG) Engine**

Nexus RAG is a high-performance, scalable API designed to ingest local PDF documents, generate vector embeddings, and provide context-aware answers using Large Language Models (LLMs). Built with Python, FastAPI, LangChain, and ChromaDB, this project demonstrates modern AI engineering capabilities, perfect for data-heavy enterprise environments.

**100% Free & Private:** This architecture operates entirely locally without requiring any paid API keys. It leverages HuggingFace for lightning-fast embeddings and Ollama for powerful local inferencing.

## 🚀 Features

- **Document Ingestion**: Upload PDF documents via a RESTful endpoint.
- **Intelligent Chunking**: Automatically parses and splits text into semantic chunks using LangChain for optimal embedding context.
- **Free Local Vector Storage**: Uses ChromaDB to store and retrieve vector embeddings efficiently.
- **Privacy-First QA**: Queries a completely local LLM (via Ollama), ensuring zero data leakage to third parties.
- **FastAPI Backend**: Asynchronous, highly performant REST API with built-in interactive Swagger UI documentation.

## 🛠️ Technology Stack

- **[Python](https://www.python.org/)**
- **[FastAPI](https://fastapi.tiangolo.com/)**: Fast, modern web framework for building APIs.
- **[LangChain](https://python.langchain.com/)**: Framework for context-aware AI applications.
- **[ChromaDB](https://www.trychroma.com/)**: Open-source embedding database.
- **[HuggingFace Sentence Transformers](https://huggingface.co/)**: Free local embeddings (`all-MiniLM-L6-v2`).
- **[Ollama](https://ollama.com/)**: Free local execution for powerful LLMs (e.g., `llama3`).

## 🏗️ Architecture Overview

1. **Ingestion Flow (`/ingest`)**:
   - Client uploads a PDF.
   - `PyPDFLoader` extracts text.
   - `RecursiveCharacterTextSplitter` chunks the text.
   - `HuggingFaceEmbeddings` convert text chunks to vectors locally.
   - Vectors are stored persistently in ChromaDB.

2. **Query Flow (`/query`)**:
   - Client submits a natural language question.
   - Engine embeds the question and performs a similarity search in ChromaDB.
   - Most relevant chunks form the augmented context.
   - Payload is sent to the local Ollama LLM to synthesize an accurate answer.

## ⚙️ Setup & Installation

### 1. Prerequisites
Since this project runs entirely locally for maximum data privacy, you need to install **Ollama**:
- Download from [ollama.com](https://ollama.com/)
- Start Ollama and download the Llama 3 model by running this in your terminal:
  ```bash
  ollama run llama3
  ```
  *(You can close the chat prompt it opens afterwards.)*

### 2. Clone the repository & setup environment

```bash
git clone https://github.com/yourusername/nexus-rag.git
cd nexus-rag

# Create Virtual Environment (Optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt
```

### 3. Run the Server

Start the API server using Python:
```bash
python main.py
```
*(Alternatively, run directly via Uvicorn: `uvicorn main:app --reload`)*

## 📖 API Usage

Once the server is running, you can access the interactive Swagger UI at:
👉 **http://localhost:8000/docs**

### Endpoints

#### 1. `POST /ingest`
Upload a PDF document to train the RAG engine.
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PDF document)

#### 2. `POST /query`
Ask a question based on the ingested documents.
- **Content-Type**: `application/json`
- **Body**: 
  ```json
  {
    "question": "What is the main topic of the uploaded document?"
  }
  ```

## 📈 Scalability & Future Improvements
- **Cloud Vector DB**: Easy transition from local ChromaDB to Pinecone or Weaviate for massive scale.
- **Distributed LLM Inferencing**: Scaling Ollama nodes or transitioning seamlessly to cloud providers if budget allows.
- **Broader Format Support**: Extend document loaders to gracefully support `.docx`, `.txt`, and Confluence/Notion pages.

---
**Developed by Artjom Becker** — Showcasing Advanced Artificial Intelligence & Data Engineering.
