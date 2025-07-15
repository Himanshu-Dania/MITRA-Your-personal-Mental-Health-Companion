# MITRA – A Research-Backed Mental Health Companion

**MITRA** is a holistic mental health app designed to support users through AI-guided therapy, personalized task assignment, secure journaling, emotion-aware dialogue, and social connection in a virtual world.
<img width="619" height="574" alt="image" src="https://github.com/user-attachments/assets/73ced812-4782-4c0e-84d2-b52dd55401ff" />

---

## Key Features

### AI Therapy Companion
- Responds to emotional cues using NLP emotion classification & strategy selection.
- Offers research-backed therapy advice even when human therapists are unavailable.
- Stores session history for continuity in conversations.
<img width="346" height="789" alt="Screenshot 2025-02-19 022545" src="https://github.com/user-attachments/assets/394ff6ca-51af-4d50-9123-a92aa5561178" />
<img width="350" height="786" alt="Screenshot 2025-02-19 024621" src="https://github.com/user-attachments/assets/ab129a3d-db9e-4d4f-9cce-a5f699fe3dbd" />

### Journaling & Mood Tracker
- Daily mood tracking with emoji-based input.
- Calendar-based journaling to reflect on thoughts.
- Suggestions by therapists are dynamically integrated.
<img width="247" height="556" alt="image" src="https://github.com/user-attachments/assets/ba114978-b268-4827-b844-6366bd0cc1a9" />
<img width="269" height="585" alt="image" src="https://github.com/user-attachments/assets/f04e0260-7f32-402f-982c-48e77a2482b7" />

### Personalized Task System
- Tasks are created based on conversations dynamically.
- Metrics-based, JSON-driven task tracking (e.g., “Talk to 5 people”).
- Completion and feedback loop integrated via Gemini API.
<img width="390" height="452" alt="Screenshot 2025-02-19 023946" src="https://github.com/user-attachments/assets/951acf83-7f4c-4a44-bc2a-407bda09641b" />


### Virtual World for Peer Support
- Allows users to interact with others facing similar mental health challenges.
- Cosine similarity is used to match users with similar emotional patterns.

### Therapist Booking (Based on Condition)
- Users are matched to therapists depending on detected emotional issues.(memory embeddings)

---

## Architecture Highlights

- **Gemini API**: Manages task CRUD, session memory updates, and final response generation.
- **RAG Pipeline**: Uses FAISS/Chroma DBs with fine-tuned DialogGPT for therapy responses.
- **Emotion & Strategy Modules**: Detect mental state and select coping mechanisms accordingly.
- **Secure Logging**: All entries are encrypted; no data leaves user’s device without consent.
<img width="1920" height="1080" alt="Soft Sand Minimalist Modern Thesis Defense Presentation" src="https://github.com/user-attachments/assets/871551d6-197d-4084-aabe-c0d6927aac0a" />


---

## Research Integration

- Emotion models trained on ESC/ESConv, mental health FAQs, and therapy transcripts.
- Task therapy design is based on psychological behavior activation techniques.
- Strategy selection is proven to make llm more empathetic and better at therapy.
  

---

## App Walkthrough

- **Home**: Welcome screen, mood tracker, journal access, AI companion.
- **Journeys**: Task list based on wellness goals.
- **Therapy Bot**: Chat-based interaction with emotionally intelligent responses.
- **Virtual World**: Safe space for social exploration and peer bonding.
- **Profile**: Mood history visualization & appointment dashboard.

---

## Security & Privacy

- End-to-end encryption for journals and chat logs.
- Session-based memory retention with optional user opt-in.
- Therapist and group-matching uses anonymized similarity scores.

---

References:

Dinesh, N. P., Gayathri, N. R., & Pugazhini, N. R. (2024). Interactive AI chatbot for mental illness. International Journal of Advanced Research in Science Communication and Technology, 68–75. https://doi.org/10.48175/ijarsct-17811

Farzan, M., Ebrahimi, H., Pourali, M., & Sabeti, F. (2024). Artificial Intelligence-Powered Cognitive Behavioral Therapy Chatbots, A Systematic Review. Iranian Journal of Psychiatry. https://doi.org/10.18502/ijps.v20i1.17395

Liu, J. M., Li, D., Cao, H., Ren, T., Liao, Z., & Wu, J. (2023). ChatCounselor: a large language models for mental health support. arXiv (Cornell University). https://doi.org/10.48550/arxiv.2309.15461

Liu, S., Zheng, C., Demasi, O., Sabour, S., Li, Y., Yu, Z., Jiang, Y., & Huang, M. (2021). Towards emotional support dialog systems. arXiv (Cornell University). https://doi.org/10.48550/arxiv.2106.01144

Rani, S., Ahmed, K., & Subramani, S. (2024). From Posts to Knowledge: Annotating a Pandemic-Era Reddit dataset to navigate mental health narratives. Applied Sciences, 14(4), 1547. https://doi.org/10.3390/app14041547

Yu, H. Q., & McGuinness, S. (2024). An experimental study of integrating fine-tuned large language models and prompts for enhancing mental health support chatbot system. Journal of Medical Artificial Intelligence, 7, 16. https://doi.org/10.21037/jmai-23-136


Links:
https://www.canva.com/design/DAGfYGbWuN4/ttMchRrayJFEhY0xV-X1NA/edit?utm_content=DAGfYGbWuN4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
https://www.canva.com/design/DAGavywR9Qo/C-O96TEGzD_y5668AaoXlA/edit?utm_content=DAGavywR9Qo&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
