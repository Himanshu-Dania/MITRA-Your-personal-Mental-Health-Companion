from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
import asyncio
import torch

persist_directory = "User_Embeddings"
collection_name = "interests"
model_name = "sentence-transformers/all-mpnet-base-v2"

# 1) Create embeddings using Hugging Face Sentence Transformer
print(f"[INFO] Using model: {model_name}")
embeddings = HuggingFaceEmbeddings(
    model_name=model_name,
    model_kwargs={"device": "cuda" if torch.cuda.is_available() else "cpu"},
)
# Change 'device' to 'cuda' if you have a GPU and the model supports it.

# 2) Convert the sentence into a Document

vectordb = Chroma(
    collection_name=collection_name,
    persist_directory=persist_directory,
    embedding_function=embeddings,
)


async def upload_interests_to_rag(
    user_interests: str,
    user_id: int,
):
    """
    Ingests a single user sentence into a Chroma DB as part of a Retrieval-Augmented Generation (RAG) setup.
    """

    doc = Document(page_content=user_interests, metadata={"user_id": user_id})
    loop = asyncio.get_event_loop()

    # Add the new document to the vector store (in a background thread)
    await loop.run_in_executor(None, vectordb.add_documents, [doc])

    # Persist to disk so it can be reused later (also in a background thread)
    await loop.run_in_executor(None, vectordb.persist)

    print(
        f"[INFO] Successfully added your sentence to the RAG collection '{collection_name}'."
    )


async def __main__():
    while True:
        user_input = input("Enter your sentence: ")
        if user_input.lower() == "exit":
            break
        user_id = int(input("Enter your user ID: "))
        await upload_interests_to_rag(user_input, user_id=user_id)


if __name__ == "__main__":
    # Simple CLI usage
    asyncio.run(__main__())
