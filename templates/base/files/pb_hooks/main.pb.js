/// <reference path="../pb_data/types.d.ts" />

// PocketBase JS hooks run inside the instance's JSVM.
// Docs: https://pocketbase.io/docs/js-overview/
routerAdd('GET', '/api/health', (e) => {
  return e.json(200, { status: 'ok' })
})
