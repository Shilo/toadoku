/** Independent test-only artifact inspection. This is never an application importer. */
export function inspectRecovery(text: string): any {
  const artifact = JSON.parse(text), values: any[] = [];
  if (artifact.application !== 'toadodu-raw-recovery' || artifact.importable !== false || artifact.recoveryVersion !== 1) throw new Error('Wrong recovery artifact');
  const primitive = (value: any): any => {
    if (!value || typeof value !== 'object') return value;
    if ('ref' in value) return node(value.ref);
    if ('bigint' in value) return BigInt(value.bigint);
    if ('special' in value) return ({ undefined: undefined, NaN: NaN, Infinity: Infinity, '-Infinity': -Infinity, '-0': -0 } as Record<string, unknown>)[value.special];
    throw new Error('Unknown token');
  };
  const bytes = (base64: string) => Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  const node = (id: number): any => {
    if (id in values) return values[id];
    const item = artifact.nodes[id]; let value: any;
    switch (item.type) {
      case 'array': value = new Array(item.length); break;
      case 'object': value = Object.create(item.nullPrototype ? null : Object.prototype); break;
      case 'map': value = new Map(); break;
      case 'set': value = new Set(); break;
      case 'date': value = new Date(primitive(item.value)); break;
      case 'regexp': value = new RegExp(item.source, item.flags); value.lastIndex = primitive(item.lastIndex); break;
      case 'error': value = new Error(item.message); value.name = item.name; break;
      case 'dom-exception': value = new DOMException(item.message, item.name); break;
      case 'array-buffer': value = bytes(item.base64).buffer; break;
      case 'view': {
        const buffer = primitive(item.buffer);
        const types: Record<string, any> = { Uint8Array, Uint8ClampedArray, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array };
        value = item.name === 'DataView' ? new DataView(buffer, item.byteOffset, item.byteLength) : new types[item.name](buffer, item.byteOffset, item.length); break;
      }
      case 'blob': value = new Blob([bytes(item.base64)], { type: item.mediaType }); break;
      case 'file': value = new File([bytes(item.base64)], item.name, { type: item.mediaType, lastModified: item.lastModified }); break;
      case 'file-list': value = item.files.map(primitive); break;
      case 'boxed': value = Object(primitive(item.value)); break;
      default: throw new Error(`Unknown node ${item.type}`);
    }
    values[id] = value;
    if (item.type === 'map') for (const [key, child] of item.entries) value.set(primitive(key), primitive(child));
    else if (item.type === 'set') for (const child of item.values) value.add(primitive(child));
    else for (const [key, child] of item.entries ?? []) Object.defineProperty(value, key, { value: primitive(child), writable: true, configurable: true, enumerable: true });
    return value;
  };
  return primitive(artifact.root);
}
