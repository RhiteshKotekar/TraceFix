import { failureScenarios } from './registry'

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5002'

async function request(path, options) {
  const response = await fetch(`${BACKEND_URL}${path}`, options)
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

const implementations = {
  checkoutException: async () => {
    const { response, body } = await request('/api/demo/checkout-failure', { method: 'POST' })
    if (response.status !== 500) throw new Error(body.message || `Expected HTTP 500, received ${response.status}`)
    return `Checkout operation failed with HTTP ${response.status}. The backend recorded a controlled exception.`
  },
  productApiFailure: async () => {
    const { response, body } = await request('/api/demo/products/failure')
    if (response.status !== 500) throw new Error(body.message || `Expected HTTP 500, received ${response.status}`)
    return `Product request failed with HTTP ${response.status}. The backend recorded the failure.`
  },
  healthCheckFailure: async () => {
    const { response, body } = await request('/api/demo/health/fail', { method: 'POST' })
    if (!response.ok) throw new Error(body.message || `Could not change health state (${response.status})`)
    const probe = await request('/api/health')
    if (probe.response.status !== 503) throw new Error(`Health probe returned ${probe.response.status}, expected 503`)
    return `Backend health probe now reports ${probe.body.status} (HTTP 503). Reset it here when the demo is done.`
  },
  resourceDegradation: async () => {
    const { response, body } = await request('/api/demo/products/slow?delayMs=2000')
    if (!response.ok) throw new Error(body.message || `Slow product request failed (${response.status})`)
    const duration = response.headers.get('X-Demo-Delay-Ms') || body.delayMs || 'unknown'
    return `Dedicated product operation completed after a ${duration} ms server delay.`
  },
}

export async function runScenario(id) {
  const scenario = failureScenarios.find((item) => item.id === id && item.enabled)
  if (!scenario) throw new Error('This failure scenario is unavailable.')
  const implementation = implementations[scenario.trigger]
  if (!implementation) throw new Error(`No implementation is registered for ${scenario.name}.`)
  return implementation()
}

export async function recoverScenario(id) {
  if (id !== 'health-check-failure') throw new Error('This scenario has no recovery action.')
  const { response, body } = await request('/api/demo/health/reset', { method: 'POST' })
  if (!response.ok) throw new Error(body.message || `Could not reset health check (${response.status})`)
  const probe = await request('/api/health')
  if (!probe.response.ok || probe.body.status !== 'up') throw new Error('Health probe did not return to healthy.')
  return 'Backend health probe is healthy again (HTTP 200).'
}
