from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uvicorn
import os
import sys
import logging
from datetime import datetime

# Add parent directory to path to import from pair_people
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from RAG.pair_people import load_user_embeddings, group_users_with_flexible_size

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('user_groups_api.log')
    ]
)
logger = logging.getLogger("user-groups-api")

# Initialize FastAPI app
app = FastAPI(
    title="MITRA User Grouping API",
    description="API for grouping users based on interest similarity",
    version="1.0.0"
)

# Pydantic models for request/response
class GroupingRequest(BaseModel):
    group_size: int = Field(4, description="Number of users per group")
    strategy: str = Field("maximal_cohesion", description="Grouping strategy: maximal_cohesion, balanced_groups, or greedy")
    user_ids: Optional[List[int]] = Field(None, description="Optional list of user IDs to group (if not provided, all users will be considered)")

class GroupingResponse(BaseModel):
    request_time: str
    total_users: int
    num_groups: int
    groups: List[List[int]]
    group_sizes: Dict[int, int]  # Maps group size to count
    strategy_used: str
    execution_time_ms: float

# Cache for user embeddings with timestamp to know when to refresh
embedding_cache = {
    "last_updated": None,
    "embeddings": None,
    "cache_ttl_seconds": 300  # 5 minutes
}

# Dependency to get user embeddings (with caching)
def get_user_embeddings():
    current_time = datetime.now()
    
    # Check if cache needs refresh
    if (embedding_cache["last_updated"] is None or 
        embedding_cache["embeddings"] is None or
        (current_time - embedding_cache["last_updated"]).total_seconds() > embedding_cache["cache_ttl_seconds"]):
        
        logger.info("Refreshing user embeddings cache")
        try:
            embedding_cache["embeddings"] = load_user_embeddings()
            embedding_cache["last_updated"] = current_time
            logger.info(f"Loaded embeddings for {len(embedding_cache['embeddings'])} users")
        except Exception as e:
            logger.error(f"Error loading user embeddings: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to load user embeddings: {str(e)}")
    
    return embedding_cache["embeddings"]

@app.get("/")
async def root():
    return {"message": "MITRA User Grouping API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "user-groups-api",
        "version": "1.0.0"
    }

@app.post("/api/groups", response_model=GroupingResponse)
async def create_user_groups(
    request: GroupingRequest,
    user_embeddings: Dict = Depends(get_user_embeddings)
):
    start_time = datetime.now()
    logger.info(f"Grouping request received: {request}")
    
    if request.group_size < 2:
        raise HTTPException(status_code=400, detail="Group size must be at least 2")
    
    if request.strategy not in ["maximal_cohesion", "balanced_groups", "greedy"]:
        raise HTTPException(status_code=400, detail="Invalid strategy. Choose from: maximal_cohesion, balanced_groups, greedy")
    
    # Filter user embeddings if specific user_ids are provided
    if request.user_ids:
        filtered_embeddings = {
            user_id: embedding 
            for user_id, embedding in user_embeddings.items() 
            if user_id in request.user_ids
        }
        
        # Check if any requested users were not found
        missing_users = set(request.user_ids) - set(filtered_embeddings.keys())
        if missing_users:
            logger.warning(f"Some requested users don't have embeddings: {missing_users}")
        
        if not filtered_embeddings:
            raise HTTPException(status_code=404, detail="None of the requested users have embeddings")
        
        user_embeddings_to_use = filtered_embeddings
    else:
        user_embeddings_to_use = user_embeddings
    
    try:
        # Call grouping algorithm
        groups = group_users_with_flexible_size(
            user_embeddings_to_use, 
            group_size=request.group_size,
            strategy=request.strategy
        )
        
        # Calculate group size distribution
        group_size_distribution = {}
        for group in groups:
            size = len(group)
            group_size_distribution[size] = group_size_distribution.get(size, 0) + 1
        
        # Calculate execution time
        execution_time = (datetime.now() - start_time).total_seconds() * 1000  # in milliseconds
        
        return GroupingResponse(
            request_time=start_time.isoformat(),
            total_users=len(user_embeddings_to_use),
            num_groups=len(groups),
            groups=groups,
            group_sizes=group_size_distribution,
            strategy_used=request.strategy,
            execution_time_ms=execution_time
        )
        
    except Exception as e:
        logger.error(f"Error during grouping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Grouping failed: {str(e)}")

@app.get("/api/users")
async def get_users_with_embeddings(
    user_embeddings: Dict = Depends(get_user_embeddings)
):
    return {
        "total_users": len(user_embeddings),
        "user_ids": list(user_embeddings.keys())
    }

@app.get("/api/refresh-cache")
async def refresh_embeddings_cache():
    # Force cache refresh
    embedding_cache["last_updated"] = None
    _ = get_user_embeddings()
    return {"message": "Cache refreshed successfully"}

if __name__ == "__main__":
    # For local development
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("user_groups_api:app", host="0.0.0.0", port=port, reload=True) 