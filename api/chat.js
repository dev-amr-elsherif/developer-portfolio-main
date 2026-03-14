export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages } = req.body;
    // تأكد أن اسم المتغير في الـ .env هو GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        // 1. استخراج تعليمات النظام (System Instruction) لو موجودة
        const systemMessage = messages.find(m => m.role === 'system');
        
        // 2. تحويل الرسائل لصيغة Gemini (user/model)
        const geminiContents = messages
            .filter(m => m.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        const requestBody = {
            contents: geminiContents
        };

        // إضافة تعليمات النظام إذا وجدت
        if (systemMessage) {
            requestBody.systemInstruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        // 3. الطلب من API جيميني
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch from Gemini');
        }

        // 4. استخراج النص وإرجاعه بنفس صيغة الـ OpenAI عشان متعدلش كتير في الـ Frontend
        const replyText = data.candidates[0].content.parts[0].text;

        return res.status(200).json({
            choices: [{
                message: {
                    role: "assistant",
                    content: replyText
                }
            }]
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}