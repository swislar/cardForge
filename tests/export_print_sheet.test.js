const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('index.html contains print sheet and individual face download buttons', () => {
  const html = fs.readFileSync('./index.html', 'utf8');

  assert.match(html, /id=["']download-sheet-btn["']/, 'download-sheet-btn must exist');
  assert.match(html, /id=["']download-front-btn["']/, 'download-front-btn must exist');
  assert.match(html, /id=["']download-back-btn["']/, 'download-back-btn must exist');
});

function createExportMockDom() {
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

  const cardFront = makeEl('card-front');
  const cardBack = makeEl('card-back');
  const cardFlipper = makeEl('card-flipper');
  const downloadBtn = makeEl('download-btn', 'button');
  const downloadSheetBtn = makeEl('download-sheet-btn', 'button');
  const downloadFrontBtn = makeEl('download-front-btn', 'button');
  const downloadBackBtn = makeEl('download-back-btn', 'button');

  const createdCanvases = [];
  const document = {
    getElementById(id) { return elements[id] || null; },
    createElement(tag) {
      if (tag === 'canvas') {
        const canvas = makeEl(`canvas-${Math.random()}`, 'canvas');
        canvas.width = 0;
        canvas.height = 0;
        canvas.toDataURL = function() { return 'data:image/png;base64,mockCanvas'; };
        canvas.getContext = function() {
          return {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '',
            textAlign: '',
            textBaseline: '',
            fillRect() {},
            strokeRect() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            stroke() {},
            fillText() {},
            setLineDash() {},
            drawImage() {}
          };
        };
        createdCanvases.push(canvas);
        return canvas;
      }
      return makeEl(`el-${Math.random()}`, tag);
    },
    body: makeEl('body'),
    addEventListener() {}
  };

  const window = {
    document,
    AppState: { title: 'Alex Wonder', isFlipped: false },
    hidePopoverCalled: false,
    hidePopover() { this.hidePopoverCalled = true; },
    setTimeout
  };

  return { elements, document, window, createdCanvases };
}

test('export.js exposes exportPrintSheet and exportCardAsPng with face selection', async () => {
  const { elements, window } = createExportMockDom();

  const capturedElements = [];
  window.html2canvas = function(el, options) {
    capturedElements.push({ el, options });
    return Promise.resolve({
      width: 700,
      height: 980,
      toDataURL() { return 'data:image/png;base64,mockFace'; }
    });
  };

  const exportCode = fs.readFileSync('./js/export.js', 'utf8');
  const context = { window, document: window.document, setTimeout, ...window };
  vm.createContext(context);
  vm.runInContext(exportCode, context);

  assert.equal(typeof window.exportPrintSheet, 'function', 'exportPrintSheet must be a function');
  assert.equal(typeof window.exportCardAsPng, 'function', 'exportCardAsPng must be a function');

  // 1. Test exportPrintSheet captures both front and back
  await window.exportPrintSheet();
  assert.equal(window.hidePopoverCalled, true, 'hidePopover called');
  assert.equal(capturedElements.length, 2, 'both card faces captured');
  assert.equal(capturedElements[0].el, elements['card-front'], 'front captured first');
  assert.equal(capturedElements[1].el, elements['card-back'], 'back captured second');

  // 2. Test exportCardAsPng('back') captures card-back
  capturedElements.length = 0;
  await window.exportCardAsPng('back');
  assert.equal(capturedElements.length, 1);
  assert.equal(capturedElements[0].el, elements['card-back']);
});
