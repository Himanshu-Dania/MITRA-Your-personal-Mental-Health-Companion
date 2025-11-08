# MITRA: Mentall Illness Therapy and Reconnection Assistant

Escape Reality, Embrace Growth
We’re developing an Android app that offers a safe haven for users to connect with others who can relate to their struggles, share wisdom, and provide support. Beyond this, the app features a personalized, evolving companion designed to help users grow into the best version of themselves. This chatbot provides non-judgmental listening and crafts customized growth journeys tailored to each user's unique needs because no one’s journey is the same.
Features:

1. Personalized Companion (Your Pet):
Interactive and Gamified: A chatbot that talks, listens, and speaks to you like a virtual companion.
Trained to be therapeutic: The chatbot utilises data proven by researchers to help the users.
Evolving Intelligence: Learns from your interactions, adapts to your progress, and refines its approach to suit you better over time.
Gamification: Engages users by introducing the concept of a “pet” whose well-being aligns with your growth. Caring for the pet motivates users to stay consistent. The pet evolves as the user grows.
Read dreams: The user can read their pet’s dreams with an item, it’s possible that the pet’s gratitude can make them feel good about themselves.
2. Dynamic Task Creation:
Tailored Growth Paths: Tasks are dynamically generated and structured like a skill tree, starting with simple activities and evolving based on your ease and progress.
Personalized Journeys: No two users will have the same experience as tasks adapt to individual needs, ensuring a unique growth trajectory.
Progressive Development: Tasks range from building habits to challenging milestones, encouraging steady growth without overwhelming users.
Uncomplicate Transformations: See those big new years’ resolutions that seem like magic? Turn them into reality by breaking them into small actionable goals
     3. Virtual World:
Connect with Like-Minded People: Enter a virtual reality space to meet individuals who resonate with your experiences.
Build Meaningful Connections: Hang out, explore, and grow alongside others in a supportive and dynamic environment.
Shared Growth: Witness and celebrate your friends’ journeys as you evolve together.
     4. Emotion Processing with Notes:
Self-Reflection Hub: Take notes about your emotions, daily progress, and reflections.
Memory Aid: Use notes as a reference to track your growth and remind yourself of key lessons.
Integrated with the Chatbot: The AI companion helps you process your emotions by offering prompts, insights, and reflections based on your entries.

Vulnerabilities : 
Personalized Support:
 Suggest content, exercises, or support groups relevant to individual user profiles.
Use AI to analyze user inputs (like mood tracking or journaling) to provide actionable feedback or suggestions.
Crisis Support
Enable users to create a plan of action for when they feel overwhelmed or at risk.
Progress Tracking and Analytics
Tools to log and visualize mood patterns, sleep, physical activity, and journaling progress.
Help users set achievable mental health goals and send regular reminders for check-ins.


Enhanced Peer Support
Subgroups based on specific challenges (e.g., postpartum depression, workplace stress).
Pair users with peers or mentors who share similar experiences or backgrounds.
Allow users to connect without revealing their identity.


## Project Structure

```
├── Backend/             # Node.js/Express backend
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Authentication and upload middleware
│   │   ├── models/      # MongoDB schema models
│   │   ├── routes/      # API routes
│   │   └── utils/       # Utility functions
│   ├── server.js        # Main server file
│   └── package.json     # Backend dependencies
│
└── frontend/            # React/TypeScript frontend
    ├── public/          # Static files
    ├── src/
    │   ├── components/  # Reusable UI components
    │   ├── pages/       # Page components
    │   ├── types/       # TypeScript type definitions
    │   ├── App.tsx      # Main app component
    │   └── index.tsx    # Entry point
    └── package.json     # Frontend dependencies
```

## Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

## Setup and Installation

### Backend

1. Navigate to the backend directory:
   ```
   cd Backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/therapy_app
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Frontend

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and go to `http://localhost:3000`

## API Endpoints

### Users

- `POST /api/users` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)

### Therapists

- `POST /api/therapists` - Register a new therapist
- `POST /api/therapists/login` - Login therapist
- `GET /api/therapists/profile` - Get therapist profile (protected)

## License

MIT
