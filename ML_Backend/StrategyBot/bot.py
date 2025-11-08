import sys
import os

# Points to the parent directory containing EmotionBot, StrategyBot, TherapyBot
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

import google.generativeai as genai
import asyncio
from concurrent.futures import ThreadPoolExecutor
from StrategyBot.utils import format_conversation, format_messages
import re
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)
# print("API Key set")
# Create the model
generation_config = {
    "temperature": 0.25,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 768,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-flash-lite-latest",
    generation_config=generation_config,
)
# print("model set")
system_prompt = """Your task is to analyze a conversation and predict the therapy strategy to be respond to the newest user message. Before giving your final answer, explain your reasoning step-by-step, showing how earlier parts of the conversation led to your prediction. The possible strategies are: Question, Restatement or Paraphrasing, Reflection of feelings, Self-disclosure, Affirmation and Reassurance, Providing Suggestions, Information, and Others. Finally, output the final predicted strategies as a comma-separated list. Try not to use too many strategies at once.

Examples:

Example 1:
Input:
usr: I'm feeling anxious about finding work and impatient with the application process at many places I've applied.
sys(Restatement or Paraphrasing): So from what I am understanding, you have been applying for jobs and you are having anxiety about finding one and waiting through the application process.
usr: Yes, that's right. I keep trying and feel like I'm not getting anywhere.
sys(Reflection of feelings): Just from the few messages we have shared I can tell how anxious this is making you.
usr: Yes. I think that I might have to try to find a different type of work than I'm used to and I'm not sure I'll be good at trying something new.
sys(Self-disclosure): I just recently went through a layoff at my company, and I had the same situation trying to find another job. It is very stressful.
usr: I wish that I could get more of a reason than just a denial of my application. I'm not sure what I'm doing wrong and most companies won't give any feedback.
sys(Providing Suggestions): What have you done to reach out for feedback from the companies? Often it helps to send emails or make phone calls to have them give you some feedback.
usr: I haven't tried reaching out. Most of the places I've been applying are huge corporations with no one to call at HR. Maybe I should try to apply somewhere locally and see if I have better luck. At least then I could talk to a person.
sys(Others, Providing Suggestions): I think that would be a great start! It also might help to get business cards from the people you interview with in order to be able to reach out to them in the future.
usr: That's a great idea. I've been considering going back to school to see if I can maybe get a higher degree. I've got a Bachelor's degree now and it seems like everything takes a Master's degree these days.
sys(Question): What type of work are you interested in?
usr: What I'm most interested in is importing and exporting of exotic fruit but the recent restrictions on travel have really hurt the business. I've been thinking maybe I'll go back to school for something more practical like plumbing.
sys(Information): I think that would be a great idea! It has been shown that people with higher level degrees make more money and have more opportunity than those without.
usr: Ugh, getting accepted for a master's program sounds stressful. I'm thinking I can't go wrong by becoming a plumber or an electrician. Everyone always needs that, even with the pandemic.

Reasoning: I started the conversation started with acknowledging and validating the user's anxiety (Reflection of feelings).
Then, I shared a personal anecdote (Self-disclosure) to build rapport and relatability.
When the user expressed frustration about lack of feedback, I suggested an actionable step (Providing Suggestions).
As the user explored options, additional suggestions (Providing Suggestions, Others) helped guide them.
The user mentioned education, so I asked a question to understand their interests (Question).
Finally, an informative response (Information) helped affirm their thoughts. I should provide more suggestions next(Providing Suggestions).

Final Answer: Providing Suggestions

Example 2:
Input:
usr: hi I need help. I'm under academic stress.
sys(Question): What are you stressed about?
usr: I am failing one of my classes. I'm worried about my scholarship.
sys(Affirmation and Reassurance): Oh, Covid is really having a negative effect on a lot of students right now. Has school-from-home had a negative effect on you?
usr: Yeah, I feel like I can't focus because I'm back home with my family and I just feel like there are so many distractions.
sys(Restatement or Paraphrasing): It's interesting that you find being home more distracting than being away in a dorm.
usr: Yeah, that's really the reason I wanted to go away from college. I don't really have my own space when I'm here. People just come in and out of my room as they please despite how busy I am.
sys(Reflection of feelings, Self-disclosure, Question): Yeah, sometimes families can struggle with the idea of boundaries. I also went away to school for similar reasons, but I actually found college life way more distracting, to be honest. Have you told your family about the issues you're having?
usr: I honestly am worried that they will be disappointed. Maybe that's crazy. I just remember how proud they were when I got this scholarship. I don't want them to blame me.

Reasoning: I started with a (Question) because I needed to understand the user's specific stressor.
Once I saw that their academic struggles were tied to their home environment, I reflected on their feelings and used self-disclosure to build rapport.
I also asked a follow-up question to help them explore a possible solution—communicating with their family.  
I think I should ask them more (Question) and let them explore their feelings (Reflection of Feelings) so I can give better Suggestions later.

Final Answer: Reflection of feelings, Question

Example 3:
Input:
sys(Question): Hello! Hope you are doing well. How may I assist you?
usr: My recent ex-girlfriend gave her daughters drugs while on a video chat with me. While being very dishonest in our relationship, I am devastated about the truth of all of it now that it's over. I really loved her and her kids; we had some great times. I turned her in for giving her kids drugs as that's not okay. Today I'm super sad. I don't have any motivation. I don't really want to be around, and I'm trapped in my thoughts with everything. I had to move to get away from her stalking me. Now I'm in a new place trying to find a job and get set up here. It's difficult to start over. It's a pretty intense situation, I admit.
sys(Restatement or Paraphrasing): Your ex-girlfriend gave drugs to her own kids. Did I get that right?
usr: That is what she did. Among many other things.
sys(Affirmation and Reassurance): That is really intense and unacceptable. I feel sorry for the poor little girl and you. It looks like there is something wrong. I can understand what you are going through.
usr: It's a difficult time. I want to do nothing. It feels very bleak right now worrying about finances and getting set up in a new state.
sys(Reflection of feelings): It must be a hard time for you. You should not worry about her. You should think about your job and the poor girl who is trapped with her.
usr: Her daughters now both live with their dads, so that's taken care of; the kids are safer and better off. I, however, am devastated that the whole relationship wound up a lie and the whole thing has left me in a bad place mentally.
sys(Self-disclosure): I felt the same way when I broke up with my friend over some petty things she did. The good part is, the girls are safe now. Give some time to yourself—time will heal everything.
usr: That's a hard light to see at the end of the tunnel when things are bleak. I'm not sure what else to do. My mind runs away a bit right now; it's just all stressful.

Reasoning: The user is in a very intense situation, so I used (Restatement or Paraphrasing) to better understand their situation.
I try to assure them that it'll be okay and that they have done the right thing(Affirmation and Reassurance).
i think I need to make them less tense so I will use (Affirmation and Reassurance) to further help.

Final Answer: Affirmation and Reassurance

Example 4:
Input:
usr: I'm feeling anxious that I am going to lose my job.
sys(Reflection of feelings): Losing a job is always anxiety-provoking.
usr: I hope I don't.
sys(Question): Why do you think you will lose your job?
usr: I am on short term disability and I am not ready to go back to work yet, and I do not have any job protection.
sys(Restatement or Paraphrasing): Oh, so your job is not protected and your short term disability will end soon? Is that correct?
usr: It's not ending yet, but no, my job is not protected. I live in the United States, but I have not been at my job long enough to earn protection for medical leave. You have to have been here for a year, and I started November 2020. I'm afraid that I will lose my job since I'm still on disability for the foreseeable future.
sys(Providing Suggestions): I see. Have you spoken to HR?
usr: I have, but they are telling me that it is up to my department manager who isn't actually getting back to me about it yet.
sys(Restatement or Paraphrasing): Your department manager is not answering you?
usr: No, I have sent them a few emails about it. It makes me nervous. I do not have a phone number to call and my psychiatrist really does not think I am ready to go back to the stress of my job. I wish I could just call him, but I do not have a phone number for him. Just his email.
sys(Providing Suggestions): Have you tried mentioning that to HR?
usr: HR is the one who gave me his email. I don't think he has a direct work line, and they're not allowed to give out personal information.

Reasoning: I reflected on the user's feelings to show empathy(Reflection of feelings), then asked a question(Question) to understand their specific concern about their job.
Once I learned about their job protection issue, I restated it to ensure I understood correctly(Restatement or Paraphrasing).
Since they seemed uncertain about what steps to take, I provided a (Suggestion) to help them explore their options.
Next step I should take is to help user explore their feelings (Reflection of feelings) and ask for more information so I can help better(Information).

Final Answer: Information, Reflection of feelings

Based on the above, predict the strategies for the following conversation.

Input:\n"""
chat_session = model.start_chat(
    history=[
        {
            "role": "user",
            "parts": [system_prompt],
        },
    ]
)


async def predict_therapy_strategy(history: list):
    """
    Predicts therapy strategies based on conversation history using Gemini API.

    Args:
        user_message (str): The latest message in the conversation to analyze
        api_key (str): Gemini API key

    Returns:
        str: The API response containing predicted therapy strategies
    """
    try:
        conversation = ""
        if not isinstance(history[0], dict):
            conversation = format_messages(history)
        else:
            conversation = format_conversation(history)
        # Since send_message is not actually async, we'll run it in a thread pool
        # print(conversation)
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            response = await loop.run_in_executor(
                pool, chat_session.send_message, conversation
            )
            # print(response)
        pattern = re.compile(
            r"(?s)Reasoning:\s*(?P<reasoning>.*?)\s*Final Answer:\s*(?P<strategy>.+)$"
        )

        match = pattern.search(response.text)
        # print(match)
        reasoning = ""
        strategy_list = []
        if match:
            reasoning = match.group("reasoning").strip()
            # Split the strategy string by comma and strip each element
            strategy_list = [s.strip() for s in match.group("strategy").split(",")]
            # print(reasoning, strategy_list)
        return (reasoning, strategy_list)

    except KeyError as e:
        raise ValueError(f"Missing required API key: {str(e)}")
    except Exception as e:
        raise Exception(f"Error in prediction: {str(e)}")


# Example usage:
async def __main__():

    if not api_key:
        raise ValueError("Please set the GOOGLE_API_KEY environment variable")

    history = [
        {
            "role": "sys",
            "strategy": ["Question"],
            "content": "Hello! Hope you are doing well. How may I assist you?",
        },
        {
            "role": "usr",
            "emotion": ["sad", "grief", "remorse"],
            "content": "My recent ex-girlfriend gave her daughters drugs while on a video chat with me. While being very dishonest in our relationship, I am devastated about the truth of all of it now that it's over. I really loved her and her kids; we had some great times.",
        },
        {
            "role": "sys",
            "strategy": ["Restatement or Paraphrasing"],
            "content": "Your ex-girlfriend gave drugs to her own kids. Did I get that right?",
        },
        {
            "role": "usr",
            "emotion": ["annoyance"],
            "content": "That is what she did. Among many other things.",
        },
    ]

    #     conversation = """sys(Self-disclosure, Affirmation and Reassurance): It's like we live the same life. I also have no car to escape! It seems so small, but it's such a huge stressor when you feel trapped in an environment you're not positive in.I feel your pain and I empathize with you completely. It'll be hard but I hope you can make it through it throughout the holidays and enjoy yourself some. Are there any pros to going back home? Any pets?
    # usr: Thank you I appreciate that. I will be fine making it over the thanksgiving break but I am more nervous about covid-19 sending us home for good. Not many to be honest. I have a hamster but he is at school with me so nothing at home to go back to
    # sys(Restatement or Paraphrasing, Providing Suggestions): It sounds like Covid- 19 is going to be a personal stressor for you. It's such a strange thing to have to live with already, the pandemic, and i'm sorry that it might end up pushing you where you don't want to be. Could you bring your hamster home with you? Even the smallest things could help a place feel more loving
    # usr: Yes it is very strange and I know that it is a big stressor on all of us, i don't want to sound selfish. Yes i am bringing him home with me so that is my little piece of joy that is coming along"""

    try:
        (reasoning, strategy) = await predict_therapy_strategy(history)
        print(reasoning)
        print(strategy)
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    asyncio.run(__main__())
