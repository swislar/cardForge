const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createMockDom() {
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

    const card = makeEl("card");
    const downloadBtn = makeEl("download-btn", "button");

    const document = {
        getElementById(id) {
            return elements[id] || null;
        },
        createElement(tag) {
            return makeEl(`el-${Math.random()}`, tag);
        },
        body: makeEl("body"),
        addEventListener() {},
    };

    const window = {
        document,
        AppState: { title: "Alex Wonder" },
        hidePopoverCalled: false,
        hidePopover() {
            this.hidePopoverCalled = true;
        },
        setTimeout,
    };

    return { elements, document, window };
}

test("export.js binds to download button and exposes exportCardAsPng", async () => {
    const { elements, window } = createMockDom();

    // Add cloneNode support to the card element (needed by the clone-based captureFace)
    elements["card"].cloneNode = function (deep) {
        const clone = {
            id: this.id + "-clone",
            tagName: this.tagName,
            className: this.className,
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
        return clone;
    };

    // Add cloneNode to body so appendChild/removeChild work for the offscreen container
    window.document.body.cloneNode = function () {
        return {};
    };

    let html2canvasCalled = false;
    window.html2canvas = function (el, options) {
        html2canvasCalled = true;
        // The clone passed to html2canvas is a detached clone, not elements['card'] itself
        assert.equal(options.scale, 2);
        return Promise.resolve({
            toDataURL() {
                return "data:image/png;base64,mock";
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

    assert.equal(typeof window.exportCardAsPng, "function");

    // Trigger export via async call
    elements["card"].classList.add("card--exporting");
    await window.exportCardAsPng();
    assert.equal(
        window.hidePopoverCalled,
        true,
        "hidePopover should be called before export",
    );
    assert.equal(html2canvasCalled, true, "html2canvas should be invoked");
    assert.equal(
        elements["card"].classList.contains("card--exporting"),
        true,
        "pre-existing export class state should be preserved",
    );
});
