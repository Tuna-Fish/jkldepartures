# ADR-009: Polling Interval Selection for Frontend Real-Time Data

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

The frontend needs to periodically fetch up-to-date traffic information in the background: trip updates, service alerts, and vehicle positions. Each data type is assigned a specific polling interval to balance API limits, server load, and a smooth user experience.

---

## Alternatives Considered

### 1. Current intervals (chosen)

* Trip updates: 30 seconds (matches Waltti API’s limit)
* Service alerts: 60 seconds (matches Waltti API’s limit)
* Vehicle positions: 5 seconds (the API allows 1 second, but 5 seconds is sufficient for smooth map updates without excessive server load)
* placeholderData: Used in all queries so that the UI is never empty—previous data remains visible during background updates.

Pros:
* Guaranteed compatibility with API rate limits
* Map updates feel smooth for the user without overwhelming the server
* Users don’t see any flickering or data gaps (thanks to placeholderData)
* Simple, justified, and robust approach

Cons:
* Vehicle positions may not always be as real-time as technically possible, but this is sufficient for practical needs

---

### 2. Maximum frequency (update as often as API allows)

* Trip updates: 30s, Service alerts: 60s, Vehicle positions: 1s

Pros:
* Maximally real-time information

Cons:
* Potentially too much load on the server and the API
* Higher risk of hitting API limits or exceptional situations
* No significant user experience benefit—higher data rate, but the user rarely perceives the difference

---

### 3. Less frequent intervals

* Trip updates: 60s, Service alerts: 120s, Vehicle positions: 10s

Pros:
* Server load remains low

Cons:
* Information may be too old from the user’s perspective
* Especially vehicle positions may not update smoothly enough

---

## Decision

The following update intervals are selected for real-time data:

- Trip updates: 30 seconds (matches Waltti API’s limit)
- Service alerts: 60 seconds (matches Waltti API’s limit)
- Vehicle positions: 5 seconds (a compromise between user experience and server load)
- All queries use placeholderData so that the UI never appears empty; previous data always remains visible during background updates

---

## Consequences

### Positive

* The UI remains fast and smooth without unnecessary server load
* API rate compatibility ensures uninterrupted service
* The user receives nearly real-time information without flickering or missing data

### Negative

* Vehicle positions will not always update at the maximum (1s) frequency, but this is practically sufficient
* The solution is a compromise between 100% real-time updates and service stability

### Long-term impact

* These choices ensure a scalable and maintainable UI as the number of users grows and the system evolves
