export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    try {
        // 1. استخراج تعليمات النظام
        const systemMessage = messages.find(m => m.role === 'system');
        
        // 2. تجهيز المحادثة بصيغة تقبلها كل نسخ Gemini
        let geminiContents = messages
            .filter(m => m.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // 3. لو فيه تعليمات نظام، هنحطها في أول رسالة User عشان نضمن إن الموديل يلقطها
        if (systemMessage && geminiContents.length > 0) {
            geminiContents[0].parts[0].text = `Instructions: ${systemMessage.content}\n\nUser Message: ${geminiContents[0].parts[0].text}`;
        }

        // 4. الرابط المستقر (Stable URL)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: geminiContents })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'API Error' });
        }

        const replyText = data.candidates[0].content.parts[0].text;
        
        return res.status(200).json({
            choices: [{ message: { role: "assistant", content: replyText } }]
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}