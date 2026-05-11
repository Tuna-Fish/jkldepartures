# ADR-002: API Contract and Data Integration Strategy

## Title

Shared API contract and GTFS(-RT) data integration for Jyväskylä transport system

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine, Pekka and Antti-Ville

---

## Context

The system must provide real-time public transport data (stops, departures, alerts, and vehicle positions) to a React frontend via a Rust backend.

To ensure consistency, maintainability, and independent development between frontend and backend, a strict shared API contract is required.

The backend integrates:

* Static GTFS data (updated nightly)  
* Real-time GTFS-RT feeds (TripUpdates, VehiclePositions, ServiceAlerts)

The frontend depends entirely on backend-provided data and must not access external APIs directly.

---

## Decision

We define a shared API contract between frontend and backend and adopt a GTFS \+ GTFS-Realtime based backend implementation using a lightweight Rust approach (without heavy frameworks like fastgtfs).

---

# Shared (Frontend Backend Contract)

## API Endpoints

### Stops

* GET /api/stops  
   Returns all stops from stops.txt where location\_type \= 0  
   Used for stop search  
* GET /api/stops/:stopId  
   Returns metadata for a single stop  
   Used for stop page header

---

### Departures (Core Endpoint)

* GET /api/stops/:stopId/departures

Responsibilities:

* Join:  
  * stop\_times.txt  
  * trips.txt  
  * routes.txt  
  * GTFS-RT TripUpdate feed  
* Compute real-time departures and delays  
* Return:  
  * Next 20 departures  
  * Within 2-hour window  
  * Sorted by realtimeDeparture

Each departure must include:

* Real-time adjusted departure time  
* Delay information  
* status field (based on contract logic)

---

### Alerts

* GET /api/alerts  
   Returns active service alerts from GTFS-RT ServiceAlert feed  
   Prefer Finnish (fi) translations

---

### Vehicles

* GET /api/vehicles  
   Returns live vehicle positions from GTFS-RT VehiclePosition feed  
   Must include routeShortName (joined from routes.txt)

---

## Shared Rules

### Data Freshness

* Every response must include:

   "fetchedAt": 1710000000000

   (Unix milliseconds)

---

### Timestamp Format

* All timestamps: Unix seconds (integer)  
* Exception:  
  * fetchedAt: Unix milliseconds

---

### Static Data Handling

* GTFS source:

   https://tvv.fra1.digitaloceanspaces.com/209.zip

* Refresh schedule:  
  * Nightly at 01:00 EET  
* Backend must:  
  * Download  
  * Re-index

---

### Rate Limiting & Caching

Waltti API limits:

* TripUpdate: every 30s  
* ServiceAlert: every 60s  
* VehiclePosition: every 1s

Decision:

* Backend handles caching  
* Frontend never calls external APIs directly

---

### CORS

* Development:

   http://localhost:5173/

* Production:  
  * Defined later

---

### Error Format

All errors must follow:

{  
 "code": "STRING\_CODE",  
 "message": "Human readable message",  
 "timestamp": 1710000000  
}  
---

### Field Formatting Rules

* routeColor, routeTextColor:  
  * Hex string  
  * No \#  
  * Exact value from routes.txt

---

# Backend

## Decision: Use GTFS \+ GTFS-Realtime (custom lightweight implementation)

### Why this approach

We choose to:

* Use standard GTFS static files  
* Use GTFS-Realtime feeds  
* Implement logic ourselves in Rust

---

## Alternatives Considered

### 1\. gtfs-rt (original library)

* Outdated and not actively maintained

Rejected because:

* Risk of incompatibility  
* Limited long-term reliability

---

### 2\. transit-model / fastgtfs

* Full-featured transit backends

Rejected because:

* Too complex for current needs  
* Implements many features not required  
* Reduces control over logic  
* Considered “overkill”

---

### 3\. gtfs-structures

* Parses static GTFS only

Rejected because:

* Does not support GTFS-RT  
* Requires separate protobuf implementation  
* Incomplete solution

---

## Chosen Approach

### gtfs-realtime (maintained fork)

Why:

* Supports GTFS-RT feeds properly  
* Lightweight and focused  
* Allows full control over:  
  * Parsing  
  * Joining datasets  
  * Real-time computation

---

## Backend Responsibilities

* Download and parse static GTFS data  
* Poll GTFS-RT feeds respecting rate limits  
* Cache responses  
* Compute:  
  * Real-time departures  
  * Delays  
  * Status values  
* Join datasets efficiently  
* Serve clean API responses

---

## Consequences

### Positive

* Full control over logic and performance  
* Minimal dependencies  
* Easier debugging and customization  
* Avoids unnecessary abstraction layers

### Negative

* More implementation effort  
* Need to handle protobuf and joins manually  
* Requires careful optimization

### Long-term Impact

* Flexible foundation for:  
  * Additional cities  
  * New endpoints  
  * Advanced features (predictions, routing)  
* Backend remains lightweight and maintainable

---

# Summary

This ADR defines a strict contract-first architecture:

* Backend \= data processing \+ integration layer  
* Frontend \= pure presentation layer  
* Shared contract \= single source of truth

The decision to use a lightweight GTFS \+ GTFS-Realtime implementation in Rust ensures:

* Performance  
* Flexibility  
* Long-term maintainability

