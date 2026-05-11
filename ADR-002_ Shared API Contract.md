# ADR-002: Shared API Contract

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine, Pekka and Antti-Ville

---

## Context

The system requires a clearly defined API contract between the frontend and backend.

The frontend application depends entirely on backend-provided transport data and must not access external transport APIs directly.

A shared contract is required to ensure:

* Consistent data structures  
* Independent frontend and backend development  
* Predictable integrations  
* Easier testing and maintenance  
* Long-term API stability

The API contract acts as the single source of truth between the frontend and backend systems.

---

## Decision

We define a strict shared REST API contract between the frontend and backend.

The backend is responsible for exposing normalized transport data through stable endpoints.

The frontend consumes only backend APIs.

---

# API Endpoints

## Stops

### GET /api/stops

Returns all stops from the transport dataset where:

* location\_type \= 0

Used for:

* Stop search  
* Stop selection  
* Autocomplete

---

### GET /api/stops/:stopId

Returns metadata for a single stop.

Used for:

* Stop page header  
* Stop details view

---

## Departures

### GET /api/stops/:stopId/departures

Returns realtime departure information for a stop.

### Responsibilities

The endpoint returns:

* Next 20 departures  
* Departures within a 2-hour time window  
* Results sorted by realtimeDeparture

### Each departure must include

* Realtime adjusted departure time  
* Delay information  
* Route information  
* Trip information  
* status field

---

## Alerts

### GET /api/alerts

Returns active public transport service alerts.

### Rules

* Prefer Finnish (fi) translations when available  
* Only active alerts are returned

---

## Vehicles

### GET /api/vehicles

Returns live vehicle positions.

### Requirements

Each vehicle response must include:

* Vehicle position  
* Route information  
* routeShortName

---

# Shared Rules

## Data Freshness

Every response must include:

{  
  "fetchedAt": 1710000000000  
}

### Rules

* fetchedAt uses Unix milliseconds  
* Represents backend fetch timestamp

---

## Timestamp Format

All timestamps use:

* Unix seconds (integer)

Exception:

* fetchedAt uses Unix milliseconds

---

## Error Format

All API errors must follow:

{  
  "code": "STRING\_CODE",  
  "message": "Human readable message",  
  "timestamp": 1710000000  
}

---

## Field Formatting Rules

### routeColor

* Hex string  
* No leading \# character  
* Exact value from source dataset

### routeTextColor

* Hex string  
* No leading \# character  
* Exact value from source dataset

---

## CORS

### Development

Allowed origin:

[http://localhost:5173/](http://localhost:5173/)

### Production

Production origins are defined later.

---

## Client Responsibility Rules

### Frontend Responsibilities

The frontend:

* Consumes backend APIs only  
* Never calls external transport APIs directly  
* Treats backend responses as authoritative

### Backend Responsibilities

The backend:

* Exposes normalized transport data  
* Maintains API stability  
* Handles external integrations internally

---

## Consequences

### Positive

* Clear separation between frontend and backend  
* Independent development possible  
* Easier testing and mocking  
* Stable integration surface  
* Reduced frontend complexity

### Negative

* Backend must maintain strict compatibility  
* API changes require coordination  
* Additional documentation effort required

---

## Long-Term Impact

The shared contract provides a stable foundation for:

* Additional frontend clients  
* Mobile applications  
* API versioning  
* Future backend refactoring  
* Integration testing

---

## Summary

This ADR defines the shared API contract between frontend and backend.

The backend acts as the single transport data provider.

The frontend depends exclusively on backend APIs.

A strict contract-first approach ensures:

* Stability  
* Maintainability  
* Predictable integrations  
* Independent development between frontend and backend teams

