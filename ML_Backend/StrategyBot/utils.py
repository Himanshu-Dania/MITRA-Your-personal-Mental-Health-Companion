from typing import List, Dict, Optional, Union
from langchain_core.prompts import PromptTemplate
from langchain_community.chat_message_histories import ChatMessageHistory

from langchain_core.prompts.chat import HumanMessage, SystemMessage, AIMessage


def format_conversation(messages: List[Dict]) -> str:
    """
    Formats a list of conversation messages into a string format required by the Gemini API.

    Example input:
    [
        {
            "role": "sys",
            "strategy": ["Question", "Reflection of feelings"],
            "content": "How are you feeling today?"
        },
        {
            "role": "usr",
            "strategy": None,
            "content": "I'm feeling a bit anxious"
        }
    ]
    """

    # Validate input
    if not messages:
        raise ValueError("Messages list cannot be empty")

    formatted_messages = []

    for msg in messages:
        # Validate required fields
        if "role" not in msg or "content" not in msg:
            raise ValueError("Each message must have 'role' and 'content' fields")

        role = msg["role"]
        content = msg["content"].strip()

        if role not in ["usr", "sys"]:
            raise ValueError(f"Invalid role: {role}. Must be 'usr' or 'sys'")

        # Format system messages with strategy
        if role == "sys":
            strategies = msg.get("strategy", [])
            # Handle both string and list inputs for backward compatibility
            if isinstance(strategies, str):
                strategies = [strategies]
            elif strategies is None:
                strategies = []

            if not strategies:
                # System messages can now have no strategy
                formatted_msg = f"sys: {content}"
            else:
                # Join multiple strategies with comma and space
                strategy_str = ", ".join(strategies)
                formatted_msg = f"sys({strategy_str}): {content}"

        # Format user messages
        else:  # role == 'usr'
            if msg.get("strategy"):
                raise ValueError("User messages should not have a strategy")
            formatted_msg = f"usr: {content}"

        formatted_messages.append(formatted_msg)

    # Join all messages with newlines
    return "\n".join(formatted_messages)


from langchain.schema import HumanMessage, AIMessage, SystemMessage
import re


def extract_strategies(system_message):
    match = re.search(r"strategy_list: \[(.*?)\]", system_message.content)
    return match.group(1) if match else ""


def format_messages(messages):
    formatted_output = []
    strategies = ""

    for i, msg in enumerate(messages):
        if isinstance(msg, SystemMessage):
            strategies = extract_strategies(msg)
        elif isinstance(msg, HumanMessage):
            formatted_output.append(f"usr: {msg.content}")
        elif isinstance(msg, AIMessage):
            if strategies:
                formatted_output.append(f"sys({strategies}): {msg.content}")
                strategies = ""
            else:
                formatted_output.append(f"sys: {msg.content}")
    return "\n".join(formatted_output)


# print(format_messages(messages))


# Example usage:
if __name__ == "__main__":
    # Example usage
    messages = [
        HumanMessage(content="hi how"),
        SystemMessage(
            content='emotion_result: [], strategy_list: [X, Y, Z], reasoning_for_strategy: "dbak"'
        ),
        AIMessage(
            content="Hi there. How are you doing today?  I'm here if you'd like to talk about anything."
        ),
        HumanMessage(content="good"),
        SystemMessage(
            content='emotion_result: [], strategy_list: [X, Y, Z], reasoning_for_strategy: "dbak"'
        ),
        AIMessage(
            content="I'm glad to hear that. Is there anything in particular you'd like to chat about today, or are you just checking in?  I'm happy to listen either way."
        ),
        HumanMessage(content="nothing"),
        SystemMessage(
            content='emotion_result: [], strategy_list: [X, Y], reasoning_for_strategy: "dbak"'
        ),
        AIMessage(
            content="Okay. Sometimes it's nice just to connect, even if there's nothing specific to discuss.  If you change your mind and want to talk, I'm here.  Perhaps you might want to think about what made you feel good today?  Sometimes reflecting on positive moments can boost our mood even further.  Take care!"
        ),
    ]

    print(format_messages(messages))
