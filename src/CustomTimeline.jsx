import React, { Component } from "react";
import moment from "moment";
import * as d3 from "d3";

import Timeline, {
  RowItems,
  GroupRow,
  HelpersContext
} from "react-calendar-timeline";
import TimelineStateContext from 'react-calendar-timeline/lib/lib/timeline/TimelineStateContext'
import generateFakeData from "./generate-fake-data";

var keys = {
  groupIdKey: "id",
  groupTitleKey: "title",
  groupRightTitleKey: "rightTitle",
  itemIdKey: "id",
  itemTitleKey: "title",
  itemDivTitleKey: "title",
  itemGroupKey: "group",
  itemTimeStartKey: "start",
  itemTimeEndKey: "end",
  groupLabelKey: "title"
};

export default class App extends Component {
  constructor(props) {
    super(props);

    const { groups, items } = generateFakeData(20, 200, 10);
    const defaultTimeStart = moment()
      .startOf("day")
      .toDate();
    const defaultTimeEnd = moment()
      .startOf("day")
      .add(1, "day")
      .toDate();

    this.state = {
      groups,
      items,
      defaultTimeStart,
      defaultTimeEnd,
      timelineLinks: []
      // timelineLinks: items
      //   .map(item => {
      //     const endItem = this.getRandomItemAfterItem(items, item);
      //     if (endItem) return [item.id, endItem.id];
      //     return undefined;
      //   })
      //   .filter(i => !!i)
    };
  }

  getRandomItem = items => {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  };

  getRandomItemAfterItem = (items, item) => {
    for (let index = 0; index < items.length; index++) {
      const randomItem = this.getRandomItem(items);
      if (randomItem.start > item.start) return randomItem;
    }
    return undefined;
  };

  handleItemMove = (itemId, dragTime, newGroupId) => {
    const { items, groups } = this.state;

    this.setState({
      items: items.map(item =>
        item.id === itemId
          ? Object.assign({}, item, {
              start: dragTime,
              end: dragTime + (item.end - item.start),
              group: newGroupId
            })
          : item
      )
    });

    console.log("Moved", itemId, dragTime, newGroupId);
  };

  handleItemResize = (itemId, time, edge) => {
    const { items } = this.state;

    this.setState({
      items: items.map(item =>
        item.id === itemId
          ? Object.assign({}, item, {
              start: edge === "left" ? time : item.start,
              end: edge === "left" ? item.end : time
            })
          : item
      )
    });

    console.log("Resized", itemId, time, edge);
  };

  getItemFromId = id => {
    return this.state.items.find(i => i.id === id);
  };

  getGroupIndexFromId = id => {
    return this.state.groups.findIndex(i => i.id === id);
  };

  tempItemId = undefined;

  handleItemSelect = (itemId, _, time) => {
    if (!this.tempItemId) {
      this.tempItemId = itemId;
    } else {
      const alreadyExist = this.state.timelineLinks.find(([startId, endId]) => {
        const matchStart =
          startId === this.tempItemId || endId === this.tempItemId;
        const matchEnd = startId === itemId || endId === itemId;
        return matchStart && matchEnd;
      });
      if (alreadyExist) return;
      if (this.tempItemId === itemId) return;
      const tempItem = this.getItemFromId(this.tempItemId);
      const item = this.getItemFromId(itemId);
      const isBefore = item.start - tempItem.start < 0;
      const link = isBefore
        ? [itemId, this.tempItemId]
        : [this.tempItemId, itemId];
      this.setState(
        state => ({
          timelineLinks: [...state.timelineLinks, link]
        }),
        () => {
          this.tempItemId = undefined;
        }
      );
    }
    console.log("Selected: " + itemId, moment(time).format());
  };

  handleCanvasClick = () => {
    this.tempItemId = undefined;
  };

  render() {
    const { groups, items, defaultTimeStart, defaultTimeEnd } = this.state;

    return (
      <React.Fragment>
        <Timeline
          groups={groups}
          items={items}
          keys={keys}
          itemTouchSendsClick={false}
          stackItems
          itemHeightRatio={0.75}
          showCursorLine
          canMove={false}
          canResize={false}
          defaultTimeStart={defaultTimeStart}
          defaultTimeEnd={defaultTimeEnd}
          onItemMove={this.handleItemMove}
          onItemResize={this.handleItemResize}
          onItemSelect={this.handleItemSelect}
          onCanvasClick={this.handleCanvasClick}
          rowRenderer={({
            rowData,
            getLayerRootProps,
            group,
            itemsWithInteractions
          }) => {
            const helpers = React.useContext(HelpersContext);
            const { timelineLinks } = rowData;
            return (
              <GroupRow>
                <RowItems />
                <Links
                  timelineLinks={timelineLinks}
                  getItemAbsoluteLocation={helpers.getItemAbsoluteLocation}
                  getItemDimensions={helpers.getItemDimensions}
                  group={group}
                  getLayerRootProps={getLayerRootProps}
                  items={itemsWithInteractions}
                  getGroupDimensions={helpers.getGroupDimensions}
                />
              </GroupRow>
            );
          }}
          rowData={{ timelineLinks: this.state.timelineLinks }}
        />
      </React.Fragment>
    );
  }
}

function Link({
  timelineLink,
  getItemAbsoluteLocation,
  getItemDimensions,
  group,
  items,
  getGroupDimensions
}) {
  const {getTimelineState} = React.useContext(TimelineStateContext);
  const  {canvasWidth} = getTimelineState()
  const [startId, endId] = timelineLink;
  const startItem = items.find(i => i.id === startId);
  if (startItem.group !== group.id) return null;
  const endItem = items.find(i => i.id === endId);
  const startItemDimensions = getItemAbsoluteLocation(startId);
  const endItemDimensions = getItemAbsoluteLocation(endId);
  let startLink, endLink, itemDimensions;
  if(!endItemDimensions){
    const endItemGroup = endItem.group;
    const groupDimension = getGroupDimensions(endItemGroup);
    endLink = [canvasWidth, groupDimension.top];
  }
  else {
    endLink = [endItemDimensions.left, endItemDimensions.top];
  }
  if (!startItemDimensions) {
    const startItemGroup = startItem.group;
    const groupDimension = getGroupDimensions(startItemGroup);
    startLink = [0, groupDimension.top];
    itemDimensions = { top: 0 };
  } else {
    startLink = [startItemDimensions.left, startItemDimensions.top];
    itemDimensions = getItemDimensions(startId);
  }
  //reverse top if switch links and
  const isEndLinkBellowStart = endLink[1] - startLink[1] < 0;
  const lineGenerator = d3.line();
  const startPoint = isEndLinkBellowStart
    ? [0, Math.abs(endLink[1] - startLink[1])]
    : [0, 0];
  const endPoint = isEndLinkBellowStart
    ? [endLink[0] - startLink[0], 0]
    : [endLink[0] - startLink[0], Math.abs(endLink[1] - startLink[1])];
  return (
    <svg
      style={{
        position: "absolute",
        left: startLink[0],
        zIndex: 200,
        top: isEndLinkBellowStart
          ? endLink[1] - startLink[1] + itemDimensions.top
          : itemDimensions.top,
        height: Math.abs(endLink[1] - startLink[1]) || 2,
        //handle case where endPoint is 0
        width: endLink[0] - startLink[0] || 2,
        pointerEvents: "none"
      }}
    >
      <path
        d={lineGenerator([startPoint, endPoint])}
        stroke="red"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

const Links = React.memo(
  ({
    timelineLinks,
    getItemAbsoluteLocation,
    getItemDimensions,
    group,
    getLayerRootProps,
    items,
    getGroupDimensions
  }) => {
    return (
      <div {...getLayerRootProps()}>
        {timelineLinks.map((timelineLink, i) => {
          const [startId, endId] = timelineLink;
          return (
            <Link
              timelineLink={timelineLink}
              key={`${startId}${endId}`}
              getItemAbsoluteLocation={getItemAbsoluteLocation}
              getItemDimensions={getItemDimensions}
              group={group}
              items={items}
              getGroupDimensions={getGroupDimensions}
            />
          );
        })}
      </div>
    );
  }
);
