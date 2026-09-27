import { describe, expect, it } from 'vitest';
import { detect } from '../src/engine/detector';
import { esc, highlight } from '../src/ui/highlight';

describe('highlight', () => {
  it('escapes HTML', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    expect(highlight('<img onerror=x>', [])).toBe('&lt;img onerror=x&gt;');
  });
  it('marks evidence spans with tactic classes', () => {
    const text = 'Buy gift cards right now';
    const html = highlight(text, detect(text, 'caller'));
    expect(html).toContain('<mark class="tac-payment"');
    expect(html).toContain('<mark class="tac-urgency"');
  });
  it('marks good and bad user moves', () => {
    expect(highlight('No, goodbye', detect('No, goodbye', 'user'))).toContain('class="good"');
    const t = 'Okay, I will buy them';
    expect(highlight(t, detect(t, 'user'))).toContain('class="bad"');
  });
});
