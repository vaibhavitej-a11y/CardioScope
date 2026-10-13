import assert from 'node:assert/strict'
import test from 'node:test'
import { probabilityPercent } from '../src/api/format.ts'

test('near-one CAD predictions retain the distinction hidden by integer rounding', () => {
  assert.equal(probabilityPercent(0.9968334485931667), '99.7')
  assert.equal(probabilityPercent(0.9981167932851986), '99.8')
})

test('lower probabilities retain one decimal place', () => {
  assert.equal(probabilityPercent(0.017765689619422473), '1.8')
  assert.equal(probabilityPercent(0.5), '50.0')
})

test('rounding cannot turn nonzero or nonunit probabilities into certainty', () => {
  assert.equal(probabilityPercent(0.00001), '<0.1')
  assert.equal(probabilityPercent(0.99999), '>99.9')
  assert.equal(probabilityPercent(0), '0.0')
  assert.equal(probabilityPercent(1), '100.0')
})
