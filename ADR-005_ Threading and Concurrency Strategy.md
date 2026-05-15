# ADR-005: Threading and Concurrency Strategy

## Status

Proposed

## Attendees

Aleksi, Lauri, Valentine, Pekka and Antti-Ville

---

## Context

The backend system must serve realtime public transport data while simultaneously polling and updating GTFS-Realtime feeds from the Waltti transport provider. HTTP requests should remain responsive even while realtime data is being refreshed in the background.

The application processes frequently updated transport datasets such as TripUpdates, (VehiclePositions), and ServiceAlerts. These datasets are updated independently from incoming HTTP requests and must remain accessible without introducing unnecessary locking or request blocking.

The backend architecture therefore requires a concurrency strategy that supports:

* Concurrent request handling  
* Background realtime feed updates  
* Fast read access for API requests  
* Minimal blocking between readers and writers  
* Predictable update scheduling

---

## Decision

The backend adopts a lightweight multi-threaded architecture consisting of:

* One thread per incoming HTTP request  
* One dedicated background update thread for GTFS-Realtime polling  
* Shared immutable transport datasets managed through ArcSwap

The update thread continuously refreshes transport data in the background while request threads serve API responses using the most recently available dataset snapshot.

---

# Request Handling Strategy

HTTP responses are served using a one-thread-per-request model.

Each request thread:

* Obtains a reference to the latest available transport dataset  
* Processes the request using that snapshot  
* Returns a response independently from ongoing updates

Requests never wait for realtime feed updates to complete. Once request processing begins, the request operates against a stable immutable snapshot of the transport data.

This design prioritizes:

* Fast response handling  
* Simpler concurrency behavior  
* Predictable request execution  
* Reduced synchronization complexity

---

# Shared Data Model

Shared transport datasets are stored using ArcSwap.

ArcSwap allows:

* Lock-free reads for request threads  
* Atomic replacement of dataset snapshots  
* Safe concurrent access between readers and writers

Request threads obtain a handle to the latest available immutable dataset when request processing begins. Even if the update thread replaces the dataset during request execution, the request continues safely using its original snapshot.

This approach ensures that readers never block while waiting for updates.

---

# Update Thread Strategy

A dedicated background thread is responsible for:

* Polling GTFS-Realtime feeds  
* Updating cached transport datasets  
* Replacing shared snapshots atomically

The update thread operates independently from HTTP request handling.

After fetching and processing new transport data, the thread atomically swaps the previous dataset with the updated version using ArcSwap. New incoming requests immediately begin using the updated dataset while older requests continue safely using earlier snapshots.

This design minimizes contention between update operations and API request handling.

---

# Scheduling Strategy

Realtime feed polling is managed using a custom scheduler.

The scheduler is responsible for:

* Determining which feed should update next  
* Respecting Waltti API polling limits  
* Computing sleep durations between updates  
* Waking the update thread only when required

The update thread sleeps between scheduled polling operations instead of continuously looping.

This approach reduces unnecessary CPU usage while maintaining predictable polling behavior for TripUpdates, VehiclePositions, and ServiceAlerts.

---

# Alternatives Considered

## 1\. Global Mutex-Protected Shared State

Rejected because:

* Readers could block during updates  
* Increased lock contention  
* Higher risk of latency spikes under load  
* More synchronization complexity

---

## 2\. Fully Async Runtime-Based Architecture

Rejected because:

* Increased implementation complexity  
* Less transparent concurrency behavior  
* Additional abstraction layers  
* Current project scale does not require advanced async scheduling

---

## 3\. Multiple Dedicated Update Threads

Rejected because:

* Increased synchronization requirements  
* More difficult scheduling coordination  
* Additional complexity without clear benefit  
* Current update workload is manageable with a single scheduler thread

---

# Consequences

## Positive

* Request handling remains responsive during updates  
* Readers never block waiting for new datasets  
* Concurrency behavior remains relatively simple  
* Predictable update scheduling  
* Efficient CPU usage during idle periods  
* Reduced synchronization overhead

---

## Negative

* Dataset snapshots may briefly become stale during updates  
* Entire datasets are replaced atomically instead of incrementally updated  
* One-thread-per-request model may become less efficient under very high request loads  
* Custom scheduler increases implementation responsibility

---

# Long-Term Impact

The concurrency architecture provides a lightweight and maintainable foundation for realtime transport processing.

The ArcSwap-based snapshot model allows future backend features to be added without significantly increasing synchronization complexity. Additional transport datasets and derived realtime computations can be integrated into the same immutable snapshot approach.

If request volume grows significantly in the future, the threading model may later evolve toward more advanced asynchronous request handling. However, the current design is considered appropriate for the expected project scale and prioritizes implementation clarity and maintainability.

---

# Summary

This ADR defines the backend threading and concurrency strategy.

The system uses:

* One-thread-per-request HTTP handling  
* A single dedicated realtime update thread  
* ArcSwap-based immutable dataset snapshots  
* A custom polling scheduler for realtime feed updates

The architecture prioritizes:

* Fast non-blocking reads  
* Simpler concurrency behavior  
* Predictable scheduling  
* Maintainability  
* Efficient realtime transport data processing

