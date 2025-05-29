import pandas as pd
import faiss
import numpy as np
import os
import requests
from tqdm import tqdm

# === Load cleaned resume dataset ===
df = pd.read_csv("resume_cleaned.csv")
texts = df['clean_text'].tolist()

# === Paths to store/load vector index and metadata ===
INDEX_PATH = "vector_store/faiss.index"
META_PATH = "vector_store/metadata.npy"

# === Function to get embeddings using Ollama's /api/embeddings ===
def get_ollama_embedding(text, model="nomic-embed-text"):
    """
    Send the input text to Ollama's embedding endpoint and return the embedding vector.
    Must have Ollama running with the model already pulled.
    """
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": model, "prompt": text}
    )
    response.raise_for_status()
    return response.json()["embedding"]  # returns list of floats

# === Function to create or load a FAISS index ===
def build_or_load_index():
    """
    If a FAISS index exists, load it from disk.
    Otherwise, create it by generating embeddings via Ollama.
    """
    if os.path.exists(INDEX_PATH):
        # Load FAISS index and metadata from disk
        index = faiss.read_index(INDEX_PATH)
        metadata = np.load(META_PATH, allow_pickle=True)
        return index, metadata
    else:
        # Generate embeddings for all resumes using Ollama
        print("Generating embeddings using Ollama...")
        embeddings = [get_ollama_embedding(text) for text in tqdm(texts)]
        embeddings = np.array(embeddings).astype("float32")

        # Create FAISS index (L2 = Euclidean distance)
        index = faiss.IndexFlatL2(embeddings.shape[1])
        index.add(embeddings)

        # Save index and metadata for future use
        os.makedirs("vector_store", exist_ok=True)
        faiss.write_index(index, INDEX_PATH)
        np.save(META_PATH, np.array(texts))

        return index, texts

# Build or load the index + metadata
index, metadata = build_or_load_index()

# === Function to retrieve top-k similar resume texts for a query ===
def retrieve_context(query, top_k=5):
    """
    Convert query into embedding using Ollama,
    search in FAISS index, return top-k matched resume texts.
    """
    query_vec = np.array([get_ollama_embedding(query)]).astype("float32")
    D, I = index.search(query_vec, top_k)  # D = distance, I = indices
    return [metadata[i] for i in I[0]]

# === Function to send prompt + context to Ollama LLM for generation ===
def generate_answer(question, context_chunks, model="llama3"):
    """
    Ask a question using retrieved context, and generate an answer via Ollama's LLM API.
    """
    context = "\n---\n".join(context_chunks)  # combine resume texts into a block
    prompt = f"""
You are ResumeBot. You are given context from candidate resumes below.

Context:
{context}

Answer the following question using only the information above:

Question: {question}
"""

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post("http://localhost:11434/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data['message']['content']
    except Exception as e:
        return f"Error communicating with Ollama: {str(e)}"
