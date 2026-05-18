# ADR-006: Vite

## Title

Vite as the build tool for frontend development

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

The project requires a modern and fast build tool and bundler that works efficiently with React-based development and supports modern JavaScript/TypeScript features. The tool must be easy to set up and support quality assurance (e.g., ESLint).

---

## Alternatives Considered

### 1. Vite

* A fast and easy-to-use build tool/bundler, especially for modern frontend projects.

Pros:
* Fast development server and build process
* Simple configuration and seamless integration with React
* Built-in support for ESLint, enabling JavaScript “linting” before running code
* Natively supports modern ESM modules and TypeScript

Cons:
* Fewer plugins/extensions than Webpack

---

### 2. Webpack

* A widely used and highly configurable build tool/bundler for frontend development.

Pros:
* Versatile extension possibilities for larger projects
* Strong ecosystem and a large user base

Cons:
* Slower development server and more complex configuration
* Heavier to set up for small projects compared to Vite

---

## Decision

Vite is selected as the build tool and development bundler. Vite is fast, simple to use, and integrates well with the project’s React-based architecture. Vite also enables use of ESLint, improving code quality by catching JavaScript/TypeScript errors before runtime.

---

## Consequences

### Positive

* Fast development workflow and instant feedback for code changes
* Easier setup and maintenance compared to Webpack
* ESLint helps ensure quality and reduces bugs
* Clearly established standard for modern frontend development

### Negative

* In very large and complex projects, some Webpack plugins may be necessary

### Long-term impact

* Vite enables efficient, maintainable, and flexible frontend workflows, as well as quality assurance as the project evolves
