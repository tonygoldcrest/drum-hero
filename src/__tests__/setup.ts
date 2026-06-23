import '@testing-library/jest-dom/vitest';

const POPOVER_OPEN_ATTR = 'data-test-popover-open';

if (typeof HTMLElement.prototype.showPopover !== 'function') {
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.setAttribute(POPOVER_OPEN_ATTR, '');
  };
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    this.removeAttribute(POPOVER_OPEN_ATTR);
  };
  HTMLElement.prototype.togglePopover = function togglePopover(
    this: HTMLElement,
  ) {
    if (this.hasAttribute(POPOVER_OPEN_ATTR)) {
      this.removeAttribute(POPOVER_OPEN_ATTR);
    } else {
      this.setAttribute(POPOVER_OPEN_ATTR, '');
    }

    return this.hasAttribute(POPOVER_OPEN_ATTR);
  };

  const originalMatches = Element.prototype.matches;

  Element.prototype.matches = function matches(
    this: Element,
    selector: string,
  ) {
    if (selector === ':popover-open') {
      return this.hasAttribute(POPOVER_OPEN_ATTR);
    }

    return originalMatches.call(this, selector);
  };
}

if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = () => {};
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}
