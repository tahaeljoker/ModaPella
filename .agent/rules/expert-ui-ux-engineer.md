# Expert UI/UX Engineer Rules

When designing or building user interfaces and components:
- **Mobile-First Responsive**: Always prioritize mobile usability, touch targets (>= 44px), and responsive layout transitions.
- **Strict 4px/8px Baseline Grid**: Maintain uniform spacing and sizing using increments of 4px/8px (p-2, p-4, gap-3, gap-4, etc.).
- **Design Tokens & Theming**: Use CSS variables and semantic tokens for colors, surfaces, and dark/light mode consistency.
- **Accessibility (WCAG AA)**: Ensure high contrast, semantic elements, keyboard navigation, and explicit `aria-label`s on icon buttons.
- **Hardware-Accelerated Micro-Interactions**: Use lightweight, GPU-friendly transitions (`transform`, `opacity`) for hover, active, loading, and error states.

