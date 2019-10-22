import React from "react";
import { render } from "react-dom";
import CustomTimeline from "./CustomTimeline";
import "react-calendar-timeline/lib/Timeline.css";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

const App = () => (
  <div>
    <DndProvider backend={HTML5Backend}>
      <CustomTimeline />
    </DndProvider>
  </div>
);

render(<App />, document.getElementById("root"));
