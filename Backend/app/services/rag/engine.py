# pyrefly: ignore [missing-import]
import os
from pinecone import Pinecone
from dotenv import load_dotenv

# LlamaIndex Core
from llama_index.core import Settings, VectorStoreIndex, Document, StorageContext
from llama_index.core.node_parser import SentenceSplitter

# LlamaIndex Google GenAI (New SDK)
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

# LlamaIndex Pinecone Integration
from llama_index.vector_stores.pinecone import PineconeVectorStore

from pypdf import PdfReader

# This automatically loads GOOGLE_APPLICATION_CREDENTIALS into the environment,
# which the new google-genai SDK natively detects for authentication!
load_dotenv()

class RAGService:
    def __init__(self):
        print("Initializing LlamaIndex with Google GenAI SDK (Vertex AI)...")
        
        # Configuration routing the new SDK to your specific Google Cloud Project
        vertex_config = {
            "project": os.getenv("GCP_PROJECT_ID"),
            "location": os.getenv("GCP_LOCATION")
        }
        
        # 1. Setup Global LlamaIndex Settings
        Settings.embed_model = GoogleGenAIEmbedding(
            model_name=os.getenv("VERTEX_EMBEDDING_MODEL"),
            vertexai_config=vertex_config
        )
        
        Settings.llm = GoogleGenAI(
            model=os.getenv("VERTEX_LLM_MODEL"),
            vertexai_config=vertex_config
        )
        
        # 2. Improved Chunking Strategy (Session 2 & Session 7)
        Settings.node_parser = SentenceSplitter(
            chunk_size=512,    
            chunk_overlap=50   
        )

        # 3. Vector Management via LlamaIndex (Session 7)
        print("Connecting to Pinecone...")
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.pinecone_index = self.pc.Index(os.getenv("PINECONE_INDEX_NAME"))
        
        # Bind Pinecone to LlamaIndex
        self.vector_store = PineconeVectorStore(pinecone_index=self.pinecone_index)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        
        # Initialize the unified Index
        self.index = VectorStoreIndex.from_vector_store(
            vector_store=self.vector_store,
            storage_context=self.storage_context
        )

    def ingest_pdf(self, file_path: str, doc_id: str) -> int:
        # Extract text using PyPDF
        reader = PdfReader(file_path)
        text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])

        # Create a single LlamaIndex Document object containing the metadata
        doc = Document(
            text=text, 
            metadata={"doc_id": doc_id}
        )
        
        # LlamaIndex handles the chunking (via SentenceSplitter), embedding, and upserting automatically
        nodes = Settings.node_parser.get_nodes_from_documents([doc])
        self.index.insert_nodes(nodes)

        return len(nodes)

    def search(self, query: str, top_k: int = 5) -> list[str]:
        # Improved Retrieval Strategy utilizing LlamaIndex's native retriever mechanics
        retriever = self.index.as_retriever(similarity_top_k=top_k)
        retrieved_nodes = retriever.retrieve(query)
        
        # Extract and return the raw text block from the matched Node objects
        return [node.get_content() for node in retrieved_nodes]

    async def generate_answer(self, query: str, context: list[str]) -> str:
        if not context:
            return "No relevant context found."
            
        context_string = "\n---\n".join(context)
        
        # Enhanced Educator Prompt
        prompt = (
            "You are an expert Educator AI. Your goal is to explain concepts clearly and accurately using the provided context.\n\n"
            "Guidelines:\n"
            "- Use structured Markdown: Use ## headers for sections, **bold** for key terms, and bullet points for lists.\n"
            "- Code & Formulas: Use triple backticks for code blocks and single backticks for inline code.\n"
            "- Accuracy: Base your answer strictly on the provided context. If the information is missing, admit it.\n"
            "- Tone: Be helpful, professional, and encouraging.\n\n"
            "Context information is below.\n"
            "---------------------\n"
            f"{context_string}\n"
            "---------------------\n"
            f"Query: {query}\n"
            "Answer: "
        )
        
        response = await Settings.llm.acomplete(prompt)
        return str(response)

    def delete_document(self, doc_id: str, chunks_count: int = 0):
        # I noticed ingest.py calls rag_engine.delete_document(). 
        # With LlamaIndex, the easiest way to delete an entire document's chunks 
        # is using the Pinecone client directly to filter by the metadata doc_id.
        try:
            self.pinecone_index.delete(filter={"doc_id": {"$eq": doc_id}})
        except Exception as e:
            print(f"Error deleting document from Pinecone: {e}")

rag_engine = RAGService()