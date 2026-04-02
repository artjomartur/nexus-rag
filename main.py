import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from RagEngine import RagEngine
from typing import Optional

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Nexus RAG API",
    description="Enterprise Multi-Notebook RAG Engine Showcase",
    version="1.1.0"
)

# Mount the static directory for the Frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize RAG Engine
rag_engine = RagEngine()

# Base directory for notebooks
BASE_NOTEBOOKS_DIR = "./notebooks"
os.makedirs(BASE_NOTEBOOKS_DIR, exist_ok=True)

# Helper to get notebook paths
def get_notebook_paths(notebook_name: str):
    notebook_path = os.path.join(BASE_NOTEBOOKS_DIR, notebook_name)
    data_path = os.path.join(notebook_path, "data")
    os.makedirs(data_path, exist_ok=True)
    return notebook_path, data_path

# Ensure a default notebook exists
get_notebook_paths("Default")

class QueryRequest(BaseModel):
    question: str

class NotebookRequest(BaseModel):
    name: str

@app.get("/notebooks", summary="List All Notebooks")
async def list_notebooks():
    """Returns a list of all available notebooks."""
    if not os.path.exists(BASE_NOTEBOOKS_DIR):
        return {"notebooks": []}
    notebooks = [d for d in os.listdir(BASE_NOTEBOOKS_DIR) 
                 if os.path.isdir(os.path.join(BASE_NOTEBOOKS_DIR, d))]
    return {"notebooks": notebooks}

@app.post("/notebooks", summary="Create New Notebook")
async def create_notebook(request: NotebookRequest):
    """Creates a new notebook with its own knowledge base."""
    if not request.name or not request.name.isalnum():
        raise HTTPException(status_code=400, detail="Notebook name must be alphanumeric.")
    
    get_notebook_paths(request.name)
    return {"status": "success", "message": f"Notebook '{request.name}' created."}

@app.post("/ingest", summary="Ingest PDF document", description="Uploads a PDF to a specific notebook's context.")
async def ingest_document(
    file: UploadFile = File(...), 
    notebook: str = Header("Default")
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    _, data_path = get_notebook_paths(notebook)
    file_path = os.path.join(data_path, file.filename)
    
    try:
        # Save the uploaded file permanently in the notebook's data folder
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Switch RagEngine to this notebook's context
        rag_engine.set_notebook(notebook)
        
        # Process the PDF using RAG Engine
        chunks_count = rag_engine.ingest_pdf(file_path)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
            
    return {
        "status": "success", 
        "message": f"Successfully ingested '{file.filename}' into '{notebook}'",
        "chunks_processed": chunks_count
    }

@app.post("/query", summary="Query the RAG Engine", description="Ask a question in a specific notebook's context.")
async def query_documents(
    request: QueryRequest, 
    notebook: str = Header("Default")
):
    if not request.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    try:
        # Switch RagEngine to this notebook's context
        rag_engine.set_notebook(notebook)
        
        answer = rag_engine.query(request.question)
        return {
            "question": request.question,
            "answer": answer,
            "notebook": notebook
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying RAG engine: {str(e)}")

@app.get("/files", summary="List Ingested Files")
async def list_files(notebook: str = Header("Default")):
    """Returns a list of all PDF files stored in a specific notebook's data directory."""
    _, data_path = get_notebook_paths(notebook)
    if not os.path.exists(data_path):
        return {"files": []}
    files = [f for f in os.listdir(data_path) if f.endswith('.pdf')]
    return {"files": files}

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@app.post("/contact", summary="Contact Form Submission")
async def contact_form(request: ContactRequest):
    """Handles contact form submissions from the landing page."""
    # For now, we'll just log it and return success. 
    # In a real app, this would send an email or store it in a DB.
    print(f"Contact from {request.name} ({request.email}): {request.message}")
    return {"status": "success", "message": "Thank you! I have received your message."}

@app.get("/app", summary="RAG Dashboard")
async def app_dashboard():
    """Serves the main multi-notebook RAG dashboard."""
    return FileResponse("static/app.html")

@app.get("/", summary="Landing Page")
async def landing_page():
    """Serves the project's professional landing page."""
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
