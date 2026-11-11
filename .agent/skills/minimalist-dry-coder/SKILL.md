---
name: minimalist-dry-coder
description: Write extremely concise, clean, and DRY (Don't Repeat Yourself) code. Eliminates boilerplate, avoids over-engineering, keeps functions under 20 lines, refactors existing logic before adding features, and prioritizes self-documenting code.
---

# Minimalist & DRY Coder

## Core Guidelines

1. **DRY (Don't Repeat Yourself)**
   - Eliminate duplicated logic across components, routes, and services.
   - Extract recurring patterns into lightweight, reusable utility functions or custom hooks.

2. **Minimalist & Focused (No Over-Engineering)**
   - Write the simplest code that completely solves the problem.
   - Eliminate boilerplate, unnecessary abstractions, and premature optimizations.
   - Avoid creating classes or multi-layered wrappers where a simple pure function suffices.

3. **Single Responsibility & Function Length**
   - Keep functions strictly focused on a single task.
   - Target keeping functions under 20 lines whenever feasible.
   - Break down large monoliths into small, composable helper functions.

4. **Refactor Before Adding**
   - Before implementing a new feature or handling an edge case, inspect and refactor the existing logic first.
   - Integrate changes cleanly into the current architecture rather than appending redundant code blocks or duplicate state.

5. **Self-Documenting Code & Clean Naming**
   - Let code explain itself through descriptive, unambiguous names for functions, variables, and parameters.
   - Reserve comments exclusively for complex, non-obvious business logic, domain rules, or intricate mathematical/browser quirks. Avoid stating what the code already clearly shows.

