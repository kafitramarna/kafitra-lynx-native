// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import '@testing-library/jest-dom';
import { expect, test } from 'vitest';
import { render, getQueriesForElement } from '@lynx-js/react/testing-library';

import { App } from '../App.jsx';

test('App renders LoginPage by default', async () => {
  render(<App />);
  const { findByText } = getQueriesForElement(elementTree.root!);

  // LoginPage is the default route – should show the welcome title
  const title = await findByText('Selamat Datang');
  expect(title).toBeInTheDocument();

  // Hint text with credentials should be visible
  const hint = await findByText('Demo credentials: demo / demo123');
  expect(hint).toBeInTheDocument();
});
