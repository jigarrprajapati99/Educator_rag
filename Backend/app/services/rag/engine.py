import os
import uuid
from pypdf import PdfReader
from fastembed import TextEmbedding
from groq import Groq
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

class RAGService:
    def __init__(self):
        print("Initializing Embedding Model...")
        # This model outputs embeddings with 384 dimensions
        self.model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        print("Connecting to Pinecone...")
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
        
        # Initialize LLM Client
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key)

    def ingest_pdf(self, file_path: str) -> int:
        reader = PdfReader(file_path)
        text = "".join([page.extract_text() for page in reader.pages if page.extract_text()])

        chunk_size = 500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        # Generate embeddings (fastembed generator converted to list)
        embeddings = list(self.model.embed(chunks))

        # Prepare vectors for Pinecone batch upsert
        vectors_to_upsert = []
        doc_id = str(uuid.uuid4())[:8] # Short unique ID for the document session
        
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            vector_id = f"{doc_id}_chunk_{i}"
            # Pinecone requires standard Python lists, not Numpy arrays
            vector_values = emb.tolist() 
            # Store the text chunk in the metadata payload
            metadata = {"text": chunk}
            
            vectors_to_upsert.append((vector_id, vector_values, metadata))
            
        # Upsert in batches of 100 to optimize network calls
        batch_size = 100
        for i in range(0, len(vectors_to_upsert), batch_size):
            batch = vectors_to_upsert[i:i + batch_size]
            self.index.upsert(vectors=batch)

        return len(chunks)

    def search(self, query: str, top_k: int = 3) -> list[str]:
        # Embed the search query
        query_embedding = list(self.model.embed([query]))[0].tolist()

        # Query Pinecone and ensure we request the metadata back
        response = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )

        # Extract the text chunks from the returned metadata
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
            model="qwen/qwen3-32b", 
            messages=[
                {"role": "system", "content": "You are a helpful assistant. You only answer questions based on the provided context. If you don't know the answer, say you don't know."},
                {"role": "user", "content": f"Context: {context_string}\n\nQuestion: {query}"}
            ]
        )
        return response.choices[0].message.content

rag_engine = RAGService()