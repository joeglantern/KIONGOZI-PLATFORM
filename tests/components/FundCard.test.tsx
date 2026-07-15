/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import FundCard from '@/components/social/FundCard';

// next/link needs the App Router context at runtime; stub it to a plain anchor.
vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={String(href)}>{children}</a>,
}));

afterEach(cleanup);

const fund = {
  id: 'f1',
  title: 'County Youth Fund',
  status: 'active',
  sector: 'Education',
  managing_body: 'County Government',
  description: 'Supports youth programs across the county.',
  total_amount: 1_000_000,
  amount_disbursed: 250_000,
  currency: 'KES',
};

describe('FundCard', () => {
  it('renders the fund title, sector, and status', () => {
    render(<FundCard fund={fund} />);
    expect(screen.getByText('County Youth Fund')).toBeTruthy();
    expect(screen.getByText('Education')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('links the title to the fund detail page', () => {
    render(<FundCard fund={fund} />);
    const link = screen.getByRole('link', { name: 'County Youth Fund' });
    expect(link.getAttribute('href')).toBe('/community/funds/f1');
  });
});
