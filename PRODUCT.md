# Product brief

## Purpose

Campus IT Helpdesk gives students and university employees one clear place to report technology problems and follow them until a fix is confirmed. Support teams receive a routed queue with ownership, priority, deadlines and a shared event history.

## Main audiences

- Requesters report issues, exchange messages with support, confirm a resolution and rate the result.
- Specialists work assigned requests and keep requesters updated.
- Dispatchers assign work and change service status.
- Managers review service volume, overdue requests and requester feedback.
- Administrators manage accounts and service categories.

## Product rules

- Impact and urgency determine priority and target time.
- New requests route to the least-loaded active specialist in the category's team when one is available.
- Requesters can edit or delete only their new requests.
- Requesters see public conversation and history; internal support notes remain staff-only.
- Requesters confirm a resolution or reopen it with a reason.
- Analytics uses the same role scope as the request list.
- Demo identities and records are fictional and controlled by `DEMO_MODE`.

## Boundaries

This repository includes the web app, Node API, Python analytics service, PostgreSQL, MySQL, MongoDB and local Docker Compose setup. Source files sit in one project folder. University SSO, email delivery, production hosting, password reset and external monitoring are not connected.
