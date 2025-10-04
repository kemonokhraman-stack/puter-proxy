const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ✅ تفعيل CORS
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

// ✅ الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send('🟢 Puter Proxy is running!');
});

// ✅ عرض النماذج المتاحة (مهم لـ Janitor AI)
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

// ✅ التحقق من API Key
function checkApiKey(req, res, next) {
    const apiKey = req.headers['authorization']?.replace('Bearer ', '') || 
                   req.headers['x-api-key'];
    
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

// ✅ معالجة المحادثات
app.post('/v1/chat/completions', checkApiKey, async (req, res) => {
    try {
        const { messages, stream = false } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: { message: 'Messages array is required' } 
            });
        }

        // تحويل الرسائل إلى نص واحد
        const userMessage = messages
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
            .join('
');

        // إرسال الطلب إلى Puter AI
        const response = await axios.post('https://api.puter.com/drivers/call', {
            interface: 'puter-chat-completion',
            driver: 'openai-completion',
            method: 'complete',
            args: {
                messages: [{ role: 'user', content: userMessage }]
            }
        }, {
            headers: {
                'Authorization': `Bearer ${PUTER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const aiResponse = response.data?.message?.content || 
                          response.data?.result?.message?.content || 
                          'لا يوجد رد';

        // إرسال الرد بتنسيق OpenAI
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.write(`data: ${JSON.stringify({
                id: 'chatcmpl-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'claude-sonnet-4.5',
                choices: [{
                    index: 0,
                    delta: { content: aiResponse },
                    finish_reason: null
                }]
            })}
`);
            res.write('data: [DONE]
');
            res.end();
        } else {
            res.json({
                id: 'chatcmpl-' + Date.now(),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: 'claude-sonnet-4.5',
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: aiResponse
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            });
        }

    } catch (error) {
        console.error('خطأ:', error.response?.data || error.message);
        res.status(500).json({
            error: {
                message: error.response?.data?.error?.info || error.message,
                type: 'api_error'
            }
        });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 Proxy يعمل على المنفذ ${PORT}`);
});
