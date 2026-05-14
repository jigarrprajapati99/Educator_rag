import os
from google import genai
from pypdf import PdfReader
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

class RAGService:
    def __init__(self):
        print("Initializing Google Gen AI Client for Vertex AI...")
        # The new unified client replaces both TextEmbeddingModel and GenerativeModel
        self.client = genai.Client(
            vertexai=True,
            project=os.getenv("GCP_PROJECT_ID"),
            location=os.getenv("GCP_LOCATION")
        )
        
        self.embedding_model = os.getenv("VERTEX_EMBEDDING_MODEL", "text-embedding-004")
        self.llm_model = os.getenv("VERTEX_LLM_MODEL", "gemini-1.5-flash")
        
        print("Connecting to Pinecone...")
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))

    def ingest_pdf(self, file_path: str, doc_id: str) -> int:
        reader = PdfReader(file_path)
        text = "".join([page.extract_text() for page in reader.pages if page.extract_text()])

        chunk_size = 500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        # New Gen AI Embedding call
        embeddings_response = self.client.models.embed_content(
            model=self.embedding_model,
            contents=chunks
        )
        
        # Extract values from the new response structure
        embeddings = [result.values for result in embeddings_response.embeddings]

        vectors_to_upsert = []
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            vector_id = f"{doc_id}_chunk_{i}"
            metadata = {"text": chunk, "doc_id": doc_id}
            vectors_to_upsert.append((vector_id, emb, metadata))
            
        batch_size = 100
        for i in range(0, len(vectors_to_upsert), batch_size):
            self.index.upsert(vectors=vectors_to_upsert[i:i + batch_size])

        return len(chunks)

    def search(self, query: str, top_k: int = 5) -> list[str]:
        # Generate embedding for the query using the new client
        response = self.client.models.embed_content(
            model=self.embedding_model,
            contents=[query]
        )
        query_embedding = response.embeddings[0].values

        response = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )

        return [match["metadata"]["text"] for match in response.get("matches", []) if "metadata" in match]

    def generate_answer(self, query: str, context: list[str]) -> str:
        if not context:
            return "No relevant context found."
            
        context_string = "\n---\n".join(context)
        prompt = f"Context: {context_string}\n\nQuestion: {query}"
        
        # New Gen AI Generative Model call
        response = self.client.models.generate_content(
            model=self.llm_model,
            contents=prompt
        )
        return response.text

rag_engine = RAGService()