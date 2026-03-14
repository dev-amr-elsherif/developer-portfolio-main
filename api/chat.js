export default async function handler(req, res) {
    // 1. التأكد من أن الطلب POST فقط
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 2. التحقق من وجود مفتاح الـ API
    if (!apiKey) {
        return res.status(500).json({ error: 'Server Configuration Error: API Key is missing.' });
    }

    try {
        // 3. فصل تعليمات النظام (System Instructions)
        const systemMessage = messages.find(m => m.role === 'system');
        
        // 4. تجهيز وتنظيف الرسائل لـ Gemini
        // Gemini يرفض وجود رسالتين من نفس النوع ورا بعض (مثل user ثم user)
        let lastRole = '';
        const geminiContents = messages
            .filter(m => m.role !== 'system')
            .map(msg => {
                const currentRole = msg.role === 'assistant' ? 'model' : 'user';
                if (currentRole === lastRole) return null; // تخطي الرسائل المتكررة في الدور
                lastRole = currentRole;
                return {
                    role: currentRole,
                    parts: [{ text: msg.content }]
                };
            })
            .filter(Boolean); // حذف الـ nulls

        const requestBody = {
            contents: geminiContents,
        };

        // إضافة تعليمات الشخصية (Sherif)
        if (systemMessage) {
            requestBody.systemInstruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        // 5. إرسال الطلب لـ Google Gemini API (v1 Stable)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // 6. التعامل مع أخطاء الـ API من جوجل
        if (!response.ok) {
            console.error('Gemini API Error Response:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Failed to fetch from Gemini' 
            });
        }

        // 7. استخراج الرد وإرجاعه بصيغة OpenAI Schema ليتوافق مع الـ Frontend عندك
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const replyText = data.candidates[0].content.parts[0].text;
            
            return res.status(200).json({
                choices: [{
                    message: {
                        role: "assistant",
                        content: replyText
                    }
                }]
            });
        } else {
            throw new Error('Empty response from Gemini API');
        }

    } catch (error) {
        console.error('Full Server Error:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message 
        });
    }
}