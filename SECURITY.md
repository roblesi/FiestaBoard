# Security

## Reporting a vulnerability

If you believe you've found a security issue, please report it responsibly:

- **Do not** open a public GitHub issue.
- Email the maintainers (see [README](./README.md) for contact) or report via GitHub Security Advisories if the repo has that enabled.

We will acknowledge your report and work with you to understand and address it.

## Sensitive data handling

- **Secrets** (API keys, tokens, passwords) are never logged or returned in API responses. Plugin and board configs are masked (sensitive fields replaced with `***`) when returned by the API.
- **Configuration** is loaded from the `data/` directory and from environment variables. Never commit `.env` or `data/config.json` / `data/settings.json`; they are listed in `.gitignore`.
- **Docker** Compose files reference `env_file: .env` so secrets stay on the host; no secrets are baked into images.

## Deployment

- Run the API and UI in Docker; use a reverse proxy (e.g. nginx) with TLS in front if exposed to the internet.
- Restrict access to the API and UI (e.g. VPN, firewall, or auth proxy) when possible.
- Use strong, unique API keys for your Vestaboard and any third-party services (weather, transit, etc.).
