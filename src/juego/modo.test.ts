import { describe, expect, it } from 'vitest'
import { comandoDeTeclaModo } from './modo'
import type { TeclaEntrada } from './tiempo'

const t = (code: string, extra: Partial<TeclaEntrada> = {}): TeclaEntrada => ({
  code,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  repeat: false,
  ...extra,
})

describe('comandoDeTeclaModo', () => {
  it('Tab alterna entre vida y plano', () => {
    expect(comandoDeTeclaModo(t('Tab'), { modo: 'vida' })).toEqual({
      tipo: 'CambiarModo',
      modo: 'plano',
    })
    expect(comandoDeTeclaModo(t('Tab'), { modo: 'plano' })).toEqual({
      tipo: 'CambiarModo',
      modo: 'vida',
    })
  })

  it('ignora la repetición, los modificadores y otras teclas', () => {
    expect(comandoDeTeclaModo(t('Tab', { repeat: true }), { modo: 'vida' })).toBeUndefined()
    expect(comandoDeTeclaModo(t('Tab', { altKey: true }), { modo: 'vida' })).toBeUndefined()
    expect(comandoDeTeclaModo(t('Tab', { ctrlKey: true }), { modo: 'vida' })).toBeUndefined()
    expect(comandoDeTeclaModo(t('KeyA'), { modo: 'vida' })).toBeUndefined()
  })
})
