# import mongodb
import time
import asyncio
import sys
import os
from dotenv import load_dotenv
load_dotenv()
# Points to the parent directory containing EmotionBot, StrategyBot, TherapyBot
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.messages import HumanMessage
import json
from typing import List
from TaskBot.utils import Task, Journey, JourneySchema, json_task
from langchain_core.prompts import PromptTemplate
from TaskBot.prompts import (
    create_task_prompt,
    journey_prompt_template,
    task_difficulty_prompt,
)

class Taskbot:
    def __init__(self, retry_count: int = 3):
        self.create_task_prompt = create_task_prompt
        self.journey_prompt_template = journey_prompt_template
        self.task_difficulty_prompt = task_difficulty_prompt

        # Get the single API key.
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key is None:
            raise ValueError("GOOGLE_API_KEY not found in environment variables.")
        
        # Set the sretry count for API calls.
        self.retry_count = retry_count

        # Create a single LLM instance.
        self.llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", api_key=api_key)

        print("Initialised Taskbot with 1 LLM\n")

    async def create_task(self, reason, tasks: List[Task]):
        tasks_json = json.dumps(
            [task.model_dump() for task in tasks], ensure_ascii=False, indent=2
        )
        # print(f"tasks_json: {tasks_json}\nReason: {reason}")
        
        # Retry mechanism
        attempts = 0
        last_exception = None
        
        while attempts < self.retry_count:
            try:
                llm_chain = self.create_task_prompt | self.llm
                result = llm_chain.invoke(
                    input={"reason": reason, "tasks_json": tasks_json}
                )
                # print(f"Result: {result}")
                return result.content.strip()
            except Exception as e:
                last_exception = e
                attempts += 1
                print(f"Error on attempt {attempts}/{self.retry_count}: {str(e)}")
                if attempts < self.retry_count:
                    # Wait a bit before retrying (exponential backoff)
                    await asyncio.sleep(2 ** attempts)
        
        raise Exception(f"API call failed after {self.retry_count} attempts.") from last_exception

    async def process_task_into_journey(self, new_task: Task, journeys: List[Journey]):
        tasks_json = json.dumps(new_task.model_dump(), ensure_ascii=False, indent=2)
        journeys_json = json.dumps(
            [j.model_dump() for j in journeys], ensure_ascii=False, indent=2
        )

        # print("new task: ")
        # print(new_task)

        # print("journeys: ")
        # print(journeys)

        # Retry mechanism
        attempts = 0
        last_exception = None
        
        while attempts < self.retry_count:
            try:
                llm_chain = self.journey_prompt_template | self.llm
                result = llm_chain.invoke(
                    input={"new_task": tasks_json, "journeys_json": journeys_json}
                )
                return result.content.strip()
            except Exception as e:
                last_exception = e
                attempts += 1
                print(f"Error on attempt {attempts}/{self.retry_count}: {str(e)}")
                if attempts < self.retry_count:
                    # Wait a bit before retrying (exponential backoff)
                    await asyncio.sleep(2 ** attempts)
        
        raise Exception(f"API call failed after {self.retry_count} attempts.") from last_exception

    async def change_task_difficulty(self, reason, task: Task):
        task_json = json.dumps(task.model_dump(), ensure_ascii=False, indent=2)
        
        # Retry mechanism
        attempts = 0
        last_exception = None
        
        while attempts < self.retry_count:
            try:
                llm_chain = self.task_difficulty_prompt | self.llm
                result = llm_chain.invoke(input={"reason": reason, "task": task_json})
                return result.content.strip()
            except Exception as e:
                last_exception = e
                attempts += 1
                print(f"Error on attempt {attempts}/{self.retry_count}: {str(e)}")
                if attempts < self.retry_count:
                    # Wait a bit before retrying (exponential backoff)
                    await asyncio.sleep(2 ** attempts)
        
        raise Exception(f"API call failed after {self.retry_count} attempts.") from last_exception


async def __main__():
    model = Taskbot()
    tasks = [
        json_task(
            task_name="Morning Gratitude",
            task_type="checkmark",
            reason="Alice needs to reaffirm their love for themself",
            description="Mark your morning gratitude as complete",
            difficulty="easy",
            completed=True,
        ),
        json_task(
            task_name="Meditation for 10 minutes",
            task_type="slider",
            reason="Alice struggles with overthinking",
            description="Meditate for at least 10 minutes",
            completed=30,
            difficulty="easy",
        ),
    ]
    result = await model.create_task(
        "To help User get used to rejections and failures.", tasks
    )
    print("Result 1:", result)


if __name__ == "__main__":
    asyncio.run(__main__())
