import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
import uvicorn

load_dotenv()

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
