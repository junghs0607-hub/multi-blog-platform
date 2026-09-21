const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';
const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_CONTEXT = {
    client: {
        clientName: 'ANDROID',
        clientVersion: INNERTUBE_CLIENT_VERSION,
    },
};
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

export interface TranscriptResponse {
    text: string;
    duration: number;
    offset: number;
    lang?: string;
}

export class YoutubeTranscript {
    static async fetchTranscript(videoId: string): Promise<TranscriptResponse[]> {
        const identifier = this.retrieveVideoId(videoId);
        const innerTubeResult = await this.fetchViaInnerTube(identifier);
        if (innerTubeResult) return innerTubeResult;
        return this.fetchViaWebPage(identifier, videoId);
    }

    private static async fetchViaInnerTube(identifier: string) {
        try {
            const resp = await fetch(INNERTUBE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': INNERTUBE_USER_AGENT,
                },
                body: JSON.stringify({
                    context: INNERTUBE_CONTEXT,
                    videoId: identifier,
                }),
            });
            if (!resp.ok) return undefined;
            const data = await resp.json();
            const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!Array.isArray(captionTracks) || captionTracks.length === 0) return undefined;
            return this.fetchTranscriptFromTracks(captionTracks, identifier);
        } catch {
            return undefined;
        }
    }

    private static async fetchViaWebPage(identifier: string, originalVideoId: string) {
        const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${identifier}`, {
            headers: { 'User-Agent': USER_AGENT },
        });
        const videoPageBody = await videoPageResponse.text();
        if (videoPageBody.includes('class="g-recaptcha"')) throw new Error('Too many requests');
        if (!videoPageBody.includes('"playabilityStatus":')) throw new Error('Video unavailable');
        
        const playerResponse = this.parseInlineJson(videoPageBody, 'ytInitialPlayerResponse');
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!Array.isArray(captionTracks) || captionTracks.length === 0) throw new Error('Transcript disabled');
        return this.fetchTranscriptFromTracks(captionTracks, originalVideoId);
    }

    private static parseInlineJson(html: string, globalName: string) {
        const startToken = `var ${globalName} = `;
        const startIndex = html.indexOf(startToken);
        if (startIndex === -1) return null;
        const jsonStart = startIndex + startToken.length;
        let depth = 0;
        for (let i = jsonStart; i < html.length; i++) {
            if (html[i] === '{') depth++;
            else if (html[i] === '}') {
                depth--;
                if (depth === 0) {
                    try { return JSON.parse(html.slice(jsonStart, i + 1)); }
                    catch { return null; }
                }
            }
        }
        return null;
    }

    private static async fetchTranscriptFromTracks(captionTracks: any[], videoId: string) {
        const track = captionTracks[0];
        const transcriptURL = track.baseUrl;
        try {
            const captionUrl = new URL(transcriptURL);
            if (!captionUrl.hostname.endsWith('.youtube.com')) throw new Error('Invalid URL');
        } catch (e) {
            throw new Error('Not available');
        }
        
        const transcriptResponse = await fetch(transcriptURL, {
            headers: { 'User-Agent': USER_AGENT },
        });
        if (!transcriptResponse.ok) throw new Error('Not available');
        const transcriptBody = await transcriptResponse.text();
        return this.parseTranscriptXml(transcriptBody, captionTracks[0].languageCode);
    }

    private static parseTranscriptXml(xml: string, lang: string) {
        const results: TranscriptResponse[] = [];
        const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
        let match;
        while ((match = pRegex.exec(xml)) !== null) {
            const startMs = parseInt(match[1], 10);
            const durMs = parseInt(match[2], 10);
            const inner = match[3];
            let text = '';
            const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
            let sMatch;
            while ((sMatch = sRegex.exec(inner)) !== null) { text += sMatch[1]; }
            if (!text) text = inner.replace(/<[^>]+>/g, '');
            text = this.decodeEntities(text).trim();
            if (text) results.push({ text, duration: durMs, offset: startMs, lang });
        }
        if (results.length > 0) return results;

        const classicResults = [...xml.matchAll(RE_XML_TRANSCRIPT)];
        return classicResults.map((result) => ({
            text: this.decodeEntities(result[3]),
            duration: parseFloat(result[2]),
            offset: parseFloat(result[1]),
            lang,
        }));
    }

    private static decodeEntities(text: string) {
        return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
            .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
            .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
    }

    private static retrieveVideoId(videoId: string) {
        if (videoId.length === 11) return videoId;
        const matchId = videoId.match(RE_YOUTUBE);
        if (matchId && matchId.length) return matchId[1];
        throw new Error('Impossible to retrieve Youtube video ID.');
    }
}
