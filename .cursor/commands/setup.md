Run a comprehensive macOS setup to ensure all prerequisites are installed for the Vesta project. Execute the following steps in sequence:

## Step 1: Check for Homebrew

Run: `which brew`

- If Homebrew is NOT found, ask the user if they want to install it, then run:
  ```
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```
  After installation, remind the user they may need to add Homebrew to their PATH by running the commands shown in the installer output.

- If Homebrew IS found, show the version with `brew --version` and continue.

## Step 2: Check for Docker

Run: `which docker`

- If Docker is NOT found, ask the user if they want to install it via Homebrew, then run:
  ```
  brew install --cask docker
  ```
  After installation, tell the user to open Docker Desktop from their Applications folder to complete setup.

- If Docker IS found, show the version with `docker --version` and continue.

## Step 3: Check if Docker Desktop is Running

Run: `docker info 2>&1`

- If this command fails with "Cannot connect to the Docker daemon", tell the user:
  "Docker Desktop is not running. Please open Docker Desktop from your Applications folder and wait for it to start, then run this setup again."

- If successful, Docker is running. Continue to the next step.

## Step 4: Verify Docker Access

Run: `docker run --rm hello-world`

- If this succeeds, Docker is properly configured.
- If this fails with permission errors, suggest the user may need to add themselves to the docker group or check Docker Desktop settings.

## Step 5: Check for docker-compose

Run: `docker-compose --version`

- Modern Docker Desktop includes docker-compose as a plugin. If the command fails, try `docker compose version` (without hyphen).
- If neither works, suggest installing docker-compose via: `brew install docker-compose`

## Step 6: Check for Environment File

Run: `ls -la .env 2>/dev/null || echo "NOT_FOUND"`

- If .env is NOT found, copy the example:
  ```
  cp env.example .env
  ```
  Tell the user: "Created .env from env.example. Please edit .env and add your API keys and configuration values."

- If .env exists, inform the user it's already configured.

## Step 7: Check for config.json

Run: `ls -la config.json 2>/dev/null || echo "NOT_FOUND"`

- If config.json is NOT found, copy the example:
  ```
  cp config.example.json config.json
  ```
  Tell the user: "Created config.json from config.example.json. Please edit config.json to configure your Vestaboard and other settings."

- If config.json exists, inform the user it's already configured.

## Step 8: Verify Project Structure

Run: `ls -la data/ 2>/dev/null || echo "NOT_FOUND"`

- If data directory doesn't exist, create it:
  ```
  mkdir -p data
  ```

## Summary

After all steps complete, provide a summary:
- ✅ or ❌ for each component (Homebrew, Docker, Docker running, docker-compose)
- Status of .env and config.json files
- Next steps: Tell the user to run `/start` to launch the development environment

If any critical component is missing or failed, clearly indicate what needs to be fixed before proceeding.





