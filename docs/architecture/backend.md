# Backend Architecture Guide
_Version: 1.2.0_
_Last Updated: 2024-02-22_

## Overview
This document outlines the backend architecture for our Python/FastAPI-based application, which handles real-time chat functionality, document collaboration, knowledge management, and AI model integration.

For visual representations of the architecture, please refer to the following diagrams:
- [System Architecture](./diagrams/backend-architecture.md#system-architecture)
- [Request Flow](./diagrams/backend-architecture.md#request-flow)
- [WebSocket Communication](./diagrams/backend-architecture.md#websocket-communication)
- [Knowledge Store Architecture](./diagrams/backend-architecture.md#knowledge-store-architecture)

## Technical Stack
- Python 3.11+
- FastAPI 0.104+
- PostgreSQL 16+
- Redis 7+
- Python-SocketIO 5.9+
- Anthropic Claude API
- Qdrant vector database
- Docker & Docker Compose

## Project Structure
```
backend/
├── api/                # API endpoints
│   ├── v1/            # API version 1
│   │   ├── chat.py    # Chat endpoints
│   │   ├── docs.py    # Document endpoints
│   │   ├── auth.py    # Authentication endpoints
│   │   └── knowledge.py # Knowledge store endpoints
│   └── deps.py        # Dependency injection
├── core/              # Core application code
│   ├── config.py      # Configuration management
│   ├── security.py    # Security utilities
│   └── logging.py     # Logging configuration
├── database/          # Database management
│   ├── migrations/    # SQL migrations
│   ├── models/        # SQLAlchemy models
│   │   ├── chat.py    # Chat models
│   │   ├── docs.py    # Document models
│   │   ├── auth.py    # Auth models
│   │   └── knowledge.py # Knowledge models
│   └── session.py     # Database session
├── services/          # Business logic
│   ├── chat.py        # Chat service
│   ├── docs.py        # Document service
│   ├── auth.py        # Auth service
│   ├── knowledge.py   # Knowledge service
│   └── vector.py      # Vector database service
├── schemas/           # Pydantic models
│   ├── chat.py        # Chat schemas
│   ├── docs.py        # Document schemas
│   ├── auth.py        # Auth schemas
│   └── knowledge.py   # Knowledge schemas
├── utils/             # Utility functions
│   ├── errors.py      # Error handling
│   └── validators.py  # Input validation
└── tests/             # Test files
    ├── unit/          # Unit tests
    ├── integration/   # Integration tests
    └── e2e/           # End-to-end tests
```

## Core Components

### 1. Database Layer

#### Connection Management
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

class Database:
    def __init__(self, url: str):
        self.engine = create_async_engine(
            url,
            pool_size=20,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800
        )
        self.async_session = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def get_session(self) -> AsyncSession:
        async with self.async_session() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                raise DatabaseError("Session error", e)
            finally:
                await session.close()
```

#### Repository Pattern
```python
from typing import Optional, List
from sqlalchemy import select
from .models import Document

class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, id: str) -> Optional[Document]:
        query = select(Document).where(Document.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, document: Document) -> Document:
        self.session.add(document)
        await self.session.commit()
        await self.session.refresh(document)
        return document

    async def update(self, document: Document) -> Document:
        await self.session.commit()
        await self.session.refresh(document)
        return document

    async def delete(self, document: Document) -> None:
        await self.session.delete(document)
        await self.session.commit()
```

### 2. API Layer

#### FastAPI Router Setup
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ..schemas.docs import DocumentCreate, DocumentResponse
from ..services.docs import DocumentService
from ..core.security import get_current_user

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

@router.post("/", response_model=DocumentResponse)
async def create_document(
    document: DocumentCreate,
    service: DocumentService = Depends(),
    current_user = Depends(get_current_user)
) -> DocumentResponse:
    try:
        return await service.create_document(document, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
```

### 3. Service Layer

#### Document Service
```python
from typing import Optional, List
from ..schemas.docs import DocumentCreate, DocumentUpdate
from ..database.models import Document
from ..database.repository import DocumentRepository

class DocumentService:
    def __init__(self, repo: DocumentRepository):
        self.repo = repo

    async def create_document(
        self,
        data: DocumentCreate,
        user: User
    ) -> Document:
        document = Document(
            title=data.title,
            content=data.content,
            owner_id=user.id
        )
        return await self.repo.create(document)

    async def update_document(
        self,
        id: str,
        data: DocumentUpdate,
        user: User
    ) -> Document:
        document = await self.repo.get_by_id(id)
        if not document:
            raise ValueError("Document not found")
        if not await self.can_edit_document(document, user):
            raise PermissionError("Not authorized to edit document")
            
        document.title = data.title or document.title
        document.content = data.content or document.content
        return await self.repo.update(document)

    async def can_edit_document(
        self,
        document: Document,
        user: User
    ) -> bool:
        return (
            document.owner_id == user.id or
            await self.repo.has_edit_access(document.id, user.id)
        )
```

### 4. WebSocket Layer

#### Socket Manager
```python
from socketio import AsyncServer
from typing import Dict, Optional
from ..core.security import verify_token
from ..services.docs import DocumentService

class SocketManager:
    def __init__(
        self,
        sio: AsyncServer,
        document_service: DocumentService
    ):
        self.sio = sio
        self.document_service = document_service
        self.active_rooms: Dict[str, Set[str]] = {}

    async def handle_connect(self, sid: str, environ: Dict):
        try:
            token = self._extract_token(environ)
            user = await verify_token(token)
            await self.sio.save_session(sid, {"user": user})
            return True
        except Exception as e:
            return False

    async def handle_join_document(
        self,
        sid: str,
        data: Dict
    ):
        try:
            session = await self.sio.get_session(sid)
            user = session["user"]
            document_id = data["document_id"]

            if await self.document_service.can_view_document(
                document_id,
                user
            ):
                room = f"document_{document_id}"
                await self.sio.enter_room(sid, room)
                self._add_to_room(room, sid)
                await self.sio.emit(
                    "user:joined",
                    {"user_id": user.id},
                    room=room,
                    skip_sid=sid
                )
            else:
                raise PermissionError("Cannot access document")
        except Exception as e:
            await self._handle_error(sid, e)

    async def handle_leave_document(
        self,
        sid: str,
        data: Dict
    ):
        try:
            document_id = data["document_id"]
            room = f"document_{document_id}"
            await self.sio.leave_room(sid, room)
            self._remove_from_room(room, sid)
        except Exception as e:
            await self._handle_error(sid, e)

    def _add_to_room(self, room: str, sid: str):
        if room not in self.active_rooms:
            self.active_rooms[room] = set()
        self.active_rooms[room].add(sid)

    def _remove_from_room(self, room: str, sid: str):
        if room in self.active_rooms:
            self.active_rooms[room].discard(sid)
            if not self.active_rooms[room]:
                del self.active_rooms[room]

    async def _handle_error(self, sid: str, error: Exception):
        error_data = {
            "type": type(error).__name__,
            "message": str(error)
        }
        await self.sio.emit("error", error_data, room=sid)
```

### 5. Error Handling

#### Custom Exceptions
```python
class AppError(Exception):
    """Base application error"""
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        extra: Optional[Dict] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.extra = extra or {}

class NotFoundError(AppError):
    def __init__(self, message: str, extra: Optional[Dict] = None):
        super().__init__(message, 404, extra)

class ValidationError(AppError):
    def __init__(self, message: str, extra: Optional[Dict] = None):
        super().__init__(message, 400, extra)

class AuthenticationError(AppError):
    def __init__(self, message: str, extra: Optional[Dict] = None):
        super().__init__(message, 401, extra)

class PermissionError(AppError):
    def __init__(self, message: str, extra: Optional[Dict] = None):
        super().__init__(message, 403, extra)
```

### 6. Testing

#### Unit Tests
```python
import pytest
from unittest.mock import AsyncMock, patch
from ..services.docs import DocumentService
from ..schemas.docs import DocumentCreate

@pytest.mark.asyncio
async def test_create_document():
    # Setup
    mock_repo = AsyncMock()
    mock_repo.create.return_value = Document(
        id="test-id",
        title="Test Doc",
        content="Test Content"
    )
    
    service = DocumentService(mock_repo)
    user = User(id="user-id")
    
    # Execute
    doc_data = DocumentCreate(
        title="Test Doc",
        content="Test Content"
    )
    result = await service.create_document(doc_data, user)
    
    # Assert
    assert result.title == "Test Doc"
    assert result.content == "Test Content"
    mock_repo.create.assert_called_once()

@pytest.mark.asyncio
async def test_update_document_unauthorized():
    # Setup
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = Document(
        id="test-id",
        owner_id="other-user"
    )
    mock_repo.has_edit_access.return_value = False
    
    service = DocumentService(mock_repo)
    user = User(id="user-id")
    
    # Execute and Assert
    with pytest.raises(PermissionError):
        await service.update_document(
            "test-id",
            DocumentUpdate(title="New Title"),
            user
        )
```

## Vector Database Integration

### Qdrant Configuration
The knowledge store uses Qdrant as its vector database for semantic search capabilities. Configuration is managed through environment variables:

```bash
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=knowledge_store
QDRANT_VECTOR_SIZE=1536  # Based on embedding model
```

### Vector Service
The `VectorService` class (`services/vector.py`) handles all vector database operations:
- Vector embedding generation
- Similarity search
- Collection management
- Point operations (upsert, delete)

```python
class VectorService:
    def __init__(self, client: QdrantClient):
        self.client = client
        
    async def create_collection(self):
        """Create knowledge store collection with proper configuration"""
        
    async def upsert_vectors(self, vectors: List[Vector]):
        """Add or update vectors in the collection"""
        
    async def search_similar(self, query: str, limit: int = 5):
        """Search for similar vectors using semantic similarity"""
```

## Knowledge Store Architecture

### Data Model
The knowledge store uses a hybrid approach combining PostgreSQL and Qdrant:
- PostgreSQL stores metadata, relationships, and file references
- Qdrant stores vector embeddings for semantic search
- File attachments stored in configurable object storage

### Security & Access Control
Knowledge store implements role-based access control:
- Admin users: Full access to all operations
- Power users: Create and manage their own entries
- Regular users: Read-only access to approved entries
- Guest users: No access

Access control is enforced at both API and service layers through dependency injection.

## Configuration

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-api-key

# Optional
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3000"]
MAX_POOL_SIZE=20
POOL_TIMEOUT=30
```

## Best Practices

### 1. Code Organization
- Follow domain-driven design principles
- Use dependency injection
- Implement repository pattern
- Separate business logic from API layer
- Use proper type hints

### 2. Database
- Use connection pooling
- Implement proper migrations
- Handle transactions correctly
- Use appropriate indexes
- Implement proper cleanup

### 3. Security
- Validate all inputs
- Use proper authentication
- Implement rate limiting
- Handle sensitive data properly
- Follow OWASP guidelines

### 4. Error Handling
- Use custom exceptions
- Implement proper logging
- Handle edge cases
- Provide clear error messages
- Implement proper cleanup

### 5. Testing
- Write comprehensive unit tests
- Implement integration tests
- Use proper mocking
- Test error scenarios
- Maintain test coverage

For more information:
- See [api-reference.md](../api/api-reference.md) for API documentation
- See [deployment.md](./deployment.md) for deployment details
- See [security.md](../technical/security.md) for security guidelines
