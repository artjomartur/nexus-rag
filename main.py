import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from RagEngine import RagEngine

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Nexus RAG API",
    description="Enterprise Retrieval-Augmented Generation Engine Showcase",
    version="1.0.0"
)

# Mount the static directory for the Frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize RAG Engine
rag_engine = RagEngine()

# Ensure temp directory for uploads exists
UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    question: str


@app.post("/ingest", summary="Ingest PDF document", description="Uploads a PDF, chunks it, and stores embeddings locally.")
async def ingest_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # Save the uploaded file temporarily
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process the PDF using RAG Engine
        chunks_count = rag_engine.ingest_pdf(file_path)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    
    finally:
        # Clean up temporary file
        if os.path.exists(file_path):
            os.remove(file_path)
            
    return {
        "status": "success", 
        "message": f"Successfully ingested '{file.filename}'",
        "chunks_processed": chunks_count
    }


@app.post("/query", summary="Query the RAG Engine", description="Ask a question and get an answer based on ingested documents.")
async def query_documents(request: QueryRequest):
    if not request.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    try:
        answer = rag_engine.query(request.question)
        return {
            "question": request.question,
            "answer": answer
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying RAG engine: {str(e)}")


@app.get("/", summary="Dashboard Frontend")
async def root():
    # Return the stunning HTML frontend instead of JSON
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
