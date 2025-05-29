from RAG_engine import retrieve_context, generate_answer

question = "Suggest a job title for someone with project management and HR experience"
chunks = retrieve_context(question, top_k=5)
answer = generate_answer(question, chunks)

print("\n📌 Question:", question)
print("\n📚 Retrieved Chunks:\n", "\n---\n".join(chunks))
print("\n🧠 Generated Answer:\n", answer)