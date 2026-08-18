# Floor Plan Media Manager Design

## Goal

Add a dedicated unit-type-aware floor-plan manager to the project media library. It must derive upload slots from the project's configured unit types, preserve the canonical `unitTypeId` relationship, and keep public rendering tied to the exact unit type rather than naming or bedroom heuristics.

## Existing architecture findings

- The project data model already includes `ProjectUnitType` and `ProjectFloorPlan`.
- `ProjectFloorPlan` stores `projectId`, `unitVariantId`, `unitType`, `bedrooms`, `bathrooms`, `size`, `price`, `imageUrl`, and `s3Key`.
- The current admin media API accepts generic categories but does not create a structured slot-per-unit-type flow.
- The public project API already exposes `unitTypes` and variant-level `floorPlans`, but it does not consistently use a canonical `unitTypeId` relationship on each floor-plan record.
- The current admin UI includes only the generic media categories and a basic floor-plan category entry, without deriving cards from configured unit types.

## Target behavior

### Data model

Keep the canonical relationship as:

- `Project` -> `ProjectUnitType` -> `ProjectFloorPlan`
- `ProjectFloorPlan` should be associated with the unit type using `unitTypeId` (preferred) or a stable equivalent if the existing schema requires `unitVariantId` as the immediate relation.
- If the existing schema is already using `unitVariantId`, we still treat the unit type as the canonical owner and ensure the upload target is bound to the selected unit type before storage.

### Admin UX

The Media Library layout becomes:

1. Hero
2. Interior
3. Exterior
4. Amenities
5. Lifestyle
6. Floor Plans

`Floor Plans` is a specialized, structured section and not a generic image category tab.

When the project loads:

- fetch project unit types in canonical order
- fetch existing floor-plan assets for the project
- match each asset by the selected unit type id
- render one card per configured unit type
- show uploaded/missing status based on whether a floor plan exists for that `unitTypeId`
- display summary counts such as `4 / 6 uploaded`

### Upload flow

- Each card is associated with a single unit type.
- Clicking upload on a given card sends the request with the target `unitTypeId` already attached.
- The backend validates that the unit type exists and belongs to the project before creating or updating a floor-plan record.
- A floor plan is treated as a primary asset per unit type and replacement updates the same record instead of creating duplicates.
- Filename and bedroom count are never used as matching keys.

## Proposed implementation approach

### 1. Admin media API enhancement

Add a dedicated floor-plan endpoint or extend the current media API with a `unitTypeId` parameter and validation.

Server-side checks must enforce:

- project exists
- unit type exists
- unit type belongs to the current project
- file type/extension/size pass validation
- when storing, only one primary floor plan may exist for the unit type under the chosen business rule

### 2. Floor plan manager component

Create a `FloorPlanManager` component that reads the canonical project unit-type list and renders one card per unit type.

Each card should include:

- unit type title
- uploaded/missing state
- preview if an asset exists
- preview/replace/delete actions
- a direct upload action bound to that unit type

### 3. Public API and public rendering

Public project serialization should expose the floor plan directly on the matching unit type object, using a stable unit-type relationship rather than bedroom-count matching.

Example shape:

```ts
unitTypes: [
  {
    id: '...',
    bedrooms: 2,
    bathrooms: 2,
    area: 1575,
    floorPlan: {
      id: '...',
      url: '...',
      type: 'IMAGE' | 'PDF'
    }
  }
]
```

The public page should render the floor plan for the selected unit type and not search by generic bedroom count.

## Risk areas and safeguards

- Prevent duplicate primary floor-plan records using a unique constraint or at minimum a strong server-side upsert that reuses the same record per unit type.
- When a unit type is deleted, remove or archive its associated floor-plan record to avoid orphaned assets per the existing project retention policy.
- When a unit type is renamed, the relationship remains stable because we use the unit type id as the key.
- Keep the implementation consistent with the existing direct-to-S3 signed-upload approach rather than forcing large files through Next.js.

## Acceptance criteria

- Number of floor-plan upload slots matches number of project unit types.
- Upload target is tied to the chosen unit type and not guessed from a filename.
- Status shows uploaded vs missing accurately.
- Existing project data loads without duplicate floor-plan records.
- Public rendering resolves the correct plan using `unitTypeId`.
- Large upload limits remain aligned with the current S3 presign architecture.

## Implementation notes

This change should be additive and specialized. It should not be merged into the generic `ProjectMediaManager` image category logic. The floor-plan flow needs a dedicated manager that understands the project-unit-type model directly.
