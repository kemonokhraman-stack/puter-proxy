import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// استقبال الطلبات من Janitor AI
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;

    console.log("📩 طلب جديد من Janitor AI");
    console.log("النموذج:", model);
    console.log("عدد الرسائل:", messages.length);

    // تحويل الرسائل لصيغة Puter
    const puterMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // إرسال الطلب إلى Puter
    console.log("🚀 إرسال إلى Puter...");
    
    const puterResponse = await fetch("https://api.puter.com/v2/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PUTER_TOKEN || ""}`
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4",
        messages: puterMessages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2000
      })
    });

    if (!puterResponse.ok) {
      throw new Error(`Puter API خطأ: ${puterResponse.status}`);
    }

    const puterData = await puterResponse.json();
    console.log("✅ رد من Puter استلم بنجاح");

    // استخراج النص من رد Puter
    let assistantMessage = "";
    
    if (puterData.message) {
      assistantMessage = puterData.message;
    } else if (puterData.choices && puterData.choices[0]) {
      assistantMessage = puterData.choices[0].message?.content || "";
    } else if (puterData.response) {
      assistantMessage = puterData.response;
    } else {
      assistantMessage = "عذراً، لم أستطع الحصول على رد.";
    }

    // إرجاع الرد بصيغة OpenAI
    const openAIResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "claude-sonnet-4",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: assistantMessage
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    console.log("📤 إرسال الرد إلى Janitor AI");
    res.json(openAIResponse);

  } catch (error) {
    console.error("❌ خطأ:", error.message);
    res.status(500).json({
      error: {
        message: `خطأ: ${error.message}`,
        type: "api_error",
        code: "internal_error"
      }
    });
  }
});

// صفحة الاختبار
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Puter Proxy</title>
        <style>
          body {
            font-family: Arial;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .status {
            background: #4CAF50;
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
          .info {
            background: white;
            padding: 20px;
            margin-top: 20px;
            border-radius: 10px;
            direction: rtl;
          }
        </style>
      </head>
      <body>
        <div class="status">
          <h1>✅ Proxy يعمل بنجاح!</h1>
        </div>
        <div class="info">
          <h2>معلومات الاتصال:</h2>
          <p><strong>URL للاستخدام في Janitor AI:</strong></p>
          <code>${req.protocol}://${req.get('host')}/v1/chat/completions</code>
          <p style="margin-top:20px"><strong>النماذج المتاحة:</strong></p>
          <ul>
            <li>claude-sonnet-4</li>
            <li>claude-opus-4</li>
            <li>gpt-4</li>
            <li>gpt-4-turbo</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// بدء السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 Proxy يعمل على المنفذ ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});
