const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

const PORT = process.env.PORT || 10000;
const PUTER_TOKEN = process.env.PUTER_TOKEN;
const API_KEY = process.env.API_KEY || 'janitor-api-key-123';

app.get('/', (req, res) => {
    res.send('Puter Proxy is running!');
});

app.get('/v1/models', (req, res) => {
    res.json({
        object: "list",
        data: [
            {
                id: "claude-sonnet-4.5",
                object: "model",
                created: 1677610602,
                owned_by: "anthropic"
            },
            {
                id: "claude-opus-4",
                object: "model",
                created: 1677610602,
                owned_by: "anthropic"
            },
            {
                id: "gpt-4",
                object: "model",
                created: 1677610602,
                owned_by: "openai"
            }
        ]
    });
});

function checkApiKey(req, res, next) {
    const apiKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ 
            error: { 
                message: 'Invalid API key', 
                type: 'invalid_request_error' 
            } 
        });
    }
    next();
}

app.post('/v1/chat/completions', checkApiKey, async (req, res) => {
    try {
        const { messages, stream = false } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: { message: 'Messages array is required' } 
            });
        }

        const userMessages = messages.filter(msg => msg.role === 'user');
        const userMessage = userMessages.map(msg => msg.content).join(' ');

        const response = await axios.post('https://api.puter.com/drivers/call', {
            interface: 'puter-chat-completion',
            driver: 'openai-completion',
            method: 'complete',
            args: {
                messages: [{ role: 'user', content: userMessage }]
            }
        }, {
            headers: {
                'Authorization': `Bearer ${PUTER
