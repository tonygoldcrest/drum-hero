import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KIT_ELEMENTS } from '../../constants';
import { Reference } from './Reference';

describe('Reference', () => {
  it('lists every kit element by its display name', () => {
    const { getByText } = render(<Reference />);

    KIT_ELEMENTS.forEach((element) => {
      expect(getByText(element.displayName)).toBeInTheDocument();
    });
  });

  it('colors each element icon with its kit color', () => {
    const { container } = render(<Reference />);
    const colors = Array.from(container.querySelectorAll('svg')).map((svg) =>
      svg.getAttribute('color'),
    );

    KIT_ELEMENTS.forEach((element) => {
      expect(colors).toContain(element.color);
    });
  });

  it('forwards a custom class name onto the root', () => {
    const { container } = render(<Reference className="fixed bottom-10" />);

    expect(container.firstElementChild?.className).toContain('fixed');
    expect(container.firstElementChild?.className).toContain('bottom-10');
  });
});
