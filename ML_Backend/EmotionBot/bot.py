from transformers import pipeline
import asyncio
import json
import os
import torch
from transformers import pipeline
from huggingface_hub import InferenceClient

# Check if GPU is available
use_local_model = torch.cuda.is_available()

if use_local_model:
    # Load the model locally
    emotion_model = pipeline(
        task="text-classification", model="SamLowe/roberta-base-go_emotions", top_k=None
    )
else:
    key = os.getenv("HUGGINGFACE_API_KEY")

    # Use Hugging Face Inference API
    hf_client = InferenceClient(
        model="SamLowe/roberta-base-go_emotions",
        # top_k=3,
        api_key=key,
    )


async def emotion_detection(query):
    """
    Detects the emotion in the input query.
    Uses local model if GPU is available, otherwise uses Hugging Face Inference API.
    """
    if use_local_model:
        results = emotion_model(query, top_k=3)
        final_result = []
        for result in results:
            label = result["label"]
            probability = result["score"]
            if probability > 0.5:
                final_result.append(label)
        return final_result
    else:
        results = hf_client.text_classification(query, top_k=3)
        final_result = []
        for result in results:
            label = result["label"]
            probability = result["score"]
            if probability >= 0.4:
                final_result.append(label)
        return final_result


async def __main__():
    query = "I am feeling very sad today. My dog passed away and I am devastated."
    emotion_result = await emotion_detection(query)
    print(json.dumps(emotion_result, indent=2))


if __name__ == "__main__":
    asyncio.run(__main__())
