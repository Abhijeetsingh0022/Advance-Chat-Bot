"""
Embedding Service for Semantic Memory Search
Generates vector embeddings for text using sentence-transformers.
"""
import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings for semantic search."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embedding service with specified model.
        
        Args:
            model_name: Name of sentence-transformers model
                       Default: "all-MiniLM-L6-v2" (384 dimensions, fast, accurate)
                       Other options:
                       - "all-mpnet-base-v2" (768 dims, more accurate, slower)
                       - "paraphrase-MiniLM-L3-v2" (384 dims, fastest)
        """
        self.model_name = model_name
        self._model: Optional[SentenceTransformer] = None
        self.embedding_dim = 384 if "MiniLM" in model_name else 768
        
    def _load_model(self) -> SentenceTransformer:
        """Lazy load the embedding model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info(f"Embedding model loaded. Dimension: {self.embedding_dim}")
        return self._model
    
    def generate_embedding(self, text: str, validate: bool = True) -> List[float]:
        """
        Generate embedding vector for a single text.
        
        Args:
            text: Input text to embed
            validate: Whether to validate the generated embedding
            
        Returns:
            List of floats representing the embedding vector
            
        Raises:
            ValueError: If validation fails and validate=True
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            if validate:
                raise ValueError("Cannot generate embedding for empty text")
            return [0.0] * self.embedding_dim
        
        try:
            model = self._load_model()
            embedding = model.encode(text, convert_to_numpy=True)
            embedding_list = embedding.tolist()
            
            # Validate embedding
            if validate:
                if not embedding_list or len(embedding_list) != self.embedding_dim:
                    raise ValueError(
                        f"Invalid embedding dimension: expected {self.embedding_dim}, "
                        f"got {len(embedding_list) if embedding_list else 0}"
                    )
                
                # Check for all-zero vector
                if all(abs(val) < 1e-10 for val in embedding_list):
                    logger.warning(f"Generated all-zero embedding for text: {text[:50]}...")
            
            return embedding_list
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            if validate:
                raise
            return [0.0] * self.embedding_dim
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batched for efficiency).
        
        Args:
            texts: List of input texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            model = self._load_model()
            embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[0.0] * self.embedding_dim for _ in texts]
    
    def cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between 0 and 1 (1 = identical, 0 = orthogonal)
        """
        if not embedding1 or not embedding2:
            return 0.0
        
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Normalize to 0-1 range (cosine similarity is -1 to 1)
            return float((similarity + 1) / 2)
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0
    
    def find_most_similar(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[tuple]:
        """
        Find top K most similar embeddings to query.
        
        Args:
            query_embedding: Query embedding vector
            candidate_embeddings: List of candidate embedding vectors
            top_k: Number of top results to return
            
        Returns:
            List of tuples (index, similarity_score) sorted by similarity descending
        """
        if not query_embedding or not candidate_embeddings:
            return []
        
        try:
            similarities = []
            for idx, candidate in enumerate(candidate_embeddings):
                sim = self.cosine_similarity(query_embedding, candidate)
                similarities.append((idx, sim))
            
            # Sort by similarity (descending) and return top K
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:top_k]
        except Exception as e:
            logger.error(f"Error finding most similar: {e}")
            return []


# Global embedding service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


# Convenience functions
def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using global service."""
    service = get_embedding_service()
    return service.generate_embedding(text)


def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate semantic similarity between two texts."""
    service = get_embedding_service()
    emb1 = service.generate_embedding(text1)
    emb2 = service.generate_embedding(text2)
    return service.cosine_similarity(emb1, emb2)
