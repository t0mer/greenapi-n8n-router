# 🚀 Green API n8n Router

A powerful WhatsApp message router that forwards incoming messages to multiple n8n webhook endpoints with a beautiful web management interface.

![Green API n8n Router](https://img.shields.io/badge/WhatsApp-Router-25D366?style=for-the-badge&logo=whatsapp)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Web%20Interface-009688?style=for-the-badge&logo=fastapi)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

## ✨ Features

### 🌐 **Modern Web Interface**
- **Visual Dashboard**: Trello-like card interface for managing routes
- **Real-time Logging**: Live WebSocket-based log viewer with drag-and-drop positioning
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Professional UI with smooth animations

### 🔄 **Smart Routing System**
- **Multiple Webhooks**: Route single chat to multiple webhook endpoints
- **Dynamic Configuration**: Hot-reload configuration without restart
- **Route Management**: Add, edit, delete routes through the web interface
- **Bulk Operations**: Manage multiple webhook URLs per chat ID

### ⚡ **Advanced Features**
- **Bot-Only Restart**: Restart WhatsApp bot without affecting web interface
- **Environment Detection**: Automatic Docker/native environment detection
- **Health Monitoring**: Built-in health check endpoints
- **Error Handling**: Comprehensive error handling with retry logic
- **Cross-Platform**: Works on Windows, Linux, macOS, and Docker

### 🛠️ **Developer Experience**
- **API-First**: RESTful API for all operations
- **WebSocket Logs**: Real-time log streaming to web interface
- **Configuration Watching**: Automatic reload on config file changes
- **Type Safety**: Full TypeScript-like type hints in Python

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Create the docker-compose.yml file:**

```yaml
version: '3.8'
services:
  greenapi-n8n-router:
    image: techblog/greenapi-n8n-router
    container_name: greenapi-n8n-router
    volumes:
      - ./app/config/:/app/config/
    restart: unless-stopped
    ports:
      - "8000:8000"
```

2. **Start the application:**

```bash
# Start the container
docker-compose up -d

# View logs (optional)
docker-compose logs -f greenapi-n8n-router
```

**Note:** An empty configuration file will be automatically created on first startup at `app/config/config.yaml`. You can then configure your Green API credentials and routes through the web interface.

3. **Access the web interface:**

Open your browser and navigate to `http://localhost:8000`

### Option 2: Docker Run

```bash
# Create config directory
mkdir -p app/config

# Run the container
docker run -d \
  --name greenapi-n8n-router \
  -p 8000:8000 \
  -v $(pwd)/app/config:/app/config \
  --restart unless-stopped \
  techblog/greenapi-n8n-router
```

**Note:** An empty configuration file will be automatically created on first startup. Configure your settings through the web interface at `http://localhost:8000`.

### Option 3: Build from Source

```bash
# Clone the repository
git clone https://github.com/t0mer/greenapi-n8n-router.git
cd greenapi-n8n-router

# Build and run with Docker Compose
docker-compose up -d --build
```

### Option 4: Native Installation

```bash
# Clone the repository
git clone https://github.com/t0mer/greenapi-n8n-router.git
cd greenapi-n8n-router/app

# Install dependencies
pip install -r requirements.txt

# Start the application
python app.py
```

## 📋 Configuration

Edit `app/config/config.yaml`:

```yaml
green_api:
  instance_id: 'YOUR_INSTANCE_ID'
  token: 'YOUR_TOKEN_HERE'
  prefix: 'YOUR_API_PREFIX_HERE'
routes:
  # Single webhook per chat
  972523531857@c.us:
    - https://your-n8n.example.com/webhook/chat1
  
  # Multiple webhooks for the same chat
  972501234567@c.us:
    - https://n8n-primary.example.com/webhook/support
    - https://n8n-backup.example.com/webhook/support
    - https://analytics.example.com/webhook/tracking
  
  # Group chat routing
  120363025623@g.us:
    - https://n8n.example.com/webhook/group-notifications
    - https://slack-integration.example.com/webhook/groups
```

### Configuration Options

| Field | Description | Example |
|-------|-------------|---------|
| `green_api.instance_id` | Your Green API instance ID | `7103251345` |
| `green_api.token` | Your Green API token | `c4e60a46f75f...` |
| `green_api.prefix` | Your Green API url prefix | `7103` for `7103.api.greenapi.com/waInstance...` |
| `routes` | Chat ID to webhook URL mappings | See examples above |

## 🎯 Usage

### 1. **Access Web Interface**
Navigate to `http://localhost:8000` to access the management dashboard.

### 2. **Configure Green API Settings**
- Click the "⚙️ Settings" button
- Enter your Instance ID, Token and API Prefix
- Click "Update & Restart" - only the bot component restarts

### 3. **Manage Routes**
- **Add Route**: Click the "+" card to create new routes
- **Edit Route**: Click on any route card to view/edit details
- **Multiple Webhooks**: Add multiple webhook URLs per chat
- **Delete Route**: Use the 🗑️ button to remove routes

### 4. **Monitor Activity**
- Click "Show Logger" to view real-time logs
- Drag the logger window to reposition it
- See live message forwarding activity

## 🔧 Container Management

### Docker Compose Commands

```bash
# Start the service
docker-compose up -d

# Stop the service
docker-compose down

# Restart the service
docker-compose restart

# View logs
docker-compose logs -f greenapi-n8n-router

# Update to latest image
docker-compose pull
docker-compose up -d

# Check service status
docker-compose ps
```

### Configuration Updates

After modifying `app/config/config.yaml`:

```bash
# Restart only the bot component (recommended)
curl -X POST http://localhost:8000/restart

# Or restart the entire container
docker-compose restart greenapi-n8n-router
```

## 🔧 API Reference

### Core Endpoints

#### Get All Routes
```http
GET /routes
```

#### Add New Route
```http
POST /routes
Content-Type: application/json

{
  "chat_id": "972523531857@c.us",
  "target_urls": [
    "https://n8n.example.com/webhook/chat1",
    "https://backup.example.com/webhook/chat1"
  ]
}
```

#### Update Route
```http
PUT /routes/{chat_id}
Content-Type: application/json

{
  "chat_id": "972523531857@c.us",
  "target_urls": [
    "https://n8n.example.com/webhook/updated"
  ]
}
```

#### Delete Route
```http
DELETE /routes/{chat_id}
```

#### Update Settings
```http
POST /settings
Content-Type: application/json

{
  "instance_id": "your_instance_id",
  "token": "your_token"
  "prefix": "your_api_prefix"
}
```

#### Restart Bot
```http
POST /restart
```

#### Health Check
```http
GET /health
```

### WebSocket Endpoints

#### Live Logs
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/logs');
ws.onmessage = (event) => {
  const logData = JSON.parse(event.data);
  console.log(`[${logData.timestamp}] ${logData.level}: ${logData.message}`);
};
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │  Green API       │    │  Router App     │
│   Messages      │───▶│  Webhook         │───▶│  (FastAPI)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   n8n Instance  │    │   n8n Instance   │    │  n8n Instance   │
│   Webhook #1    │◀───│   Webhook #2     │◀───│  Webhook #3     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Components

- **WhatsApp Bot**: Handles incoming messages via Green API
- **Web Interface**: FastAPI-based management dashboard
- **Router Engine**: Forwards messages to configured webhooks
- **Configuration Manager**: Hot-reload configuration system
- **Logger**: Real-time WebSocket logging system

## 🐳 Docker Support

```yaml
version: '3.8'
services:
  greenapi-n8n-router:
    image: techblog/greenapi-n8n-router
    container_name: greenapi-n8n-router
    volumes:
      - ./app/config/config.yaml:/app/config/config.yaml
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```


## 🛠️ Development

### Project Structure
```
greenapi-n8n-router/
├── app/
│   ├── app.py                 # Main application entry point
│   ├── web_manager.py         # FastAPI web interface
│   ├── config_loader.py       # Configuration management
│   ├── config_watcher.py      # Hot-reload configuration
│   ├── restart_app.py         # Bot restart utility
│   ├── requirements.txt       # Python dependencies
│   ├── static/
│   │   ├── css/routes.css     # Stylesheet
│   │   └── js/routes.js       # Frontend JavaScript
│   ├── templates/
│   │   └── routes.html        # Main web interface
│   └── config/
│       └── config.yaml        # Configuration file
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### Key Features Implementation

#### 1. **Bot-Only Restart**
The application separates the WhatsApp bot and web server, allowing bot restarts without affecting the web interface:

```python
def restart_bot_component():
    """Restart only the bot component."""
    global bot, bot_thread
    
    # Stop existing bot
    bot = None
    bot_thread = None
    
    # Reload config and restart bot
    config = load_config(CONFIG_PATH)
    bot = initialize_bot()
    bot_thread = start_bot_thread(bot)
```

#### 2. **Real-time Logging**
WebSocket-based logging provides instant feedback:

```javascript
connectWebSocket() {
    const ws = new WebSocket('ws://localhost:8000/ws/logs');
    ws.onmessage = (event) => {
        const logData = JSON.parse(event.data);
        this.addLogEntry(logData.message, logData.level);
    };
}
```

#### 3. **Hot Configuration Reload**
Automatic configuration reloading without restart:

```python
def reload_config(new_config):
    global config
    old_credentials = (config["green_api"]["instance_id"], config["green_api"]["token"], config["green_api"]["prefix"])
    new_credentials = (new_config["green_api"]["instance_id"], new_config["green_api"]["token"], new_config["green_api"]["prefix"])
    
    config = new_config
    
    if old_credentials != new_credentials:
        restart_bot_component()  # Only restart bot if credentials changed
```

## 🔍 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 8000
sudo lsof -i :8000

# Kill the process
sudo kill -9 <PID>

# Or use different port in docker-compose.yml
ports:
  - "8001:8000"  # Use port 8001 instead
```

#### Configuration Issues
```bash
# Check if config file exists and is valid
cat app/config/config.yaml

# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('app/config/config.yaml'))"

# Check container logs
docker-compose logs greenapi-n8n-router
```

#### Bot Restart
```bash
# Manual bot restart via API
curl -X POST http://localhost:8000/restart

# Restart entire container
docker-compose restart greenapi-n8n-router

# Check health status
curl http://localhost:8000/health
```

#### Docker Issues
```bash
# View container logs
docker-compose logs -f greenapi-n8n-router

# Restart container
docker-compose restart greenapi-n8n-router

# Rebuild and restart
docker-compose down
docker-compose pull
docker-compose up -d

# Check container status
docker-compose ps
```

#### Green API Issues
- Ensure `instance_id`, `token` and `prefix` are correct
- Verify Green API account is active
- Check webhook URLs are accessible from the internet
- Test webhooks manually with curl/Postman

## 📝 Requirements

### System Requirements
- Docker and Docker Compose
- 1GB RAM minimum
- Network access to Green API and target webhooks
- Modern web browser for management interface

### Python Dependencies (for development)
```
fastapi>=0.104.1
uvicorn>=0.24.0
whatsapp-chatbot-python>=0.0.5
httpx>=0.25.0
pydantic>=2.4.2
python-multipart>=0.0.6
jinja2>=3.1.2
pyyaml>=6.0.1
loguru>=0.7.2
watchdog>=3.0.0
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Green API](https://green-api.com/) for WhatsApp Business API
- [n8n](https://n8n.io/) for workflow automation
- [FastAPI](https://fastapi.tiangolo.com/) for the web framework
- [SweetAlert2](https://sweetalert2.github.io/) for beautiful alerts

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/t0mer/greenapi-n8n-router/issues)

---

Made with ❤️ for the automation community

