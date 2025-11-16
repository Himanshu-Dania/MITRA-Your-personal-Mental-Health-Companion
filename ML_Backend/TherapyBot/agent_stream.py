import os
import asyncio
import sys
# Points to the parent directory containing EmotionBot, StrategyBot, TherapyBot
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.runnables.history import RunnableWithMessageHistory
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
from langchain_core.tools import tool
# from langchain.agents import AgentType
from langchain.agents import create_agent
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from RAG.retreive_books import query_retriever
from EmotionBot.bot import emotion_detection
from StrategyBot.bot import predict_therapy_strategy
from TherapyBot.utils import _decode_thread_id, _extract_config_dict, is_probably_json, system_prompt, user_prompt, pet_prompt, chat_prompt
from TaskBot.bot import Taskbot
from TaskBot.utils import Task
import json
from langchain.agents.middleware import SummarizationMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.runnables import RunnableConfig
# from langchain_core.runnables import get_current_config
from typing import Optional, Any, Dict
load_dotenv()

# Module-level debug flags (will be set by TherapyAgent instance)
_query_debug: bool = False
_agent_debug: bool = False
_task_debug: bool = False
_checkpoint_debug: bool = False

def set_debug_flags(query_debug: bool = False, agent_debug: bool = False, task_debug: bool = False, checkpoint_debug: bool = False):
    """Set the shared debug flags for use in tools and agent methods."""
    global _query_debug, _agent_debug, _task_debug, _checkpoint_debug
    _query_debug = query_debug
    _agent_debug = agent_debug
    _task_debug = task_debug
    _checkpoint_debug = checkpoint_debug

def get_query_debug() -> bool:
    """Get the query debug flag."""
    return _query_debug

def get_agent_debug() -> bool:
    """Get the agent debug flag."""
    return _agent_debug

def get_task_debug() -> bool:
    """Get the task debug flag."""
    return _task_debug

def get_checkpoint_debug() -> bool:
    """Get the checkpoint debug flag."""
    return _checkpoint_debug

class SystemSummaryMiddleware(SummarizationMiddleware):
    """Same as SummarizationMiddleware, but injects summaries as system messages instead of user messages."""

    def insert_summary(self, messages, summary_message):
        """
        Override the default behavior so the summary is added
        as a SYSTEM message, not a HUMAN message.
        """
        system_msg = SystemMessage(content=summary_message)
        messages.append(system_msg)

# Module-level TaskBot instance (will be initialized by TherapyAgent)
_taskbot_instance: Optional[Taskbot] = None

def set_taskbot_instance(taskbot: Taskbot):
    """Set the shared TaskBot instance for use in tools."""
    global _taskbot_instance
    _taskbot_instance = taskbot

def get_taskbot_instance() -> Taskbot:
    """Get the shared TaskBot instance, creating one if it doesn't exist."""
    global _taskbot_instance
    if _taskbot_instance is None:
        _taskbot_instance = Taskbot()
    return _taskbot_instance



#try making tool runnable? or maybe by customstate or just prompt bs
@tool("save_memory_to_db")
def save_memory_to_db(memory: str, thread_id: str):
    """Save a specific user memory into the database."""

    user_id, session_id = _decode_thread_id(thread_id)

    if get_task_debug():  # Reusing task_debug for all tool debug logs
        print(f"[DB MEMORY SAVE] User: {user_id}, Session: {session_id}")
        print(f"[DB MEMORY SAVE] Summary Saved: {memory[:200]}...")

    return {
        "status": "success",
        "memory": memory,
        "user_id": user_id,
        "session_id": session_id,
    }

def _clean_json_response(response: str) -> str:
    """Extract JSON from markdown code blocks if present."""
    response = response.strip()
    
    # Remove markdown code blocks (```json ... ```)
    if response.startswith("```json"):
        # Find the closing ```
        end_idx = response.rfind("```")
        if end_idx > 0:
            response = response[7:end_idx].strip()  # Remove ```json and closing ```
    elif response.startswith("```"):
        # Generic code block
        end_idx = response.rfind("```")
        if end_idx > 0:
            response = response[3:end_idx].strip()  # Remove ``` and closing ```
    
    return response.strip()


@tool("create_therapy_task")
async def create_therapy_task(reason_for_task_creation: str, thread_id: str):
    """Create a therapy-related task for the user, based on the given reason. 
    This tool uses TaskBot to generate personalized therapy tasks that avoid redundancy 
    and are tailored to the user's needs."""
    
    user_id, session_id = _decode_thread_id(thread_id)
    
    if get_task_debug():
        print(f"[THERAPY TASK] New Task Creation Started for User {user_id}, Session {session_id}")
        print(f"[THERAPY TASK] Reason: {reason_for_task_creation}")
    
    # Get shared TaskBot instance
    taskbot = get_taskbot_instance()
    
    # TODO: Fetch existing tasks for this user from database
    # For now, using empty list - you should replace this with actual DB query
    existing_tasks = []  # Replace with: await get_user_tasks(user_id, session_id)
    
    try:
        # Call TaskBot to create the task
        task_json_result = await taskbot.create_task(reason_for_task_creation, existing_tasks)
        
        # Clean the response (remove markdown code blocks if present)
        cleaned_json = _clean_json_response(task_json_result)
        
        # Parse the JSON response from TaskBot
        try:
            task_data = json.loads(cleaned_json)
            
            # Handle both single task and list of tasks
            if isinstance(task_data, dict) and "task" in task_data:
                # Extract the task from the wrapper
                task_data = task_data["task"]
            elif isinstance(task_data, list) and len(task_data) > 0 and isinstance(task_data[0], dict) and "task" in task_data[0]:
                # Handle list of tasks wrapped in task key
                task_data = [item["task"] if isinstance(item, dict) and "task" in item else item for item in task_data]
            
        except json.JSONDecodeError as e:
            if get_task_debug():
                print(f"[THERAPY TASK] JSON Parse Error: {e}")
                print(f"[THERAPY TASK] Raw response: {cleaned_json[:500]}")
            # If parsing fails, return the cleaned string
            task_data = {"raw_response": cleaned_json}
        
        if get_task_debug():
            print(f"[THERAPY TASK] Task Created Successfully")
            print(f"[THERAPY TASK] Task Data: {json.dumps(task_data, indent=2)[:300]}...")
        
        # Format a user-friendly response string instead of returning raw dict
        # This prevents the agent from echoing the entire JSON structure
        if isinstance(task_data, dict):
            task_name = task_data.get("task_name", "A therapy task")
            task_description = task_data.get("description", "")
            task_type = task_data.get("task_type", "")
            difficulty = task_data.get("difficulty", "")
            
            # Create a concise, natural description for the agent to use
            response_text = f"Task created: '{task_name}'. {task_description}"
            if difficulty:
                response_text += f" (Difficulty: {difficulty})"
        elif isinstance(task_data, list) and len(task_data) > 0:
            # Handle multiple tasks
            task_names = [t.get("task_name", "task") if isinstance(t, dict) else str(t) for t in task_data]
            response_text = f"Created {len(task_data)} tasks: {', '.join(task_names)}"
        else:
            response_text = "Task created successfully."
        
        # Store full task data for potential later use (e.g., saving to DB)
        # You can access this via a getter function if needed
        if get_task_debug():
            # Store in a simple dict for debugging (in production, save to DB)
            if not hasattr(create_therapy_task, '_task_store'):
                create_therapy_task._task_store = {}
            create_therapy_task._task_store[f"{user_id}_{session_id}"] = {
                "status": "success",
                "created_task": task_data,
                "reason_for_task_creation": reason_for_task_creation,
            }
        
        return response_text
    except Exception as e:
        if get_task_debug():
            print(f"[THERAPY TASK] Error creating task: {str(e)}")
        return f"Error creating task: {str(e)}"


# --------------------- CHATBOT ---------------------

class TherapyAgent:
    def __init__(
        self, 
        retry_count: int = 1,
        query_debug: bool = False,
        agent_debug: bool = False,
        task_debug: bool = False,
        checkpoint_debug: bool = False
    ):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables.")

        self.retry_count = retry_count
        self.query_debug = query_debug
        self.agent_debug = agent_debug
        self.task_debug = task_debug
        self.checkpoint_debug = checkpoint_debug
        
        # Set module-level debug flags for tools to access
        set_debug_flags(query_debug, agent_debug, task_debug, checkpoint_debug)
        
        self.conversation_llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", temperature=0.7)
        self.summary_llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.9)
        
        # Initialize TaskBot instance and share it with tools
        self.taskbot = Taskbot()
        set_taskbot_instance(self.taskbot)
        # Prompt setup

        self.system_prompt_template = SystemMessagePromptTemplate.from_template(system_prompt.template)
        self.user_prompt_template = HumanMessagePromptTemplate.from_template(user_prompt.template)
        pet_prompt_template = AIMessagePromptTemplate.from_template(pet_prompt.template)
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

        summarisation_middleware = SystemSummaryMiddleware(
            model=self.summary_llm,
            max_tokens_before_summary=4000,
            messages_to_keep=6,
            summary_prompt="""Summarize the conversation so far using ONLY information explicitly stated in user or assistant messages.

Rules:
- DO NOT add interpretation or assumptions.
- DO NOT infer emotions, fears, or therapy themes unless explicitly mentioned.
- DO NOT summarize system messages, prompts, or instructions.
- DO NOT summarize explanations of how to summarize.


Include ONLY:
- User’s explicit requests.
- Assistant’s explicit responses.
- Tasks actually created (with difficulty if provided).
- Any tool calls and their explicit results.

""",
        )
        chat_history_checkpointer=InMemorySaver()
        # Initialize agent for tool calling
        self.agent = create_agent(
            tools=[save_memory_to_db, create_therapy_task],
            model=self.conversation_llm,
            system_prompt=system_prompt.template,
            # agent_type=AgentType.OPENAI_FUNCTIONS,
            # middleware=[summarisation_middleware],
            checkpointer = chat_history_checkpointer,
            debug=False,
        )
        self.agent.checkpointer.storage.clear()

        print("Agent initialized.\n")



    async def chat(self, query: str, session_id: int, user_id: int):
        thread_id = f"{user_id}_{session_id}"

        # retrieve full or partial history (from checkpointer)
        config = RunnableConfig(configurable={"thread_id": thread_id, "user_id": user_id, "session_id": session_id})
        checkpoint = self.agent.checkpointer.get(config)
        
        state = (
            checkpoint.checkpoint.get("state", {}) if checkpoint and hasattr(checkpoint, "checkpoint") else {}
        )

        messages = state.get("messages", []) if isinstance(state, dict) else []

        recent_msgs = messages[-8:]


        # add new message
        recent_msgs.append(HumanMessage(content=query))

        # concurrent async tasks
        rag_docs_task = asyncio.create_task(asyncio.to_thread(query_retriever, query))
        emotion_task = asyncio.create_task(emotion_detection(query))
        strategy_task = asyncio.create_task(predict_therapy_strategy(recent_msgs))

        emotion_result, strategy_result, rag_docs = await asyncio.gather(
            emotion_task, strategy_task, rag_docs_task
        )
        # emotion_result,rag_docs = (["neutral"], ["", ""])
        # strategy_result=("reason", [])
        if self.query_debug:
            print(f"Received the intermediate inputs {emotion_result}, {strategy_result}, {rag_docs[0]}")
        reasoning, strategy_list = strategy_result
        # combined_context = "\n\n".join([doc.page_content for doc in rag_docs])
        combined_context=""

        response = ""
        attempts, successful, last_exception = 0, False, None

        while attempts < self.retry_count and not successful:
            try:
                # Combine all retrieved info into a single user message string
                message_text = f"""
                User Message: {query}

                These are some book excerpts relevant to the user's question:
                {combined_context}

                **Detected Emotions:** {emotion_result}
                **Reasoning for strategy:** {reasoning}
                **Predicted Strategy:** {strategy_list}

                Use these details if you need to call tools :- thread_id: {thread_id}
                """
                
                inside_json_block = False  # NEW STATE FLAG

                async for token, metadata in self.agent.astream(
                    {"messages": [{"role": "user", "content": message_text}]},
                    stream_mode="messages",
                    config=config,
                ):
                    if self.agent_debug:
                        token_type = type(token).__name__
                        print(f"[TOKEN DEBUG] Received token type: {token_type}")

                    # -------------------------------
                    # 1. Skip tool call / function call messages
                    # -------------------------------
                    if hasattr(token, "additional_kwargs"):
                        if "function_call" in token.additional_kwargs:
                            if self.agent_debug:
                                print("[TOKEN DEBUG] Filtered: Function call detected in additional_kwargs")
                            continue

                    # -------------------------------
                    # 2. Skip tool call metadata
                    # -------------------------------
                    if getattr(token, "tool_calls", None):
                        if self.agent_debug:
                            print(f"[TOKEN DEBUG] Filtered: tool_calls found: {token.tool_calls}")
                        continue

                    if getattr(token, "tool_call_chunks", None):
                        if self.agent_debug:
                            print(f"[TOKEN DEBUG] Filtered: tool_call_chunks found: {token.tool_call_chunks}")
                        continue

                    # -------------------------------
                    # 3. Skip tool result messages
                    # -------------------------------
                    if hasattr(token, "tool_call_id"):
                        if self.agent_debug:
                            print(f"[TOKEN DEBUG] Filtered: tool_call_id found: {token.tool_call_id}")
                        continue

                    if getattr(token, "name", None) and getattr(token, "tool_call_id", None):
                        if self.agent_debug:
                            print("[TOKEN DEBUG] Filtered: token has name and tool_call_id")
                        continue

                    # -------------------------------
                    # 4. Extract text
                    # -------------------------------
                    text = getattr(token, "content", None) or ""

                    if self.agent_debug:
                        print(f"[TOKEN DEBUG] Extracted text: {repr(text[:100])} (length: {len(text)})")

                    # -------------------------------
                    # 5. Skip empty text
                    # -------------------------------
                    if not text.strip():
                        if self.agent_debug:
                            print("[TOKEN DEBUG] Filtered: Empty or whitespace-only text")
                        continue

                    # -------------------------------
                    # 6. JSON BLOCK SUPPRESSION LOGIC
                    # -------------------------------

                    # Detect the start of a ``` fenced block
                    if text.strip().startswith("```") or text.strip().endswith("```"):
                        inside_json_block = not inside_json_block
                        
                        if self.agent_debug:
                            print(f"[TOKEN DEBUG] JSON block toggle. Now inside_json_block={inside_json_block}")
                        
                        # Do NOT stream this fence line
                        continue

                    # If inside JSON block → suppress EVERYTHING
                    if inside_json_block:
                        if self.agent_debug:
                            print("[TOKEN DEBUG] Filtered: inside JSON fenced block")
                        continue

                    # # -------------------------------
                    # # 7. Skip JSON-like fragments (brace chunks)
                    # # -------------------------------
                    # if is_probably_json(text):
                    #     if self.agent_debug:
                    #         print("[TOKEN DEBUG] Filtered: Detected as JSON/markdown artifact")
                    #     continue

                    # -------------------------------
                    # 8. FINALLY: yield valid assistant text
                    # -------------------------------
                    if self.agent_debug:
                        print(f"[TOKEN DEBUG] YIELDING: {repr(text[:50])}...")

                    yield text
                    response += text


                # async for event in self.agent.astream(
                #     {"messages": [{"role": "user", "content": message_text}]},
                #     config=config,
                #     stream_mode="updates",
                # ):
                #     print(event)


                successful = True

            except Exception as e:
                last_exception = e
                attempts += 1
                print(f"Error on attempt {attempts}: {e}")
                await asyncio.sleep(2 ** attempts)
        if self.checkpoint_debug:
            self.debug_agent(user_id, session_id)
        # print(f"Response: {response}")
        if not successful:
            raise Exception("Failed after retries.") from last_exception


        # # Trigger tool usage if context suggests
        # if "save memory" in response.lower():
        #     summary = self.memory.moving_summary_buffer[-1] if self.memory.moving_summary_buffer else response[:500]
        #     self.agent.run(
        #         "Save this session summary",
        #         user_id=user_id,
        #         session_id=session_id,
        #         memory=summary,
        #     )

        # if "create task" in response.lower():
        #     self.agent.run(
        #         "Create a therapy task for the user",
        #         user_id=user_id,
        #         reason_for_task_creation=f"Suggested by conversation: {response[:150]}",
        #     )

    def debug_agent(self, user_id: int, session_id: int):
        thread_id = f"{user_id}_{session_id}"
        config = RunnableConfig(configurable={"thread_id": thread_id, "user_id": user_id})
        checkpoints = self.agent.checkpointer.list(config)
        print(f"\n\n--- Agent Debug for Thread: {thread_id} ---")
        try:
            for i, checkpoint in enumerate(checkpoints):
                print(f"\n[Checkpoint {i}]")
                print(f"  Timestamp: {checkpoint.checkpoint.get('ts')}")
                print(f"  Thread TS: {checkpoint.checkpoint.get('thread_ts')}")
                state = checkpoint.checkpoint.get('checkpoint', {}).get('state')
                if state:
                    print(f"  State Messages: {state.get('messages')}")
                else:
                    print("  State: (Empty)")
        except Exception as e:
            print(f"Error while debugging checkpoints: {e}")
            
        print("--- End Agent Debug ---")

# --------------------- TEST ---------------------
if __name__ == "__main__":
    async def main():
        bot = TherapyAgent(agent_debug=False)

        while True:
            query = input("\n>> User: ")
            if query.lower() == "exit":
                break
            print(">> Pet: ")
            response=""
            async for res in bot.chat(query, 10, 123):
                response+=res
                print(res, end="")
    asyncio.run(main())
