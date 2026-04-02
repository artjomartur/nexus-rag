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
    def __init__(self):
        # 100% Free Local Embeddings via HuggingFace (all-MiniLM-L6-v2)
        # This will download the model once and reuse it.
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # 100% Free Local LLM via Ollama
        self.llm = ChatOllama(model="llama3", temperature=0)
        
        # Current active notebook and vector store
        self.active_notebook = None
        self.vector_store = None

    def set_notebook(self, notebook_name: str):
        """
        Sets the active notebook and initializes/switches the respective ChromaDB vector store.
        """
        self.active_notebook = notebook_name
        persist_directory = f"./notebooks/{notebook_name}/chroma_db"
        
        # Initialize or switch to the specific Chroma vector store locally
        self.vector_store = Chroma(
            persist_directory=persist_directory, 
            embedding_function=self.embeddings
        )

    def ingest_pdf(self, file_path: str) -> int:
        """
        Loads a PDF, splits it into chunks, and stores embeddings in the active notebook's context.
        """
        if self.vector_store is None:
            raise Exception("No active notebook selected. Please set a notebook before ingesting documents.")

        loader = PyPDFLoader(file_path)
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            add_start_index=True
        )
        chunks = text_splitter.split_documents(documents)

        if not chunks:
            return 0

        self.vector_store.add_documents(chunks)
        return len(chunks)

    def query(self, question: str) -> str:
        """
        Queries the active notebook's vector database and generates an answer using local LLM.
        """
        if self.vector_store is None:
            raise Exception("No active notebook selected. Please set a notebook before querying.")

        retriever = self.vector_store.as_retriever(search_kwargs={"k": 4})
        
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
        
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        try:
            response = rag_chain.invoke(question)
            return response
        except Exception as e:
            return f"Error generating answer: {str(e)}"
