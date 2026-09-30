export default async function handler(req, res) {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16', 
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        if (targetUrl.includes('.m3u8') || targetUrl.includes('get.php') || targetUrl.includes('player_api.php')) {
            let text = await response.text();
            
            // إذا كان الرد عبارة عن JSON (قائمة قنوات)، نرسله كما هو
            if(text.trim().startsWith('[') || text.trim().startsWith('{')) {
                return res.status(200).send(text);
            }

            const baseUrl = new URL(targetUrl);
            const rewrittenText = text.split('\n').map(line => {
                line = line.trim();
                if (line.startsWith('#') || line === '') return line;
                
                let absoluteUrl = line;
                if (!line.startsWith('http')) {
                    absoluteUrl = new URL(line, baseUrl.href).href;
                }
                
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');
            
            return res.status(200).send(rewrittenText);
        } else {
            const buffer = await response.arrayBuffer();
            return res.status(200).send(Buffer.from(buffer));
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).send('Error fetching stream');
    }
}
