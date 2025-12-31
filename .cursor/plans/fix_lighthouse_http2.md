# Fix Lighthouse HTTP/2 and Add System Management

## Changes Overview

This plan includes two major improvements:

1. **HTTP/2 Support**: Add nginx as a reverse proxy with HTTP/2 for both development and production
2. **System Management**: Add container management features to the UI (production only)

These changes work together - adding nginx infrastructure is a good time to think holistically about system management.

## Architecture Overview

```mermaid
graph TB
    subgraph Browser
        Client[Chrome Browser]
    end
    
    subgraph DockerHost[Docker Host]
        subgraph UIContainer[UI Container :3000]
            Nginx[nginx HTTP/2]
            NextJS[Next.js Server :3001]
            Nginx -->|proxy| NextJS
        end
        
        subgraph APIContainer[API Container :8000]
            FastAPI[FastAPI Server]
            DockerMgr[Docker Manager]
            FastAPI -->|production only| DockerMgr
        end
        
        DockerSocket[/var/run/docker.sock]
        DockerMgr -.->|restart/upgrade| DockerSocket
        
        UIContainer -->|API calls| APIContainer
    end
    
    Client -->|HTTP/2| Nginx
    
    style Nginx fill:#4CAF50
    style DockerMgr fill:#FF9800
    style DockerSocket fill:#F44336
```

### Key Changes
- **nginx** handles HTTP/2 (port 3000) and proxies to Next.js (port 3001)
- **Docker Manager** (production only) controls containers via Docker socket
- **Docker socket mount** gives API container control over all containers

## Implementation Strategy

### Development Mode
- Add nginx to the existing `node:20-alpine` dev container
- Nginx proxies HTTP/2 requests to Next.js dev server (running on internal port 3001)
- Keeps volume mounts and hot reload functionality intact
- Developers always test with HTTP/2, matching production behavior
- **No Docker socket mount** - system management features hidden

### Production Mode  
- Update `Dockerfile.ui` to include nginx
- Multi-stage build with nginx in the final stage
- Next.js standalone server runs on internal port 3001
- Nginx serves on port 3000 with HTTP/2 enabled
- **Docker socket mounted** - system management features enabled

## Detailed Changes

### 1. Create nginx Configuration Files

**`nginx.conf`** - Production nginx config:
- Listen on port 3000 with HTTP/2 (`listen 3000 http2`)
- Reverse proxy to Next.js on `localhost:3001`
- Gzip compression for text assets
- Optimized cache headers for static assets (_next/static/*)
- Proper headers for fonts and assets

**`nginx-dev.conf`** - Dev mode nginx config:
- Same as production but optimized for development
- Disable caching for easier debugging
- Proxy to Next.js dev server on `localhost:3001`

### 2. Update docker-compose.dev.yml

Modify the `vestaboard-ui-dev` service:
- Install nginx in the container startup
- Copy nginx-dev.conf into the container
- Create a startup script that runs both:
  - nginx (port 3000 with HTTP/2)
  - `npm run dev -- -H 0.0.0.0 -p 3001` (Next.js dev server on port 3001)
- Update command to use the startup script
- Keep all volume mounts for hot reload

### 3. Update Dockerfile.ui

Modify the production Dockerfile:
- Install nginx in the runner stage
- Copy nginx.conf
- Set `PORT=3001` for Next.js server (internal)
- Expose port 3000 (nginx)
- Create a startup script to run both nginx and Next.js server
- Update CMD to use the startup script
- Update healthcheck to check nginx endpoint

### 4. Add Preconnect Hints

Update [`web/src/app/layout.tsx`](web/src/app/layout.tsx):
- Add preconnect links in the `<head>` section for Google Fonts CDN:
  ```tsx
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  ```

### 5. Docker Compose Configuration

**No changes needed** to port mappings in any docker-compose files:
- `docker-compose.dev.yml`: Already maps `3000:3000`
- `docker-compose.prod.yml`: Already maps `4420:3000`
- Both will now serve HTTP/2 transparently

## Testing Plan

### Phase 1: HTTP/2 Testing (Dev Mode)

1. **Dev Mode Testing** (`/start` command):
   - Verify nginx starts successfully with HTTP/2
   - Confirm hot reload still works (edit a file, see changes)
   - Open Chrome DevTools → Network → Check Protocol column shows `h2` (HTTP/2)
   - Run Lighthouse test → Verify HTTP/2 warning is resolved
   - System Management section should NOT appear (dev mode)

### Phase 2: System Management Testing (Production Mode)

2. **Production Build Testing** (`/build` command):
   - Build the new Docker image locally
   - Start with `docker-compose -f docker-compose.prod.yml up`
   - Run Lighthouse test → Verify both warnings resolved
   - Check estimated savings decreased to ~0ms
   - **System Management section SHOULD appear in Settings**

3. **Test System Management Features**:
   - **View Status**: Check that container versions and status display correctly
   - **View Logs**: 
     - Click "View Logs" → Select API → Verify logs display
     - Test auto-refresh toggle
     - Test download logs
   - **Restart API**: 
     - Click "Restart API" → Confirm dialog appears
     - Confirm → Verify API restarts (~5-10 seconds)
     - Check logs to confirm restart
   - **Restart UI**: 
     - Click "Restart UI" → Confirm → Page may disconnect briefly, then reconnect
   - **Restart All**: 
     - Click "Restart All" → Confirm → Both containers restart
   - **Upgrade**: 
     - Click "Upgrade Containers" → Confirm
     - Verify pulls latest images and restarts
     - Check logs for pull progress

### Phase 3: Deployment

4. **Publish to GHCR**:
   - After successful local testing, publish updated images
   - Both `vestaboard-api` and `vestaboard-ui` have changes
   - Deploy to NAS using `/deploy-to-nas` command
   - Run final Lighthouse test on deployed instance
   - Test system management features on NAS

## Expected Results

### HTTP/2 Improvements
- **HTTP/2**: All resources served via h2 protocol (estimated savings: 0ms, warning gone)
- **Preconnect**: Early connections to Google Fonts (faster font loading)
- **Dev Mode**: Hot reload preserved, HTTP/2 enabled for realistic testing
- **Prod Mode**: Full HTTP/2 support with optimized caching
- **Image Size**: vestaboard-ui image ~50MB larger (nginx included)

### System Management Features
- **Production-Only**: System controls only visible when `PRODUCTION=true`
- **Container Control**: Ability to restart API, UI, or all containers from the UI
- **Log Viewing**: Real-time container log viewer with download capability
- **Upgrade Path**: One-click container upgrades from UI (pulls latest images)
- **Safety**: All operations require explicit confirmation
- **Feedback**: Toast notifications for all operations
- **Status Monitoring**: Real-time container health and version information

### User Benefits
- **No SSH Required**: Administrators can manage containers from the web UI
- **Faster Troubleshooting**: View logs without command-line access
- **Easy Updates**: Upgrade to latest versions with one click
- **Better Performance**: HTTP/2 reduces page load time by ~220ms

## Part 2: System Management Features (Production Only)

### Overview

Add container management capabilities to the Settings UI, allowing production users to restart services, upgrade containers, and view logs without SSH access.

### Backend Changes

#### 1. Add Docker Python Library

Update [`requirements.txt`](requirements.txt):
```
docker>=7.0.0
```

This allows the API to interact with the Docker daemon.

#### 2. Create System Management API Module

Create new file [`src/system/docker_manager.py`](src/system/docker_manager.py):
- Class `DockerManager` to interact with Docker API
- Methods: `restart_service()`, `restart_all()`, `upgrade_images()`, `get_logs()`, `get_status()`
- Production-only check (raises error if `PRODUCTION != true`)
- Error handling for Docker socket access

#### 3. Add System API Endpoints

Update [`src/api_server.py`](src/api_server.py) with new routes:

**Container Operations:**
- `POST /api/system/restart/api` - Restart API container (with delay so request completes first)
- `POST /api/system/restart/ui` - Restart UI container  
- `POST /api/system/restart/all` - Restart all containers
- `POST /api/system/upgrade` - Pull latest images and restart containers

**Monitoring:**
- `GET /api/system/status` - Get container status, health, image versions
- `GET /api/system/logs/{service}` - Stream container logs (with `lines` query param)

**Runtime Config:**
- Update `GET /api/runtime-config` to include `is_production` flag

All endpoints check `PRODUCTION` env var and return 403 if not production.

#### 4. Update Docker Compose for Production

Update [`docker-compose.prod.yml`](docker-compose.prod.yml):
- Add Docker socket volume mount to API container:
  ```yaml
  volumes:
    - ./data:/app/data
    - /var/run/docker.sock:/var/run/docker.sock:ro
  ```
- This gives API read-write access to Docker (needed for restart/upgrade operations)

**Security Note**: Docker socket access is powerful - this is why it's production-only and requires confirmation dialogs.

### Frontend Changes

#### 1. Update Runtime Config Type

Update [`web/src/lib/api.ts`](web/src/lib/api.ts):
- Add `is_production` to runtime config type
- Store production flag in API client
- Export helper: `export const isProduction = () => runtimeConfig.is_production`

#### 2. Create System Management Components

Create [`web/src/components/system-controls.tsx`](web/src/components/system-controls.tsx):
- Card component for System section
- Buttons for each operation (with icons)
- Confirmation dialogs using AlertDialog
- Toast notifications for success/error
- Loading states during operations
- Show current container versions/status

Create [`web/src/components/system-logs-viewer.tsx`](web/src/components/system-logs-viewer.tsx):
- Dialog component to view container logs
- Service selector (API, UI, All)
- Auto-refresh option
- Scrollable log area with monospace font
- Download logs button

#### 3. Create System API Hooks

Create [`web/src/hooks/use-system.ts`](web/src/hooks/use-system.ts):
- `useSystemStatus()` - Fetch container status
- `useRestartService(service)` - Mutation to restart service
- `useRestartAll()` - Mutation to restart all containers
- `useUpgradeContainers()` - Mutation to upgrade
- `useSystemLogs(service)` - Query for logs with auto-refresh

#### 4. Update Settings Page

Update [`web/src/app/settings/page.tsx`](web/src/app/settings/page.tsx):
- Add conditional System section (only visible in production)
- Import and render `<SystemControls />` component
- Place it after General Settings, before Vestaboard Connection

Example structure:
```tsx
{isProduction && (
  <section>
    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
      System Management
    </h2>
    <p className="text-sm text-muted-foreground mb-4">
      Manage Docker containers and view system logs
    </p>
    <SystemControls />
  </section>
)}
```

### Confirmation Dialog UX

All destructive operations require confirmation:

**Restart Service/All:**
- Title: "Restart [Service]?"
- Description: "This will briefly interrupt the service. Are you sure?"
- Actions: Cancel (secondary), Restart (destructive)

**Upgrade Containers:**
- Title: "Upgrade to Latest Images?"
- Description: "This will pull the latest images from GHCR and restart all containers. Downtime: ~30-60 seconds."
- Actions: Cancel (secondary), Upgrade (destructive)

### User Flow Example

1. User opens Settings page in production
2. Sees "System Management" section with current versions
3. Clicks "Restart API" button
4. Confirmation dialog appears
5. User confirms → API call made → Toast shows "Restarting API container..."
6. After ~3 seconds → Toast updates "API container restarted successfully"
7. Status indicators update automatically

## Files Modified

### HTTP/2 Changes
- `nginx.conf` (new)
- `nginx-dev.conf` (new)
- `Dockerfile.ui`
- `docker-compose.dev.yml`
- `web/src/app/layout.tsx`

### System Management Changes
- `requirements.txt`
- `src/system/__init__.py` (new)
- `src/system/docker_manager.py` (new)
- `src/api_server.py` (add system routes)
- `docker-compose.prod.yml` (add Docker socket)
- `web/src/lib/api.ts` (add system API calls)
- `web/src/hooks/use-system.ts` (new)
- `web/src/components/system-controls.tsx` (new)
- `web/src/components/system-logs-viewer.tsx` (new)
- `web/src/app/settings/page.tsx` (add system section)

## Files NOT Modified

- `docker-compose.dev.yml` (no Docker socket in dev mode - system features won't appear)
- `docker-compose.ghcr.yml` (inherits from prod, will get Docker socket)
- Core application logic (service, displays, pages, etc.)

## Implementation Order

### Phase 1: HTTP/2 Support (Core Infrastructure)
1. Create nginx.conf (production)
2. Create nginx-dev.conf (development)
3. Update Dockerfile.ui (add nginx multi-stage)
4. Update docker-compose.dev.yml (add nginx to dev container)
5. Add preconnect hints to layout.tsx
6. Test in dev mode with `/start`

### Phase 2: System Management Backend
7. Add docker library to requirements.txt
8. Create src/system/docker_manager.py
9. Add system API endpoints to api_server.py
10. Update runtime-config endpoint to include is_production
11. Update docker-compose.prod.yml (add Docker socket mount)

### Phase 3: System Management Frontend
12. Update web/src/lib/api.ts (add system API calls and production flag)
13. Create web/src/hooks/use-system.ts
14. Create web/src/components/system-controls.tsx
15. Create web/src/components/system-logs-viewer.tsx
16. Update web/src/app/settings/page.tsx (add system section)

### Phase 4: Testing and Deployment
17. Build and test in production mode locally
18. Test all system management features
19. Run Lighthouse tests
20. Publish images to GHCR
21. Deploy to NAS

## Security Considerations

**Docker Socket Access:**
- Only mounted in production mode
- Backend enforces PRODUCTION env var check on all system endpoints
- All operations require user confirmation in UI
- Frontend only shows system controls when `is_production = true`

**Why This Is Safe:**
- Production deployment is trusted environment (user's NAS)
- API already has full system access (runs services)
- Docker socket just formalizes existing trust boundary
- Confirmation dialogs prevent accidental operations
- Logs show all system operations for audit trail

