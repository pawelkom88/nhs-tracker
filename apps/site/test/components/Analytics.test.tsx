import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Analytics } from '../../src/components/Analytics';

describe('Analytics component', () => {
  const originalEnv = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN = originalEnv;
  });

  it('renders nothing when NEXT_PUBLIC_CF_ANALYTICS_TOKEN is not set', () => {
    const { container } = render(<Analytics />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when NEXT_PUBLIC_CF_ANALYTICS_TOKEN is empty string', () => {
    process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN = '';
    const { container } = render(<Analytics />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Cloudflare Web Analytics beacon script when token is set', () => {
    process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN = 'test-token-123';
    const { container } = render(<Analytics />);
    const script = container.querySelector('script');

    expect(script).not.toBeNull();
    expect(script?.getAttribute('src')).toBe('https://static.cloudflareinsights.com/beacon.min.js');
    expect(script?.hasAttribute('defer')).toBe(true);
    expect(script?.getAttribute('data-cf-beacon')).toBe(
      JSON.stringify({ token: 'test-token-123' }),
    );
  });
});
