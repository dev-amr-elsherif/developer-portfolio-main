export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });

    try {
        const systemMessage = messages.find(m => m.role === 'system');
        
        // تنظيف الرسائل لضمان التبادل (User -> Model)
        let lastRole = '';
        const geminiContents = messages
            .filter(m => m.role !== 'system')
            .map(msg => {
                const currentRole = msg.role === 'assistant' ? 'model' : 'user';
                if (currentRole === lastRole) return null;
                lastRole = currentRole;
                return {
                    role: currentRole,
                    parts: [{ text: msg.content }]
                };
            })
            .filter(Boolean);

        const requestBody = {
            contents: geminiContents
        };

        // إضافة تعليمات النظام - دي اللي كانت بتعمل Error في النسخة القديمة
        if (systemMessage) {
            requestBody.system_instruction = { // تأكد من استخدام v1beta مع هذا الهيكل
                parts: [{ text: systemMessage.content }]
            };
        }

        // الرابط الصحيح لنسخة v1beta مع الموديل
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || 'Gemini API Error',
                details: data.error
            });
        }

        const replyText = data.candidates[0].content.parts[0].text;
        
        return res.status(200).json({
            choices: [{
                message: { role: "assistant", content: replyText }
            }]
        });

    } catch (error) {
        return res.status(500).json({ error: 'Server Error', details: error.message });
    }
}