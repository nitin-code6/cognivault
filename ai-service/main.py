import os
import io
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from PyPDF2 import PdfReader
from sqlalchemy import select
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
    filter_filename: str = None

class ChatResponse(BaseModel):
    reply: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    db = SessionLocal()
    try:
        # 1. Embed user query
        query_emb = client.models.embed_content(
            model='text-embedding-004',
            contents=request.message
        ).embeddings[0].values
        
        # 2. Retrieve top chunks
        stmt = select(DocumentChunk)
        if request.filter_filename:
            stmt = stmt.filter(DocumentChunk.filename == request.filter_filename)
            
        results = db.scalars(
            stmt.order_by(DocumentChunk.embedding.cosine_distance(query_emb))
            .limit(3)
        ).all()
        
        context_text = "\n\n".join([f"Source: {res.filename}\n{res.text}" for res in results])
        
        # 3. Augment Prompt
        augmented_prompt = f"Use the following context to answer the user's question. If you don't know the answer based on the context, say so.\n\nContext:\n{context_text}\n\nQuestion:\n{request.message}"
        
        # Call the LLM (Gemini 2.5 Flash) with the augmented prompt
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=augmented_prompt,
        )
        return ChatResponse(reply=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

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
