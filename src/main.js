import { TwitchClient } from './twitch.js';

const { createApp, reactive, computed, nextTick, ref, onMounted } = Vue;

const store = reactive({
    // Config
    config: {
        channel: localStorage.getItem('nx_channel') || '',
        alerts: localStorage.getItem('nx_alerts') || 'pog, omg, hype',
        fontSize: localStorage.getItem('nx_fontSize') || '0.95rem',
        maxMessages: parseInt(localStorage.getItem('nx_maxMsgs')) || 500,
        audioEnabled: localStorage.getItem('nx_audio') === 'true',
        autoConnect: localStorage.getItem('nx_auto') === 'true',
        sentimentEnabled: localStorage.getItem('nx_sentiment') !== 'false',
        timestampsEnabled: localStorage.getItem('nx_ts') !== 'false'
    },

    // Live Data
    messages: [],
    status: 'disconnected', // 'connected', 'disconnected', 'error'
    startTime: null,
    totalMessages: 0,
    topChatters: {},
    activeAlerts: [],

    // UI State
    autoScroll: true,
    searchQuery: '',
    userFilter: null,
    showSettings: false,

    // Actions
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        Object.entries(this.config).forEach(([key, val]) => {
            localStorage.setItem(`nx_${key}`, val);
        });
        // Apply global styles
        document.documentElement.style.setProperty('--chat-font-size', this.config.fontSize);
        this.activeAlerts = this.config.alerts.split(',').map(s => s.trim()).filter(s => s);
    },

    addMessage(msg) {
        this.messages.push(msg);
        this.totalMessages++;

        // Update top chatters
        this.topChatters[msg.username] = (this.topChatters[msg.username] || 0) + 1;

        // Limit messages
        if (this.messages.length > this.config.maxMessages) {
            this.messages.shift();
        }

        // Trigger Alert logic
        const hasAlert = this.activeAlerts.some(w => msg.text.toLowerCase().includes(w.toLowerCase()));
        if (hasAlert && this.config.audioEnabled) {
            this.playPing();
        }
    },

    playPing() {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
    }
});

const app = createApp({
    setup() {
        const messageListRef = ref(null);

        // Computed
        const filteredMessages = computed(() => {
            let list = store.messages;
            if (store.userFilter) list = list.filter(m => m.username === store.userFilter);
            if (store.searchQuery) list = list.filter(m => m.text.toLowerCase().includes(store.searchQuery.toLowerCase()));
            return list;
        });

        const sortedChatters = computed(() => {
            return Object.entries(store.topChatters)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
        });

        const messagesPerMinute = computed(() => {
            if (!store.startTime) return 0;
            const elapsed = (new Date() - store.startTime) / 60000;
            return Math.round(store.totalMessages / Math.max(elapsed, 0.1));
        });

        const uptime = ref('00:00:00');
        setInterval(() => {
            if (store.startTime) {
                const diff = Math.floor((new Date() - store.startTime) / 1000);
                const h = Math.floor(diff / 3600).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');
                uptime.value = `${h}:${m}:${s}`;
            }
        }, 1000);

        // Methods
        const startTracking = () => {
            if (!store.config.channel) return;
            store.messages = [];
            store.totalMessages = 0;
            store.topChatters = {};
            store.startTime = new Date();
            TwitchClient.connect(
                store.config.channel,
                (msg) => {
                    store.addMessage(msg);
                    if (store.autoScroll) scrollToBottom();
                },
                (status) => store.status = status
            );
        };

        const stopTracking = () => {
            TwitchClient.disconnect();
            store.status = 'disconnected';
            store.startTime = null;
        };

        const scrollToBottom = (force = false) => {
            if (!force && !store.autoScroll) return;
            nextTick(() => {
                const el = messageListRef.value;
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        };

        const handleScroll = (e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            // Precise threshold: if user is within 50px of bottom, stick to bottom
            const isAtBottom = scrollHeight - clientHeight - scrollTop < 50;

            // Only update store if it's a genuine change in state
            if (store.autoScroll !== isAtBottom) {
                store.autoScroll = isAtBottom;
            }
        };

        // Mutation Observer for guaranteed scroll sync
        onMounted(() => {
            const observer = new MutationObserver(() => {
                if (store.autoScroll) scrollToBottom(true);
            });
            if (messageListRef.value) {
                observer.observe(messageListRef.value, { childList: true, subtree: true });
            }

            store.activeAlerts = store.config.alerts.split(',').map(s => s.trim()).filter(s => s);
            document.documentElement.style.setProperty('--chat-font-size', store.config.fontSize);
            if (store.config.autoConnect) startTracking();
        });

        const exportLog = () => {
            const blob = new Blob([JSON.stringify(store.messages, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nexchat_${store.config.channel}_${Date.now()}.json`;
            a.click();
        };

        const setUserFilter = (username) => {
            store.userFilter = username;
            scrollToBottom();
        };

        const formatBody = (msg) => {
            return TwitchClient.processMessageHtml(msg.text, msg.emotes, store.activeAlerts);
        };

        const getSentimentClass = (text) => {
            if (!store.config.sentimentEnabled) return '';
            const s = TwitchClient.detectSentiment(text);
            return s === 'positive' ? 'border-l-4 border-green-400' : s === 'negative' ? 'border-l-4 border-red-500' : '';
        };


        return {
            store,
            filteredMessages,
            sortedChatters,
            messagesPerMinute,
            uptime,
            messageListRef,
            startTracking,
            stopTracking,
            scrollToBottom,
            handleScroll,
            exportLog,
            setUserFilter,
            formatBody,
            getSentimentClass
        };
    }
});

app.mount('#app');
