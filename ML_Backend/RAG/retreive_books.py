from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import torch
import os
from typing import Tuple, List

# 1) Set up your embedding model
embedding_model = "sentence-transformers/all-mpnet-base-v2"
embeddings = HuggingFaceEmbeddings(
    model_name=embedding_model,
    model_kwargs={"device": "cuda" if torch.cuda.is_available() else "cpu"},
)

# 2) Load the existing Chroma DB from the local folder
vectordb = Chroma(
    persist_directory="books_chroma_db",
    collection_name="rag_docs",
    embedding_function=embeddings,
)

# 3) MMR retriever — k=3 final docs selected from fetch_k=12 candidates.
#    lambda_mult=0.6 balances relevance (1.0) vs. diversity (0.0).
retriever = vectordb.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 3, "fetch_k": 12, "lambda_mult": 0.6},
)


def _source_id(doc) -> str:
    """Build a human-readable source identifier from a Document's metadata."""
    meta = doc.metadata or {}
    src = os.path.basename(meta.get("source", ""))
    page = meta.get("page", meta.get("chunk", ""))
    return f"{src}:{page}" if page != "" else (src or "unknown")


def query_retriever(query: str) -> Tuple[str, List[str]]:
    """
    Retrieve relevant passages via MMR search.

    Returns:
        combined_context  -- passages joined by double newline (ready to inject into prompt)
        sources           -- list of source identifiers for storage in the message doc
    """
    docs = retriever.invoke(query)
    combined_context = "\n\n".join(doc.page_content for doc in docs)
    sources = [_source_id(doc) for doc in docs]
    return combined_context, sources


# Example usage
if __name__ == "__main__":
    test_query = "How do I go about the loss of someone?"
    context, srcs = query_retriever(test_query)

    if not context:
        print("No documents retrieved.")
    else:
        print(f"Retrieved {len(srcs)} documents.\n")
        for idx, src in enumerate(srcs, start=1):
            print(f"Document {idx}: {src}")
        print("\n--- Combined Context (first 500 chars) ---")
        print(context[:500])
