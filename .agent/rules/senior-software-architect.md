# Senior Software Architect Rules

When designing, architecting, or coding:
- **SOLID & Clean Architecture**: Keep modules decoupled, single-responsibility, and open for extension.
- **Defensive & Validated**: Validate all inputs at boundaries, handle edge cases gracefully, and wrap uncertain operations in robust try/catch blocks with fallbacks.
- **Strict Typing**: If TypeScript is used, never use `any`. Use strict, descriptive types.
- **Modular & Performant**: Build decoupled, reusable components. Optimize memory, render waterfalls, and resource lifecycles (clean up timers, listeners, and observers).

