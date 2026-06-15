import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parse, compileTemplate, compileScript } from '@vue/compiler-sfc'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dashboardPath = resolve(__dirname, '../src/views/Dashboard.vue')
const source = readFileSync(dashboardPath, 'utf8')

const parsed = parse(source, { filename: dashboardPath })
if (parsed.errors.length > 0) {
  throw new Error(formatErrors('Dashboard.vue SFC parse failed', parsed.errors))
}

const { descriptor } = parsed
if (!descriptor.template) {
  throw new Error('Dashboard.vue must include a template')
}

if (descriptor.scriptSetup) {
  compileScript(descriptor, { id: 'dashboard-compile-test' })
}

const compiled = compileTemplate({
  source: descriptor.template.content,
  filename: dashboardPath,
  id: 'dashboard-compile-test'
})

if (compiled.errors.length > 0) {
  throw new Error(formatErrors('Dashboard.vue template compile failed', compiled.errors))
}

function formatErrors(title, errors) {
  return [
    title,
    ...errors.map(error => {
      if (typeof error === 'string') return error
      const location = error.loc?.start
      const suffix = location ? ` at ${location.line}:${location.column}` : ''
      return `${error.message}${suffix}`
    })
  ].join('\n')
}
