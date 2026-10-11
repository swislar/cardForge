const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("index.html contains print sheet and individual face download buttons", () => {
    const html = fs.readFileSync("./index.html", "utf8");

    assert.match(
        html,
        /id=["']download-sheet-btn["']/,
        "download-sheet-btn must exist",
    );
    assert.match(
        html,
        /id=["']download-front-btn["']/,
        "download-front-btn must exist",
    );
    assert.match(
        html,
        /id=["']download-back-btn["']/,
        "download-back-btn must exist",
    );
});

function createExportMockDom() {
    const elements = {};
    const listeners = {};

    function makeEl(id, tagName = "div") {
        const el = {
            id,
            tagName: tagName.toUpperCase(),
            className: "",
            classList: {
                classes: new Set(),
                add(c) {
                    this.classes.add(c);
                    el.className = Array.from(this.classes).join(" ");
                },
                remove(c) {
                    this.classes.delete(c);
                    el.className = Array.from(this.classes).join(" ");
                },
                contains(c) {
                    return this.classes.has(c);
                },
            },
            textContent: "",
            innerHTML: "",
            style: {
                cssText: "",
                setProperty(k, v) {
                    this[k] = v;
                },
            },
            parentNode: null,
            parentElement: null,
            nextSibling: null,
            disabled: false,
            children: [],
            appendChild(ch) {
                this.children.push(ch);
                ch.parentNode = this;
                ch.parentElement = this;
                return ch;
            },
            insertBefore(ch, ref) {
                const i = ref ? this.children.indexOf(ref) : -1;
                if (i === -1) this.children.push(ch);
                else this.children.splice(i, 0, ch);
                ch.parentNode = this;
                ch.parentElement = this;
                return ch;
            },
            removeChild(ch) {
                const i = this.children.indexOf(ch);
                if (i !== -1) this.children.splice(i, 1);
                ch.parentNode = null;
                ch.parentElement = null;
                return ch;
            },
            addEventListener(evt, handler) {
                listeners[evt] = listeners[evt] || [];
                listeners[evt].push({ el, handler });
            },
            click() {
                const list = listeners["click"] || [];
                list.forEach((entry) => {
                    if (entry.el === el) entry.handler({ preventDefault() {} });
                });
            },
        };
        elements[id] = el;
        return el;
    }

    const cardFront = makeEl("card-front");
    const cardBack = makeEl("card-back");
    const cardFlipper = makeEl("card-flipper");
    cardFlipper.appendChild(cardFront);
    cardFlipper.appendChild(cardBack);
    cardFront.nextSibling = cardBack;
    const downloadBtn = makeEl("download-btn", "button");
    const downloadSheetBtn = makeEl("download-sheet-btn", "button");
    const downloadFrontBtn = makeEl("download-front-btn", "button");
    const downloadBackBtn = makeEl("download-back-btn", "button");

    // Helper that makes a minimal clone object (no need for full fidelity)
    function makeClone(src) {
        return {
            id: src.id + "-clone",
            tagName: src.tagName,
            className: src.className,
            _sourceId: src.id,
            classList: {
                classes: new Set(),
                add(c) {
                    this.classes.add(c);
                },
                remove(c) {
                    this.classes.delete(c);
                },
                contains(c) {
                    return this.classes.has(c);
                },
                toggle(c, force) {
                    if (force !== undefined) {
                        if (force) this.add(c);
                        else this.remove(c);
                    } else {
                        if (this.contains(c)) this.remove(c);
                        else this.add(c);
                    }
                },
            },
            style: {
                setProperty(k, v) {
                    this[k] = v;
                },
                cssText: "",
            },
            children: [],
            appendChild(ch) {
                this.children.push(ch);
                return ch;
            },
            parentElement: null,
        };
    }

    cardFront.cloneNode = function () {
        return makeClone(this);
    };
    cardBack.cloneNode = function () {
        return makeClone(this);
    };

    const createdCanvases = [];
    const document = {
        getElementById(id) {
            return elements[id] || null;
        },
        createElement(tag) {
            if (tag === "canvas") {
                const canvas = makeEl(`canvas-${Math.random()}`, "canvas");
                canvas.width = 0;
                canvas.height = 0;
                canvas.toDataURL = function () {
                    return "data:image/png;base64,mockCanvas";
                };
                canvas.getContext = function () {
                    return {
                        fillStyle: "",
                        strokeStyle: "",
                        lineWidth: 1,
                        font: "",
                        textAlign: "",
                        textBaseline: "",
                        fillRect() {},
                        strokeRect() {},
                        beginPath() {},
                        moveTo() {},
                        lineTo() {},
                        stroke() {},
                        fillText() {},
                        setLineDash() {},
                        drawImage() {},
                    };
                };
                createdCanvases.push(canvas);
                return canvas;
            }
            return makeEl(`el-${Math.random()}`, tag);
        },
        body: makeEl("body"),
        addEventListener() {},
    };

    const window = {
        document,
        AppState: { title: "Alex Wonder", isFlipped: false },
        hidePopoverCalled: false,
        hidePopover() {
            this.hidePopoverCalled = true;
        },
        setTimeout,
    };

    return { elements, document, window, createdCanvases };
}

test("export.js exposes exportPrintSheet and exportCardAsPng with face selection", async () => {
    const { elements, window } = createExportMockDom();

    const capturedElements = [];
    window.html2canvas = function (el, options) {
        capturedElements.push({ el, options });
        return Promise.resolve({
            width: 700,
            height: 980,
            toDataURL() {
                return "data:image/png;base64,mockFace";
            },
        });
    };

    const exportCode = fs.readFileSync("./js/export.js", "utf8");
    const context = {
        window,
        document: window.document,
        setTimeout,
        ...window,
    };
    vm.createContext(context);
    vm.runInContext(exportCode, context);

    assert.equal(
        typeof window.exportPrintSheet,
        "function",
        "exportPrintSheet must be a function",
    );
    assert.equal(
        typeof window.exportCardAsPng,
        "function",
        "exportCardAsPng must be a function",
    );

    // 1. Test exportPrintSheet captures both front and back
    await window.exportPrintSheet();
    assert.equal(window.hidePopoverCalled, true, "hidePopover called");
    assert.equal(capturedElements.length, 2, "both card faces captured");
    assert.equal(
        capturedElements[0].el.id,
        "card-front",
        "front captured first",
    );
    assert.equal(
        capturedElements[1].el.id,
        "card-back",
        "back captured second",
    );
    assert.equal(
        elements["card-front"].parentNode,
        elements["card-flipper"],
        "front face is restored after capture",
    );
    assert.equal(
        elements["card-back"].parentNode,
        elements["card-flipper"],
        "back face is restored after capture",
    );

    // 2. Test exportCardAsPng('back') captures card-back
    capturedElements.length = 0;
    await window.exportCardAsPng("back");
    assert.equal(capturedElements.length, 1);
    assert.equal(capturedElements[0].el.id, "card-back");

    // 3. Test exportCardAsPng('front') captures card-front
    capturedElements.length = 0;
    await window.exportCardAsPng("front");
    assert.equal(capturedElements.length, 1);
    assert.equal(capturedElements[0].el.id, "card-front");
});
