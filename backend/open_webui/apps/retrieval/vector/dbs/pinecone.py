import pinecone
from typing import Optional, List, Dict, Any
import logging

from open_webui.apps.retrieval.vector.main import VectorItem, SearchResult, GetResult
from open_webui.config import PINECONE_API_KEY, PINECONE_ENVIRONMENT


class PineconeClient:
    def __init__(self):
        self.collection_prefix = "open-webui"
        self.PINECONE_API_KEY = PINECONE_API_KEY.value if PINECONE_API_KEY.value else None
        self.PINECONE_ENVIRONMENT = PINECONE_ENVIRONMENT.value if PINECONE_ENVIRONMENT.value else None
        self.client = None
        if self.PINECONE_API_KEY and self.PINECONE_ENVIRONMENT:
            try:
                pinecone.init(api_key=self.PINECONE_API_KEY, environment=self.PINECONE_ENVIRONMENT)
                self.client = pinecone
            except Exception as e:
                logging.error(f"Failed to initialize Pinecone client: {str(e)}")

    def _get_index_name(self, collection_name: str) -> str:
        """Get the full index name with prefix."""
        return f"{self.collection_prefix}_{collection_name}"

    def _create_index_if_not_exists(self, collection_name: str, dimension: int):
        """Create a Pinecone index if it doesn't exist."""
        index_name = self._get_index_name(collection_name)
        if index_name not in self.client.list_indexes():
            self.client.create_index(
                name=index_name,
                dimension=dimension,
                metric="cosine"
            )

    def insert(self, collection_name: str, items: List[VectorItem]):
        """Insert items into the collection."""
        if not self.client:
            return None

        if not items:
            return None

        self._create_index_if_not_exists(collection_name, len(items[0]["vector"]))
        index = self.client.Index(self._get_index_name(collection_name))

        vectors = [(item["id"], item["vector"], {
            "text": item["text"],
            "metadata": item["metadata"]
        }) for item in items]
        
        index.upsert(vectors=vectors)

    def get(self, collection_name: str) -> Optional[GetResult]:
        """Get all items from a collection."""
        if not self.client:
            return None

        index_name = self._get_index_name(collection_name)
        if index_name not in self.client.list_indexes():
            return None

        index = self.client.Index(index_name)
        # Fetch all vectors (up to 10000)
        results = index.query(vector=[0] * index.describe_index_stats()['dimension'], top_k=10000, include_metadata=True)
        
        if not results.matches:
            return None

        ids = [[match.id for match in results.matches]]
        documents = [[match.metadata["text"] for match in results.matches]]
        metadatas = [[match.metadata["metadata"] for match in results.matches]]

        return GetResult(ids=ids, documents=documents, metadatas=metadatas)

    def query(self, collection_name: str, filter: Dict[str, Any], limit: Optional[int] = None) -> Optional[GetResult]:
        """Query items based on metadata filter."""
        if not self.client:
            return None

        index_name = self._get_index_name(collection_name)
        if index_name not in self.client.list_indexes():
            return None

        index = self.client.Index(index_name)
        
        # Convert filter to Pinecone format
        pinecone_filter = {f"metadata.{k}": v for k, v in filter.items()}
        
        results = index.query(
            vector=[0] * index.describe_index_stats()['dimension'],
            filter=pinecone_filter,
            top_k=limit if limit else 10000,
            include_metadata=True
        )

        if not results.matches:
            return None

        ids = [[match.id for match in results.matches]]
        documents = [[match.metadata["text"] for match in results.matches]]
        metadatas = [[match.metadata["metadata"] for match in results.matches]]

        return GetResult(ids=ids, documents=documents, metadatas=metadatas)

    def search(self, collection_name: str, vectors: List[List[float]], limit: int) -> Optional[SearchResult]:
        """Search for similar vectors."""
        if not self.client:
            return None

        index_name = self._get_index_name(collection_name)
        if index_name not in self.client.list_indexes():
            return None

        index = self.client.Index(index_name)
        results = index.query(
            vector=vectors[0],  # Pinecone only supports single query vector
            top_k=limit,
            include_metadata=True
        )

        if not results.matches:
            return None

        ids = [[match.id for match in results.matches]]
        documents = [[match.metadata["text"] for match in results.matches]]
        metadatas = [[match.metadata["metadata"] for match in results.matches]]
        distances = [[1 - match.score for match in results.matches]]  # Convert cosine similarity to distance

        return SearchResult(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            distances=distances
        )

    def delete(self, collection_name: str, ids: Optional[List[str]] = None, filter: Optional[Dict[str, Any]] = None):
        """Delete items from collection."""
        if not self.client:
            return None

        index_name = self._get_index_name(collection_name)
        if index_name not in self.client.list_indexes():
            return None

        index = self.client.Index(index_name)

        if ids:
            index.delete(ids=ids)
        elif filter:
            # Convert filter to Pinecone format
            pinecone_filter = {f"metadata.{k}": v for k, v in filter.items()}
            # Delete using metadata filter
            index.delete(filter=pinecone_filter)

    def delete_collection(self, collection_name: str):
        """Delete an entire collection."""
        if not self.client:
            return None

        index_name = self._get_index_name(collection_name)
        if index_name in self.client.list_indexes():
            self.client.delete_index(index_name)

    def reset(self):
        """Reset all collections."""
        if not self.client:
            return None

        for index_name in self.client.list_indexes():
            if index_name.startswith(self.collection_prefix):
                self.client.delete_index(index_name)

    def upsert(self, collection_name: str, items: List[VectorItem]):
        """Upsert items into collection."""
        return self.insert(collection_name, items)  # Pinecone's insert is actually an upsert

    async def test_connection(self) -> bool:
        """Test the connection to Pinecone."""
        try:
            if not self.client:
                return False

            # Test connection by listing indexes
            try:
                self.client.list_indexes()
                return True
            except Exception as e:
                logging.error(f"Failed to list indexes: {str(e)}")
                return False

        except Exception as e:
            logging.error(f"Pinecone connection test failed: {str(e)}")
            return False