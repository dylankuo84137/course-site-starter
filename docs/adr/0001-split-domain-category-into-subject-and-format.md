---
status: accepted (implemented)
---

# Classify courses on two orthogonal axes, filter the public site on one


A Course is classified along two independent axes — **Subject Domain** (語文, 數學, 自然,
藝術, …) and **Teaching Format** (主課程/epoch, 專科, 選修, 班級戲劇). The internal
teaching-records archive (`112-114-syllabus-and-teaching-records`) confirms these are
orthogonal: the same subject (e.g. 戲劇) appears both as a main-lesson and as a specialist
subject, and one format spans many subjects.

The legacy `metadata.domain_category` field conflated the two — mixing subject values
(`nature`, `arts`) with a format value (`main-lesson`) in a single facet. We split it into
two fields so each axis is coherent.

We record both axes in the data but deliberately expose only **Subject Domain** as a filter
(and homepage grouping) on the public `/courses/` page. Rationale: the audience is parents
and the general public, and a single subject facet keeps cognitive load low; the internal
archive's three-axis model (adding 年段/grade group) is more granularity than a showcase
site needs, and grade is already covered by the separate grade filter.

## Consequences

- Splitting `domain_category` touches the course JSON schema, the validator, course-card
  templates, homepage grouping, and the AI-discovery output — reversing later is costly.
- Teaching Format is stored but unfiltered; a future UI could surface it without a data
  migration.
