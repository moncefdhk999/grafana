import React, { useState } from 'react';

import { PageLayoutType } from '@grafana/data';
import { Box, Drawer } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';

import { EmbeddedDashboard } from './EmbeddedDashboard';

export function EmbeddedDashboardTestPage() {
  const [state, setState] = useState('?from=now-5m&to=now');

  return (
    <Page
      navId="dashboards/browse"
      pageNav={{ text: 'Embedding dashboard', subTitle: 'Showing dashboard: Panel Tests - Pie chart' }}
      layout={PageLayoutType.Canvas}
    >
      <Box paddingBottom={2}>Internal url state: {state}</Box>
      <EmbeddedDashboard uid="O6GmNPvWk" initialState={state} onStateChange={setState} />
    </Page>
  );
}

export default EmbeddedDashboardTestPage;
