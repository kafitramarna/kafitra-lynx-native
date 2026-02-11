import '@testing-library/jest-dom'
import { expect, test, vi } from 'vitest'
import { render, getQueriesForElement } from '@lynx-js/react/testing-library'

import { App } from '../App.jsx'

test('App renders device info UI', async () => {
  render(<App />)

  const { findByText } = getQueriesForElement(elementTree.root!)

  // Should render the header
  const title = await findByText('Device Info')
  expect(title).toBeInTheDocument()

  // Should render the subtitle
  const subtitle = await findByText('@kafitra/lynx-device-info')
  expect(subtitle).toBeInTheDocument()
})
