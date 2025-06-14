# test_rag.py

from RAG_engine import retrieve_context, generate_answer

# Simulate a resume or a job-related question
test_input = """
I have 3 years of experience in Python and SQL. I recently worked on data pipelines and dashboards.
I'm interested in roles related to data analytics or business intelligence.
"""

# Step 1: Retrieve similar contexts from stored resumes
contexts = retrieve_context(test_input, top_k=5)

# Step 2: Ask your question based on retrieved context
response = generate_answer(
    question="What job roles would suit this person based on their background?",
    context_chunks=contexts
)

print("=== Recommended Job Roles ===")
print(response)
