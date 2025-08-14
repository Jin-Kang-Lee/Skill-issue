print("[✅] Backend is starting...")
from fastapi import Request, FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import traceback
from fastapi.responses import PlainTextResponse
import pdfplumber
import docx
import os
import requests
from dotenv import load_dotenv
# from RAG_engine import retrieve_context, generate_answer
import json
from sentence_transformers import SentenceTransformer
import urllib.parse
import re
import logging
from openai import OpenAI
logging.basicConfig(level=logging.INFO)
import re, unicodedata



load_dotenv()  # local only; harmless on Render

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
print("[DEBUG] OpenAI Key Loaded:", (OPENAI_API_KEY[:8] + "…") if OPENAI_API_KEY else "❌ NOT FOUND")

client = OpenAI(api_key=OPENAI_API_KEY)
MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")



# Ollama local API endpoint (change via .env if needed)
# OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")

# Together.ai API config
# TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
# TOGETHER_MODEL = os.getenv("TOGETHER_MODEL", "mistralai/Mistral-7B-Instruct-v0.1")
# TOGETHER_API_URL = os.getenv("TOGETHER_API_URL", "https://api.together.xyz/v1/completions")


app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://skill-issue-ai.netlify.app"
]


# Allow frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # include Netlify here
    allow_credentials=True,
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
    
    

#ATS obvious non-skills/noise to drop (tune as you go)
NOISE = {
    "stakeholder education", "stakeholder communication",
    "communication", "communications", "teamwork",
    "presentation", "presentations", "documentation",
    "microsoft office", "google suite", "ms office", "office",
}

def _normalize(text: str) -> str:
    t = text.lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    # keep word chars and +-. / for things like c++, node.js, ci/cd
    t = re.sub(r"[^\w+\-\.\/ ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def _canonicalize(skill: str) -> str:
    # “Canonical” = normalized; plus very light plural strip for single tokens
    s = _normalize(skill)
    if s.endswith("s") and len(s) > 3 and " " not in s:
        s = s[:-1]
    return s

def _filter_noise(skills: list[str]) -> list[str]:
    out = []
    for s in skills:
        sn = _normalize(s)
        if sn in NOISE:
            continue
        if len(sn.split()) > 5:  # overlong phrases are rarely skills
            continue
        out.append(s)
    return out

def _resume_index(resume_text: str):
    norm = _normalize(resume_text)
    tokens = norm.split()
    # Build n-grams up to 5 tokens for phrase matching
    ngrams = set()
    max_n = 5
    for n in range(1, max_n + 1):
        for i in range(0, len(tokens) - n + 1):
            ngrams.add(" ".join(tokens[i:i+n]))
    return norm, tokens, ngrams

def _regex_word_boundary(term: str) -> re.Pattern:
    # word-boundary exact match; special-case tiny terms to avoid false hits
    if term in {"c", "r", "go"}:
        return re.compile(rf"(?<!\w){re.escape(term)}(?!\w)", re.IGNORECASE)
    return re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)

# Generate spelling/punctuation variants automatically (no curated map)
def _generate_variants(skill_norm: str) -> set[str]:
    """
    Produce likely spelling/punctuation variants:
    - hyphen ↔ space ↔ nothing  (scikit-learn / scikit learn / scikitlearn)
    - dot/slash variants         (node.js / nodejs) (ci/cd / cicd)
    - simple concatenations      (xg boost ↔ xgboost)
    - light plural/singular tweak
    """
    s = skill_norm
    variants = {s}
    variants.update([
        s.replace("-", " "),
        s.replace(" ", "-"),
        s.replace(".", ""),
        s.replace("/", ""),
        s.replace(" ", ""),
    ])
    if " " in s or "-" in s:
        variants.add(s.replace(" ", "").replace("-", ""))

    toks = s.split()
    if len(toks) == 2:
        variants.add("".join(toks))
    if len(toks) == 1 and 5 <= len(s) <= 10:
        mid = len(s) // 2
        variants.add(s[:mid] + " " + s[mid:])

    if s.endswith("s") and " " not in s and len(s) > 3:
        variants.add(s[:-1])

    final = set()
    for v in variants:
        v = re.sub(r"\s+", " ", v).strip()
        if v:
            final.add(v)
    return final

# Optional fuzzy matcher (auto no-op if RapidFuzz not installed)
try:
    from rapidfuzz.fuzz import token_set_ratio
    def _fuzzy(a, b): return token_set_ratio(a, b)
except Exception:
    def _fuzzy(a, b): return 0
    
    
    
@app.post("/ats-score/")
async def ats_score(
    role: str = Form(...),
    resume_text: str = Form(...),
    skills_csv: str = Form(...),
):
    # 1) Parse & denoise incoming skills (from LLM or your list)
    required_raw = [s.strip() for s in skills_csv.split(",") if s.strip()]
    required_raw = _filter_noise(required_raw)

    # 2) Canonicalize skills (normalize + light plural strip)
    canon_list = [ _canonicalize(s) for s in required_raw ]

    # 3) Build resume index once
    resume_norm, _tokens, ngrams = _resume_index(resume_text)

    def match_skill(canon: str) -> bool:
        variants = _generate_variants(canon)

        # First: exact phrase hits via n-grams (covers multi-word & symbol forms)
        for v in variants:
            if " " in v or "/" in v or "." in v:
                if v in ngrams:
                    return True

        # Second: boundary regex for single-token variants
        for v in variants:
            if " " not in v and "/" not in v and "." not in v:
                if _regex_word_boundary(v).search(resume_norm):
                    return True
                # special-case: "c" matches c++/c#
                if v == "c" and re.search(r"\bc\+\+|\bc#\b", resume_norm):
                    return True

        # Optional fuzzy safety net for near-variants (phrases only)
        if _fuzzy != (lambda a, b: 0):
            for v in variants:
                if " " in v:
                    for ng in ngrams:
                        if abs(len(ng.split()) - len(v.split())) <= 1 and _fuzzy(v, ng) >= 90:
                            return True

        return False

    # 4) Evaluate unique canonical skills to avoid double-counting
    seen = set()
    matched, missing = [], []
    for original, canon in zip(required_raw, canon_list):
        if canon in seen:
            continue
        if match_skill(canon):
            matched.append(original)   # return original label to avoid frontend changes
            seen.add(canon)
        else:
            missing.append(original)

    total = len(set(canon_list))
    got = len(seen)
    score = round((got / total) * 100) if total else 0

    return {
        "role": role,
        "score": score,
        "matched_skills": matched,   # same shape as before: list[str]
        "missing_skills": missing,   # same shape as before: list[str]
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
    user_input = user_input.strip()[:3000]

    system_prompt = (
        "You are CareerBot, an expert career advisor. "
        "Given a user's resume, suggest 3 to 5 suitable job roles.\n\n"
        "For each job, follow this format exactly:\n"
        "**<Job Title>**\n"
        "Job Description: a 1–2 sentence summary of what the job entails.\n"
        "Why Suggested: a short reason why this job fits the user.\n"
        "Required Skills: comma-separated list of relevant skills.\n\n"
        "DO NOT include numbered job labels like 'Job 1', 'Job 2'.\n"
        "Only output real job titles using this exact format:\n"
        "**<Job Title>**"
    )

    few_shot_example = (
        "**Machine Learning Engineer**\n"
        "Job Description: Builds machine learning models to solve business problems using data.\n"
        "Why Suggested: Based on your experience with Python and predictive modeling.\n"
        "Required Skills: Python, NumPy, Pandas, Scikit-learn, AWS"
    )

    user_prompt = f"Here is the user's resume:\n{user_input}"

    try:
        logging.info("[🚀] suggest_jobs() called")
        logging.info("[📝] Resume input length: %d characters", len(user_input))

        logging.info("[🧠] System Prompt:")
        logging.info(system_prompt)

        logging.info("[💡] Few-shot Example:")
        logging.info(few_shot_example)

        logging.info("[👤] User Prompt (preview):")
        logging.info(user_prompt[:500])

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": few_shot_example},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=512,
        )

        result = response.choices[0].message.content.strip()
        logging.info("[📩] Raw LLM response:")
        logging.info(repr(result))


        if not result or len(result.strip()) < 30:
            logging.warning("[⚠️] GPT-3.5 returned empty or too short output.")
            return f"[⚠️] GPT returned no usable output for this input:\n\n{user_input[:500]}"

        logging.info("[✅] Suggestions OK:\n" + result[:300])
        return result

    except Exception as e:
        print("[❌] OpenAI job suggestion error:", e)
        return None







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

    print("[DEBUG] Extracted resume input (job suggestion):\n", user_input[:500])
    suggestions = suggest_jobs(user_input)

    # ✅ Ensure suggestions are valid
    if not suggestions or len(suggestions.strip()) < 30:
        print("[❌] LLM response is empty or too short, rejecting.")
        return {
            "job_suggestions": "",
            "resume_text": user_input,
            "error": "No suggestions could be generated."
        }

    print("[✅] Suggestions received:\n", suggestions)
    return {
        "job_suggestions": suggestions,
        "resume_text": user_input
    }


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
    print("[DEBUG] Extracted resume input (feedback):\n", resume_text[:500])
    feedback = generate_resume_feedback(resume_text)
    return {"feedback": feedback}


@app.post("/role-info/")
async def role_info(
    role: str = Form(...),
    skills: str = Form(...)
):
    prompt = (
        "You are CareerBot. Given a job role and a user's skills, respond ONLY with valid JSON including:\n"
        "- 'description': a 2–3 sentence summary of the job\n"
        "- 'faqs': a list of exactly 3 FAQs with 'question' and 'answer' keys\n\n"
        "Return JSON only. Do not include explanation, markdown, or headings.\n\n"
        f"Role: {role}\nUser Skills: {skills}"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=512,
        )
        raw = response.choices[0].message.content.strip()

        # Optional: validate it's JSON
        try:
            parsed = json.loads(raw)
            return parsed
        except Exception:
            print("[⚠️] GPT returned non-JSON:", raw)
            return {"error": "Model returned malformed JSON.", "raw": raw}

    except Exception as e:
        print("[❌] OpenAI role_info request failed:", e)
        return {"error": "Unable to generate role information."}









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
    prompt = (
        "You are an expert resume reviewer. Analyze the following resume and provide section-based feedback.\n"
        "Only include sections that exist in the resume. Use these labels if applicable:\n"
        "1. Summary\n"
        "2. Work Experience\n"
        "3. Skills\n"
        "4. Education\n"
        "5. Formatting & Structure\n"
        "6. Overall Suggestions\n\n"
        "For each section:\n"
        "- Mention what's good (if any)\n"
        "- Point out weaknesses or missing parts\n"
        "- Suggest 1–2 improvements\n\n"
        f"Resume:\n\"\"\"\n{resume_text.strip()[:3000]}\n\"\"\""
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=512,
        )

        result = response.choices[0].message.content.strip()
        print("[DEBUG] GPT Feedback Output:", repr(result))
        return result

    except Exception as e:
        print("[❌] OpenAI resume feedback error:", e)
        return "Error generating feedback."
