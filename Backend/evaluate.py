import os
import warnings

# 1. Disable Ragas telemetry and warnings for a clean output
os.environ["RAGAS_DO_NOT_TRACK"] = "true"
warnings.filterwarnings("ignore", category=DeprecationWarning)

import pandas as pd
from datasets import Dataset
from ragas import evaluate

from ragas.metrics import (
    Faithfulness,
    ContextPrecision,
    ContextRecall
)

# 2. Import the required wrappers for Ragas v0.3+ compatibility
from ragas.llms import llm_factory
from ragas.embeddings import LangchainEmbeddingsWrapper
from openai import OpenAI
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

from app.services.rag.engine import rag_engine

def run_evaluation():
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    # Setup Groq using the OpenAI client to satisfy Ragas InstructorLLM requirements
    groq_client = OpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    
    # Initialize the judge model (Reverted to the valid Groq Llama model)
    evaluator_llm = llm_factory(
        model="meta-llama/llama-4-scout-17b-16e-instruct", 
        client=groq_client
    )
    
    # Wrap FastEmbed for Ragas compatibility
    base_embeddings = FastEmbedEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    evaluator_embeddings = LangchainEmbeddingsWrapper(base_embeddings)

    # 3. Real test dataset extracted from your uploaded PDFs
    questions = [
        "Why are local SLMs the compliant solution for hospitals and law firms?",
        "What happens to an eigenbasis when a matrix is symmetric?",
        "What does the integral represent in calculus?",
        "Without mathematics, what would computers be?"
    ]
    
    ground_truths = [
        "Local SLMs are the only compliant solution because of Data Sovereignty; these industries cannot send data to the cloud.",
        "Symmetric matrices guarantee an orthonormal eigenbasis.",
        "The integral represents total accumulation, which is the area under a curve.",
        "Without mathematics, computers would only be machines that store and fetch data."
    ]

    answers = []
    contexts = []

    print(f"Running {len(questions)} queries through the Educator RAG system...")
    
    for query in questions:
        # 4. Updated top_k to 5 as requested
        retrieved_context = rag_engine.search(query, top_k=5)
        contexts.append(retrieved_context)
        
        answer = rag_engine.generate_answer(query, retrieved_context)
        answers.append(answer)

    data = {
        "user_input": questions,        
        "response": answers,            
        "retrieved_contexts": contexts, 
        "reference": ground_truths      
    }
    dataset = Dataset.from_dict(data)

    print("Evaluating with Ragas...")
    
    metrics = [
        ContextPrecision(),
        ContextRecall(),
        Faithfulness(),
    ]

    result = evaluate(
        dataset=dataset,
        metrics=metrics,
        llm=evaluator_llm,
        embeddings=evaluator_embeddings
    )

    df = result.to_pandas()
    print("\n--- Evaluation Results ---")
    print(df[['user_input', 'faithfulness', 'context_precision', 'context_recall']])
    
    # Print average scores across all questions
    print("\n--- Average System Performance ---")
    print(f"Faithfulness:      {df['faithfulness'].mean():.3f}")
    print(f"Context Precision: {df['context_precision'].mean():.3f}")
    print(f"Context Recall:    {df['context_recall'].mean():.3f}")
    
    df.to_csv("rag_evaluation_results.csv", index=False)
    print("\nResults saved to rag_evaluation_results.csv")

if __name__ == "__main__":
    run_evaluation()