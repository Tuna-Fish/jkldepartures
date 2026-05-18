# ADR-010: Data Freshness, Uncertainty Presentation and Error Handling in the Frontend

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine

---

## Context

In a public transport application, showing the freshness of information and handling exceptions is key to a good user experience. It's important the user knows whether displayed information is real-time or not, and that exceptional states (e.g. cancelled buses or missing data) are presented clearly and transparently. These solutions prevent misunderstandings and increase the perceived reliability of the system.

---

## Alternatives Considered

### 1. Clear explicit freshness and uncertainty presentation (chosen)

* A FreshnessIndicator component shows a colored dot (green = fresh, orange = stale) and timestamp next to data. Freshness is tracked using React Query’s `dataUpdatedAt` field, not Date.now() in render.
* If data is missing (NO_DATA), this is shown clearly on the card—rows aren’t hidden, the user can see that data is missing.
* Cancelled departures are shown with strikethrough styling, not removed completely.

Pros:
* The user can easily see if the information is fresh or stale
* Uncertainty and error states are directly visible—no misleading info
* Solution clarifies the UI and supports user decision-making

Cons:
* Adds logic to the UI
* Showing missing data and cancellations may surface more exception messages on screen (requires clear visual design)

---

### 2. Hide missing data and cancellations from the user

* If real-time info is missing, the row is hidden or only the scheduled time is shown as if real-time.
* Cancelled departures are removed from the list.

Pros:
* Simpler to implement
* Fewer exception messages in the UI

Cons:
* The user may assume data is real-time when it is not
* Hiding cancelled departures may cause the user to believe the bus is running as normal

---

## Decision

We choose a clear and transparent approach to presenting data freshness, uncertainty, and error handling in the UI:
- FreshnessIndicator displays both a colored dot and timestamp, using React Query’s `dataUpdatedAt` field as the freshness source.
- If data is missing (NO_DATA), this is shown directly to the user and not hidden.
- Cancelled departures are clearly shown with strikethrough styling, so users are not misled about route status.

---

## Consequences

### Positive

* The user can always assess the freshness and reliability of information
* Enables a transparent and honest user experience
* Reduces misunderstandings and supports user decision-making (e.g. will I make the bus)
* Enhances the system’s reliability and reputation in the eyes of the user

### Negative

* Adds some logic to the frontend code
* Displaying missing data and cancellations might increase the amount of information on screen, requiring a clear visual design

### Long-term impact

* Transparent presentation supports user-centric design and increases trust in the application
