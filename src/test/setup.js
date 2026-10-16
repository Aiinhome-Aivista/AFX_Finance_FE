import { vi } from 'vitest'
class RO { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = RO
globalThis.DOMMatrixReadOnly = class { constructor() { this.m22 = 1 } }
window.HTMLElement.prototype.scrollIntoView = () => {}
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
