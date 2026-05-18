# ADR-011: Frontend Testing Strategy

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

Reliability and maintainability require a systematic approach to testing. In the early stages of the project, rapid prototyping and agile development were prioritized, allowing new features to be built and project direction changed flexibly without the burden of extensive up-front tests.

Test-driven development (TDD) was considered, as it helps clarify requirements and specifications and is especially beneficial with AI-assisted coding: when a test exists, it’s easy to verify if the generated code works as expected. Still, TDD was seen as slowing down fast development in the early phase.

As development progresses, testing will be systematically introduced to ensure high quality, security, robustness, and user experience when moving to production.

---

## Alternatives Considered

### 1. Test-Driven Development (TDD)

* Tests are written before implementation, all core logic is covered from the start.

Pros:
* Enables bug-free code and clear specifications
* Especially valuable for AI-assisted coding
* Improves maintainability

Cons:
* Slows down rapid experimentation and product pivots
* Increases test maintenance burden during early-phase changes

---

### 2. Fully manual testing

* Only manual checking without automated tests

Pros:
* Maximum speed and full freedom in the early phase

Cons:
* High risk of bugs, easy to let regressions slip through
* No safety net as features grow and code changes

---

### 3. Incremental testing (chosen)

* Test coverage is built up as features mature and stabilize
* Tests are added for each level: unit, integration, system, and acceptance tests

Pros:
* Enables rapid prototyping but increases quality as the project progresses
* Testing tools and coverage can be matched to team strengths and needs

Cons:
* Early quality depends on developer discipline
* Requires a systematic approach to increasing coverage as the project advances

---

## Decision

We adopt an incremental, expanding testing strategy:

* No TDD in the prototype, enabling rapid delivery of features
* As functionality stabilizes, we develop greater test coverage
* **Unit testing:** Jest (fast, known to the team)
* **System/browser testing:** Playwright (broad browser and CI support, team familiarity)
* **Acceptance testing:** Real users perform tasks with the software, with observations and feedback collected

---

## Consequences

### Positive

* Early development is very fast and enables agile pivoting
* In the long term, automated testing ensures quality and eases maintenance
* Acceptance testing with real users improves usability and reliability during roll-out

### Negative

* Rapid early cycles can allow bugs and regressions to slip through
* Requires resources and discipline to expand test coverage as the project evolves

### Long-term impact

* The project can develop quickly at first, but quality and maintainability are ensured later by building solid test coverage
* Testing enables confident refactoring and improves developer well-being as the codebase grows
