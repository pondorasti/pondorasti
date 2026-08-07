import { formatDate, normalizeUtc } from "@lib/date"
import { IContributionsCollection } from "@lib/types"
import * as d3 from "d3"
import { useTheme } from "next-themes"
import { RefObject, useLayoutEffect, useRef } from "react"

function drawChart(payload: IContributionsCollection, svgRef: RefObject<SVGSVGElement>, theme: string | undefined) {
  const contributions = payload.data.user.contributionsCollection.contributionCalendar.weeks

  const chartWidth = 740
  const chartHeight = 88
  const topMargin = 12
  const leftMargin = 24

  // Source: https://github.com/github/feedback/discussions/7078
  const colorPalette = {
    dark: {
      NONE: "#171717BF", //"#161B22"
      FIRST_QUARTILE: "#0E4429",
      SECOND_QUARTILE: "#006D32",
      THIRD_QUARTILE: "#26A641",
      FOURTH_QUARTILE: "#39D353",
    },
    light: {
      NONE: "#EBEDF0BF",
      FIRST_QUARTILE: "#9BE9A8",
      SECOND_QUARTILE: "#30C463",
      THIRD_QUARTILE: "#30A14E",
      FOURTH_QUARTILE: "#216d39",
    },
    halloweenDark: {
      NONE: "#171717BF", //"#161B22"
      FIRST_QUARTILE: "#631c03",
      SECOND_QUARTILE: "#bd561d",
      THIRD_QUARTILE: "#fa7a18",
      FOURTH_QUARTILE: "#fddf68",
    },
    halloweenLight: {
      NONE: "#ebedf080",
      FIRST_QUARTILE: "#ffee4a",
      SECOND_QUARTILE: "#ffc501",
      THIRD_QUARTILE: "#fe9600",
      FOURTH_QUARTILE: "#03001c",
    },
  }
  const rectOutline = theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(27, 31, 35, 0.06)"
  const fontFamily =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
  const today = normalizeUtc(new Date()).toISOString().split("T")[0].substring(5)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const months = contributions.reduce((months, item) => {
    item.contributionDays.forEach(contribution => {
      const date = normalizeUtc(new Date(contribution.date))

      const month = date.toLocaleDateString("en-us", { month: "short" })
      if (!months.includes(month)) {
        months.push(month)
      }
    })
    return months
  }, new Array<string>())

  const svg = d3
    .select(svgRef.current)
    .attr("width", chartWidth + leftMargin)
    .attr("height", chartHeight + topMargin)

  // clean-up previous render
  svg.selectAll("*").remove()

  // Chart
  const chartContainer = svg
    .append("g")
    .attr("id", "chartContainer")
    .attr("transform", `translate(${leftMargin}, ${topMargin})`)
  const weekPaths = chartContainer
    .selectAll("g")
    .data(contributions)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(${i * 14}, 0)`)

  const firstWeek = contributions[0].contributionDays
  // contributionRects
  weekPaths
    .selectAll("rect")
    .data(d => {
      return d.contributionDays
    })
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => {
      const dayOfFirstWeek = firstWeek.find(value => value.date === d.date)
      if (dayOfFirstWeek && firstWeek.length !== 7) {
        const offset = new Date(firstWeek[0].date).getUTCDay()
        return (i + offset) * 13
      }
      return i * 13
    })
    .attr("width", 10)
    .attr("height", 10)
    .attr("rx", 2)
    .attr("ry", 2)
    .attr(
      "style",
      `shape-rendering: geometricPrecision; outline: 1px solid ${rectOutline}; outline-offset: -1px; border-radius: 2px`
    )
    .attr("fill", d => {
      if (today === "10-31") {
        return theme === "dark"
          ? colorPalette.halloweenDark[d.contributionLevel]
          : colorPalette.halloweenLight[d.contributionLevel]
      }
      return theme === "dark" ? colorPalette.dark[d.contributionLevel] : colorPalette.light[d.contributionLevel]
    })
    .append("title")
    .text(
      d =>
        `${d.contributionCount} contribution${d.contributionCount === 1 ? "" : "s"} on ${formatDate(
          normalizeUtc(new Date(d.date))
        )}`
    )

  // Top Axis
  const topAxis = svg.append("g").attr("id", "topAxis")
  topAxis
    .selectAll("text")
    .data(months)
    .enter()
    .append("text")
    .text(d => d)
    .attr("x", (d, i) => leftMargin + (chartWidth / months.length) * i)
    .attr("y", () => 7)
    .style("font-size", "9px")
    .style("font-family", fontFamily)
    .style("fill", theme === "dark" ? "#fff" : "#000")

  // Left Axis
  const leftAxis = svg.append("g").attr("id", "leftAxis")
  leftAxis
    .selectAll("text")
    .data(days)
    .enter()
    .append("text")
    .text(d => d)
    .attr("x", () => 0)
    .attr("y", (d, i) => topMargin + 9 + (chartHeight / days.length) * i)
    .attr("style", (d, i) => `display: ${i % 2 === 1 ? "block" : "none"}`)
    .style("font-size", "9px")
    .style("font-family", fontFamily)
    .style("fill", theme === "dark" ? "#fff" : "#000")
}

export default function YearlyChart({ collection }: { collection: IContributionsCollection }) {
  const { resolvedTheme } = useTheme()
  const svgRef = useRef<SVGSVGElement>(null)

  const numberOfContributions = collection.data.user.contributionsCollection.contributionCalendar.totalContributions
  const year = collection.data.user.contributionsCollection.year

  useLayoutEffect(() => {
    // exit early is ref is not defined
    if (!svgRef.current) return

    drawChart(collection, svgRef, resolvedTheme)
  }, [svgRef, collection, resolvedTheme])

  return (
    <div className="mb-8 overflow-x-scroll md:-ml-[62px] md:overflow-visible">
      <p className="text-md inline-block pb-2 pl-5 font-medium text-gray-700 dark:text-gray-300">
        {numberOfContributions} contribution{numberOfContributions === 1 ? "" : "s"} in{" "}
        {year !== undefined ? year : "the last year"}
      </p>
      <svg ref={svgRef} className="overflow-visible" />
    </div>
  )
}
