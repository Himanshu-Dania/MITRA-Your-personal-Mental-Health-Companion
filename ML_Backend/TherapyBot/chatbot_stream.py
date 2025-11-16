import os
import asyncio
import sys
# Points to the parent directory containing EmotionBot, StrategyBot, TherapyBot
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.chains import ConversationChain
from langchain_classic.memory import ConversationSummaryBufferMemory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    AIMessagePromptTemplate,
)
from langchain_core.chat_history import BaseChatMessageHistory
from pydantic import BaseModel, Field
from typing import List
from langchain_core.runnables import (
    RunnableLambda,
    ConfigurableFieldSpec,
    RunnablePassthrough,
)
from langchain_core.messages import BaseMessage
from langchain.tools import tool
from langchain.agents import initialize_agent, AgentType
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from RAG.retreive_books import query_retriever
from EmotionBot.bot import emotion_detection
from StrategyBot.bot import predict_therapy_strategy
from TherapyBot.utils import system_prompt, user_prompt, pet_prompt

load_dotenv()


# --------------------- TOOLS ---------------------

@tool("save_memory_to_db")
def save_memory_to_db(user_id: int, session_id: str, memory: str):
    print(f"[DB MEMORY SAVE] User: {user_id}, Session: {session_id}")
    print(f"Summary Saved: {memory}")
    return {"status": "success", "memory": memory}


@tool("create_therapy_task")
def create_therapy_task(user_id: int, reason_for_task_creation: str):
    print(f"[THERAPY TASK] New Task Created for User {user_id}")
    print(f"Reason for Task Creation: {reason_for_task_creation}")
    return {"status": "success", "reason_for_task_creation": reason_for_task_creation}



# --------------------- CHATBOT ---------------------

class Chatbot:
    def __init__(self, retry_count: int = 3):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables.")

        self.retry_count = retry_count
        self.conversation_llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.7)
        self.summary_llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", temperature=0.7)
        # Prompt setup
        self.system_prompt_template = SystemMessagePromptTemplate(prompt=system_prompt)
        self.user_prompt_template = HumanMessagePromptTemplate(prompt=user_prompt)
        pet_prompt_template = AIMessagePromptTemplate(prompt=pet_prompt)

        self.prompt = ChatPromptTemplate.from_messages(
            [
                self.system_prompt_template,
                MessagesPlaceholder(variable_name="history"),
                (
                    "user",
                    """These are some book excerpts relevant to user's question:
{context}

{input}
**Detected Emotions:** {emotion_result}
**Reasoning for strategy:** {reasoning_for_strategy}
**Predicted Strategy:** {strategy_result}""",
                ),
            ]
        )

        # Memory system
        self.chat_history = ChatMessageHistory() # This is the chat history of the user and the pet

        # This is the part that summarises old chat and keeps some of the new ones
        self.memory = ConversationSummaryBufferMemory(
            llm=self.summary_llm,
            max_token_limit=1000,
            chat_memory=self.chat_history, 
        )

        # Core conversation chain
        self.chain = ConversationChain(
            llm=self.conversation_llm,
            memory=self.memory,
            prompt=self.prompt,
            verbose=False,
        )

        # Multi-user / multi-session message history
        self.store = {}

        # RunnableWithMessageHistory wrapper
        self.chain_with_history = RunnableWithMessageHistory(
            self.chain,
            self.get_message_history,
            input_messages_key="input",
            history_messages_key="history",
            history_factory_config=[
                ConfigurableFieldSpec(
                    id="user_id",
                    annotation=str,
                    name="User ID",
                    description="Unique identifier for the user.",
                    default="",
                    is_shared=True,
                ),
                ConfigurableFieldSpec(
                    id="session_id",
                    annotation=str,
                    name="Session ID",
                    description="Unique identifier for the session.",
                    default="",
                    is_shared=True,
                ),
            ],
        )

        # Initialize agent for tool calling
        self.agent = initialize_agent(
            tools=[save_memory_to_db, create_therapy_task],
            llm=self.conversation_llm,
            agent_type=AgentType.OPENAI_FUNCTIONS,
            verbose=False,
        )

        print("Chatbot initialized.\n")

    def get_message_history(self, session_id: str, user_id: int) -> ChatMessageHistory:
        if user_id not in self.store:
            self.store[user_id] = {}
        if session_id not in self.store[user_id]:
            self.store[user_id][session_id] = ChatMessageHistory()
        return self.store[user_id][session_id]

    async def chat(self, query: str, session_id: str, user_id: int):
        message_history = self.get_message_history(session_id, user_id)

        rag_docs_task = asyncio.create_task(asyncio.to_thread(query_retriever, query))
        emotion_task = asyncio.create_task(emotion_detection(query))
        recent_msgs = message_history.messages[-8:]
        recent_msgs.append(HumanMessage(content=f"{query}"))
        strategy_task = asyncio.create_task(predict_therapy_strategy(recent_msgs))

        emotion_result, strategy_result, rag_docs = await asyncio.gather(
            emotion_task, strategy_task, rag_docs_task
        )
        reasoning, strategy_list = strategy_result
        combined_context = "\n\n".join([doc.page_content for doc in rag_docs])

        response = ""
        attempts, successful, last_exception = 0, False, None

        while attempts < self.retry_count and not successful:
            try:
                async for token in self.chain_with_history.astream(
                    {
                        "input": query,
                        # "history": message_history.messages,
                        "emotion_result": emotion_result,
                        "reasoning_for_strategy": reasoning,
                        "strategy_result": strategy_list,
                        "context": combined_context,
                    },
                    config={"configurable": {"session_id": session_id, "user_id": user_id}},
                ):
                    yield token.content
                    response += token.content
                successful = True
            except Exception as e:
                last_exception = e
                attempts += 1
                print(f"Error on attempt {attempts}: {e}")
                await asyncio.sleep(2 ** attempts)

        if not successful:
            raise Exception("Failed after retries.") from last_exception

        # Add messages
        message_history.add_user_message(query)
        message_history.add_ai_message(response)

        # Trigger tool usage if context suggests
        if "save memory" in response.lower():
            summary = self.memory.moving_summary_buffer[-1] if self.memory.moving_summary_buffer else response[:500]
            self.agent.run(
                "Save this session summary",
                user_id=user_id,
                session_id=session_id,
                memory=summary,
            )

        if "create task" in response.lower():
            self.agent.run(
                "Create a therapy task for the user",
                user_id=user_id,
                reason_for_task_creation=f"Suggested by conversation: {response[:150]}",
            )


# --------------------- TEST ---------------------
if __name__ == "__main__":
    async def main():
        bot = Chatbot()
        while True:
            query = input("\n>> User: ")
            if query.lower() == "exit":
                break
            print(">> Pet: ")
            async for res in bot.chat(query, "sess1", 123):
                print(res, end="")
    asyncio.run(main())
