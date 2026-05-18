# ADR-003: Choosing React for Frontend Development

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

The project needs a modern, flexible, and maintainable UI solution for displaying bus schedules and maps. The frontend must be scalable, easily testable, and support agile development. There are several market options, but team expertise and the size of the ecosystem are key factors in the decision.

---

## Alternatives Considered

### 1. React

* A widely used and supported component-based JavaScript UI library developed by Facebook.

Pros:
* Large ecosystem and library/tool selection (state management, testing, styling libraries, routing, etc.)
* Big and active developer community, lots of materials and help available
* Familiar to the team
* Component model supports reusability
* Improved testability and maintainability

Cons:
* The structure can become complex in large projects without best practices
* Requires orientation to React-specific concepts

---

### 2. Svelte

* A modern, lightweight framework for component-based development.

Pros:
* Small bundle size and great performance
* Advanced file management and “lean” structure

Cons:
* Less ready-made ecosystem and libraries
* Less established in enterprise use
* Less familiar to the team

---

### 3. Angular

* An enterprise-class frontend framework developed by Google.

Pros:
* Scales to large applications
* Built-in features like routing, forms, and state management

Cons:
* Steep learning curve
* Requires strict conventions, less flexible
* Less popular in smaller projects

---

## Decision

React is selected as the project's frontend technology. The decision is based on the size of the ecosystem, the team's existing knowledge, and the fact that React enables fast development as well as future maintainability and testability. The component-based architecture supports modularity and reusability, making the application easier to grow and adapt as requirements evolve.

React also integrates well with the planned styling library (Tailwind) and other intended technologies.

---

## Consequences

### Positive

* Fast and agile development
* Broad tool support and good compatibility with other technologies
* Easier maintenance and scalability
* Solution leverages the team's current expertise

### Negative

* Complex state management and error-prone Hooks: React code can easily become tangled as the project grows. Especially incorrect use of useEffect often causes hard-to-fix bugs and endless render loops.

### Long-term impact

* Enables a scalable, maintainable, and reusable frontend architecture
* Strong long-term support and talent availability thanks to an active community
* The solution allows flexible technology stack adjustments as the project evolves
