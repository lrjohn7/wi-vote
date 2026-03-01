import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricToggle } from './MetricToggle';
import { useMapStore } from '@/stores/mapStore';

describe('MetricToggle', () => {
  beforeEach(() => {
    useMapStore.setState({ displayMetric: 'margin' });
  });

  it('renders all four metric buttons', () => {
    render(<MetricToggle />);
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('Dem %')).toBeInTheDocument();
    expect(screen.getByText('Rep %')).toBeInTheDocument();
    expect(screen.getByText('Votes')).toBeInTheDocument();
  });

  it('marks the active metric as pressed', () => {
    render(<MetricToggle />);
    const marginBtn = screen.getByText('Margin');
    expect(marginBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Dem %')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a button updates the store metric', async () => {
    const user = userEvent.setup();
    render(<MetricToggle />);

    await user.click(screen.getByText('Dem %'));
    expect(useMapStore.getState().displayMetric).toBe('demPct');

    await user.click(screen.getByText('Rep %'));
    expect(useMapStore.getState().displayMetric).toBe('repPct');

    await user.click(screen.getByText('Votes'));
    expect(useMapStore.getState().displayMetric).toBe('totalVotes');

    await user.click(screen.getByText('Margin'));
    expect(useMapStore.getState().displayMetric).toBe('margin');
  });

  it('has an accessible group role', () => {
    render(<MetricToggle />);
    const group = screen.getByRole('group', { name: /map display metric/i });
    expect(group).toBeInTheDocument();
  });
});
