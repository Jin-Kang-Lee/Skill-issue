from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import docx
from openai import OpenAI
import os
from dotenv import load_dotenv
import requests

# Load environment variables from .env
load_dotenv()

# Ollama local API endpoint (change via .env if needed)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")

app = FastAPI()

# Allow frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # adjust if your frontend URL differs
    allow_methods=["*"],
    allow_headers=["*"],
)

# Utility function to read PDF content
def extract_text_from_pdf(file):
    with pdfplumber.open(file) as pdf:
        return "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])

# Utility function to read DOCX content
def extract_text_from_docx(file):
    doc = docx.Document(file)
    return "\n".join([para.text for para in doc.paragraphs])

# Function to generate job roles using Ollama
def suggest_jobs(prompt_text: str) -> str:
    """
    Send a chat completion request to Ollama's local API.
    Returns the AI-generated suggestion text.
    """
    payload = {
        "model": "llama3:latest",  # or your chosen model
        "messages": [
            {"role": "system", "content": "You are a helpful career advisor."},
            {"role": "user",   "content": prompt_text}
        ],
        "temperature": 0.7
    }
    response = requests.post(OLLAMA_URL, json=payload)
    response.raise_for_status()
    # Ollama returns a structure similar to OpenAI
    return response.json()["choices"][0]["message"]["content"].strip()


#Function that handles resume upload from user
@app.post("/upload-resume/")
async def upload_resume(file: UploadFile = File(None), skills: str = Form(None)):
    user_input = ""

    if file:
        # Save the uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        # Extract content based on file type
        if file.filename.endswith(".pdf"):
            user_input = extract_text_from_pdf(temp_path)
        elif file.filename.endswith(".docx"):
            user_input = extract_text_from_docx(temp_path)
        else:
            return {"error": "Unsupported file format. Only PDF or DOCX allowed."}

        os.remove(temp_path)  # Clean up temporary file

    elif skills:
        user_input = skills
    else:
        return {"error": "No input provided"}

    # Compose prompt for AI
    prompt = (
        f"Here is a list of skills and experiences from a user:\n\n{user_input}\n\n"
        f"Based on this, suggest 3–5 suitable job roles or career paths the user could consider. "
        f"Explain each briefly."
    )

    # Get job suggestions from GPT
    suggestions = suggest_jobs(prompt)
    return {"job_suggestions": suggestions}
