# Knowledge Store Feature Documentation

## Overview
The Knowledge Store is a core feature that provides structured storage and retrieval of knowledge assets with file attachments. It integrates with a vector database for efficient content search and retrieval, while maintaining relationships between knowledge entries and their associated files.

## Architecture

### Components
1. Knowledge Model
   - Stores metadata about knowledge entries
   - Manages relationships with attached files
   - Tracks creation and update timestamps

2. File Storage System
   - Handles file uploads and storage
   - Maintains file metadata
   - Integrates with the knowledge entries

3. Vector Database
   - Stores processed file content for semantic search
   - Enables efficient content retrieval
   - Maintains collections per knowledge entry

### Data Model

#### Knowledge Entry
```json
{
  "id": "string",
  "user_id": "string",
  "name": "string",
  "description": "string",
  "data": {
    "file_ids": ["string"]
  },
  "meta": "object",
  "created_at": "integer",
  "updated_at": "integer"
}
```

## API Endpoints

### Knowledge Management
- `GET /` - List all knowledge entries
- `GET /{id}` - Get specific knowledge entry
- `POST /create` - Create new knowledge entry
- `POST /{id}/update` - Update existing knowledge entry
- `DELETE /{id}/delete` - Delete knowledge entry
- `POST /{id}/reset` - Reset knowledge entry (removes all files)

### File Operations
- `POST /{id}/file/add` - Add file to knowledge entry
- `POST /{id}/file/update` - Update file in knowledge entry
- `POST /{id}/file/remove` - Remove file from knowledge entry

## Security
- Admin users have full access to all operations
- Verified users can view knowledge entries
- File operations require admin privileges
- Each operation validates user permissions

## Usage Examples

### Creating a Knowledge Entry
```python
knowledge_form = KnowledgeForm(
    name="Project Documentation",
    description="Technical documentation for the project",
    data={}
)
response = await create_new_knowledge(knowledge_form, user)
```

### Adding a File
```python
file_form = KnowledgeFileIdForm(
    file_id="file123"
)
response = await add_file_to_knowledge_by_id("knowledge123", file_form, user)
```

### Retrieving Knowledge
```python
# Get all knowledge entries
knowledge_items = await get_knowledge_items(user)

# Get specific knowledge entry
knowledge = await get_knowledge_by_id("knowledge123", user)
```

## Integration Points

### Vector Database Integration
- Files added to knowledge entries are processed and stored in the vector database
- Each knowledge entry has its own collection in the vector database
- Content can be queried for semantic search
- File updates trigger reprocessing of vector content

### File System Integration
- Files are stored and managed separately
- File metadata is linked to knowledge entries
- File processing handles various content types
- Automatic cleanup of orphaned files

## Best Practices
1. Use descriptive names and descriptions for knowledge entries
2. Keep file attachments organized and relevant
3. Update file content through the provided API endpoints
4. Clean up unused knowledge entries and files
5. Regularly validate file integrity

## Troubleshooting
1. Missing Files
   - Check if files were properly uploaded
   - Verify file IDs in knowledge entry data
   - Ensure file processing completed successfully

2. Vector Database Issues
   - Check vector database connection
   - Verify collection exists for knowledge entry
   - Reprocess files if content is missing

3. Permission Errors
   - Verify user has correct role (admin/verified)
   - Check if knowledge entry exists
   - Ensure file operations are performed by admin users

## Related Documentation
- [Backend Architecture](../architecture/backend.md#knowledge-store-architecture) - Detailed backend implementation
- [Frontend Architecture](../architecture/frontend.md#knowledge-store-integration) - UI components and state management
- [Testing Guide](../development/TESTING.md#knowledge-store-tests) - Testing requirements and examples
- [Build Guide](../development/BUILD.md#vector-database-setup) - Setup and configuration
- [Code Style Guide](../development/code-style.md#knowledge-store-patterns) - Coding patterns and best practices
- [Chat Integration](./chat.md#knowledge-store-integration) - Integration with chat system

## Version History
- v1.0.0 (2024-02-22) - Initial documentation
- v1.1.0 (2024-02-23) - Added vector database integration details
- v1.2.0 (2024-02-24) - Added cross-references and examples
