# Accessibility Guidelines

## Overview
This document outlines the accessibility requirements and best practices for the Whatever chat interface. Our goal is to ensure that the application is usable by everyone, regardless of their abilities.

## General Requirements

### Semantic HTML
- Use appropriate HTML elements for their intended purpose
- Prefer semantic elements over generic divs and spans
- Examples:
  - `<aside>` for sidebars
  - `<button>` for interactive elements
  - `<nav>` for navigation
  - `<main>` for main content

### ARIA Attributes
- Add appropriate ARIA roles when semantic HTML isn't sufficient
- Include descriptive labels and descriptions
- Common patterns:
  ```html
  <!-- Dialog example -->
  <aside
    role="dialog"
    aria-modal="true"
    aria-label="Description of dialog"
  >
  ```

### Keyboard Navigation
- Ensure all interactive elements are focusable
- Provide visible focus indicators
- Support standard keyboard shortcuts
- Handle Escape key for closing modals/dialogs

### Screen Readers
- Provide text alternatives for images
- Use aria-live regions for dynamic content
- Include skip links for main content
- Test with popular screen readers

## Component-Specific Guidelines

### Dialogs and Modals
- Use proper dialog role
- Include modal attribute when appropriate
- Provide visible close button
- Trap focus within modal
- Handle escape key

### Navigation
- Use proper landmark roles
- Provide skip links
- Include aria-current for current page
- Support keyboard navigation

### Forms
- Associate labels with inputs
- Provide error messages
- Use fieldset and legend for groups
- Include input validation feedback

### Interactive Elements
- Use native buttons when possible
- Provide hover and focus states
- Include touch targets of sufficient size
- Support both mouse and keyboard

## Testing

### Manual Testing
- Keyboard navigation testing
- Screen reader testing
- High contrast mode testing
- Browser zoom testing

### Automated Testing
- Use accessibility linters
- Run automated accessibility tests
- Check color contrast
- Validate HTML structure

## Resources
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Svelte Accessibility](https://svelte.dev/docs#accessibility-warnings)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
