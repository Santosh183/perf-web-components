export class VirtualList extends HTMLElement {
    _items = [];
    _maxNodes = 20;
    _scrollDirection = 'vertical';
    _nodePool = [];
    _estimatedItemSize = 50;
    _userTemplate = null;
    _isConnected = false;
    $viewport;
    $phantom;
    $content;
    $slot;
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        if (!this.shadowRoot) {
            throw new Error('Shadow root initialization failed');
        }
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          contain: strict;
        }
        .viewport {
          width: 100%;
          height: 100%;
          overflow: auto;
          position: relative;
          -webkit-overflow-scrolling: touch;
        }
        .phantom {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
        }
        .content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          will-change: transform;
        }
        .content.horizontal {
          display: flex;
          flex-direction: row;
          width: max-content;
          height: 100%;
        }
      </style>

      <div class="viewport" id="viewport">
        <div class="phantom" id="phantom"></div>
        <div class="content" id="content"></div>
        <slot id="slot" style="display: none;"></slot>
      </div>
    `;
        this.$viewport = this.shadowRoot.getElementById('viewport');
        this.$phantom = this.shadowRoot.getElementById('phantom');
        this.$content = this.shadowRoot.getElementById('content');
        this.$slot = this.shadowRoot.getElementById('slot');
        this._onScroll = this._onScroll.bind(this);
        this._onSlotChange = this._onSlotChange.bind(this);
    }
    static get observedAttributes() {
        return ['max-nodes', 'scroll-direction', 'estimated-item-size'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue)
            return;
        if (name === 'max-nodes') {
            this._maxNodes = parseInt(newValue || '20', 10) || 20;
            this._buildNodePool();
        }
        else if (name === 'scroll-direction') {
            this._scrollDirection = newValue === 'horizontal' ? 'horizontal' : 'vertical';
        }
        else if (name === 'estimated-item-size') {
            this._estimatedItemSize = parseFloat(newValue || '50') || 50;
        }
        this._updateLayout();
        this._render();
    }
    connectedCallback() {
        this._isConnected = true;
        this.$viewport.addEventListener('scroll', this._onScroll, { passive: true });
        if (this.$slot) {
            this.$slot.addEventListener('slotchange', this._onSlotChange);
        }
        this._getTemplate();
        this._buildNodePool();
        this._updateLayout();
        this._render();
    }
    disconnectedCallback() {
        this._isConnected = false;
        this.$viewport.removeEventListener('scroll', this._onScroll);
        if (this.$slot) {
            this.$slot.removeEventListener('slotchange', this._onSlotChange);
        }
    }
    _onSlotChange() {
        this._userTemplate = null;
        this._getTemplate();
        this._render();
    }
    _getTemplate() {
        if (!this._userTemplate) {
            const templateTag = this.querySelector('template');
            if (templateTag) {
                this._userTemplate = templateTag.innerHTML;
            }
        }
        return this._userTemplate;
    }
    set items(data) {
        if (!Array.isArray(data)) {
            this._items = [];
            return;
        }
        this._items = new Proxy(data, {
            set: (target, property, value, receiver) => {
                const success = Reflect.set(target, property, value, receiver);
                this._updateLayout();
                this._render();
                return success;
            }
        });
        this._updateLayout();
        this._render();
    }
    get items() {
        return this._items;
    }
    set maxNodes(val) {
        this.setAttribute('max-nodes', String(val));
    }
    get maxNodes() {
        return this._maxNodes;
    }
    set estimatedItemSize(val) {
        this.setAttribute('estimated-item-size', String(val));
    }
    get estimatedItemSize() {
        return this._estimatedItemSize;
    }
    set scrollDirection(val) {
        this.setAttribute('scroll-direction', val);
    }
    get scrollDirection() {
        return this._scrollDirection;
    }
    _buildNodePool() {
        if (!this.$content)
            return;
        this.$content.innerHTML = '';
        this._nodePool = [];
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this._maxNodes; i++) {
            const nodeWrapper = document.createElement('div');
            nodeWrapper.dataset.poolIndex = String(i);
            this._nodePool.push(nodeWrapper);
            fragment.appendChild(nodeWrapper);
        }
        this.$content.appendChild(fragment);
    }
    _updateLayout() {
        if (!this.$phantom || !this.$content)
            return;
        const isHoriz = this._scrollDirection === 'horizontal';
        const totalSize = this._items.length * this._estimatedItemSize;
        if (isHoriz) {
            this.$phantom.style.width = `${totalSize}px`;
            this.$phantom.style.height = '100%';
            this.$content.classList.add('horizontal');
        }
        else {
            this.$phantom.style.height = `${totalSize}px`;
            this.$phantom.style.width = '100%';
            this.$content.classList.remove('horizontal');
        }
    }
    _onScroll() {
        requestAnimationFrame(() => this._render());
    }
    _render() {
        if (!this.$viewport || !this._items.length || !this._nodePool.length)
            return;
        const isHoriz = this._scrollDirection === 'horizontal';
        const scrollOffset = isHoriz ? this.$viewport.scrollLeft : this.$viewport.scrollTop;
        let startIndex = Math.floor(scrollOffset / this._estimatedItemSize);
        const maxStartIndex = Math.max(0, this._items.length - this._maxNodes);
        startIndex = Math.min(Math.max(0, startIndex), maxStartIndex);
        const offset = startIndex * this._estimatedItemSize;
        this.$content.style.transform = isHoriz
            ? `translate3d(${offset}px, 0, 0)`
            : `translate3d(0, ${offset}px, 0)`;
        const userTemplate = this._getTemplate();
        for (let i = 0; i < this._maxNodes; i++) {
            const dataIndex = startIndex + i;
            const node = this._nodePool[i];
            if (dataIndex < this._items.length) {
                node.style.display = '';
                const itemData = this._items[dataIndex];
                if (userTemplate) {
                    node.innerHTML = this._interpolate(userTemplate, itemData, dataIndex);
                }
                else {
                    node.textContent = typeof itemData === 'object' ? JSON.stringify(itemData) : String(itemData);
                }
            }
            else {
                node.style.display = 'none';
            }
        }
    }
    _interpolate(templateStr, item, index) {
        return templateStr.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
            if (key === 'index')
                return String(index);
            if (key === 'item')
                return typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);
            const path = key.startsWith('item.') ? key.slice(5) : key;
            const val = path.split('.').reduce((obj, prop) => (obj && obj[prop] !== undefined ? obj[prop] : undefined), item);
            return val !== undefined ? String(val) : '';
        });
    }
}
// Auto-register custom element if window is available
if (typeof window !== 'undefined' && !customElements.get('virtual-list')) {
    customElements.define('virtual-list', VirtualList);
}
//# sourceMappingURL=virtual-scroll.js.map