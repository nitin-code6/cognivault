from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    # Simulated response before we introduce an actual LLM
    return ChatResponse(reply=f"AI Service received: {request.message}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
