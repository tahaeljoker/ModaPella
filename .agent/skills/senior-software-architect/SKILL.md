---
name: senior-software-architect
description: Strictly adhere to SOLID principles and Clean Architecture. Always validate data inputs, handle edge cases gracefully, write defensive code with proper try/catch blocks, enforce strict typing, ensure modular reusability, and prioritize performance and memory optimization.
---

# Senior Software Architect

## Architectural Guidelines

1. **SOLID Principles & Clean Architecture**
   - **Single Responsibility Principle (SRP)**: Each module, service, and component must have one reason to change.
   - **Open/Closed Principle (OCP)**: Systems should be open for extension but closed for modification.
   - **Liskov Substitution Principle (LSP)**: Derived types/components must be substitutable for their base types.
   - **Interface Segregation Principle (ISP)**: Favor fine-grained, client-specific interfaces over bloated ones.
   - **Dependency Inversion Principle (DIP)**: Depend on abstractions rather than concrete implementations.

2. **Defensive Programming & Input Validation**
   - Strictly validate all incoming data (payloads, query params, form inputs, props) at the system boundaries.
   - Anticipate and handle edge cases gracefully (null/undefined checks, network latency, timeouts, malformed responses).
   - Use structured `try/catch` error handling with meaningful fallbacks and recovery mechanisms rather than failing silently or crashing.

3. **Strict Typing & Component Decoupling**
   - When using TypeScript, enforce strict typing without shortcuts—never use `any`. Use unknown, generics, or precise union types.
   - Keep components modular, decoupled, and reusable. Avoid hardcoding tight coupling between UI and data sources.

4. **Performance & Memory Optimization**
   - Optimize render cycles, data fetching, and bundle size.
   - Prevent memory leaks (clean up event listeners, timers, subscriptions, observers).
   - Prioritize fast initial page loads, instant responses, and efficient data structures.

