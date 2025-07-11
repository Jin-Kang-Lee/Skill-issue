from fastapi import Request, FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import traceback
from fastapi.responses import PlainTextResponse
import pdfplumber
import docx
import os
import requests
from dotenv import load_dotenv
import requests
# from RAG_engine import retrieve_context, generate_answer
import json
from sentence_transformers import SentenceTransformer
import urllib.parse
import re



# Load environment variables from .env
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Ollama local API endpoint (change via .env if needed)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")

app = FastAPI()

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]


# Allow frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                    "http://127.0.0.1:3000"],  # adjust if your frontend URL differs
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        tb = traceback.format_exc()
        print("[✖] Error in request:", tb)
        return PlainTextResponse("Internal server error", status_code=500)
    
    
    
@app.post("/ats-score/")
async def ats_score(
    role: str = Form(...),
    resume_text: str = Form(...),
    skills_csv: str = Form(...)
):
    required_skills = [s.strip() for s in skills_csv.split(",") if s.strip()]
    resume_text = resume_text.lower()

    matched = [s for s in required_skills if s.lower() in resume_text]
    missing = [s for s in required_skills if s.lower() not in resume_text]
    score = round((len(matched) / len(required_skills)) * 100) if required_skills else 0

    return {
        "score": score,
        "matched_skills": matched,
        "missing_skills": missing
    }



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
            "  Required Skills: a comma-separated list of 6 to 10 specific skills and tools relevant to the job. Include both general and technical terms. \n\n"
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
        "model": "mistral:instruct",
        "messages": [system_message, few_shot, user_message],
        "temperature": 0.7
    }

    # response = requests.post(OLLAMA_URL, json=payload)
    # response.raise_for_status()
    # return response.json()["choices"][0]["message"]["content"].strip()
    response = requests.post(OLLAMA_URL, json=payload, stream=True)
    response.raise_for_status()

    full_content = ""
    for line in response.iter_lines():
        if not line:
            continue
        obj = json.loads(line.decode("utf-8"))
        part = obj.get("message", {}).get("content", "")
        full_content += part
        if obj.get("done") is True:
            break

    return full_content.strip()

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


@app.post("/resume-feedback/")
async def resume_feedback(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    if file.filename.lower().endswith(".pdf"):
        resume_text = extract_text_from_pdf(temp_path)
    elif file.filename.lower().endswith(".docx"):
        resume_text = extract_text_from_docx(temp_path)
    else:
        os.remove(temp_path)
        return {"error": "Unsupported file format. Only PDF or DOCX allowed."}

    os.remove(temp_path)

    # Generate feedback
    feedback = generate_resume_feedback(resume_text)
    return {"feedback": feedback}


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
        "model": "mistral:instruct",
        "messages": [system_message, user_message],
        "temperature": 0.7
    }
    resp = requests.post(OLLAMA_URL, json=payload)
    resp.raise_for_status()
    # Return the raw JSON string from the model
    return resp.json()["choices"][0]["message"]["content"]







#SETTING JOB POSTING LOCATIONS
LOCATION = "Singapore"

#NORMALIZING JOB ROLES
def normalize_role(role: str) -> str:
    parts = re.split(r'\s+(for|in|at|on|within)\b', role, flags=re.IGNORECASE)
    return parts[0].strip()

#PROVIDE LINKS FOR JOB POSTINGS
def build_search_urls(role: str):
    simple = normalize_role(role)
    q = urllib.parse.quote_plus(simple)
    base_urls = {
      "Indeed": f"https://sg.indeed.com/jobs?q={q}&l={LOCATION}&fromage=1",
      "LinkedIn": f"https://www.linkedin.com/jobs/search/?keywords={q}&location={LOCATION}&f_TPR=r86400",
      "JobStreet": f"https://www.jobstreet.com.sg/en/job-search/{q}-jobs-in-Singapore",
      "MyCareersFuture": f"https://www.mycareersfuture.gov.sg/search?search={q}&sortBy=relevancy&page=0"
    }
    return base_urls

@app.get("/api/search-links/")
async def search_links(role: str):
    urls = build_search_urls(role)
    return [{"site": s, "url": u} for s, u in urls.items()]





#GENERATE FEEDBACK FOR RESUME
def generate_resume_feedback(resume_text: str) -> str:
    prompt = f"""
You are an expert resume reviewer. Analyze the resume below and give section-based feedback.

Break your feedback into the following labeled sections (only include sections that exist in the resume):

1. Summary
2. Work Experience
3. Skills
4. Education
5. Formatting & Structure
6. Overall Suggestions

For each section:
- Mention what is good (if any)
- Point out missing or weak parts
- Suggest 1–2 ways to improve
- Be concise and friendly

Resume:
\"\"\"{resume_text}\"\"\"
"""

    payload = {
        "model": "mistral:instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    response = requests.post(OLLAMA_URL, json=payload, stream=True)
    response.raise_for_status()

    full_content = ""
    for line in response.iter_lines():
        if not line:
            continue
        obj = json.loads(line.decode("utf-8"))
        part = obj.get("message", {}).get("content", "")
        full_content += part
        if obj.get("done") is True:
            break

    return full_content.strip()
