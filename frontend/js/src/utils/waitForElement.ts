/* eslint-disable import/prefer-default-export */

// Checks for the element using mutation observer before starting the joyride
export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;

    function waitForLayout(el: Element) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        requestAnimationFrame(() => resolve(el));
        return;
      }
      if (Date.now() >= deadline) {
        resolve(el);
        return;
      }
      requestAnimationFrame(() => waitForLayout(el));
    }

    const existing = document.querySelector(selector);
    if (existing) {
      waitForLayout(existing);
      return;
    }

    const timer = window.setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(`waitForElement: "${selector}" not found within ${timeout}ms`)
      );
    }, timeout);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        waitForLayout(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
