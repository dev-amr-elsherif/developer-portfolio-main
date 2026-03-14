export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    try {
        // 1. فصل تعليمات النظام (الشخصية اللي هيرد بيها)
        const systemMessage = messages.find(m => m.role === 'system');
        
        // 2. تحويل رسائل الشات لصيغة Gemini
        const geminiContents = messages
            .filter(m => m.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        const requestBody = {
            contents: geminiContents,
        };

        if (systemMessage) {
            requestBody.systemInstruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        // 3. إرسال الطلب لـ Gemini 1.5 Flash (سريع جداً وممتاز للشات)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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

        // 4. استخراج النص من رد Gemini
        const replyText = data.candidates[0].content.parts[0].text;

        // 5. إرجاع الرد بنفس الصيغة اللي واجهة الموقع متوقعاها
        return res.status(200).json({
            choices: [{
                message: {
                    content: replyText
                }
            }]
        });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}