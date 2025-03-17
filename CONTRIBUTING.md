# Contributing to APity

First off, thanks for taking the time to contribute! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps which reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include code samples and screenshots if relevant

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Provide specific examples to demonstrate the steps
- Describe the current behavior and explain which behavior you expected to see instead
- Explain why this enhancement would be useful

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Include screenshots and animated GIFs in your pull request whenever possible
- Follow the TypeScript and React styleguides
- Include thoughtfully-worded, well-structured tests
- Document new code
- End all files with a newline

## Development Process

1. Fork the repo
2. Create a new branch from `main`
3. Make your changes
4. Run the tests with `npm test`
5. Run type checking with `npm run typecheck`
6. Push to your fork and submit a pull request

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/apity.git

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck
```

### Project Structure

```
apity/
├── src/             # Source code
├── tests/           # Test files
├── examples/        # Example projects
├── scripts/         # Build and utility scripts
└── docs/           # Documentation
```

## Style Guide

### TypeScript

- Use TypeScript's strict mode
- Prefer interfaces over type aliases for object types
- Use explicit return types for functions
- Use const assertions for literal values
- Use template literal types when possible

### React

- Use functional components
- Use hooks for state and side effects
- Follow React Query best practices
- Use proper prop types

## Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
