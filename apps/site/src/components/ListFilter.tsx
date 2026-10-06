'use client';

import React, { useId, useEffect, useMemo, useRef, useState } from 'react';
import { IntlMessageFormat } from 'intl-messageformat';
import filterMessages from '../../messages/en/filter.json';

export interface ListFilterProps {
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  children: React.ReactNode;
}

export function ListFilter({
  id: customId,
  label,
  placeholder,
  className,
  children,
}: ListFilterProps) {
  const generatedId = useId();
  const baseId = customId ?? `list-filter-${generatedId.replace(/:/g, '')}`;
  const inputId = `${baseId}-input`;
  const contentId = `${baseId}-content`;

  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<{ shown: number; total: number }>({ shown: 0, total: 0 });

  const contentRef = useRef<HTMLDivElement>(null);

  const statusFormatter = useMemo(() => new IntlMessageFormat(filterMessages.status, 'en-GB'), []);

  // Mark mounted after client hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter items whenever query changes or on initial mount
  useEffect(() => {
    if (!mounted || !contentRef.current) {
      return;
    }

    const container = contentRef.current;
    const explicitItems = Array.from(container.querySelectorAll<HTMLElement>('[data-filter-text]'));
    const items =
      explicitItems.length > 0
        ? explicitItems
        : Array.from(container.querySelectorAll<HTMLElement>('li'));

    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let visibleCount = 0;

    for (const item of items) {
      const explicit = item.getAttribute('data-filter-text');
      const text = (explicit ?? item.textContent).toLowerCase();
      const matches = terms.every((term) => text.includes(term));
      item.hidden = !matches;
      if (matches) {
        visibleCount += 1;
      }
    }

    // Hide empty group containers if all their child items are hidden
    const groups = Array.from(
      container.querySelectorAll<HTMLElement>('section, [data-filter-group]'),
    );
    for (const group of groups) {
      const groupItems = Array.from(
        group.querySelectorAll<HTMLElement>('[data-filter-text], li'),
      ).filter((el) => items.includes(el));
      if (groupItems.length > 0) {
        const hasVisible = groupItems.some((el) => !el.hidden);
        group.hidden = !hasVisible;
      }
    }

    setCounts({
      shown: visibleCount,
      total: items.length,
    });
  }, [mounted, query]);

  const statusText = statusFormatter.format({
    shown: counts.shown,
    total: counts.total,
  }) as string;

  return (
    <div className={className}>
      {mounted && (
        <div className="filter-controls">
          <label htmlFor={inputId}>{label ?? filterMessages.label}</label>
          <input
            id={inputId}
            type="search"
            role="searchbox"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder={placeholder ?? filterMessages.placeholder}
            aria-controls={contentId}
            autoComplete="off"
            spellCheck={false}
          />
          <div role="status" aria-live="polite" className="filter-status">
            {statusText}
          </div>
        </div>
      )}
      <div id={contentId} ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
