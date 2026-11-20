# Design system

## Direction

Campus wayfinding: make the next action and ownership as easy to find as signs around a university campus. Use an ink canvas, warm paper surfaces and a bright signal-yellow accent. Use green for connected/complete states and red sparingly for errors and urgent risk.

## Interface rules

- Outfit variable font with a compact editorial heading scale and readable body text.
- Consistent spacing, fine borders and square-to-soft-corner surfaces; reserve large radii for the hero demo panel.
- Signal yellow marks primary actions and the active navigation item. Do not rely on color alone for status.
- Keep request forms short, explain impact and urgency in context, and identify the service target after submission.
- Every asynchronous view includes loading, retryable error and empty-result states.
- Support narrow layouts, keyboard focus, semantic labels, reduced motion and light/dark appearance.
- Use GSAP on the public service-tour section only; the app workspace stays fast and calm.

## Motion

The public page introduces its headline and workflow in small reveals. On wide screens, ScrollTrigger pins the service route while its cards scrub horizontally. Touch screens use a normal horizontal reading layout. Reduced-motion settings disable the entrance and pin animations.
