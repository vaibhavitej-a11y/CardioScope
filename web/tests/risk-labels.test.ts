import assert from 'node:assert/strict'
import test from 'node:test'
import { riskBand, riskLabel } from '../src/vessels.ts'

test('overall CAD uses likelihood language, not vessel stenosis language', () => {
  assert.equal(riskLabel(riskBand(0.0178), 'cad'), 'Lower CAD likelihood')
  assert.equal(riskLabel(riskBand(0.5), 'cad'), 'Uncertain CAD likelihood')
  assert.equal(riskLabel(riskBand(0.9968), 'cad'), 'Higher CAD likelihood')
})

test('vessel labels retain the specified probability bands at both boundaries', () => {
  assert.equal(riskLabel(riskBand(0.25)), 'Predicted normal')
  assert.equal(riskLabel(riskBand(0.2501)), 'Uncertain')
  assert.equal(riskLabel(riskBand(0.7499)), 'Uncertain')
  assert.equal(riskLabel(riskBand(0.75)), 'Predicted stenotic')
})
