# Firestore Collection & Dynamic Data Policy

## MANDATORY DIRECTIVE FOR ALL AI AGENTS & DEVELOPERS

### 1. Dynamic Firestore Data Binding Requirement
- Every route, page, feature view, and modal form in this codebase MUST be 100% dynamic, fetching data from and persisting changes directly to **Firebase Firestore**.
- Never hardcode mock items in component classes or templates. Always subscribe to real-time streams exposed by [`LodgeDataService`](file:///c:/github/Inventory-Management/src/app/services/lodge-data.service.ts).

### 2. Security Rules (`firestore.rules`)
- Every Firestore collection **must** have an explicit security block defined in [`firestore.rules`](file:///c:/github/Inventory-Management/firestore.rules).
- Enforce appropriate authentication (`request.auth != null`) and ownership checks.

```rules
match /your_new_collection/{documentId} {
  allow read, write: if request.auth != null;
}
```

### 3. Composite Indexes (`firestore.indexes.json`)
- If a Firestore query filters or orders by multiple fields (e.g. `.where('status', '==', 'active').orderBy('createdAt', 'desc')`), declare the corresponding composite index in [`firestore.indexes.json`](file:///c:/github/Inventory-Management/firestore.indexes.json).

```json
{
  "collectionGroup": "your_new_collection",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 4. Firebase Manifest (`firebase.json`)
- Ensure [`firebase.json`](file:///c:/github/Inventory-Management/firebase.json) retains the `firestore` property pointing to rules and index files.
