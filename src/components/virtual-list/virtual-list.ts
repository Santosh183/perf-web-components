export type ScrollDirection = 'vertical' | 'horizontal';

export interface VirtualListOptions {
  maxNodes?: number;
  estimatedItemSize?: number;
  scrollDirection?: ScrollDirection;
}

export class VirtualList<T = Record<string, unknown>> extends HTMLElement {
  private _items: T[] = [];
  private _maxNodes: number = 20;
  private _scrollDirection: ScrollDirection = 'vertical';
  private _nodePool: HTMLDivElement[] = [];
  private _estimatedItemSize: number = 50;
  private _userTemplate: string | null = null;
  private _isConnected: boolean = false;

  private $viewport: HTMLDivElement;
  private $phantom: HTMLDivElement;
  private $content: HTMLDivElement;
  private $slot: HTMLSlotElement | null;

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

    this.$viewport = this.shadowRoot.getElementById('viewport') as HTMLDivElement;
    this.$phantom = this.shadowRoot.getElementById('phantom') as HTMLDivElement;
    this.$content = this.shadowRoot.getElementById('content') as HTMLDivElement;
    this.$slot = this.shadowRoot.getElementById('slot') as HTMLSlotElement | null;

    this._onScroll = this._onScroll.bind(this);
    this._onSlotChange = this._onSlotChange.bind(this);
  }

  static get observedAttributes(): string[] {
    return ['max-nodes', 'scroll-direction', 'estimated-item-size'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'max-nodes') {
      this._maxNodes = parseInt(newValue || '20', 10) || 20;
      this._buildNodePool();
    } else if (name === 'scroll-direction') {
      this._scrollDirection = newValue === 'horizontal' ? 'horizontal' : 'vertical';
    } else if (name === 'estimated-item-size') {
      this._estimatedItemSize = parseFloat(newValue || '50') || 50;
    }
    this._updateLayout();
    this._render();
  }

  connectedCallback(): void {
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

  disconnectedCallback(): void {
    this._isConnected = false;
    this.$viewport.removeEventListener('scroll', this._onScroll);
    if (this.$slot) {
      this.$slot.removeEventListener('slotchange', this._onSlotChange);
    }
  }

  private _onSlotChange(): void {
    this._userTemplate = null;
    this._getTemplate();
    this._render();
  }

  private _getTemplate(): string | null {
    if (!this._userTemplate) {
      const templateTag = this.querySelector('template');
      if (templateTag) {
        this._userTemplate = templateTag.innerHTML;
      }
    }
    return this._userTemplate;
  }

  set items(data: T[]) {
    if (!Array.isArray(data)) {
      this._items = [];
      return;
    }

    this._items = new Proxy(data, {
      set: (target: T[], property: string | symbol, value: unknown, receiver: unknown) => {
        const success = Reflect.set(target, property, value, receiver);
        this._updateLayout();
        this._render();
        return success;
      }
    });

    this._updateLayout();
    this._render();
  }

  get items(): T[] {
    return this._items;
  }

  set maxNodes(val: number) {
    this.setAttribute('max-nodes', String(val));
  }

  get maxNodes(): number {
    return this._maxNodes;
  }

  set estimatedItemSize(val: number) {
    this.setAttribute('estimated-item-size', String(val));
  }

  get estimatedItemSize(): number {
    return this._estimatedItemSize;
  }

  set scrollDirection(val: ScrollDirection) {
    this.setAttribute('scroll-direction', val);
  }

  get scrollDirection(): ScrollDirection {
    return this._scrollDirection;
  }

  private _buildNodePool(): void {
    if (!this.$content) return;
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

  private _updateLayout(): void {
    if (!this.$phantom || !this.$content) return;
    const isHoriz = this._scrollDirection === 'horizontal';
    const totalSize = this._items.length * this._estimatedItemSize;

    if (isHoriz) {
      this.$phantom.style.width = `${totalSize}px`;
      this.$phantom.style.height = '100%';
      this.$content.classList.add('horizontal');
    } else {
      this.$phantom.style.height = `${totalSize}px`;
      this.$phantom.style.width = '100%';
      this.$content.classList.remove('horizontal');
    }
  }

  private _onScroll(): void {
    requestAnimationFrame(() => this._render());
  }

  private _render(): void {
    if (!this.$viewport || !this._items.length || !this._nodePool.length) return;

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
        } else {
          node.textContent = typeof itemData === 'object' ? JSON.stringify(itemData) : String(itemData);
        }
      } else {
        node.style.display = 'none';
      }
    }
  }

  private _interpolate(templateStr: string, item: unknown, index: number): string {
    return templateStr.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
      if (key === 'index') return String(index);
      if (key === 'item') return typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);

      const path = key.startsWith('item.') ? key.slice(5) : key;
      const val = path.split('.').reduce((obj: any, prop: string) => (obj && obj[prop] !== undefined ? obj[prop] : undefined), item);

      return val !== undefined ? String(val) : '';
    });
  }
}

// Auto-register custom element if window is available
if (typeof window !== 'undefined' && !customElements.get('virtual-list')) {
  customElements.define('virtual-list', VirtualList);
}

declare global {
  interface HTMLElementTagNameMap {
    'virtual-list': VirtualList;
  }
}
