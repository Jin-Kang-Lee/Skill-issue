from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import docx
import os
import requests
from dotenv import load_dotenv
from fastapi import Form
import requests


# Load environment variables from .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

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
def extract_text_from_pdf(file_path: str) -> str:
    with pdfplumber.open(file_path) as pdf:
        return "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])

# Utility function to read DOCX content
def extract_text_from_docx(file_path: str) -> str:
    document = docx.Document(file_path)
    return "\n".join([para.text for para in document.paragraphs])

# Function to generate job roles using Ollama
def suggest_jobs(user_input: str) -> str:
    """
    Send a chat completion request to Ollama's local API.
    Returns the AI-generated suggestion text.
    """
    system_message = {
        "role": "system",
        "content": (
            "You are CareerBot, an expert career advisor. "
            "Translate a user's skills and experiences into personalized job role suggestions. "
            "Always reference specific user skills or experiences. "
            "For each role, emit a Markdown bullet like:\n\n"
            "  **Role Title**: short explanation  \n"
            "  Required Skills: comma-separated list of the most important skills  \n\n"
            "Respond with 3–5 such bullets, no extra conclusion."
        )
    }

    few_shot = {
        "role": "user",
        "content": (
            "**Example 1:**\n"
            "**Data Analyst**: Your experience with Excel and SQL showcases strong analytical capabilities. This role leverages those skills to derive actionable insights.  \n"
            "Required Skills: Excel, SQL, Python\n\n"
            "**Example 2:**\n"
            "**Technical Writer**: Your clear documentation during past projects highlights your ability to translate complex concepts. In this role, you'd produce precise technical guides.  \n"
            "Required Skills: Writing, Attention to Detail, Markdown\n\n"
            "---"
        )
    }

    user_message = {
        "role": "user",
        "content": f"Here is the user's skills and experiences:\n{user_input}\n\nBased on this, suggest 3 to 5 career roles as bullet points following the format above."
    }

    payload = {
        "model": "llama3:8b",
        "messages": [system_message, few_shot, user_message],
        "temperature": 0.7
    }

    response = requests.post(OLLAMA_URL, json=payload)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()

@app.post("/upload-resume/")
async def upload_resume(file: UploadFile = File(None), skills: str = Form(None)):
    user_input = ""

    if file:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        if file.filename.lower().endswith(".pdf"):
            user_input = extract_text_from_pdf(temp_path)
        elif file.filename.lower().endswith(".docx"):
            user_input = extract_text_from_docx(temp_path)
        else:
            os.remove(temp_path)
            return {"error": "Unsupported file format. Only PDF or DOCX allowed."}

        os.remove(temp_path)

    elif skills:
        user_input = skills.strip()
    else:
        return {"error": "No input provided. Please upload a resume or enter skills."}

    # Get job suggestions
    suggestions = suggest_jobs(user_input)
    return {"job_suggestions": suggestions}


@app.post("/role-info/")
async def role_info(
    role: str = Form(...),
    skills: str = Form(...)
):
    """
    Given a selected role and the user's skills, return JSON with:
    - description: short overview
    - faqs: list of {question, answer}
    """
    system_message = {
        "role": "system",
        "content": (
            "You are CareerBot. "
            "Given a job role and a user's skills, output ONLY valid JSON with two keys:\n"
            "1) description: a 2–3 sentence overview of the role\n"
            "2) faqs: an array of exactly 3 {question, answer} pairs about the role\n"
        )
    }
    user_message = {
        "role": "user",
        "content": f"Role: {role}\nUser skills: {skills}\n\nRespond ONLY with JSON."
    }
    payload = {
        "model": "llama3:8b",
        "messages": [system_message, user_message],
        "temperature": 0.7
    }
    resp = requests.post(OLLAMA_URL, json=payload)
    resp.raise_for_status()
    # Return the raw JSON string from the model
    return resp.json()["choices"][0]["message"]["content"]

