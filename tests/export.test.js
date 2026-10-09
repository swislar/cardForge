const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createMockDom() {
  const elements = {};
  const listeners = {};

  function makeEl(id, tagName = 'div') {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      className: '',
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(' '); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(' '); },
        contains(c) { return this.classes.has(c); }
      },
      textContent: '',
      innerHTML: '',
      style: {
        setProperty(k, v) { this[k] = v; }
      },
      disabled: false,
      children: [],
      appendChild(ch) { this.children.push(ch); return ch; },
      removeChild(ch) {
        const i = this.children.indexOf(ch);
        if (i !== -1) this.children.splice(i, 1);
        return ch;
      },
      addEventListener(evt, handler) {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push({ el, handler });
      },
      click() {
        const list = listeners['click'] || [];
        list.forEach(entry => {
          if (entry.el === el) entry.handler({ preventDefault() {} });
        });
      }
    };
    elements[id] = el;
    return el;
  }

  const card = makeEl('card');
  const downloadBtn = makeEl('download-btn', 'button');

  const document = {
    getElementById(id) { return elements[id] || null; },
    createElement(tag) { return makeEl(`el-${Math.random()}`, tag); },
    body: makeEl('body'),
    addEventListener() {}
  };

  const window = {
    document,
    AppState: { title: 'Alex Wonder' },
    hidePopoverCalled: false,
    hidePopover() { this.hidePopoverCalled = true; },
    setTimeout
  };

  return { elements, document, window };
}

test('export.js binds to download button and exposes exportCardAsPng', async () => {
  const { elements, window } = createMockDom();

  let html2canvasCalled = false;
  window.html2canvas = function(el, options) {
    html2canvasCalled = true;
    assert.equal(el, elements['card']);
    assert.equal(options.scale, 2);
    return Promise.resolve({
      toDataURL() { return 'data:image/png;base64,mock'; }
    });
  };

  const exportCode = fs.readFileSync('./js/export.js', 'utf8');
  const context = { window, document: window.document, setTimeout, ...window };
  vm.createContext(context);
  vm.runInContext(exportCode, context);

  assert.equal(typeof window.exportCardAsPng, 'function');

  // Trigger export via async call
  await window.exportCardAsPng();
  assert.equal(window.hidePopoverCalled, true, 'hidePopover should be called before export');
  assert.equal(html2canvasCalled, true, 'html2canvas should be invoked');
});
