/**
 * Twitch IRC & Emote Manager
 * Handles WebSocket connection and message parsing
 */
export const TwitchClient = {
    ws: null,
    onMessage: null,
    onStatusChange: null,
    emoteMap: {},

    async connect(channel, onMessage, onStatusChange) {
        this.onMessage = onMessage;
        this.onStatusChange = onStatusChange;

        if (this.ws) this.ws.close();

        const channelClean = channel.replace('twitch.tv/', '').split('/')[0].toLowerCase();
        this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

        this.ws.onopen = () => {
            const nick = `justinfan${Math.floor(Math.random() * 89999) + 10000}`;
            this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            this.ws.send(`NICK ${nick}`);
            this.ws.send(`JOIN #${channelClean}`);
            this.onStatusChange('connected');
        };

        this.ws.onmessage = (event) => {
            const raw = event.data;
            if (raw.startsWith('PING')) return this.ws.send('PONG :tmi.twitch.tv');

            if (raw.includes('ROOMSTATE')) {
                const mid = raw.match(/room-id=(\d+)/);
                if (mid) this.fetchEmotes(mid[1]);
            }

            if (raw.includes('PRIVMSG')) {
                const parsed = this.parseIrc(raw);
                if (parsed) this.onMessage(parsed);
            }
        };

        this.ws.onclose = () => this.onStatusChange('disconnected');
        this.ws.onerror = () => this.onStatusChange('error');
    },

    disconnect() {
        if (this.ws) this.ws.close();
    },

    parseIrc(raw) {
        try {
            const parts = raw.split(' :');
            const tagPart = parts[0];
            const msgPart = parts.slice(1).join(' :');

            const meta = {};
            tagPart.split(';').forEach(tag => {
                const [key, val] = tag.split('=');
                meta[key] = val;
            });

            const emotes = {};
            if (meta['emotes']) {
                meta['emotes'].split('/').forEach(e => {
                    const [id, pos] = e.split(':');
                    pos.split(',').forEach(p => emotes[p] = id);
                });
            }

            return {
                id: meta['id'],
                userId: meta['user-id'],
                username: meta['display-name'] || raw.split('!')[0].split(':')[1] || 'Unknown',
                color: meta['color'] || '#9147ff',
                text: msgPart.trim(),
                emotes,
                time: new Date()
            };
        } catch (e) {
            console.error("IRC Parse Error:", e);
            return null;
        }
    },

    async fetchEmotes(cid) {
        this.emoteMap = {};
        const providers = [
            { url: 'https://api.betterttv.net/3/cached/emotes/global', parser: d => d.forEach(e => this.emoteMap[e.code] = { src: `https://cdn.betterttv.net/emote/${e.id}/1x` }) },
            { url: `https://api.betterttv.net/3/cached/users/twitch/${cid}`, parser: d => [...(d.channelEmotes || []), ...(d.sharedEmotes || [])].forEach(e => this.emoteMap[e.code] = { src: `https://cdn.betterttv.net/emote/${e.id}/1x` }) },
            { url: 'https://7tv.io/v3/emotes/global', parser: d => d.emotes.forEach(e => this.emoteMap[e.name] = { src: e.data.host.url + '/1x.webp' }) },
            { url: `https://7tv.io/v3/users/twitch/${cid}`, parser: d => d.emote_set?.emotes?.forEach(e => this.emoteMap[e.name] = { src: e.data.host.url + '/1x.webp' }) }
        ];

        for (const p of providers) {
            try {
                const res = await fetch(p.url);
                if (res.ok) p.parser(await res.json());
            } catch (e) { console.warn(`Emote provider failed: ${p.url}`); }
        }
    },

    processMessageHtml(text, twitchEmotes, alertWords = []) {
        // Escape HTML
        let html = text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

        // Twitch Emotes (Reverse sort unique ranges to prevent overlap issues)
        const ranges = Object.keys(twitchEmotes).sort((a, b) => parseInt(b.split('-')[0]) - parseInt(a.split('-')[0]));
        ranges.forEach(range => {
            const [start, end] = range.split('-').map(Number);
            const id = twitchEmotes[range];
            const emoteHtml = `<img class="inline-block h-7 align-middle" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0" alt="emote">`;
            html = html.substring(0, start) + emoteHtml + html.substring(end + 1);
        });

        // Split by spaces to handle 3rd party emotes and alerts
        return html.split(' ').map(word => {
            if (this.emoteMap[word]) {
                return `<img class="inline-block h-7 align-middle" src="${this.emoteMap[word].src}" alt="${word}" title="${word}">`;
            }
            if (alertWords.some(w => word.toLowerCase().includes(w.toLowerCase()))) {
                return `<span class="bg-yellow-500 text-black px-1 rounded font-bold">${word}</span>`;
            }
            return word;
        }).join(' ');
    },

    detectSentiment(text) {
        const positive = ['pog', 'pogchamp', 'love', 'hype', 'lul', 'kek', 'ez', 'nice', 'huge', 'king', 'goat'];
        const negative = ['bad', 'trash', 'l', 'toxic', 'dogshit', 'garbage', 'f', 'rip', 'throw', 'cringe'];
        const low = text.toLowerCase();
        if (positive.some(w => low.includes(w))) return 'positive';
        if (negative.some(w => low.includes(w))) return 'negative';
        return 'neutral';
    }
};
