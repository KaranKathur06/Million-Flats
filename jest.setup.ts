import { TextDecoder, TextEncoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  Object.defineProperty(global, 'TextEncoder', {
    value: TextEncoder,
    writable: true,
    configurable: true,
  })
}

if (typeof global.TextDecoder === 'undefined') {
  Object.defineProperty(global, 'TextDecoder', {
    value: TextDecoder,
    writable: true,
    configurable: true,
  })
}
