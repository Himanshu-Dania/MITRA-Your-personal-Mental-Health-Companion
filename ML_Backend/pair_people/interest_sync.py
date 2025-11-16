#!/usr/bin/env python3
"""
Script to sync user interests from MongoDB to Chroma embeddings database.
This should be run periodically to keep the embeddings up-to-date.
"""

import os
import asyncio
import argparse
import logging
from typing import List, Dict, Any
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Import the embedding creation function
from create_user_embeds import upload_interests_to_rag

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('interest_sync.log')
    ]
)
logger = logging.getLogger("interest-sync")

# MongoDB connection details
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/therapy_app")
DB_NAME = os.getenv("DB_NAME", "therapy_app")
USER_COLLECTION = os.getenv("USER_COLLECTION", "users")

async def get_user_interests_from_db() -> List[Dict[str, Any]]:
    """
    Retrieve all users with their IDs and interests from MongoDB.
    
    Returns:
        List of dictionaries with user_id and interests
    """
    logger.info(f"Connecting to MongoDB at {MONGO_URI}")
    
    try:
        client = MongoClient(MONGO_URI)
        # Test the connection
        client.admin.command('ping')
        logger.info("MongoDB connection successful")
        
        # Get database and collection
        db = client[DB_NAME]
        users_collection = db[USER_COLLECTION]
        
        # Find users with interests field
        users_with_interests = list(users_collection.find(
            {"interests": {"$exists": True, "$ne": []}},
            {"_id": 1, "interests": 1}
        ))
        
        logger.info(f"Found {len(users_with_interests)} users with interests")
        
        # Format the data
        result = []
        for user in users_with_interests:
            user_id = user["_id"]
            interests = user.get("interests", [])
            
            if interests:
                result.append({
                    "user_id": user_id,
                    "interests": interests
                })
        
        return result
        
    except ConnectionFailure as e:
        logger.error(f"MongoDB connection failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error retrieving user interests: {str(e)}")
        raise
    finally:
        client.close()

async def sync_interests_to_embeddings(force_update: bool = False):
    """
    Main function to sync user interests from MongoDB to the embeddings database.
    
    Args:
        force_update: If True, update all embeddings even if they already exist
    """
    start_time = datetime.now()
    logger.info(f"Starting interest sync at {start_time.isoformat()}")
    
    try:
        # Get user interests from MongoDB
        users_with_interests = await get_user_interests_from_db()
        
        if not users_with_interests:
            logger.warning("No users with interests found. Nothing to sync.")
            return
        
        # Process each user
        success_count = 0
        error_count = 0
        
        for user_data in users_with_interests:
            user_id = user_data["user_id"]
            interests = user_data["interests"]
            
            try:
                # Convert interests array to a string
                interest_string = ", ".join(interests)
                
                # Upload to embeddings database
                logger.info(f"Processing user {user_id} with interests: {interest_string}")
                await upload_interests_to_rag(interest_string, user_id)
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"Error processing user {user_id}: {str(e)}")
                error_count += 1
        
        # Log summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info(f"Sync completed in {duration:.2f} seconds")
        logger.info(f"Successfully processed {success_count} users")
        
        if error_count > 0:
            logger.warning(f"Encountered errors for {error_count} users")
        
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync user interests from MongoDB to embeddings database")
    parser.add_argument("--force", action="store_true", help="Force update all embeddings even if they already exist")
    args = parser.parse_args()
    
    try:
        asyncio.run(sync_interests_to_embeddings(force_update=args.force))
    except KeyboardInterrupt:
        logger.info("Sync interrupted by user")
    except Exception as e:
        logger.critical(f"Unhandled exception: {str(e)}")
        exit(1) 