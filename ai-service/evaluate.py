import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# A simple script to evaluate RAG responses based on faithfulness and relevance
def evaluate_response(question, context, answer):
    client = genai.Client(api_key=os.getenv("LLM_API_KEY"))
    
    eval_prompt = f"""
    Evaluate the following RAG response.
    Question: {question}
    Context: {context}
    Answer: {answer}
    
    Score the answer from 1 to 5 on:
    1. Faithfulness (Is the answer derived ONLY from the context?)
    2. Relevance (Does the answer directly address the question?)
    
    Output Format:
    Faithfulness: [Score]
    Relevance: [Score]
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=eval_prompt,
    )
    return response.text

if __name__ == "__main__":
    print("Running Cognivault RAG Evaluation...")
    q = "What is the company leave policy?"
    c = "Employees get 15 days of annual leave and 5 days of sick leave."
    a = "You have 15 days of annual leave and 5 sick days."
    print("Result:\n" + evaluate_response(q, c, a))
