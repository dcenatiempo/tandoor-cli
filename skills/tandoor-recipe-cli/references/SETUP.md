# tandoor-cli Setup Guide

A command-line interface for [Tandoor Recipe Manager](https://tandoor.dev).

---

## Prerequisites

- Node.js 18+
- npm 8+
- A running Tandoor instance (local or remote)

---

## Installation

### Option 1: Install globally via npm

```bash
npm install -g tandoor-cli
```

After the global install, the `tandoor` command becomes available system-wide.

### Option 2: Run without installing

```bash
npx tandoor-cli <command>
```

No global install is required. `npx` downloads and runs the CLI on demand.

**Note:** The rest of this documentation assumes a global install.

---

## Configuration

`TANDOOR_URL` and at least one authentication method are required.

The CLI supports three configuration sources, applied in this order (highest priority first):

1. Environment variables
2. Persistent config file
3. `.env` file

### Option 1: Environment variables

```bash
export TANDOOR_URL=http://localhost:8080
export TANDOOR_API_TOKEN=your_token_here
```

Environment variables take precedence over stored config and `.env` settings.

### Option 2: `tandoor configure`

Run the interactive setup command to save credentials to `~/.config/tandoor-cli/config.json`:

```bash
# without install
npx tandoor-cli configure

# with global install
tandoor configure
```

You will be prompted for:
- `TANDOOR_URL`
- `TANDOOR_API_TOKEN`

The file is written with restricted permissions (0600) to protect your credentials.

### Option 3: `.env` file

Create a `.env` file in your working directory:

```dotenv
TANDOOR_URL=http://localhost:8080
TANDOOR_API_TOKEN=your_token_here
TANDOOR_USERNAME=
TANDOOR_PASSWORD=
```

The CLI loads `.env` automatically when present.

---

## Authentication

### API token (preferred)

Use an OAuth2 access token with Bearer authentication. 

**Important:** The regular DRF token shown in Tandoor's Settings → API does **not** work for this CLI. You need an OAuth2 access token.

#### Generating an OAuth2 token

If you're running Tandoor in Docker, you can generate a long-lived OAuth2 token using the Django shell:

```bash
# Access the Django shell in your Tandoor container
docker exec -it <your-container-name> /opt/recipes/venv/bin/python manage.py shell

# In the Django shell, run:
from django.contrib.auth import get_user_model
from oauth2_provider.models import Application, AccessToken
from datetime import timedelta
from django.utils import timezone

User = get_user_model()

# Get your user
user = User.objects.get(username='your_username')

# Create or get an OAuth2 application
app, created = Application.objects.get_or_create(
    name='tandoor-cli',
    defaults={
        'client_type': Application.CLIENT_CONFIDENTIAL,
        'authorization_grant_type': Application.GRANT_PASSWORD,
        'user': user
    }
)

# Create a long-lived access token (1 year)
token = AccessToken.objects.create(
    user=user,
    application=app,
    token='your_custom_token_string_here',  # Or leave blank for auto-generation
    expires=timezone.now() + timedelta(days=365),
    scope='read write'
)

print(f"Your access token: {token.token}")
```

Copy the token and use it as your `TANDOOR_API_TOKEN`.

### Username/password fallback

If `TANDOOR_API_TOKEN` is missing, the CLI falls back to HTTP Basic Authentication using `TANDOOR_USERNAME` and `TANDOOR_PASSWORD`.

**Note:** This method is less secure and not recommended for production use.

---

## Verification

Test your configuration:

```bash
# Check version
tandoor --version

# List recipes (requires valid credentials)
tandoor list --limit 5
```

If you see recipes listed, your configuration is working correctly!

---

## Troubleshooting

### "TANDOOR_URL is not set"

Run `tandoor configure` or set the `TANDOOR_URL` environment variable.

### "Authentication failed" or 401 errors

- Verify your `TANDOOR_API_TOKEN` is a valid OAuth2 token (not a DRF token)
- Check that your token hasn't expired
- Ensure your Tandoor instance is accessible at the configured URL

### "Permission denied" or 403 errors

Some commands (especially household management) require admin or space owner privileges. Check your user permissions in Tandoor.

### Command not found

If `tandoor` command is not found after global install:
- Verify npm's global bin directory is in your PATH
- Try `npx tandoor-cli` instead
- Reinstall: `npm install -g tandoor-cli`

---

## Next Steps

For command usage examples and full documentation, see the main [README](https://github.com/dcenatiempo/tandoor-cli#readme).
