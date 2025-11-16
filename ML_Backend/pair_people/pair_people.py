from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

model_name = "sentence-transformers/all-mpnet-base-v2"

# 1) Create embeddings using Hugging Face Sentence Transformer
print(f"[INFO] Using model: {model_name}")
embeddings = HuggingFaceEmbeddings(
    model_name=model_name, model_kwargs={"device": "cpu"}
)


def load_user_embeddings(
    persist_directory: str = "User_Embeddings",
    collection_name: str = "interests",
):
    """
    Returns a dict {user_id: embedding_vector} for each user.
    """
    # 1) Initialize the Chroma DB
    vectordb = Chroma(
        collection_name=collection_name,
        persist_directory=persist_directory,
        embedding_function=embeddings,
    )

    # 2) The Chroma internal collection object
    collection = vectordb._collection  # private API, but handy for direct data

    # 3) Get all embeddings and metadata
    #    collection.get(...) can fetch embeddings, metadatas, and documents
    results = collection.get(include=["embeddings", "metadatas", "documents"])

    # 4) Convert into a user-friendly structure
    #    results["embeddings"] is a list of vectors
    #    results["metadatas"] is a list of dicts (like {"user_id": 123})
    #    results["ids"] are internal IDs
    user_id_to_embedding = {}
    for embedding, meta in zip(results["embeddings"], results["metadatas"]):
        user_id = meta.get("user_id")
        if user_id is not None:
            user_id_to_embedding[user_id] = embedding

    return user_id_to_embedding


import numpy as np
import networkx as nx
from typing import Dict, List, Tuple, Any
import random


def pair_users_by_similarity(user_id_to_embedding: dict, top_k=10):
    """
    Takes {user_id: embedding_vector} and returns the top-k pairs of users
    that have the highest similarity.
    """
    user_ids = list(user_id_to_embedding.keys())
    embeddings = [user_id_to_embedding[uid] for uid in user_ids]
    n = len(user_ids)

    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    # Create a list of (userA, userB, similarity)
    similarities = []
    for i in range(n):
        for j in range(i + 1, n):
            uid_i = user_ids[i]
            uid_j = user_ids[j]
            sim = cosine_similarity(embeddings[i], embeddings[j])
            similarities.append((uid_i, uid_j, sim))

    # Sort by similarity (highest first)
    similarities.sort(key=lambda x: x[2], reverse=True)

    # Select the top-k pairs
    top_pairs = similarities[:top_k]

    return [(user1, user2) for user1, user2, _ in top_pairs]


def group_users_with_flexible_size(user_id_to_embedding: dict, group_size: int = 4, strategy: str = "maximal_cohesion"):
    """
    Group users into flexible-sized groups based on interest similarity.
    
    Args:
        user_id_to_embedding: Dictionary mapping user IDs to their embedding vectors
        group_size: Number of users in each group (default: 4)
        strategy: Grouping strategy to use:
                 - "maximal_cohesion": Maximize average similarity within each group
                 - "balanced_groups": Create groups with more even similarity distribution
                 - "greedy": Simple greedy algorithm (faster but less optimal)
    
    Returns:
        List of groups, where each group is a list of user IDs
    """
    if group_size < 2:
        raise ValueError("Group size must be at least 2")
    
    user_ids = list(user_id_to_embedding.keys())
    
    # If we have fewer users than the group size, return them as a single group
    if len(user_ids) <= group_size:
        return [user_ids]
    
    embeddings = {uid: np.array(vec) for uid, vec in user_id_to_embedding.items()}
    
    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    # Create a similarity matrix between all users
    user_count = len(user_ids)
    similarity_matrix = np.zeros((user_count, user_count))
    
    for i in range(user_count):
        for j in range(i+1, user_count):
            sim = cosine_similarity(embeddings[user_ids[i]], embeddings[user_ids[j]])
            similarity_matrix[i, j] = sim
            similarity_matrix[j, i] = sim  # Symmetric
    
    if strategy == "maximal_cohesion":
        return _maximal_cohesion_grouping(user_ids, similarity_matrix, group_size)
    elif strategy == "balanced_groups":
        return _balanced_groups_grouping(user_ids, similarity_matrix, group_size)
    elif strategy == "greedy":
        return _greedy_grouping(user_ids, embeddings, group_size)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

def _maximal_cohesion_grouping(user_ids: List, similarity_matrix: np.ndarray, group_size: int) -> List[List]:
    """
    Create groups that maximize the average similarity within each group using a graph-based approach.
    This is more computationally intensive but produces more cohesive groups.
    """
    # Create a graph where nodes are users and edge weights are similarities
    G = nx.Graph()
    for i, user1 in enumerate(user_ids):
        G.add_node(user1)
        for j, user2 in enumerate(user_ids):
            if i != j:
                # Add an edge with weight = similarity
                G.add_edge(user1, user2, weight=similarity_matrix[i, j])
    
    groups = []
    remaining_users = set(user_ids)
    
    while len(remaining_users) >= group_size:
        # Start with a random user if this is the first group, or
        # the user that has lowest average similarity with existing groups
        if not groups:
            start_user = random.choice(list(remaining_users))
        else:
            # Find the most "isolated" user to start a new group
            min_avg_sim = float('inf')
            start_user = None
            
            for user in remaining_users:
                avg_sim = 0
                for group in groups:
                    for member in group:
                        u1_idx = user_ids.index(user)
                        u2_idx = user_ids.index(member)
                        avg_sim += similarity_matrix[u1_idx, u2_idx]
                
                avg_sim = avg_sim / sum(len(g) for g in groups) if groups else 0
                
                if avg_sim < min_avg_sim:
                    min_avg_sim = avg_sim
                    start_user = user
        
        # Form a group around this user
        current_group = [start_user]
        remaining_users.remove(start_user)
        
        # Find the group with highest average similarity
        while len(current_group) < group_size and remaining_users:
            best_user = None
            best_avg_sim = -1
            
            for candidate in remaining_users:
                # Calculate average similarity of this candidate with current group
                avg_sim = 0
                for member in current_group:
                    u1_idx = user_ids.index(candidate)
                    u2_idx = user_ids.index(member)
                    avg_sim += similarity_matrix[u1_idx, u2_idx]
                
                avg_sim /= len(current_group)
                
                if avg_sim > best_avg_sim:
                    best_avg_sim = avg_sim
                    best_user = candidate
            
            current_group.append(best_user)
            remaining_users.remove(best_user)
        
        groups.append(current_group)
    
    # Handle remaining users (if any)
    if remaining_users:
        if len(remaining_users) >= group_size / 2:
            # Create a smaller group if we have enough users
            groups.append(list(remaining_users))
        else:
            # Distribute remaining users to existing groups
            for user in remaining_users:
                # Find the group with highest average similarity to this user
                best_group_idx = -1
                best_avg_sim = -1
                
                for i, group in enumerate(groups):
                    avg_sim = 0
                    for member in group:
                        u1_idx = user_ids.index(user)
                        u2_idx = user_ids.index(member)
                        avg_sim += similarity_matrix[u1_idx, u2_idx]
                    
                    avg_sim /= len(group)
                    
                    if avg_sim > best_avg_sim:
                        best_avg_sim = avg_sim
                        best_group_idx = i
                
                groups[best_group_idx].append(user)
    
    return groups

def _balanced_groups_grouping(user_ids: List, similarity_matrix: np.ndarray, group_size: int) -> List[List]:
    """
    Create groups that have more balanced similarity distributions
    using a community detection approach.
    """
    # Create a weighted graph where edge weights are similarities
    G = nx.Graph()
    for i, user1 in enumerate(user_ids):
        G.add_node(user1)
        for j, user2 in enumerate(user_ids):
            if i != j:
                # Add an edge with weight = similarity
                # Scale up similarities to ensure better community detection
                G.add_edge(user1, user2, weight=similarity_matrix[i, j] * 10)  
    
    # Find communities using Louvain method
    from community import best_partition
    partition = best_partition(G)
    
    # Group users by community
    communities = {}
    for user, community_id in partition.items():
        if community_id not in communities:
            communities[community_id] = []
        communities[community_id].append(user)
    
    # Now rebalance communities to match our desired group size
    groups = []
    ungrouped = []
    
    # First, handle communities that are too large
    for community_id, members in communities.items():
        if len(members) > group_size:
            # Split into multiple groups
            for i in range(0, len(members), group_size):
                if i + group_size <= len(members):
                    groups.append(members[i:i+group_size])
                else:
                    # Add leftover members to ungrouped
                    ungrouped.extend(members[i:])
        elif len(members) >= group_size / 2:
            # Keep small but reasonable communities
            groups.append(members)
        else:
            # Too small, add to ungrouped
            ungrouped.extend(members)
    
    # Handle ungrouped users
    while len(ungrouped) >= group_size:
        groups.append(ungrouped[:group_size])
        ungrouped = ungrouped[group_size:]
    
    # If we have leftover users, distribute them to existing groups
    # or create a new small group if there are enough of them
    if ungrouped:
        if len(ungrouped) >= max(2, group_size / 2):
            groups.append(ungrouped)
        else:
            # Distribute remaining users to existing groups
            for user in ungrouped:
                # Find best group for this user
                best_group_idx = 0
                best_avg_sim = -1
                
                for i, group in enumerate(groups):
                    if len(group) >= group_size + 1:
                        continue  # Don't add to already oversized groups
                        
                    avg_sim = 0
                    for member in group:
                        u1_idx = user_ids.index(user)
                        u2_idx = user_ids.index(member)
                        avg_sim += similarity_matrix[u1_idx, u2_idx]
                    
                    avg_sim /= len(group)
                    
                    if avg_sim > best_avg_sim:
                        best_avg_sim = avg_sim
                        best_group_idx = i
                
                groups[best_group_idx].append(user)
    
    return groups

def _greedy_grouping(user_ids: List, embeddings: Dict, group_size: int) -> List[List]:
    """
    A simpler greedy grouping algorithm that's faster but may be less optimal.
    Similar to the original group_users_in_fours function but with flexible size.
    """
    remaining_users = user_ids.copy()
    groups = []
    
    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    while len(remaining_users) >= group_size:
        # Pick the first user as anchor
        anchor_user = remaining_users[0]
        anchor_emb = embeddings[anchor_user]
        
        # Compute similarity with all others
        sims = []
        for other in remaining_users[1:]:
            sim = cosine_similarity(anchor_emb, embeddings[other])
            sims.append((other, sim))
        
        # Sort by similarity descending
        sims.sort(key=lambda x: x[1], reverse=True)
        
        # Take top (group_size-1) users
        top_users = [anchor_user] + [uid for (uid, _) in sims[:group_size-1]]
        groups.append(top_users)
        
        # Remove these users from remaining_users
        for uid in top_users:
            remaining_users.remove(uid)
    
    # Handle leftover users
    if remaining_users:
        if len(remaining_users) >= max(2, group_size / 2):
            # Create a smaller group if we have enough users
            groups.append(remaining_users)
        else:
            # Otherwise, distribute them to existing groups
            for user in remaining_users:
                # Add to smallest group (to balance group sizes)
                smallest_group = min(groups, key=len)
                smallest_group.append(user)
    
    return groups

def group_users_in_fours(user_id_to_embedding: dict):
    """
    Greedily form groups of 4 based on average similarity to each other.
    Legacy function maintained for backward compatibility.
    """
    user_ids = list(user_id_to_embedding.keys())
    embeddings = {uid: np.array(vec) for uid, vec in user_id_to_embedding.items()}

    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    groups = []

    while len(user_ids) >= 4:
        # 1) Pick the first user
        anchor_user = user_ids[0]
        anchor_emb = embeddings[anchor_user]

        # 2) Compute similarity with all others
        sims = []
        for other in user_ids[1:]:
            sim = cosine_similarity(anchor_emb, embeddings[other])
            sims.append((other, sim))

        # 3) Sort by similarity descending
        sims.sort(key=lambda x: x[1], reverse=True)

        # 4) Take top 3
        top3 = [anchor_user] + [uid for (uid, _) in sims[:3]]
        groups.append(top3)

        # 5) Remove these 4 from user_ids
        for uid in top3:
            user_ids.remove(uid)

    # If leftover users remain (less than 4), they remain unmatched
    return groups

if __name__ == "__main__":
    # Load user embeddings
    user_id_to_embedding = load_user_embeddings()
    print(f"Loaded {len(user_id_to_embedding)} user embeddings.")
    
    # Test different grouping strategies
    print("\nTesting grouping strategies:")
    group_sizes = [2, 3, 4, 5]
    
    for size in group_sizes:
        print(f"\nGrouping users with size {size}:")
        
        # Maximal cohesion strategy
        try:
            groups = group_users_with_flexible_size(
                user_id_to_embedding, 
                group_size=size, 
                strategy="maximal_cohesion"
            )
            print(f"Maximal cohesion: Created {len(groups)} groups")
            for idx, group in enumerate(groups, start=1):
                print(f"  Group {idx} (size {len(group)}):", group)
        except Exception as e:
            print(f"Error with maximal_cohesion: {str(e)}")
        
        # Greedy strategy (faster)
        try:
            groups = group_users_with_flexible_size(
                user_id_to_embedding, 
                group_size=size, 
                strategy="greedy"
            )
            print(f"Greedy approach: Created {len(groups)} groups")
            for idx, group in enumerate(groups, start=1):
                print(f"  Group {idx} (size {len(group)}):", group)
        except Exception as e:
            print(f"Error with greedy: {str(e)}")
        
    # Legacy code (for backward compatibility)
    print("\nLegacy grouping in fours:")
    groups_of_4 = group_users_in_fours(user_id_to_embedding)
    for idx, group in enumerate(groups_of_4, start=1):
        print(f"Group {idx}:", group)
