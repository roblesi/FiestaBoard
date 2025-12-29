Deploy the Vesta application to Synology NAS. Execute:

./deploy.sh

This script will:
1. Build Docker images locally
2. Save images as tar files
3. Create production configuration with custom ports (API: 6969, UI: 4420)
4. Transfer images and configs to Synology NAS (192.168.0.2)
5. Load images and start containers on Synology
6. Switch from dev mode (UI simulator) to production mode (actual Vestaboard)
7. Verify deployment and display access URLs

The script reads credentials from .env and will prompt for confirmation before deploying. After deployment, the Web UI will be available at http://192.168.0.2:4420 and the API at http://192.168.0.2:6969.



