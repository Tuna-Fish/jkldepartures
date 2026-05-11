# ADR-003: Frontend Architecture and Data Consumption Strategy (WIP)

## Status

Work In Progress

## Attendees

Aleksi, Lauri, Valentine, Pekka and Antti-Ville

---

## Purpose

This ADR will define frontend-specific architectural decisions for the Jyväskylä transport application.

The goal is to separate frontend concerns from:

* API contract definitions (ADR-002)  
* Backend integration and GTFS processing decisions (ADR-004)

This document acts as a placeholder and planning document for upcoming frontend architecture decisions.

---

# Planned Topics

## 1\. Frontend Architecture

Potential topics:

* React application structure  
* Component organization  
* Route/page structure  
* Shared UI components  
* State management approach  
* Feature-based vs layer-based architecture

Possible decisions:

* React \+ TypeScript  
* Vite build tooling  
* Feature-oriented folder structure

---

## 2\. API Consumption Strategy

Potential topics:

* How frontend consumes backend APIs  
* Fetching strategy  
* Revalidation strategy  
* Error handling strategy  
* Loading state handling  
* Data normalization inside frontend

Possible decisions:

* React Query / TanStack Query  
* Centralized API client  
* Polling strategy for realtime departures

---

## 3\. State Management

Potential topics:

* Global state requirements  
* Local component state  
* Search state  
* Map state  
* Selected stop persistence

Possible alternatives:

* Context API  
* Zustand  
* Redux Toolkit  
* React Query cache only

---

## 4\. Routing and Navigation

Potential topics:

* React Router structure  
* URL conventions  
* Stop detail pages  
* Search navigation  
* Deep linking support

---

## 5\. Realtime UI Behavior

Potential topics:

* Realtime departure updates  
* Auto-refresh behavior  
* Polling intervals  
* Stale data indicators  
* Offline handling

Potential decisions:

* Poll backend periodically  
* Avoid direct WebSocket dependency initially  
* Graceful degradation during backend outages

---

## 6\. Map Integration

Potential topics:

* Map provider selection  
* Vehicle rendering  
* Stop marker rendering  
* Clustering strategy  
* Performance considerations

Possible alternatives:

* Leaflet  
* Paikkatietoikkuna  
* Google Maps :)

---

## 7\. UI and Design System

Potential topics:

* Shared component library  
* Accessibility requirements  
* Responsive design  
* Color usage  
* Typography  
* Mobile-first design decisions

Possible decisions:

* Tailwind CSS  
* Shared reusable UI primitives  
* Dark mode support

---

## 8\. Error Handling and User Feedback

Potential topics:

* API failure handling  
* Empty state behavior  
* Retry mechanisms  
* User-visible error messages  
* Loading skeletons

---

## 9\. Performance Considerations

Potential topics:

* Rendering optimization  
* Memoization strategy  
* Virtualized lists  
* Bundle size optimization  
* Lazy loading

---

## 10\. Testing Strategy

Potential topics:

* Component testing  
* Integration testing  
* API mocking  
* End-to-end testing

Possible tooling:

* Vitest  
* React Testing Library  
* Playwright

---

# Relationship to Other ADRs

## ADR-002

Defines:

* Shared API contract  
* Endpoint structure  
* Response formats  
* Backend/frontend integration boundary

ADR-003 should not redefine API contracts.

---

## ADR-004

Defines:

* Backend GTFS integration  
* Realtime processing  
* Backend architecture  
* Feed polling and caching

ADR-003 should not contain backend implementation decisions.

---

# Current Direction (Tentative)

The current frontend direction appears to favor:

* React \+ TypeScript  
* Lightweight architecture  
* Backend-driven data model  
* Minimal frontend business logic  
* Reusable component structure  
* Realtime UI updates through backend polling

These decisions are not final.

---

# Summary

This ADR acts as a placeholder for frontend architecture decisions.

Its purpose is to:

* Clearly separate frontend concerns from backend concerns  
* Define frontend responsibilities  
* Document UI and application architecture decisions  
* Maintain clean architectural boundaries between ADRs

The document will evolve as frontend implementation decisions become finalized.

