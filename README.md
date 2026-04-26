# Educator RAG (Retrieval-Augmented Generation)

Educator RAG is a full-stack AI-powered educational assistant. It allows users to upload educational documents (PDFs) and interact with an intelligent chat interface to ask questions about the material. The system uses advanced vector search to retrieve relevant context and generates accurate, grounded answers using state-of-the-art Large Language Models.

## ✨ Features
* **Document Ingestion:** Upload educational PDFs (e.g., Calculus, Linear Algebra) which are automatically chunked and embedded.
* **Semantic Search:** Uses Pinecone Vector Database and FastEmbed to find the most relevant document chunks based on user queries.
* **Conversational AI:** Powered by the Groq API (using models like Llama 3/4) to provide fast, context-aware answers.
* **Session Management:** Secure user authentication (JWT) and persistent chat history stored in MongoDB.
* **Automated Evaluation:** Built-in evaluation pipeline using the **Ragas** framework to mathematically measure Context Precision, Context Recall, and Answer Faithfulness.

## 🛠️ Tech Stack

### Frontend
* **Framework:** React + Vite
* **State Management:** Zustand (`useAuthStore`)
* **Styling:** CSS / Tailwind (via `index.css`)

### Backend
* **Framework:** FastAPI (Python)
* **AI & Orchestration:** LangChain
* **LLM Provider:** Groq (`meta-llama/llama-4-scout-17b-16e-instruct`)
* **Embeddings:** FastEmbed (`sentence-transformers/all-MiniLM-L6-v2`)
* **Vector Database:** Pinecone
* **Document Database:** MongoDB
* **Evaluation:** Ragas

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v19)
* Python (3.11)
* MongoDB instance (Atlas)
* API Keys for **Groq** and **Pinecone**

### 1. Backend Setup
Navigate to the backend directory:
```bash
cd Backend