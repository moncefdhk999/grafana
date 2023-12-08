import classNames from 'classnames';
import React, { CSSProperties, FC, PureComponent } from 'react';
import ReactGridLayout, { ItemCallback } from 'react-grid-layout';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Subscription } from 'rxjs';

import { config } from '@grafana/runtime';
import appEvents from 'app/core/app_events';
import { GRID_CELL_HEIGHT, GRID_CELL_VMARGIN, GRID_COLUMN_COUNT } from 'app/core/constants';
import { contextSrv } from 'app/core/services/context_srv';
import { VariablesChanged } from 'app/features/variables/types';
import { DashboardPanelsChangedEvent } from 'app/types/events';

import { AddLibraryPanelWidget } from '../components/AddLibraryPanelWidget';
import { AddPanelWidget } from '../components/AddPanelWidget';
import { DashboardRow } from '../components/DashboardRow';
import { DashboardModel, PanelModel } from '../state';
import { GridPos } from '../state/PanelModel';

import DashboardEmpty from './DashboardEmpty';
import { DashboardPanel } from './DashboardPanel';
import { Mode, Orientation, PrintOptions } from './PrintPDF/types';

export const PANEL_FILTER_VARIABLE = 'systemPanelFilterVar';

export interface Props {
  dashboard: DashboardModel;
  isEditable: boolean;
  editPanel: PanelModel | null;
  viewPanel: PanelModel | null;
  hidePanelMenus?: boolean;
  printOptions?: PrintOptions;
}

interface State {
  panelFilter?: RegExp;
}

export class DashboardGrid extends PureComponent<Props, State> {
  private panelMap: { [key: string]: PanelModel } = {};
  private eventSubs = new Subscription();
  private windowHeight = 1200;
  private windowWidth = 1920;
  private gridWidth = 0;
  /** Used to keep track of mobile panel layout position */
  private lastPanelBottom = 0;
  private isLayoutInitialized = false;

  // Print preview
  private wrapperDivRef: HTMLDivElement | null = null;
  private pageLineCount = 17;

  constructor(props: Props) {
    super(props);
    this.state = {
      panelFilter: undefined,
    };
  }

  componentDidMount() {
    const { dashboard } = this.props;

    if (config.featureToggles.panelFilterVariable) {
      // If panel filter variable is set on load then
      // update state to filter panels
      for (const variable of dashboard.getVariables()) {
        if (variable.id === PANEL_FILTER_VARIABLE) {
          if ('query' in variable) {
            this.setPanelFilter(variable.query);
          }
          break;
        }
      }

      this.eventSubs.add(
        appEvents.subscribe(VariablesChanged, (e) => {
          if (e.payload.variable?.id === PANEL_FILTER_VARIABLE) {
            if ('current' in e.payload.variable) {
              let variable = e.payload.variable.current;
              if ('value' in variable && typeof variable.value === 'string') {
                this.setPanelFilter(variable.value);
              }
            }
          }
        })
      );
    }

    this.eventSubs.add(dashboard.events.subscribe(DashboardPanelsChangedEvent, this.triggerForceUpdate));
  }

  componentWillUnmount() {
    this.eventSubs.unsubscribe();
  }

  setPanelFilter(regex: string) {
    // Only set the panels filter if the systemPanelFilterVar variable
    // is a non-empty string
    let panelFilter = undefined;
    if (regex.length > 0) {
      panelFilter = new RegExp(regex, 'i');
    }

    this.setState({
      panelFilter: panelFilter,
    });
  }

  buildLayout() {
    console.log('in buildLayout');
    const layout: ReactGridLayout.Layout[] = [];
    this.panelMap = {};
    const { panelFilter } = this.state;

    let count = 0;
    for (const panel of this.props.dashboard.panels) {
      if (!panel.key) {
        panel.key = `panel-${panel.id}-${Date.now()}`;
      }
      this.panelMap[panel.key] = panel;

      if (!panel.gridPos) {
        console.log('panel without gridpos');
        continue;
      }

      if (this.props.printOptions?.mode && panel.collapsed) {
        this.props.dashboard.toggleRow(panel);
      }

      const panelPos: ReactGridLayout.Layout = {
        i: panel.key,
        x: panel.gridPos.x,
        y: panel.gridPos.y,
        w: panel.gridPos.w,
        h: panel.gridPos.h,
      };

      if (panel.type === 'row') {
        panelPos.w = GRID_COLUMN_COUNT;
        panelPos.h = 1;
        panelPos.isResizable = false;
        panelPos.isDraggable = panel.collapsed;
      }

      if (!panelFilter) {
        layout.push(panelPos);
      } else {
        if (panelFilter.test(panel.title)) {
          panelPos.isResizable = false;
          panelPos.isDraggable = false;
          panelPos.x = (count % 2) * GRID_COLUMN_COUNT;
          panelPos.y = Math.floor(count / 2);
          layout.push(panelPos);
          count++;
        }
      }
    }

    return layout;
  }

  buildPrintableLayout() {
    console.log('in buildPrintableLayout: ', this.props.dashboard.panels, this.props.printOptions);
    this.panelMap = {};
    const panelLayoutMap: { [key: string]: ReactGridLayout.Layout } = {};

    const panelYPerColumn = Array(24).fill(0);
    // const offsetPerColumn = Array(24).fill(0);
    const lastPanelKeyPerColumn = Array(24).fill('');
    for (let idx = 0; idx < this.props.dashboard.panels.length; idx++) {
      console.log('init loop', panelYPerColumn);
      const panel = this.props.dashboard.panels[idx];
      if (!panel.key) {
        panel.key = `panel-${panel.id}-${Date.now()}`;
      }
      this.panelMap[panel.key] = panel;

      if (!panel.gridPos) {
        console.log('panel without gridpos');
        continue;
      }

      if (panel.collapsed) {
        this.props.dashboard.toggleRow(panel);
      }

      const panelPos: ReactGridLayout.Layout = {
        i: panel.key,
        x: panel.gridPos.x,
        y: panel.gridPos.y,
        w: panel.gridPos.w,
        h: panel.gridPos.h,
      };

      if (panel.type === 'row') {
        panelPos.w = GRID_COLUMN_COUNT;
        panelPos.h = 1;
        panelPos.isResizable = false;
        panelPos.isDraggable = panel.collapsed;
      }

      // Calculate max Y of the panel
      let maxY = 0;
      for (let i = panelPos.x; i < panelPos.x + panelPos.w; i++) {
        const startY = panelYPerColumn[i]; // + offsetPerColumn[i];
        if (startY > maxY) {
          maxY = startY;
        }
      }
      panelPos.y = maxY;

      const startingPage = Math.floor(maxY / this.pageLineCount);
      const endingPage = Math.floor((maxY + panelPos.h - 1) / this.pageLineCount);
      // Panel about to be cut
      // TODO: If panel too big to be displayed on one page only - do nothing but could reduce it to fit in one page
      console.log(
        `[Panel ${panel.title}] comparing starting page ${startingPage} with ending page ${endingPage} (maxY ${maxY}, h ${panelPos.h})`
      );
      if (panelPos.h <= this.pageLineCount && startingPage !== endingPage) {
        let newY = Math.floor((maxY + panelPos.h) / this.pageLineCount) * this.pageLineCount;
        console.log(`[Panel ${panel.title}] panel about to be cut, old y: ${panelPos.y}, new y: ${newY}`);

        // If previous panel is a row, put it on the new page as well
        if (idx - 1 > 0 && this.props.dashboard.panels[idx - 1].type === 'row') {
          panelLayoutMap[this.props.dashboard.panels[idx - 1].key].y += 1;
          newY += 1;
        }

        const offset = newY - panelPos.y;
        panelPos.y = newY;

        // Update offset and previous panels to be bigger
        const previousPanels: string[] = [];
        for (let i = 0; i < 24; i++) {
          panelYPerColumn[i] += offset;
          if (!previousPanels.includes(lastPanelKeyPerColumn[i])) {
            previousPanels.push(lastPanelKeyPerColumn[i]);
          }
        }
        for (const id of previousPanels) {
          console.log('updating previous panel: ', id, offset);
          panelLayoutMap[id].h += offset;
        }
      }

      for (let i = panelPos.x; i < panelPos.x + panelPos.w; i++) {
        panelYPerColumn[i] = panelPos.y + panelPos.h;
        if (panel.type !== 'row') {
          lastPanelKeyPerColumn[i] = panel.key;
        }
      }

      panelLayoutMap[panel.key] = panelPos;
    }

    const layout: ReactGridLayout.Layout[] = [];
    for (const key in panelLayoutMap) {
      layout.push(panelLayoutMap[key]);
    }

    return layout;
  }

  onLayoutChange = (newLayout: ReactGridLayout.Layout[]) => {
    console.log('on layout change');
    if (this.state.panelFilter) {
      return;
    }
    for (const newPos of newLayout) {
      this.panelMap[newPos.i!].updateGridPos(newPos, this.isLayoutInitialized);
    }

    if (this.isLayoutInitialized) {
      this.isLayoutInitialized = true;
    }

    this.props.dashboard.sortPanelsByGridPos();
    this.forceUpdate();
  };

  triggerForceUpdate = () => {
    this.forceUpdate();
  };

  updateGridPos = (item: ReactGridLayout.Layout, layout: ReactGridLayout.Layout[]) => {
    this.panelMap[item.i!].updateGridPos(item);
  };

  onResize: ItemCallback = (layout, oldItem, newItem) => {
    const panel = this.panelMap[newItem.i!];
    panel.updateGridPos(newItem);
  };

  onResizeStop: ItemCallback = (layout, oldItem, newItem) => {
    this.updateGridPos(newItem, layout);
  };

  onDragStop: ItemCallback = (layout, oldItem, newItem) => {
    this.updateGridPos(newItem, layout);
  };

  getPanelScreenPos(panel: PanelModel, gridWidth: number): { top: number; bottom: number } {
    let top = 0;

    // mobile layout
    if (gridWidth < config.theme2.breakpoints.values.md) {
      // In mobile layout panels are stacked so we just add the panel vertical margin to the last panel bottom position
      top = this.lastPanelBottom + GRID_CELL_VMARGIN;
    } else {
      // For top position we need to add back the vertical margin removed by translateGridHeightToScreenHeight
      top = translateGridHeightToScreenHeight(panel.gridPos.y) + GRID_CELL_VMARGIN;
    }

    this.lastPanelBottom = top + translateGridHeightToScreenHeight(panel.gridPos.h);

    return { top, bottom: this.lastPanelBottom };
  }

  renderPanels(gridWidth: number, isDashboardDraggable: boolean) {
    const { panelFilter } = this.state;
    const panelElements = [];

    // Reset last panel bottom
    this.lastPanelBottom = 0;

    // This is to avoid layout re-flows, accessing window.innerHeight can trigger re-flow
    // We assume here that if width change height might have changed as well
    if (this.gridWidth !== gridWidth) {
      this.windowHeight = window.innerHeight ?? 1000;
      this.windowWidth = window.innerWidth;
      this.gridWidth = gridWidth;
    }

    for (const panel of this.props.dashboard.panels) {
      const panelClasses = classNames({ 'react-grid-item--fullscreen': panel.isViewing });

      // used to allow overflowing content to show on top of the next panel
      // requires parent create stacking context to prevent overlap with parent elements
      const descIndex = this.props.dashboard.panels.length - panelElements.length;

      const p = (
        <GrafanaGridItem
          key={panel.key}
          className={panelClasses}
          descendingOrderIndex={descIndex}
          data-panelid={panel.id}
          gridPos={panel.gridPos}
          gridWidth={gridWidth}
          windowHeight={this.windowHeight}
          windowWidth={this.windowWidth}
          isViewing={panel.isViewing}
        >
          {(width: number, height: number) => {
            return this.renderPanel(panel, width, height, isDashboardDraggable);
          }}
        </GrafanaGridItem>
      );

      if (!panelFilter) {
        panelElements.push(p);
      } else {
        if (panelFilter.test(panel.title)) {
          panelElements.push(p);
        }
      }
    }

    return panelElements;
  }

  renderPanel(panel: PanelModel, width: number, height: number, isDraggable: boolean) {
    if (panel.type === 'row') {
      return <DashboardRow key={panel.key} panel={panel} dashboard={this.props.dashboard} />;
    }

    // Todo: Remove this when we remove the emptyDashboardPage toggle
    if (panel.type === 'add-panel') {
      return <AddPanelWidget key={panel.key} panel={panel} dashboard={this.props.dashboard} />;
    }

    if (panel.type === 'add-library-panel') {
      return <AddLibraryPanelWidget key={panel.key} panel={panel} dashboard={this.props.dashboard} />;
    }

    return (
      <DashboardPanel
        key={panel.key}
        stateKey={panel.key}
        panel={panel}
        dashboard={this.props.dashboard}
        isEditing={panel.isEditing}
        isViewing={panel.isViewing}
        isDraggable={isDraggable}
        width={width}
        height={height}
        hideMenu={this.props.hidePanelMenus}
      />
    );
  }

  renderPages() {
    if (this.props.printOptions?.mode === Mode.Preview && this.props.printOptions?.pageBreaks && this.wrapperDivRef) {
      const pageElements = [];
      this.pageLineCount = 17;
      if (this.props.printOptions?.orientation === Orientation.Portrait) {
        this.pageLineCount = 26;
      }
      this.pageLineCount *= this.props.printOptions?.scaleFactor || 1;
      const pageHeight = (GRID_CELL_HEIGHT + GRID_CELL_VMARGIN) * this.pageLineCount;
      const pageCount = Math.floor(this.wrapperDivRef.offsetHeight / pageHeight);
      for (let i = 1; i <= pageCount; i++) {
        pageElements.push(<DashboardPage marginTop={i * pageHeight - 14} key={`page-break-${i}`} />);
      }

      return pageElements;
    }

    return [];
  }

  /**
   * Without this hack the move animations are triggered on initial load and all panels fly into position.
   * This can be quite distracting and make the dashboard appear to less snappy.
   */
  onGetWrapperDivRef = (ref: HTMLDivElement | null) => {
    if (ref && contextSrv.user.authenticatedBy !== 'render') {
      setTimeout(() => {
        ref.classList.add('react-grid-layout--enable-move-animations');
      }, 50);

      this.wrapperDivRef = ref;
    }
  };

  // optimizeForPrinting() {
  //   const pageLineCount = 16;
  //   const panelYPerColumn = Array(24).fill(0);
  //   const offsetPerColumn = Array(24).fill(0);
  //   const lastPanelIDsPerColumn = Array(24).fill(0);
  //   for (let idx = 0; idx < this.props.dashboard.panels.length; idx++) {
  //     const panel = this.props.dashboard.panels[idx];
  //     const gridPos = panel.gridPos;
  //     const newPos = {
  //       h: panel.gridPos.h,
  //       w: panel.gridPos.w,
  //       x: panel.gridPos.x,
  //       y: panel.gridPos.y,
  //     };
  //
  //     // Calculate max Y of the panel
  //     let maxY = 0;
  //     for (let i = gridPos.x; i < gridPos.x + gridPos.w; i++) {
  //       const startY = panelYPerColumn[i] + offsetPerColumn[i];
  //       if (startY > maxY) {
  //         maxY = startY;
  //       }
  //     }
  //     newPos.y = maxY;
  //     panel.updateGridPos(newPos, false);
  //
  //     // Panel about to be cut
  //     const startingPage = Math.floor(maxY / pageLineCount);
  //     const endingPage = Math.floor((maxY + gridPos.h) / pageLineCount);
  //     // console.log(
  //     //   `[Panel ${panel.title}] comparing starting page ${startingPage} with ending page ${endingPage} (maxY ${maxY}, h ${gridPos.h})`
  //     // );
  //     // TODO: If panel too big to be displayed on one page only - do nothing but could reduce it to fit in one page
  //     if (gridPos.h <= pageLineCount && startingPage !== endingPage) {
  //       const newY = Math.floor((maxY + gridPos.h) / pageLineCount) * pageLineCount;
  //       console.log(`[Panel ${panel.title}] panel about to be cut, old y: ${gridPos.y}, new y: ${newY}`);
  //       const previousPanels: number[] = [];
  //       for (let i = gridPos.x; i < gridPos.x + gridPos.w; i++) {
  //         offsetPerColumn[i] = newY - gridPos.y;
  //         if (!previousPanels.includes(lastPanelIDsPerColumn[i])) {
  //           previousPanels.push(lastPanelIDsPerColumn[i]);
  //         }
  //       }
  //       for (const id of previousPanels) {
  //         console.log('about to update previous panel: ', id);
  //         const previousPanel = this.props.dashboard.panels[id];
  //         const newPos = {
  //           h: previousPanel.gridPos.h,
  //           w: previousPanel.gridPos.w,
  //           x: previousPanel.gridPos.x,
  //           y: previousPanel.gridPos.y,
  //         };
  //         newPos.h += newY - gridPos.y;
  //         previousPanel.updateGridPos(newPos, false);
  //       }
  //       gridPos.y = newY;
  //     }
  //
  //     for (let i = gridPos.x; i < gridPos.x + gridPos.w; i++) {
  //       panelYPerColumn[i] = gridPos.y + gridPos.h;
  //       lastPanelIDsPerColumn[i] = idx;
  //     }
  //   }
  // }

  render() {
    const { isEditable, dashboard } = this.props;

    if (config.featureToggles.emptyDashboardPage && dashboard.panels.length === 0) {
      return <DashboardEmpty dashboard={dashboard} canCreate={isEditable} />;
    }

    /**
     * We have a parent with "flex: 1 1 0" we need to reset it to "flex: 1 1 auto" to have the AutoSizer
     * properly working. For more information go here:
     * https://github.com/bvaughn/react-virtualized/blob/master/docs/usingAutoSizer.md#can-i-use-autosizer-within-a-flex-container
     *
     * pos: rel + z-index is required to create a new stacking context to contain the escalating z-indexes of the panels
     */
    return (
      <div
        style={{
          flex: '1 1 auto',
          position: 'relative',
          zIndex: 1,
          display: this.props.editPanel ? 'none' : undefined,
        }}
      >
        <AutoSizer disableHeight>
          {({ width }) => {
            if (width === 0) {
              return null;
            }

            // Disable draggable if mobile device, solving an issue with unintentionally
            // moving panels. https://github.com/grafana/grafana/issues/18497
            const draggable = width <= config.theme2.breakpoints.values.md ? false : isEditable;

            return (
              /**
               * The children is using a width of 100% so we need to guarantee that it is wrapped
               * in an element that has the calculated size given by the AutoSizer. The AutoSizer
               * has a width of 0 and will let its content overflow its div.
               */
              <div style={{ width: width, height: '100%' }} ref={this.onGetWrapperDivRef}>
                <ReactGridLayout
                  width={width}
                  isDraggable={draggable}
                  isResizable={isEditable}
                  containerPadding={[0, 0]}
                  useCSSTransforms={false}
                  margin={[GRID_CELL_VMARGIN, GRID_CELL_VMARGIN]}
                  cols={GRID_COLUMN_COUNT}
                  rowHeight={GRID_CELL_HEIGHT}
                  draggableHandle=".grid-drag-handle"
                  draggableCancel=".grid-drag-cancel"
                  layout={
                    this.props.printOptions?.mode && this.props.printOptions?.pageBreaks
                      ? this.buildPrintableLayout()
                      : this.buildLayout()
                  }
                  onDragStop={this.onDragStop}
                  onResize={this.onResize}
                  onResizeStop={this.onResizeStop}
                  onLayoutChange={this.onLayoutChange}
                >
                  {this.renderPanels(width, draggable)}
                </ReactGridLayout>
                {this.renderPages()}
              </div>
            );
          }}
        </AutoSizer>
      </div>
    );
  }
}

interface GrafanaGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  gridWidth?: number;
  gridPos?: GridPos;
  descendingOrderIndex?: number;
  isViewing: boolean;
  windowHeight: number;
  windowWidth: number;
  children: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * A hacky way to intercept the react-layout-grid item dimensions and pass them to DashboardPanel
 */
const GrafanaGridItem = React.forwardRef<HTMLDivElement, GrafanaGridItemProps>((props, ref) => {
  const theme = config.theme2;
  let width = 100;
  let height = 100;

  const { gridWidth, gridPos, isViewing, windowHeight, windowWidth, descendingOrderIndex, ...divProps } = props;
  const style: CSSProperties = props.style ?? {};

  if (isViewing) {
    // In fullscreen view mode a single panel take up full width & 85% height
    width = gridWidth!;
    height = windowHeight * 0.85;
    style.height = height;
    style.width = '100%';
  } else if (windowWidth < theme.breakpoints.values.md) {
    // Mobile layout is a bit different, every panel take up full width
    width = props.gridWidth!;
    height = translateGridHeightToScreenHeight(gridPos!.h);
    style.height = height;
    style.width = '100%';
  } else {
    // Normal grid layout. The grid framework passes width and height directly to children as style props.
    if (props.style) {
      const { width: styleWidth, height: styleHeight } = props.style;
      if (styleWidth != null) {
        width = typeof styleWidth === 'number' ? styleWidth : parseFloat(styleWidth);
      }
      if (styleHeight != null) {
        height = typeof styleHeight === 'number' ? styleHeight : parseFloat(styleHeight);
      }
    }
  }

  // props.children[0] is our main children. RGL adds the drag handle at props.children[1]
  return (
    <div {...divProps} style={{ ...divProps.style, zIndex: descendingOrderIndex }} ref={ref}>
      {/* Pass width and height to children as render props */}
      {[props.children[0](width, height), props.children.slice(1)]}
    </div>
  );
});

/**
 * This translates grid height dimensions to real pixels
 */
function translateGridHeightToScreenHeight(gridHeight: number): number {
  return gridHeight * (GRID_CELL_HEIGHT + GRID_CELL_VMARGIN) - GRID_CELL_VMARGIN;
}

GrafanaGridItem.displayName = 'GridItemWithDimensions';

interface DashboardPageProps {
  marginTop: number;
}

const DashboardPage: FC<DashboardPageProps> = ({ marginTop }) => {
  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        width: '100%',
        zIndex: 1000,
        top: marginTop,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          flexGrow: 1,
          borderBottom: '2px dashed black',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'end',
          margin: '0 .5em',
          // backgroundColor: 'white',
        }}
      >
        Page Break
      </div>
      <div
        style={{
          flexGrow: 1,
          borderBottom: '2px dashed black',
        }}
      />
    </div>
  );
};
