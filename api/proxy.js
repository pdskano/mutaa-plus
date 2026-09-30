export default async function handler(req, res) {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                // Mimic a generic player user-agent to bypass some basic server blocks
                'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16', 
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Essential CORS headers to allow the browser to consume the stream
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Check if the response is a playlist or API response that needs URL rewriting
        if (targetUrl.includes('.m3u8') || targetUrl.includes('get.php') || targetUrl.includes('player_api.php') || (contentType && contentType.includes('application/vnd.apple.mpegurl'))) {
            let text = await response.text();
            
            // If the response is JSON (like the channel list), send it directly
            if(text.trim().startsWith('[') || text.trim().startsWith('{')) {
                return res.status(200).send(text);
            }

            const baseUrl = new URL(targetUrl);
            
            // Rewrite URLs inside the m3u8 playlist to also point to our proxy
            const rewrittenText = text.split('\n').map(line => {
                line = line.trim();
                // Ignore comments and empty lines
                if (line.startsWith('#') || line === '') return line;
                
                let absoluteUrl = line;
                // If the URL in the playlist is relative, resolve it against the base URL
                if (!line.startsWith('http')) {
                    absoluteUrl = new URL(line, baseUrl.href).href;
                }
                
                // Wrap the absolute URL with our proxy
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            }).join('\n');
            
            return res.status(200).send(rewrittenText);
        } else {
            // For binary data (like .ts video segments), stream it directly
            const buffer = await response.arrayBuffer();
            return res.status(200).send(Buffer.from(buffer));
        }
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).send('Error fetching stream');
    }
}
