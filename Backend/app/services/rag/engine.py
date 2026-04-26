import os
from pypdf import PdfReader
from fastembed import TextEmbedding
from groq import Groq
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

class RAGService:
    def __init__(self):
        print("Initializing Embedding Model...")
        self.model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        print("Connecting to Pinecone...")
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
        
        # Initialize LLM Client
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key)

    # Note: We now FORCE it to accept the doc_id from ingest.py
    def ingest_pdf(self, file_path: str, doc_id: str) -> int:
        reader = PdfReader(file_path)
        text = "".join([page.extract_text() for page in reader.pages if page.extract_text()])

        chunk_size = 500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        embeddings = list(self.model.embed(chunks))

        vectors_to_upsert = []
        
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            # We use the exact doc_id passed from MongoDB
            vector_id = f"{doc_id}_chunk_{i}"
            vector_values = emb.tolist() 
            metadata = {"text": chunk, "doc_id": doc_id}
            
            vectors_to_upsert.append((vector_id, vector_values, metadata))
            
        batch_size = 100
        for i in range(0, len(vectors_to_upsert), batch_size):
            batch = vectors_to_upsert[i:i + batch_size]
            self.index.upsert(vectors=batch)

        return len(chunks)

    def delete_document(self, doc_id: str, num_chunks: int):
        # We recreate the exact vector IDs using the MongoDB doc_id
        vector_ids = [f"{doc_id}_chunk_{i}" for i in range(num_chunks)]
        
        batch_size = 100
        for i in range(0, len(vector_ids), batch_size):
            self.index.delete(ids=vector_ids[i:i + batch_size])

    def search(self, query: str, top_k: int = 5) -> list[str]:
        query_embedding = list(self.model.embed([query]))[0].tolist()

        response = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )

        results = []
        for match in response.get("matches", []):
            if "metadata" in match and "text" in match["metadata"]:
                results.append(match["metadata"]["text"])
                
        return results

    def generate_answer(self, query: str, context: list[str]) -> str:
        if not context:
            return "No relevant context found in the database to answer this question."
            
        context_string = "\n---\n".join(context)
        response = self.client.chat.completions.create(
            model="openai/gpt-oss-120b", 
            messages=[
                {"role": "system", "content": "You are a helpful assistant. You only answer questions based on the provided context. If you don't know the answer, say you don't know."},
                {"role": "user", "content": f"Context: {context_string}\n\nQuestion: {query}"}
            ]
        )
        return response.choices[0].message.content

rag_engine = RAGService()