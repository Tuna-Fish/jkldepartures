# ADR-008: Leaflet as the Map Library for Frontend Development

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

The frontend application requires map functionality to display bus and stop information. The solution must be free, scalable, easy to use, and support future development for international needs. There are many libraries and map integrations available, but longevity, cost-effectiveness, and independence are key factors.

---

## Alternatives Considered

### 1. Leaflet

* Open source JavaScript library for building interactive maps.

Pros:
* Open source and free (no licensing fees)
* Easy to use and widely supported
* Scales to international use cases
* No dependency on commercial providers

Cons:
* Some advanced features may require additional libraries

---

### 2. Paikkatietoikkuna

* Finnish map service

Pros:
* Easy to use for domestic (Finland) use cases

Cons:
* Does not scale to international use

---

### 3. Google Maps

* Worldwide commercial map service

Pros:
* Advanced features and broad global coverage
* Well-documented and familiar to many developers

Cons:
* Commercial service – usage may incur costs
* Strict usage policies and API limitations
* Dependency on a US corporate provider (kill switch risk)

---

## Decision

Leaflet is selected as the map technology for the frontend, as it is open source, free, and internationally scalable. Using Leaflet reduces dependency on external commercial entities and avoids hidden costs or contract risks. Leaflet also works well with React and is widely documented and supported by the open source community.

---

## Consequences

### Positive

* No license fees or commercial dependencies
* The application can be scaled internationally in the future without technical or contractual limitations
* Open source community support and extensibility

### Negative

* Some advanced features may require additional libraries or extra development

### Long-term impact

* Choosing Leaflet enables flexible and cost-effective map functionality now and in the future
* The solution supports project growth both domestically and internationally
