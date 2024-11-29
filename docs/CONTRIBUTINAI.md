# Contributing Guide for AI Assistants

This guide is specifically designed for AI assistants working on this project. It outlines best practices and important considerations when making contributions.

## Before Making Changes

1. **Review Documentation First**
   - Always check the technical documentation in `/docs/technical/`
   - Key documents to review:
     - `streaming.md` - Streaming implementation details
     - `types.md` - Type definitions and interfaces
     - `stores.md` - Store management system
   - Review relevant guides in `/docs/guides/`
     - `developer.md` - Development guidelines
     - `user.md` - User-facing features

2. **Code Analysis**
   - If code is not modified in the diff, assume it works as intended
   - Focus on the specific components being changed
   - Check related files for potential impacts

## Making Changes

### Documentation Updates
1. Keep documentation concise and well-referenced
2. Update cross-references between documents
3. Include code examples for complex features
4. Document both implementation and usage patterns

### Code Modifications
1. Preserve existing patterns and conventions
2. Maintain type safety and error handling
3. Update tests when modifying functionality
4. Keep streaming functionality intact

## Best Practices

### Type Safety
- Always use TypeScript types
- Update type definitions in `types.md`
- Ensure store types match implementations

### Store Management
- Use atomic updates for store modifications
- Maintain store subscriptions properly
- Document store interactions

### Streaming
- Preserve streaming functionality
- Maintain error handling
- Keep UI updates smooth

## Important Considerations

1. **Existing Code**
   - If code is not in the diff, assume it works
   - Focus on modifying only necessary parts
   - Preserve existing patterns

2. **Documentation**
   - Keep documentation up-to-date
   - Add cross-references
   - Document complex features

3. **Testing**
   - Preserve existing tests
   - Add tests for new features
   - Ensure streaming works

## Common Pitfalls to Avoid

1. **Don't Assume Broken Code**
   - If code isn't in the diff, it likely works
   - Focus on specific changes needed

2. **Documentation Overhaul**
   - Don't rewrite working documentation
   - Update only relevant sections
   - Maintain cross-references

3. **Store Management**
   - Don't break store subscriptions
   - Maintain atomic updates
   - Preserve type safety

## Final Checklist

Before submitting changes:
- [ ] Documentation updated
- [ ] Types maintained
- [ ] Store patterns preserved
- [ ] Streaming functionality intact
- [ ] Tests updated if needed
- [ ] Cross-references maintained
