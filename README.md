# 🌌 NexChat | Twitch Chat Intelligence

NexChat is a high-performance, real-time Twitch chat monitoring dashboard designed for power users, moderators, and analysts. Built with a modern glassmorphism aesthetic, it transforms raw chat streams into actionable intelligence without requiring complex API keys or developer registrations.

![NexChat Dashboard](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000)

## 🔥 Core Features

- **🚀 Real-Time Streaming**: Directly connects to Twitch IRC via WebSockets for zero-latency monitoring.
- **🖼️ Fixed Emote Engine**: Comprehensive support for:
  - Native Twitch Emotes
  - BetterTTV (BTTV) Global & Channel Emotes
  - 7TV (v3) Global & Channel Emotes
- **🧠 Signal Intelligence**:
  - **Sentiment Analysis**: Real-time emotional tone detection (Positive/Negative/Neutral).
  - **High-Frequency Leaderboard**: Tracks top chatters dynamically.
  - **Entity Analysis**: Deep-dive into specific user histories with one click.
- **🔔 Mission Control**:
  - Custom Alert Triggers with visual highlighting.
  - Message Filtering & Search.
  - Glassmorphism UI with Dark Mode optimized for stream monitoring.
- **💾 Data Sovereignty**: 
  - Export chat logs as clean JSON.
  - Import previous session data for offline analysis.
  - LocalStorage persistence for your target channels and alert words.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (Modern ES6+ Component Pattern)
- **Styling**: Modern CSS3 (CSS Variables, Flex/Grid, Glassmorphism)
- **Networking**: WebSocket (WSS) / Twitch IRC Protocol
- **APIs**: Twitch Emotes CDN, BetterTTV API v3, 7TV API v3

## 🚀 Deployment

NexChat is designed to be serverless and portable.

### Automated Deployment
This repository includes a GitHub Action that automatically deploys the WebApp to **GitHub Pages** whenever changes are pushed to the `main` branch.

### Manual Usage
Simply open `index.html` in any modern web browser. No installation or build steps required.

## 🛡️ Privacy & Security

- **No Data Collection**: NexChat runs entirely on your local machine. No chat data is sent to external servers.
- **Anonymous Access**: Uses Twitch's `justinfan` anonymous login system. No OAuth or password required.

## 🤝 Contributing

NexChat is built for the community. Feel free to open issues or submit pull requests to enhance the signal intelligence capabilities!
