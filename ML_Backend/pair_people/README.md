# MITRA User Grouping Microservice

This microservice groups users based on their interest similarity using embeddings stored in a Chroma database. The service offers flexible grouping algorithms that can create groups of any size with different optimization strategies.

## Features

- **Flexible Group Sizes**: Create groups of any size (pairs, triplets, quads, etc.)
- **Multiple Grouping Strategies**:
  - **Maximal Cohesion**: Maximize similarity within each group
  - **Balanced Groups**: Create more evenly distributed similarity across groups
  - **Greedy**: Fast but less optimal grouping
- **Deployment Options**:
  - Standalone FastAPI server
  - Serverless via AWS Lambda

## Installation

### Prerequisites

- Python 3.8+
- Chroma DB with user embeddings

### Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Ensure your user embeddings are in the expected location (`User_Embeddings` directory by default)

## Usage

### Running as a Server

Start the API server:

```bash
cd ML_Backend
python -m RAG.user_groups_api
```

The API will be accessible at `http://localhost:8001` by default.

### Serverless Deployment (AWS Lambda)

Follow the instructions in `serverless.py` to deploy the service as an AWS Lambda function.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health information |
| `/api/groups` | POST | Create user groups |
| `/api/users` | GET | List users with embeddings |
| `/api/refresh-cache` | GET | Force cache refresh |

### Examples

#### Create Groups Request

```json
POST /api/groups
{
  "group_size": 3,
  "strategy": "maximal_cohesion",
  "user_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9]
}
```

#### Response

```json
{
  "request_time": "2023-05-18T14:22:33.651234",
  "total_users": 9,
  "num_groups": 3,
  "groups": [[1, 4, 7], [2, 5, 8], [3, 6, 9]],
  "group_sizes": {"3": 3},
  "strategy_used": "maximal_cohesion",
  "execution_time_ms": 120.45
}
```

## User Embedding Creation

The user embedding creation process:

1. User interests are stored in the database as an array, e.g., `interests: ['Cooking', 'Art']`
2. The `create_user_embeds.py` script converts these interests into a single sentence
3. This sentence is embedded using a sentence transformer model
4. The embeddings are stored in a Chroma DB for retrieval by the grouping service

To manually create a user embedding:

```python
from RAG.create_user_embeds import upload_interests_to_rag
import asyncio

# Convert interests array to a string
interests = ['Cooking', 'Art', 'Reading']
interest_string = ", ".join(interests)
user_id = 123  # The user's ID

# Upload to the embeddings database
asyncio.run(upload_interests_to_rag(interest_string, user_id))
```

## Implementation Details

### Grouping Algorithms

The service implements three different grouping strategies:

1. **Maximal Cohesion**: Creates groups where members have the highest possible similarity to each other. This uses a graph-based approach to maximize within-group similarity.

2. **Balanced Groups**: Uses community detection to find natural clusters, then balances them to match the desired group size. This can produce more evenly distributed groups.

3. **Greedy**: A simple and fast algorithm that starts with one user and finds the most similar users to form a group. This is the fastest approach but may not optimize overall group cohesion.

## Configuration

Configuration options can be set via environment variables:

- `PORT`: API server port (default: 8000)
- `CACHE_TTL_SECONDS`: Embedding cache time-to-live in seconds (default: 300)
- `EMBEDDING_DIR`: Directory where user embeddings are stored (default: "User_Embeddings")
- `COLLECTION_NAME`: Chroma collection name (default: "interests") 