# Security policy

## Supported versions

Security fixes target the latest `main` branch until the project begins tagged release support.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability involving authentication, SSRF, data exposure or workflow credentials. Contact the maintainer through the private security advisory feature on GitHub.

Include reproduction steps, impact and the smallest safe proof of concept. Do not access data that is not yours.

## Operator guidance

- Set a long random `ADMIN_TOKEN` in every non-development deployment.
- Bind the admin server to a private interface or reverse proxy with additional access control.
- Keep the database and `.env` outside public web roots.
- Review new collectors for rate limits, robots, licensing and SSRF exposure.
- Rotate any credential that might have appeared in logs or commits.

