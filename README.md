# perf-web-components

High-performance, framework-agnostic web components built with native Custom Elements.

## Install

```bash
npm install perf-web-components
```

```js
import 'perf-web-components';
```

## Components

### `<virtual-list>`

A virtualized list/grid that only renders the DOM nodes needed to fill the viewport, regardless of how many items are in the dataset. Useful for rendering large collections (thousands+ of rows) without the performance cost of mounting every item.

#### Attributes / Properties

| Attribute              | Property            | Type                        | Default      | Description                                                              |
|------------------------|----------------------|-----------------------------|--------------|---------------------------------------------------------------------------|
| `max-nodes`            | `maxNodes`           | `number`                    | `20`         | Size of the reused DOM node pool (number of items rendered at once).      |
| `estimated-item-size`  | `estimatedItemSize`  | `number`                    | `50`         | Estimated height (vertical) or width (horizontal) of each item, in px.    |
| `scroll-direction`     | `scrollDirection`    | `'vertical' \| 'horizontal'`| `'vertical'` | Scroll axis for the list.                                                 |
| —                      | `items`              | `T[]`                       | `[]`         | The data array to render. Must be set via the JS property, not an attribute. |

#### Item templates

Provide a `<template>` child to control markup per item. Use `{{ }}` interpolation to bind fields:

```html
<virtual-list max-nodes="10" estimated-item-size="60">
  <template>
    <div class="row">{{ index }}: {{ name }}</div>
  </template>
</virtual-list>

<script type="module">
  const list = document.querySelector('virtual-list');
  list.items = [{ name: 'Item 1' }, { name: 'Item 2' } /* ... */];
</script>
```

If no template is provided, each item is rendered as `JSON.stringify(item)` (or `String(item)` for primitives).

#### Framework Bindings (Angular, React, Vue, Lit, Svelte)

Modern frameworks bind directly to the Web Component's JS property, not just its attributes. `items` must always be set as a property since arrays cannot be passed through HTML attributes.

**Angular**
```html
<virtual-list [items]="itemArray" max-nodes="5" estimated-item-size="60"></virtual-list>
```

**Vue**
```html
<virtual-list :items="itemArray" max-nodes="5" estimated-item-size="60"></virtual-list>
```

**React**
```jsx
<virtual-list
  ref={el => el && (el.items = itemArray)}
  max-nodes="5"
  estimated-item-size="60"
/>
```

**Lit**
```html
<virtual-list .items=${itemArray} max-nodes="5" estimated-item-size="60"></virtual-list>
```

**Svelte**
```svelte
<virtual-list this={el} max-nodes="5" estimated-item-size="60" use:setItems={itemArray}></virtual-list>
```

## Development

```bash
npm run dev      # start vite dev server
npm run build    # type-check and build the library
npm run preview  # preview the production build
```
