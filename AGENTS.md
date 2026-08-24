# AGENTS.md - Repository Guidelines for AI Assistants

## Dynamic Firebase Firestore Integration Policy

> [!IMPORTANT]
> **MANDATORY POLICY FOR ALL ROUTES, PAGES & COMPONENTS**:
> 1. **100% Dynamic Data**: EVERY route, page, view, and component in this project MUST read, write, and compute state dynamically using **Firebase Firestore** via [`LodgeDataService`](file:///c:/github/Inventory-Management/src/app/services/lodge-data.service.ts) and [`FirebaseService`](file:///c:/github/Inventory-Management/src/app/services/firebase.service.ts). Hardcoded mock objects MUST NOT be used for runtime state display.
> 2. **Firestore Collections & Security Rules**: Whenever you create a **new Firestore collection** or add **multi-field queries** (`.where()` + `.orderBy()`), you MUST:
>    - Add access security rules in [`firestore.rules`](file:///c:/github/Inventory-Management/firestore.rules).
>    - Add required composite indexes in [`firestore.indexes.json`](file:///c:/github/Inventory-Management/firestore.indexes.json).
>    - Verify that [`firebase.json`](file:///c:/github/Inventory-Management/firebase.json) references both rules and index files.

For full guidelines and examples, see [.agents/rules/firestore-collections.md](file:///c:/github/Inventory-Management/.agents/rules/firestore-collections.md).
