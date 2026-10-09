// Vite builds these query variants from the same typed CloudBase module.
declare module '*todo-cloud?retry=1' {
  const api: typeof import('./scripts/todo-cloud');
  export = api;
}

declare module '*todo-cloud?retry=2' {
  const api: typeof import('./scripts/todo-cloud');
  export = api;
}
