export default async function handler(req, res) {
    const targetUrl = req.query.url;

    // التأكد من وجود الرابط المطلوب
    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        // الاتصال بسيرفر IPTV نيابة عن المستخدم
        const response = await fetch(targetUrl, {
            headers: {
                // استخدام User-Agent وهمي لأن بعض السيرفرات تحظر المتصفحات
                'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16', 
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // إخبار المتصفح بأن هذا الرابط آمن ومصرح به (CORS)
        res.setHeader('Access-Control-Allow-Origin', '*');
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // إذا كان الملف هو قائمة تشغيل (m3u8)، يجب أن نعدل الروابط بداخله
        if (targetUrl.includes('.m3u8') || targetUrl.includes('get.php')) {
            let text = await response.text();
            
            // استخراج الرابط الأساسي للسيرفر
            const baseUrl = new URL(targetUrl);
            
            const rewrittenText = text.split('\n').map(line => {
                line = line.trim();
                // تجاهل الأسطر الخاصة بإعدادات الفيديو
                if (line.startsWith('#') || line === '') return line;
                
                // إذا كان السطر عبارة عن رابط فيديو، نقوم بتغليفه مرة أخرى في البروكسي
                let absoluteUrl = line;
                if (!line.startsWith('http')) {
                    absoluteUrl = new URL(line, baseUrl.href).href;
                }
                
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');
            
            return res.status(200).send(rewrittenText);
        } 
        // إذا كان الملف عبارة عن جزء من الفيديو (.ts)، نرسله مباشرة
        else {
            const buffer = await response.arrayBuffer();
            return res.status(200).send(Buffer.from(buffer));
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).send('Error fetching stream from IPTV server');
    }
}