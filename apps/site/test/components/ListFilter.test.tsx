import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ListFilter } from '../../src/components/ListFilter';

afterEach(() => {
  cleanup();
});

describe('ListFilter (T-8.10 / ADR-0007)', () => {
  test('SSR output contains no <input> or search controls, only children', () => {
    const ssrHtml = renderToString(
      <ListFilter id="test-filter">
        <ul>
          <li data-filter-text="cataract ophthalmology">Ophthalmology</li>
          <li data-filter-text="hip knee trauma orthopaedics">Trauma & Orthopaedics</li>
        </ul>
      </ListFilter>,
    );

    expect(ssrHtml).not.toContain('<input');
    expect(ssrHtml).not.toContain('<label');
    expect(ssrHtml).not.toContain('role="searchbox"');
    expect(ssrHtml).toContain('Ophthalmology');
    expect(ssrHtml).toContain('Trauma &amp; Orthopaedics');
  });

  test('renders search input, label, and live region after client mount', () => {
    render(
      <ListFilter id="specialty-filter">
        <ul>
          <li data-filter-text="cataract eye ophthalmology">Ophthalmology</li>
          <li data-filter-text="knee hip trauma orthopaedics">Trauma & Orthopaedics</li>
          <li data-filter-text="skin dermatology">Dermatology</li>
        </ul>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('search');
    expect(input.getAttribute('id')).toBe('specialty-filter-input');
    expect(input.getAttribute('aria-controls')).toBe('specialty-filter-content');

    const label = screen.getByText('Filter this list');
    expect(label.getAttribute('for')).toBe('specialty-filter-input');

    const liveRegion = screen.getByRole('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.textContent).toBe('3 of 3 shown');
  });

  test('filters by substring on single word and toggles hidden attribute', () => {
    const { container } = render(
      <ListFilter>
        <ul>
          <li data-filter-text="cataract eye ophthalmology">Ophthalmology</li>
          <li data-filter-text="knee hip trauma orthopaedics">Trauma & Orthopaedics</li>
          <li data-filter-text="skin dermatology eczema">Dermatology</li>
        </ul>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');
    const items = container.querySelectorAll('li');

    fireEvent.change(input, { target: { value: 'cataract' } });

    expect(items[0]?.hidden).toBe(false);
    expect(items[1]?.hidden).toBe(true);
    expect(items[2]?.hidden).toBe(true);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion.textContent).toBe('1 of 3 shown');
  });

  test('filters by substring on all words (multi-term search)', () => {
    const { container } = render(
      <ListFilter>
        <ul>
          <li data-filter-text="knee hip trauma orthopaedics surgery">Trauma Surgery</li>
          <li data-filter-text="trauma brain neurology">Neurological Trauma</li>
          <li data-filter-text="knee replacement orthopaedics">Orthopaedics (General)</li>
        </ul>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');
    const items = container.querySelectorAll('li');

    fireEvent.change(input, { target: { value: 'trauma knee' } });

    expect(items[0]?.hidden).toBe(false); // contains both "trauma" and "knee"
    expect(items[1]?.hidden).toBe(true); // contains "trauma", missing "knee"
    expect(items[2]?.hidden).toBe(true); // contains "knee", missing "trauma"

    const liveRegion = screen.getByRole('status');
    expect(liveRegion.textContent).toBe('1 of 3 shown');
  });

  test('preserves DOM order exactly (never reorders or ranks elements)', () => {
    const { container } = render(
      <ListFilter>
        <ul id="test-list">
          <li id="item-a" data-filter-text="cardiology heart">
            Cardiology
          </li>
          <li id="item-b" data-filter-text="cataract ophthalmology">
            Ophthalmology
          </li>
          <li id="item-c" data-filter-text="cardio thoracic surgery">
            Thoracic Surgery
          </li>
        </ul>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');

    // Filter to subset
    fireEvent.change(input, { target: { value: 'cardio' } });

    const itemsAfterFilter = Array.from(container.querySelectorAll('li'));
    expect(itemsAfterFilter.map((el) => el.id)).toEqual(['item-a', 'item-b', 'item-c']);
    expect(itemsAfterFilter[0]?.hidden).toBe(false);
    expect(itemsAfterFilter[1]?.hidden).toBe(true);
    expect(itemsAfterFilter[2]?.hidden).toBe(false);

    // Clear filter
    fireEvent.change(input, { target: { value: '' } });

    const itemsAfterClear = Array.from(container.querySelectorAll('li'));
    expect(itemsAfterClear.map((el) => el.id)).toEqual(['item-a', 'item-b', 'item-c']);
    expect(itemsAfterClear.every((el) => !el.hidden)).toBe(true);
  });

  test('hides empty group sections when all child items are hidden', () => {
    const { container } = render(
      <ListFilter>
        <section id="group-london">
          <h2>London</h2>
          <ul>
            <li data-filter-text="guy's st thomas london trust">Guy's and St Thomas'</li>
            <li data-filter-text="king's college london hospital">King's College Hospital</li>
          </ul>
        </section>
        <section id="group-midlands">
          <h2>Midlands</h2>
          <ul>
            <li data-filter-text="university hospitals birmingham">Birmingham Hospitals</li>
          </ul>
        </section>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');
    const londonSection = container.querySelector('#group-london');
    const midlandsSection = container.querySelector('#group-midlands');

    expect(londonSection).not.toBeNull();
    expect(midlandsSection).not.toBeNull();
    expect(londonSection?.hasAttribute('hidden')).toBe(false);
    expect(midlandsSection?.hasAttribute('hidden')).toBe(false);

    // Filter to Birmingham only
    fireEvent.change(input, { target: { value: 'birmingham' } });

    expect(londonSection?.hasAttribute('hidden')).toBe(true);
    expect(midlandsSection?.hasAttribute('hidden')).toBe(false);

    // Filter to London only
    fireEvent.change(input, { target: { value: 'thomas' } });

    expect(londonSection?.hasAttribute('hidden')).toBe(false);
    expect(midlandsSection?.hasAttribute('hidden')).toBe(true);
  });

  test('falls back to element textContent when data-filter-text attribute is omitted', () => {
    const { container } = render(
      <ListFilter>
        <ul>
          <li>Cardiology Services</li>
          <li>Ophthalmology Eye Care</li>
        </ul>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');
    const items = container.querySelectorAll('li');

    fireEvent.change(input, { target: { value: 'ophthalmology' } });

    expect(items[0]?.hidden).toBe(true);
    expect(items[1]?.hidden).toBe(false);
  });

  test('updates live region to 0 of N when no items match', () => {
    render(
      <ListFilter>
        <ul>
          <li data-filter-text="alpha">Alpha</li>
          <li data-filter-text="beta">Beta</li>
        </ul>
      </ListFilter>,
    );

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'gamma' } });

    const liveRegion = screen.getByRole('status');
    expect(liveRegion.textContent).toBe('0 of 2 shown');
  });
});
