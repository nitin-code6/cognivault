import os
import io
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from PyPDF2 import PdfReader
from database import SessionLocal, DocumentChunk, init_db
import uvicorn

load_dotenv()
init_db()

app = FastAPI()

# Initialize Gemini Client
# We use os.getenv to pull the key from our .env file securely.
client = genai.Client(api_key=os.getenv("LLM_API_KEY"))

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    try:
        # Call the LLM (Gemini 2.5 Flash) with the user's prompt
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=request.message,
        )
        return ChatResponse(reply=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        
        # We only support PDF for now
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
            
        pdf = PdfReader(io.BytesIO(content))
        
        extracted_text = ""
        for page in pdf.pages:
            extracted_text += page.extract_text() + "\n"
            
        # Fixed-size Semantic Chunking
        chunk_size = 500
        overlap = 50
        chunks = []
        
        i = 0
        while i < len(extracted_text):
            chunk = extracted_text[i:i+chunk_size]
            if chunk.strip():
                chunks.append(chunk)
            i += (chunk_size - overlap)
            
        # Generate Embeddings & Save to DB
        db = SessionLocal()
        try:
            for text_chunk in chunks:
                emb_res = client.models.embed_content(
                    model='text-embedding-004',
                    contents=text_chunk
                )
                
                db_chunk = DocumentChunk(
                    filename=file.filename,
                    text=text_chunk,
                    embedding=emb_res.embeddings[0].values
                )
                db.add(db_chunk)
            db.commit()
        finally:
            db.close()
            
        return {
            "filename": file.filename,
            "metadata": {
                "pages": len(pdf.pages),
                "total_chunks": len(chunks)
            },
            "status": "embedded_and_stored"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
