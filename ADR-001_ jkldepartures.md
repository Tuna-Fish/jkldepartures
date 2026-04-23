# ADR-001: jkldepartures

## Title

Architecture for delivering real-time bus departure information for Jyväskylä public transport stops

## Status

Proposed

---

## Context

The goal of this system is to display real-time bus departure information for specific public transport stops in Jyväskylä.

The system must:

* Fetch live public transport data from official API sources  
* Parse and transform the data into a usable format  
* Serve the processed data efficiently to a frontend application  
* Display live departure information to end users with minimal latency

Key constraints and drivers:

* Official transport API is external and may require normalization and parsing  
* Frontend should remain lightweight and focused only on presentation  
* Backend must handle data fetching, parsing, and transformation  
* System should be maintainable and scalable for future transport features

---

## Alternatives Considered

### 1\. Full-stack frontend (React-only solution)

* Fetch API data directly in the React frontend  
* Parse and transform data in the browser

Pros:

* Simpler architecture (no backend required)  
* Lower infrastructure cost

Cons:

* Exposes API logic and keys to the client  
* Repeated parsing logic across clients if extended  
* Harder to optimize or cache data  
* Increased client-side complexity and performance cost

---

### 2\. Backend-heavy architecture (Rust backend \+ thin frontend)

* Rust backend handles API integration, parsing, transformation  
* React frontend only consumes cleaned data

Pros:

* Centralized and reusable data processing logic  
* Improved security (API keys and logic hidden server-side)  
* Better performance via caching and preprocessing  
* Easier to extend with additional transport features

Cons:

* More initial setup complexity  
* Requires maintaining backend service

---

### 3\. Direct proxy backend (minimal transformation backend)

* Backend only forwards API responses with minimal processing

Pros:

* Simple backend implementation  
* Keeps API keys hidden

Cons:

* Still leaves parsing complexity to frontend or duplicated logic later  
* Limited flexibility for future enhancements

---

## Decision

We choose Alternative 2: Backend-heavy architecture using Rust for the backend and React for the frontend.

The backend will:

* Fetch data from official Jyväskylä public transport APIs  
* Parse and normalize the data  
* Provide a clean API for the frontend

The frontend will:

* Focus only on UI rendering  
* Display live departure times per stop  
* Consume backend-provided structured data

---

## Consequences

### Positive

* Clear separation of concerns (frontend vs backend)  
* Improved security (API credentials not exposed)  
* Centralized parsing logic reduces duplication  
* Easier to extend system (alerts, routes, multiple cities)  
* Better performance control (caching, rate limiting, batching)

### Negative

* Additional system complexity (backend service required)  
* More development and deployment overhead  
* Slight increase in latency due to backend processing step

### Long-term impact

* System is well-positioned to scale into a full transport information platform  
* Backend can evolve into a shared data service for multiple clients (web, mobile, etc.)  
* Easier integration of additional data sources in the future

