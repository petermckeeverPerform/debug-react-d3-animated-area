import { useEffect, useRef, useMemo } from "react";
import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { line, area, curveCatmullRom } from "d3-shape";
import { transition } from "d3-transition";
import { interpolate } from "d3-interpolate";
import { easeLinear } from "d3-ease";

import data from "./data/data.json";

import "./App.scss";

const $ANIMATE_OPTS = {
  delay: 500,
  duration: 1000,
  ease: easeLinear,
};
const $CURVE = curveCatmullRom;

function App() {
  const lineRef = useRef();
  const areaRef = useRef();

  // d3-transition and eslint throw errors when importing individual d3 libs, supresses this
  transition();

  // this should be a hook that updates with some resize eventListener - memoizing here for sake of example
  const dimensions = useMemo(
    () => ({
      width: 600,
      height: 400,
      margin: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
      boundedWidth: 600 - 10 - 10,
      boundedHeight: 400 - 10 - 10,
    }),
    []
  );

  useEffect(() => {
    // clearing path drawing
    select(lineRef.current).attr("d", "");
    select(areaRef.current).attr("d", "");

    if (!data) return;

    const xScale = scaleLinear()
      .domain(extent(data, (d) => d.xValue))
      .range([0, dimensions.boundedWidth]);

    const yScale = scaleLinear()
      .domain(extent(data, (d) => d.yValue))
      .range([dimensions.boundedHeight, 0]);

    const xAccessor = (d) => d.xValue;
    const yAccessor = (d) => d.yValue;

    const lineGenerator = line()
      .x((d) => xScale(xAccessor(d)))
      .y((d) => yScale(yAccessor(d)))
      .curve($CURVE);

    // initial area generator
    const areaGenerator = area()
      .x((d) => xScale(xAccessor(d)))
      .y0(yScale(0))
      .y1((d) => yScale(yAccessor(d)))
      .curve($CURVE);

    /**
     * This generator is used tohande the SVG Elements that are returned
     * from getPointAtLength in attrTween when transitioning the area
     */
    const areaGeneratorInterpolated = area()
      .x((d) => d.x)
      .y0(yScale(0))
      .y1((d) => d.y)
      .curve($CURVE);

    // drawing the line
    const path = select(lineRef.current);

    let prevLength = 0;
    if (path.node().getTotalLength() > 0) {
      prevLength = path.node().getTotalLength();
    }
    path.attr("d", lineGenerator(data));
    const length = path.node().getTotalLength();

    path
      .attr("stroke", "#bbb")
      .attr("stroke-dasharray", `${length} ${length}`)
      .attr("stroke-dashoffset", length - prevLength)
      .transition("animated-line")
      .delay($ANIMATE_OPTS.delay)
      .duration($ANIMATE_OPTS.duration)
      .ease($ANIMATE_OPTS.ease)
      .attr("stroke-dashoffset", 0);

    // drawing the area
    const areaPath = select(areaRef.current);
    areaPath
      .attr("d", areaGenerator(data))
      .attr("opacity", 0.4)
      .transition("animated-area")
      .delay($ANIMATE_OPTS.delay)
      .duration($ANIMATE_OPTS.duration)
      .ease($ANIMATE_OPTS.ease)
      .attr("fill", "#fe7aae")
      .attrTween("d", function () {
        let p = path.node();
        let l = p.getTotalLength();
        let i = interpolate(0, l);
        const accumulatedDataPoints = []; // array to hold accumulated datapoints
        return function (t) {
          const { x, y } = p.getPointAtLength(i(t));
          accumulatedDataPoints.push({ x, y }); // on every iteration get a point on the line
          return areaGeneratorInterpolated(accumulatedDataPoints); // draw area - note this is using areaGeneratorInterpolated
        };
      });
  }, [dimensions]);

  return (
    <div className="App">
      <div className="container">
        <svg width={dimensions.width} height={dimensions.height}>
          <g
            className="bounds"
            transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}
          >
            <path ref={lineRef} fill="none" d="" />
            <path ref={areaRef} fill="none" d="" />
          </g>
        </svg>
      </div>
    </div>
  );
}
export default App;
