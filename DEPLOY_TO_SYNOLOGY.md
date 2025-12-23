# Deploying to Synology

## Prerequisites

✅ All tests passed locally
✅ Apple Music helper service running on Mac Studio (192.168.0.116:8080)
✅ Configuration ready in `.env`

## Deployment Steps

### 1. Transfer Files to Synology

**Option A: Git (Recommended)**
```bash
# On your Mac, commit and push
git add .
git commit -m "MVP ready for deployment"
git push

# On Synology, clone/pull
git clone <your-repo> /volume1/docker/vestaboard
# or
cd /volume1/docker/vestaboard && git pull
```

**Option B: SCP/SFTP**
```bash
# From your Mac
scp -r /Users/roblesi/Dev/Vesta user@synology-ip:/volume1/docker/vestaboard
```

**Option C: Synology File Station**
- Use Synology's web interface to upload files

### 2. Create .env File on Synology

Copy your `.env` file to Synology, or create it with:

```bash
# On Synology
cd /volume1/docker/vestaboard
nano .env
```

Make sure it contains:
```bash
VB_READ_WRITE_KEY=1a801a86+c1f1+4007+bec9+7ea92443d3cd
WEATHER_API_KEY=bd6af5858e41468396d25331252312
WEATHER_PROVIDER=weatherapi
WEATHER_LOCATION=San Francisco, CA
TIMEZONE=America/Los_Angeles
APPLE_MUSIC_ENABLED=true
APPLE_MUSIC_SERVICE_URL=http://192.168.0.116:8080
APPLE_MUSIC_TIMEOUT=5
APPLE_MUSIC_REFRESH_SECONDS=10
```

### 3. Test Network Connectivity

From Synology, test if it can reach your Mac Studio:

```bash
# SSH into Synology, then:
curl http://192.168.0.116:8080/health
curl http://192.168.0.116:8080/now-playing
```

If this works, you're ready to deploy!

### 4. Build Docker Image

**Via Synology Docker GUI:**
1. Open Docker app in Synology
2. Go to Image → Add → From File
3. Select the Dockerfile
4. Build the image

**Via SSH/Command Line:**
```bash
cd /volume1/docker/vestaboard
docker build -t vestaboard-display .
```

### 5. Run Container

**Via Docker Compose (Recommended):**
```bash
cd /volume1/docker/vestaboard
docker-compose up -d
```

**Via Docker CLI:**
```bash
docker run -d \
  --name vestaboard-display \
  --env-file .env \
  --restart unless-stopped \
  vestaboard-display
```

### 6. Check Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker CLI
docker logs -f vestaboard-display
```

You should see:
```
Initializing Vestaboard Display Service...
Vestaboard client initialized
Weather source initialized (weatherapi)
DateTime source initialized (timezone: America/Los_Angeles)
Apple Music source initialized (http://192.168.0.116:8080)
Sending initial update...
Display updated successfully
```

### 7. Verify Vestaboard Display

Check your Vestaboard - it should be showing:
- Weather information
- Date and time
- Apple Music (when playing)

## Troubleshooting

### Can't connect to Mac Studio from Synology

1. **Check Mac Studio IP hasn't changed:**
   ```bash
   # On Mac Studio
   ipconfig getifaddr en0
   ```

2. **Check Mac Studio firewall:**
   - System Settings → Network → Firewall
   - Allow Python or port 8080

3. **Test connectivity:**
   ```bash
   # From Synology
   ping 192.168.0.116
   curl http://192.168.0.116:8080/health
   ```

### Docker container won't start

1. **Check logs:**
   ```bash
   docker logs vestaboard-display
   ```

2. **Verify .env file:**
   ```bash
   cat .env | grep -E "(VB_|WEATHER_|APPLE_MUSIC)"
   ```

3. **Check Docker is running:**
   ```bash
   docker ps
   ```

### Apple Music not showing

1. **Check helper service is running on Mac Studio:**
   ```bash
   # On Mac Studio
   curl http://localhost:8080/health
   ```

2. **Check Docker can reach Mac Studio:**
   ```bash
   # From Synology Docker container
   docker exec vestaboard-display curl http://192.168.0.116:8080/now-playing
   ```

3. **Check logs for errors:**
   ```bash
   docker logs vestaboard-display | grep -i "apple\|music"
   ```

## Monitoring

### View Real-time Logs
```bash
docker-compose logs -f
```

### Check Service Status
```bash
docker ps | grep vestaboard
```

### Restart Service
```bash
docker-compose restart
# or
docker restart vestaboard-display
```

## Next Steps

Once deployed and working:
- ✅ Monitor logs for a few days
- ✅ Adjust refresh intervals if needed
- ✅ Set up Apple Music helper service permanently (launchd)
- ✅ Consider Phase 3: Baywheels integration
- ✅ Consider Phase 4: Waymo pricing

