# ADR-007: Tailwind as the Style Library for Frontend Development

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

The frontend requires a modern and efficient solution for implementing styles, so that UI design and maintenance are smooth and fast. The right style library simplifies both development and future iterations. The tool must support the chosen technology stack (React), be easy to learn, and provide abundant examples, community support, and available talent.

---

## Alternatives Considered

### 1. Tailwind CSS

* Utility-first, configurable, and popular CSS framework that integrates excellently with React.

Pros:
* Extremely common combination with React—lots of material, examples, and skilled developers available
* Accelerates UI construction in component-based development
* Highly customizable and offers responsive design out of the box
* Supported by a large developer community and ecosystem

Cons:
* Utility classes can make HTML bulkier and look messier at first
* Requires some adaptation compared to traditional CSS approaches

---

### 2. Sass

* Advanced CSS preprocessor enabling variables, nesting, and functions.

Pros:
* Enables efficient and modular CSS
* Well-known and widely supported

Cons:
* Less direct integration with React’s component mindset
* Styles can become scattered across many files, harder to maintain as the project grows

---

### 3. Pure CSS

* No preprocessors or utility layers—directly browser-standard.

Pros:
* No dependencies—works anywhere
* Every developer is familiar with the basics

Cons:
* Repetitive and extensive UI maintenance becomes heavy
* Weak reusability and scalability in large projects
* Lacks automation, component orientation, and support for modern development

---

## Decision

Tailwind CSS is chosen as the frontend style library. The combination of Tailwind and React is extremely popular, so material, support, and skilled developers are easy to find. Tailwind enables agile styling directly within components, which speeds up and simplifies development. This solution supports the project’s goals regarding scalability, modularity, and maintainability.

---

## Consequences

### Positive

* Fast adoption and accelerated development with React—most frontend developers are familiar with this combination
* Extensive documentation, ready code, and community support are widely available
* Styles are handled per-component, making code modular and maintainable
* Strong foundation for responsive and modern user interfaces

### Negative

* HTML files may grow due to utility classes
* Utility-first approach requires a learning curve for those used to traditional CSS

### Long-term impact

* The solution supports the project’s growth and maintenance
* The typical React + Tailwind combo attracts new developers and makes it easier to find talent in the future
* Enables a modern and easily customizable frontend architecture
