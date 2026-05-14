# ADR-004: Backend GTFS and GTFS-Realtime Integration Strategy

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine, Pekka and Antti-Ville

---

## Context

The backend system must provide real-time public transport data for the Jyväskylä transport application.

The backend is responsible for:

* Downloading and managing static GTFS datasets  
* Polling GTFS-Realtime feeds  
* Combining static and realtime data  
* Computing realtime departures and delays  
* Exposing processed data through backend APIs  
* Handling caching and rate limiting

The system must remain lightweight, maintainable, and fully controlled by the development team.

---

## Decision

We adopt a lightweight custom Rust backend implementation based on:

* GTFS static datasets  
* GTFS-Realtime feeds  
* Manual dataset joins and realtime computations

The implementation will avoid large transit backend frameworks and instead use focused libraries for parsing GTFS and GTFS-Realtime data.

---

## Static GTFS Data

### Source

GTFS static data source:

[https://tvv.fra1.digitaloceanspaces.com/209.zip](https://tvv.fra1.digitaloceanspaces.com/209.zip)

### Refresh Strategy

Static data must:

* Be downloaded nightly  
* Be re-indexed after download  
* Replace old static datasets atomically

Refresh schedule:

* Every night at 01:00 EET

### Responsibilities

Backend responsibilities for static data:

* Download GTFS zip  
* Parse required files  
* Build in-memory indexes  
* Provide efficient lookup structures for:  
  * Stops  
  * Routes  
  * Trips  
  * Stop times

---

## GTFS-Realtime Integration

The backend integrates three GTFS-Realtime feeds:

* TripUpdates  
* VehiclePositions  
* ServiceAlerts

### Polling Limits

Waltti API limits:

* TripUpdate: every 30 seconds  
* ServiceAlert: every 60 seconds  
* VehiclePosition: every 1 second

The backend must respect these limits.

### Responsibilities

The backend must:

* Poll feeds periodically  
* Parse protobuf messages  
* Cache latest feed state  
* Join realtime data with static GTFS data  
* Handle temporary feed failures gracefully

---

## Backend Processing Responsibilities

The backend is responsible for computing:

* Realtime departures  
* Delays  
* Service status values  
* Vehicle route information  
* Alert visibility

The backend performs joins between:

* stop\_times.txt  
* trips.txt  
* routes.txt  
* GTFS-Realtime TripUpdates  
* GTFS-Realtime VehiclePositions  
* GTFS-Realtime ServiceAlerts

All realtime calculations and data normalization happen exclusively in the backend.

---

## Caching Strategy

The backend is responsible for all caching.

### Decision

* Frontend must never call external APIs directly  
* Backend serves cached and normalized responses  
* Feed polling and cache refresh are handled internally

### Goals

* Reduce external API load  
* Respect Waltti rate limits  
* Improve frontend response times  
* Isolate frontend from GTFS-Realtime complexity

---

## Library Decision

### Chosen Approach

Use:

* Standard GTFS static files  
* gtfs-realtime maintained Rust crate  
* Custom lightweight Rust implementation

### Why

This approach provides:

* Full control over parsing and joins  
* Minimal abstraction layers  
* Better debuggability  
* Lightweight architecture  
* Easier optimization for project-specific needs

---

## Alternatives Considered

### 1\. gtfs-rt (original library)

Rejected because:

* Outdated  
* Not actively maintained  
* Potential long-term compatibility risks

---

### 2\. transit-model / fastgtfs

Rejected because:

* Too complex for current project scope  
* Includes many unnecessary features  
* Reduces implementation control  
* Considered overkill for application requirements

---

### 3\. gtfs-structures

Rejected because:

* Supports static GTFS only  
* No GTFS-Realtime support  
* Requires separate protobuf implementation  
* Incomplete as a standalone solution

---

## Consequences

### Positive

* Full control over backend logic  
* Lightweight dependency footprint  
* Easier debugging  
* Flexible realtime processing  
* Easier customization for future requirements

### Negative

* Increased implementation effort  
* Manual protobuf handling required  
* Manual dataset joining required  
* Requires careful optimization for performance

---

## Long-Term Impact

The architecture provides a flexible foundation for:

* Supporting additional cities  
* Adding new backend endpoints  
* Extending realtime processing  
* Implementing future prediction or routing features

The backend remains lightweight, maintainable, and independent from large framework ecosystems.

---

## Summary

This ADR defines the backend integration strategy for the transport system.

The backend acts as:

* A GTFS data processing layer  
* A realtime integration layer  
* A caching layer  
* A normalization layer between transport feeds and frontend APIs

The project adopts a lightweight custom Rust implementation using GTFS and GTFS-Realtime feeds to maximize:

* Performance  
* Flexibility  
* Maintainability  
* Long-term control over the system architecture

