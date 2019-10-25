import React, { Component } from "react";
import moment from "moment";
import Timeline, {
  RowItems,
  GroupRow,
  HelpersContext
} from "react-calendar-timeline";
import TimelineStateContext from "react-calendar-timeline/lib/lib/timeline/TimelineStateContext";
import generateFakeData from "./generate-fake-data";
import { Spring } from "react-spring/renderprops";

const ITEM_HEIGHT = 22.5;

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
    const visibleTimeStart = moment()
      .startOf("day")
      .valueOf();
    const visibleTimeEnd = moment()
      .startOf("day")
      .add(1, "day")
      .valueOf();

    this.state = {
      groups,
      items,
      visibleTimeStart,
      visibleTimeEnd,
      timelineLinks: [],
      scrolling: true
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

  handleTimeChange = (visibleTimeStart, visibleTimeEnd) => {
    this.setState({
      visibleTimeStart,
      visibleTimeEnd,
      scrolling: true
    });
  };

  scrollToItem = itemId => {
    const item = this.state.items.find(i => i.id === itemId);
    if (item) {
      const zoom = this.state.visibleTimeEnd - this.state.visibleTimeStart;
      this.setState({
        visibleTimeStart: item.start - zoom / 2,
        visibleTimeEnd: item.start + zoom / 2,
        scrolling: false
      });
    }
  };

  handleSelectChange = e => {
    this.scrollToItem(e.target.value);
  };

  render() {
    const { groups, items, visibleTimeStart, visibleTimeEnd } = this.state;

    return (
      <React.Fragment>
        <select onChange={this.handleSelectChange} style={{ marginBottom: 10 }}>
          {this.state.items.map(item => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <Spring
          config={{ duration: 250 }}
          to={{ visibleTimeStart, visibleTimeEnd }}
          immediate={this.state.scrolling}
        >
          {props => (
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
              visibleTimeStart={props.visibleTimeStart}
              visibleTimeEnd={props.visibleTimeEnd}
              onItemMove={this.handleItemMove}
              onItemResize={this.handleItemResize}
              onItemSelect={this.handleItemSelect}
              onCanvasClick={this.handleCanvasClick}
              onTimeChange={this.handleTimeChange}
              rowRenderer={RowRenderer}
              rowData={{ timelineLinks: this.state.timelineLinks }}
            />
          )}
        </Spring>
      </React.Fragment>
    );
  }
}

function RowRenderer({
  rowData,
  getLayerRootProps,
  group,
  itemsWithInteractions
}) {
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
}

function Link({
  timelineLink,
  getItemAbsoluteLocation,
  getItemDimensions,
  group,
  items,
  getGroupDimensions
}) {
  const { getTimelineState } = React.useContext(TimelineStateContext);
  const { canvasWidth } = getTimelineState();
  const [startId, endId] = timelineLink;
  const startItem = items.find(i => i.id === startId);
  if (startItem.group !== group.id) return null;
  const endItem = items.find(i => i.id === endId);
  const startItemDimensions = getItemAbsoluteLocation(startId);
  const endItemDimensions = getItemAbsoluteLocation(endId);
  let startLink, endLink, itemDimensions, startPointX;
  if (!startItemDimensions) {
    const startItemGroup = startItem.group;
    const groupDimension = getGroupDimensions(startItemGroup);
    //if start point doens't exist then replace it with an end point at the end of the screen to show start point out of screen
    startLink = [0, groupDimension.top];
    //item dimension is needed to decide the top of the absolute posion of the svg relative to the row
    itemDimensions = { top: 0 };
    startPointX = 0;
  } else {
    startLink = [startItemDimensions.left, startItemDimensions.top];
    itemDimensions = getItemDimensions(startId);
    startPointX = startItemDimensions.width;
  }
  if (!endItemDimensions) {
    const endItemGroup = endItem.group;
    const groupDimension = getGroupDimensions(endItemGroup);
    //if end point doens't exist then replace it with an end point at the end of the screen to show end point out of screen
    endLink = [canvasWidth, groupDimension.top];
  } else {
    endLink = [endItemDimensions.left, endItemDimensions.top];
  }
  //reverse top if switch links and
  const isEndLinkBellowStart = endLink[1] - startLink[1] < 0;
  const startPoint = isEndLinkBellowStart
    ? [startPointX, Math.abs(endLink[1] - startLink[1])]
    : [startPointX, 0];
  const endPoint = isEndLinkBellowStart
    ? [endLink[0] - startLink[0], 0]
    : [endLink[0] - startLink[0], Math.abs(endLink[1] - startLink[1])];
  //width of the svg should be atleast the width of the start item / needed when end time of the start item before start time of the end item
  const svgWidth =
    endLink[0] - startLink[0] > startPointX
      ? endLink[0] - startLink[0]
      : startPointX;
  return (
    <svg
      style={{
        position: "absolute",
        left: startLink[0],
        zIndex: 200,
        top: isEndLinkBellowStart
          ? endLink[1] - startLink[1] + itemDimensions.top
          : itemDimensions.top,
        height: (Math.abs(endLink[1] - startLink[1]) || 4) + ITEM_HEIGHT,
        //handle case where endPoint is 0
        width: svgWidth,
        pointerEvents: "none"
      }}
    >
      <path
        //account
        d={getPath(
          { x: startPoint[0], y: startPoint[1] + ITEM_HEIGHT / 2 },
          { x: endPoint[0], y: endPoint[1] + ITEM_HEIGHT / 2 }
        )}
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

function calcNormCoordinates(start, end) {
  let cpt1 = { x: 0, y: 0 };
  let cpt2 = { x: 0, y: 0 };
  let middle = 0;
  middle = start.x + (end.x - start.x) / 2;
  cpt1 = { x: middle, y: start.y };
  cpt2 = { x: middle, y: end.y };
  return { cpt1: cpt1, cpt2: cpt2 };
}

function calcSCoordinates(start, end) {
  let cpt1 = {
    x: start.x,
    y: start.y
  };
  let halfY = (end.y - start.y) / 2;
  let cpt2 = { x: cpt1.x, y: cpt1.y + halfY };
  let cpt3 = { x: end.x, y: cpt2.y };
  let cpt4 = { x: cpt3.x, y: cpt3.y + halfY };
  return { cpt1: cpt1, cpt2: cpt2, cpt3: cpt3, cpt4: cpt4 };
}

function getPath(start, end) {
  let coordinates = null;
  if (start.x > end.x) {
    coordinates = calcSCoordinates(start, end);
    return `M${start.x} ${start.y}  ${coordinates.cpt1.x} ${
      coordinates.cpt1.y
    } ${coordinates.cpt2.x} ${coordinates.cpt2.y} ${coordinates.cpt3.x} ${
      coordinates.cpt3.y
    } ${coordinates.cpt4.x} ${coordinates.cpt4.y} ${end.x} ${end.y}`;
  } else {
    coordinates = calcNormCoordinates(start, end);
    return `M${start.x} ${start.y}  ${coordinates.cpt1.x} ${
      coordinates.cpt1.y
    } ${coordinates.cpt2.x} ${coordinates.cpt2.y} ${end.x} ${end.y}`;
  }
}
