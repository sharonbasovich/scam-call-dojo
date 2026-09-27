import { describe, expect, it } from 'vitest';
import { DEAPI_BASE, DeapiError, deapiSpeech, deapiTranscribe } from '../src/voice/deapi';

type Call = { url: string; init: RequestInit };

function mockFetch(response: Response, calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response;
  }) as typeof fetch;
}

describe('deAPI adapter', () => {
  it('sends an OpenAI-compatible speech request with a preset Kokoro voice', async () => {
    const calls: Call[] = [];
    const blob = await deapiSpeech('k', 'hello', 'af_nova', 1, mockFetch(new Response(new Blob(['mp3']), { status: 200 }), calls));
    expect(blob.size).toBeGreaterThan(0);
    expect(calls[0].url).toBe(`${DEAPI_BASE}/audio/speech`);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer k');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ model: 'Kokoro', voice: 'af_nova', input: 'hello', response_format: 'mp3', speed: 1 });
  });

  it('uploads audio for transcription and returns text', async () => {
    const calls: Call[] = [];
    const text = await deapiTranscribe('k', new Blob(['x'], { type: 'audio/webm' }), mockFetch(Response.json({ text: ' no thanks ' }), calls));
    expect(text).toBe('no thanks');
    expect(calls[0].url).toBe(`${DEAPI_BASE}/audio/transcriptions`);
    const form = calls[0].init.body as FormData;
    expect(form.get('model')).toBe('WhisperLargeV3');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('surfaces API error messages', async () => {
    const res = Response.json({ error: { message: 'Invalid token', code: 'unauthorized' } }, { status: 401 });
    await expect(deapiSpeech('bad', 'hi', 'af_nova', 1, mockFetch(res, []))).rejects.toThrow(DeapiError);
  });
});
