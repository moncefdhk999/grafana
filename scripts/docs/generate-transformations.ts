import {
  transformationDocsContent,
  TransformationDocsContentType,
  ImageRenderType,
} from '../../public/app/features/transformers/docs/content';

const template = `---
comments: |
  This Markdown file is auto-generated. DO NOT EDIT THIS FILE DIRECTLY.

  To update this Markdown, navigate to the following Typescript files and edit them based on what you need to update:

  scripts/docs/generate-transformations.ts - Includes all content not specific to a transformation.
  public/app/features/transformers/docs/content.ts - Transformation-specific content.

  Only use reference style links in the 'content.ts' file or else link text will be visible in the UI.

  To build this Markdown, do the following:

  $ cd /docs (from the root of the repository)
  $ make sources/panels-visualizations/query-transform-data/transform-data/index.md
  $ make docs

  Browse to http://localhost:3003/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/

  Refer to ./docs/README.md "Content guidelines" for more information about editing and building these docs.

aliases:
  - ../../panels/reference-transformation-functions/
  - ../../panels/transform-data/
  - ../../panels/transform-data/about-transformation/
  - ../../panels/transform-data/add-transformation-to-data/
  - ../../panels/transform-data/apply-transformation-to-data/
  - ../../panels/transform-data/debug-transformation/
  - ../../panels/transform-data/delete-transformation/
  - ../../panels/transform-data/transformation-functions/
  - ../../panels/transformations/
  - ../../panels/transformations/apply-transformations/
  - ../../panels/transformations/config-from-query/
  - ../../panels/transformations/rows-to-fields/
  - ../../panels/transformations/types-options/
labels:
  products:
    - cloud
    - enterprise
    - oss
title: Transform data
weight: 100
refs:
  sparkline-cell-type:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/visualizations/table/#sparkline
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/visualizations/table/#sparkline
  calculation-types:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/query-transform-data/calculation-types/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana-cloud/visualizations/panels-visualizations/query-transform-data/calculation-types/
  configuration-file:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-grafana/#configuration-file-location
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-grafana/#configuration-file-location
  dashboard-variable:
    - pattern: /docs/grafana/
      destination: docs/grafana/<GRAFANA_VERSION>/dashboards/variables/
    - pattern: /docs/grafana-cloud/
      destination: docs/grafana/<GRAFANA_VERSION>/dashboards/variables/
  feature-toggle:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-grafana/#feature_toggles
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana/<GRAFANA_VERSION>/setup-grafana/configure-grafana/#feature_toggles
  table-panel:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/visualizations/table/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/visualizations/table/
  time-series-panel:
    - pattern: /docs/grafana/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/visualizations/time-series/
    - pattern: /docs/grafana-cloud/
      destination: /docs/grafana/<GRAFANA_VERSION>/panels-visualizations/visualizations/time-series/
---

# Transform data

Transformations are a powerful way to manipulate data returned by a query before the system applies a visualization. Using transformations, you can:

- Rename fields
- Join time series data
- Perform mathematical operations across queries
- Use the output of one transformation as the input to another transformation

For users that rely on multiple views of the same dataset, transformations offer an efficient method of creating and maintaining numerous dashboards.

You can also use the output of one transformation as the input to another transformation, which results in a performance gain.

> Sometimes the system cannot graph transformed data. When that happens, click the \`Table view\` toggle above the visualization to switch to a table view of the data. This can help you understand the final result of your transformations.

## Transformation types

Grafana provides a number of ways that you can transform data. For a complete list of transformations, refer to [Transformation functions](#transformation-functions).

## Order of transformations

When there are multiple transformations, Grafana applies them in the order they are listed. Each transformation creates a result set that then passes on to the next transformation in the processing pipeline.

The order in which Grafana applies transformations directly impacts the results. For example, if you use a Reduce transformation to condense all the results of one column into a single value, then you can only apply transformations to that single value.

## Add a transformation function to data

The following steps guide you in adding a transformation to data. This documentation does not include steps for each type of transformation. For a complete list of transformations, refer to [Transformation functions](#transformation-functions).

1. Navigate to the panel where you want to add one or more transformations.
1. Hover over any part of the panel to display the actions menu on the top right corner.
1. Click the menu and select **Edit**.
1. Click the **Transform** tab.
1. Click a transformation.
   A transformation row appears where you configure the transformation options. For more information about how to configure a transformation, refer to [Transformation functions](#transformation-functions).
   For information about available calculations, refer to [Calculation types][].
1. To apply another transformation, click **Add transformation**.
   This transformation acts on the result set returned by the previous transformation.
   {{< figure src="/static/img/docs/transformations/transformations-7-0.png" class="docs-image--no-shadow" max-width= "1100px" alt="The Transform tab in the panel editor" >}}

## Debug a transformation

To see the input and the output result sets of the transformation, click the bug icon on the right side of the transformation row.

The input and output results sets can help you debug a transformation.

{{< figure src="/static/img/docs/transformations/debug-transformations-7-0.png" class="docs-image--no-shadow" max-width= "1100px" alt="The debug transformation screen with the debug icon highlighted" >}}

## Disable a transformation

You can disable or hide one or more transformations by clicking on the eye icon on the top right side of the transformation row. This disables the applied actions of that specific transformation and can help to identify issues when you change several transformations one after another.

{{< figure src="/static/img/docs/transformations/screenshot-example-disable-transformation.png" class="docs-image--no-shadow" max-width= "1100px" alt="A transformation row with the disable transformation icon highlighted" >}}

## Filter a transformation

If your panel uses more than one query, you can filter these and apply the selected transformation to only one of the queries. To do this, click the filter icon on the top right of the transformation row. This opens a drop-down with a list of queries used on the panel. From here, you can select the query you want to transform.

Note that the filter icon is always displayed if your panel has more than one query, but it may not work if previous transformations for merging the queries' outputs are applied. This is because one transformation takes the output of the previous one.

## Delete a transformation

We recommend that you remove transformations that you don't need. When you delete a transformation, you remove the data from the visualization.

**Before you begin:**

- Identify all dashboards that rely on the transformation and inform impacted dashboard users.

**To delete a transformation**:

1. Open a panel for editing.
1. Click the **Transform** tab.
1. Click the trash icon next to the transformation you want to delete.

{{< figure src="/static/img/docs/transformations/screenshot-example-remove-transformation.png" class="docs-image--no-shadow" max-width= "1100px" alt="A transformation row with the Remove icon highlighted" >}}

## Transformation functions

You can perform the following transformations on your data.

${buildTransformationDocsContent(transformationDocsContent)}

[Table panel]: ref:table-panel
[Calculation types]: ref:calculation-types
[sparkline cell type]: ref:sparkline-cell-type
[configuration file]: ref:configuration-file
[Time series panel]: ref:time-series-panel
[feature toggle]: ref:feature-toggle
[dashboard variable]: ref:dashboard-variable
`;

function buildTransformationDocsContent(transformationDocsContent: TransformationDocsContentType) {
  const transformationsList = Object.keys(transformationDocsContent);

  const content = transformationsList
    .map((transformationName) => {
      return `
  ### ${transformationDocsContent[transformationName].name}
  ${transformationDocsContent[transformationName].getHelperDocs(ImageRenderType.ShortcodeFigure)}
  `;
    })
    // Remove the superfluous commas.
    .join('');

  return content;
}

/*
  `process.stdout.write(template + '\n')` was not functioning as expected.
  Neither the tsc nor ts-node compiler could identify the node `process` object.
  Fortunately, `console.log` also writes to the standard output.
*/
console.log(template);
