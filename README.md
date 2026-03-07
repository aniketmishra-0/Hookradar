# 🛰️ HookRadar — Webhook Tester & Debugger

> Open-source webhook testing and debugging tool. Inspect, debug, and replay incoming HTTP webhooks in real-time.

![HookRadar](https://img.shields.io/badge/HookRadar-Open%20Source-6366f1?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)

## ✨ Features

- **🔗 Unique Webhook URLs** — Generate unique endpoints to receive and inspect webhooks
- **⚡ Real-time Monitoring** — Watch incoming requests appear instantly via WebSocket
- **🔍 Full Request Inspection** — View headers, body, query parameters, and metadata
- **🎨 Custom Responses** — Configure status codes, headers, response body, and delays
- **🔄 Request Replay** — Forward/replay captured requests to any URL
- **📋 cURL Export** — Generate cURL commands to reproduce any captured request
- **🌙 Premium Dark UI** — Beautiful, modern interface with smooth animations
- **💾 Persistent Storage** — SQLite database stores all endpoints and requests
- **🚀 Self-hosted** — Run on your own server, own your data

## 🛠️ Tech Stack

| Frontend | Backend | Database |
|----------|---------|----------|
| React 19 | Node.js + Express | SQLite (better-sqlite3) |
| Vite | WebSocket (ws) | |
| Lucide Icons | nanoid + uuid | |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hookradar.git
cd hookradar

# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Webhook endpoints**: http://localhost:3001/hook/<slug>

### Production Build

```bash
# Build the frontend
npm run build

# Start the production server
npm start
```

## 📡 Usage

### 1. Create an Endpoint
Click "New Endpoint" to generate a unique webhook URL.

### 2. Send Webhooks
Send any HTTP request to your webhook URL:

```bash
# POST request
curl -X POST http://localhost:5173/hook/your-slug \
  -H "Content-Type: application/json" \
  -d '{"event": "payment.completed", "amount": 99.99}'

# GET request with query params
curl "http://localhost:5173/hook/your-slug?status=active&page=1"

# PUT request
curl -X PUT http://localhost:5173/hook/your-slug \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

### 3. Inspect & Debug
View detailed information about each request:
- HTTP method, path, and status
- Request headers
- Request body (auto-formatted JSON)
- Query parameters
- cURL command to reproduce

### 4. Customize Responses
Configure what your endpoint returns:
- **Status Code**: 200, 201, 400, 500, etc.
- **Headers**: Custom response headers
- **Body**: Custom response body
- **Delay**: Simulate slow responses

### 5. Replay Requests
Forward any captured request to another URL for testing.

## 📁 Project Structure

```
hookradar/
├── server/
│   ├── server.js          # Express + WebSocket server
│   └── database.js        # SQLite database setup
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── EndpointView.jsx
│   │   ├── RequestDetail.jsx
│   │   ├── ResponseConfig.jsx
│   │   └── CreateEndpointModal.jsx
│   ├── utils/
│   │   └── api.js         # API client & utilities
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   └── hookradar-icon.svg
├── index.html
├── vite.config.js
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Lucide Icons](https://lucide.dev/) for beautiful icons
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for fast SQLite bindings
- Inspired by webhook.site, RequestBin, and similar tools

---

**Made with ❤️ by the HookRadar community**
