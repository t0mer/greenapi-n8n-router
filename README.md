# greenapi-n8n-router

A lightweight Python-based relay that connects Green-API WhatsApp messages to dynamic n8n webhook URLs based on chat IDs.

Features:

✅ Built on whatsapp_chatbot_python for seamless Green-API integration.

✅ YAML-based configuration with live reload support

✅ Routes messages to different n8n webhooks based on chatId

✅ Async forwarding using httpx

✅ Deployable via Docker Compose or systemd

✅ Structured logging with loguru


## ⚙️ Configuration
The app/config.yaml file defines your Green-API credentials and routing rules:
```yaml
green_api:
  instance_id: "your-instance-id"
  token: "your-api-token"

routes:
  1234567890@c.us: "https://n8n.local/webhook/route1"
  9876543210@c.us: "https://n8n.local/webhook/route2"
```

🛡️ On first run, the app will auto-create this file if it doesn't exist.

## 🚀 Deployment Options


### Option 1: Docker Compose

Create the following docker-compose.yaml file:

```yaml
services:
  greenapi-n8n-router:
    image: techblog/greenapi-n8n-router
    container_name: greenapi-n8n-router
    volumes:
      - ./app/config/:/app/config
    restart: unless-stopped
```

Run the container using Docker Compose:

```bash 
docker-compose up -d
```

Verify the logs:
```bash
docker logs -f greenapi-n8n-router
```

### Option 2: systemd Service

clone the repo:
```bash
git clone https://github.com/t0mer/greenapi-n8n-router
```

Then enter the application folder:
```bash
cd greenapi-n8n-router
```

and run pip command to install the dependencies
```bash
pip3 install -r requirements.txt
```


Create a systemd service file:
```bash
sudo nano /etc/systemd/system/greenapi-n8n-router.service
```

Add the following content:

```bash

[Unit]
Description=GreenAPI to n8n Router
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/greenapi-n8n-router
ExecStart=/usr/bin/python3 app/main.py
Restart=on-failure
User=your-username

[Install]
WantedBy=multi-user.target
```

Replace /path/to/greenapi-n8n-router with the actual path to your project directory.

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable greenapi-n8n-router
sudo systemctl start greenapi-n8n-router
```

Check the service status:

```bash
sudo systemctl status greenapi-n8n-router
```

🧰 Testing

Set your Green-API webhook URL to point to this service.
Send a WhatsApp message from a number listed in your config.yaml routes.
Verify that the message is forwarded to the corresponding n8n webhook URL.



## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

