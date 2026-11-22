import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chatApi } from '../web/server/chat.ts'

// Run the extension's existing API middleware without the optional website's dependencies.
// Bind only to loopback: requests can spend the API key from web/.env.local.
let handle
chatApi(process.env, resolve('plugins')).configureServer({
  middlewares: { use(middleware) { handle = middleware } },
})

if (!handle) throw new Error('No se ha podido iniciar la API local.')
createServer((request, response) => {
  handle(request, response, () => {
    response.writeHead(404)
    response.end('No encontrado.')
  })
}).listen(5173, '127.0.0.1', () => {
  console.log('API local lista en http://127.0.0.1:5173/api/extension')
})
