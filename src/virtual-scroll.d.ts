export type ScrollDirection = 'vertical' | 'horizontal';
export interface VirtualListOptions {
    maxNodes?: number;
    estimatedItemSize?: number;
    scrollDirection?: ScrollDirection;
}
export declare class VirtualList<T = Record<string, unknown>> extends HTMLElement {
    private _items;
    private _maxNodes;
    private _scrollDirection;
    private _nodePool;
    private _estimatedItemSize;
    private _userTemplate;
    private _isConnected;
    private $viewport;
    private $phantom;
    private $content;
    private $slot;
    constructor();
    static get observedAttributes(): string[];
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _onSlotChange;
    private _getTemplate;
    set items(data: T[]);
    get items(): T[];
    set maxNodes(val: number);
    get maxNodes(): number;
    set estimatedItemSize(val: number);
    get estimatedItemSize(): number;
    set scrollDirection(val: ScrollDirection);
    get scrollDirection(): ScrollDirection;
    private _buildNodePool;
    private _updateLayout;
    private _onScroll;
    private _render;
    private _interpolate;
}
declare global {
    interface HTMLElementTagNameMap {
        'virtual-list': VirtualList;
    }
}
//# sourceMappingURL=virtual-scroll.d.ts.map