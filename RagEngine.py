import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain_chroma import Chroma
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

class RagEngine:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        
        # 100% Free Local Embeddings via HuggingFace (all-MiniLM-L6-v2)
        # This will download a very lightweight embedding model on first run.
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # 100% Free Local LLM via Ollama
        # Important: You must have Ollama installed and the model downloaded (e.g., 'ollama run llama3')
        self.llm = ChatOllama(model="llama3", temperature=0)
        
        # Initialize Chroma vector store locally
        self.vector_store = Chroma(
            persist_directory=self.persist_directory, 
            embedding_function=self.embeddings
        )

    def ingest_pdf(self, file_path: str) -> int:
        """
        Loads a PDF, splits it into chunks, and stores embeddings in ChromaDB locally.
        Returns the number of chunks processed.
        """
        # Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            add_start_index=True
        )
        chunks = text_splitter.split_documents(documents)

        if not chunks:
            return 0

        # Add chunks to Local Vector Database
        self.vector_store.add_documents(chunks)
        
        return len(chunks)

    def query(self, question: str) -> str:
        """
        Queries the local vector database and generates an answer using the local Ollama LLM.
        """
        # Setup Retriever
        retriever = self.vector_store.as_retriever(search_kwargs={"k": 4})
        
        # Define Prompt Template
        system_prompt = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer the question. "
            "If you don't know the answer, say that you don't know. "
            "Use three sentences maximum and keep the answer concise."
            "\n\n"
            "{context}"
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{question}"),
        ])
        
        # Format documents helper
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        # Create QA Chain using modern LCEL (LangChain Expression Language)
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        # Invoke Chain
        try:
            response = rag_chain.invoke(question)
            return response
        except Exception as e:
            return f"Error generating answer: {str(e)}"
