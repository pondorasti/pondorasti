import { Button } from "@base-ui/react/button"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import {
  CircleHelp,
  Contrast,
  FlipHorizontal2,
  Image,
  LayoutGrid,
  Minus,
  Move,
  PanelLeft,
  PanelRight,
  Plus,
  RotateCw,
  Scan,
  Square
} from "lucide-react"
import { formatDate } from "~/dicom/format"
import { bundledStudy } from "~/dicom/study"
import type { Filmroom } from "~/viewer/use-filmroom"
import type { Tool } from "~/viewer/view"
import { cx, Divider, Hint } from "./controls"

const icon = { size: 19, strokeWidth: 1.65 }

export function Header({ app }: { app: Filmroom }) {
  return (
    <header className="surface-header z-2 flex min-h-16 shrink-0 border-b border-black/12 shadow-[inset_0_1px_#fff,0_1px_3px_#00000005] backdrop-blur-[28px] backdrop-saturate-160 md:h-16 dark:border-black/33 dark:shadow-[inset_0_1px_#ffffff0a,0_1px_3px_#00000015]">
      {app.sidebar && (
        <div className="hidden w-(--sidebar) shrink-0 items-center gap-2.5 self-stretch border-r border-line bg-brand px-4 text-[15px] font-[650] tracking-[-0.3px] sm:flex lg:px-5">
          <span className="grid size-7.25 place-items-center rounded-[7px] bg-[linear-gradient(150deg,#5cc1fa,#107dfa_65%,#1865da)] text-white shadow-[inset_0_0_0_1px_#00000009,inset_0_1px_#ffffff60,0_1px_2px_#00000015]">
            <Image size={20} strokeWidth={1.5} />
          </span>
          Filmroom
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.25 gap-y-1.75 p-3 sm:py-2.25 md:flex-nowrap md:gap-2 md:py-0 lg:gap-3 lg:px-4">
        <PanelToggle
          label="Show or hide sidebar"
          pressed={app.sidebar}
          onPressedChange={app.setSidebar}
        >
          <PanelLeft {...icon} />
        </PanelToggle>
        <div className="min-w-25 max-w-51 shrink-0">
          <h1 className="m-0 mb-0.75 truncate text-[13px] leading-[1.3] font-[650] tracking-[-0.25px] lg:text-sm">
            {bundledStudy.title}
          </h1>
          <span className="text-[10px] text-secondary lg:text-[11px]">
            {formatDate(bundledStudy.date)}
          </span>
        </div>
        <Toolbar app={app} />
        <div className="ml-auto flex items-center gap-2 md:ml-1 md:border-l md:border-black/7 md:pl-2 lg:ml-3 lg:gap-2.5 lg:pl-3 dark:md:border-white/10">
          <Hint
            label="Filmroom Help"
            render={
              <Button
                aria-label="Help and keyboard shortcuts"
                className="toolbar-button"
                onClick={() => app.setHelp(true)}
              />
            }
          >
            <CircleHelp size={18} strokeWidth={1.5} />
          </Hint>
          <PanelToggle
            label="Show or hide inspector"
            pressed={app.inspector}
            onPressedChange={app.setInspector}
          >
            <PanelRight {...icon} />
          </PanelToggle>
        </div>
      </div>
    </header>
  )
}

function PanelToggle({
  label,
  pressed,
  onPressedChange,
  children
}: {
  label: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Hint
      label={label}
      render={
        <Toggle
          aria-label={label}
          pressed={pressed}
          onPressedChange={onPressedChange}
          className="toolbar-button w-7.5 shrink-0 data-pressed:text-[#505058] dark:data-pressed:text-[#dedee5]"
        />
      }
    >
      {children}
    </Hint>
  )
}

function Toolbar({ app }: { app: Filmroom }) {
  const { view, ready } = app
  const disabled = !ready
  return (
    <div
      aria-label="Image controls"
      className="order-4 flex w-full items-center justify-center gap-0.75 border-t border-line pt-1.25 md:order-none md:ml-auto md:w-auto md:border-0 md:pt-0"
    >
      <ToggleGroup
        aria-label="Tool"
        disabled={disabled}
        value={[app.tool]}
        onValueChange={(value) => {
          if (value[0]) app.setTool(value[0] as Tool)
        }}
        className="flex gap-px rounded-[7px] bg-track p-0.5"
      >
        <ToolToggle value="pan" label="Pan" hint="Drag to pan (V)">
          <Move size={17} strokeWidth={1.65} />
        </ToolToggle>
        <ToolToggle value="window" label="Window" hint="Drag to adjust contrast and brightness (W)">
          <Contrast size={17} strokeWidth={1.65} />
        </ToolToggle>
      </ToggleGroup>
      <Divider />
      <Hint
        label="Zoom out (−)"
        render={
          <Button
            aria-label="Zoom out"
            disabled={disabled}
            className="toolbar-button"
            onClick={() => view?.zoom(0.8)}
          />
        }
      >
        <Minus {...icon} />
      </Hint>
      <Hint
        label="View at actual size (100%)"
        render={
          <Button
            disabled={disabled}
            className="h-7 w-10.75 rounded-[5px] text-[11px] text-[#55555b] tabular-nums hover:bg-hover dark:text-[#ceced6]"
            onClick={() => view && view.zoom(1 / view.scale)}
          />
        }
      >
        {view ? `${Math.round(view.scale * 100)}%` : "100%"}
      </Hint>
      <Hint
        label="Zoom in (+)"
        render={
          <Button
            aria-label="Zoom in"
            disabled={disabled}
            className="toolbar-button"
            onClick={() => view?.zoom(1.25)}
          />
        }
      >
        <Plus {...icon} />
      </Hint>
      <Hint
        label="Fit image (F)"
        render={
          <Button
            aria-label="Fit image"
            disabled={disabled}
            className="toolbar-button"
            onClick={() => view?.fit()}
          />
        }
      >
        <Scan {...icon} />
      </Hint>
      <Divider />
      <Hint
        label="Rotate clockwise"
        render={
          <Button
            aria-label="Rotate clockwise"
            disabled={disabled}
            className="toolbar-button"
            onClick={() => view?.rotate()}
          />
        }
      >
        <RotateCw {...icon} />
      </Hint>
      <Hint
        label="Flip horizontally"
        render={
          <Toggle
            aria-label="Flip horizontally"
            disabled={disabled}
            pressed={view?.flip ?? false}
            onPressedChange={() => view?.toggleFlip()}
            className="toolbar-button data-pressed:bg-accent/8 data-pressed:text-accent"
          />
        }
      >
        <FlipHorizontal2 {...icon} />
      </Hint>
      <ToggleGroup
        aria-label="Layout"
        disabled={disabled}
        value={[app.compare ? "compare" : "single"]}
        onValueChange={(value) => {
          if (value[0]) app.setLayout(value[0] === "compare")
        }}
        className="ml-2.25 flex rounded-[7px] bg-track p-0.5"
      >
        <LayoutToggle value="single" label="Single image">
          <Square {...icon} />
        </LayoutToggle>
        <LayoutToggle value="compare" label="Compare up to four images (C)">
          <LayoutGrid {...icon} />
        </LayoutToggle>
      </ToggleGroup>
    </div>
  )
}

function ToolToggle({
  value,
  label,
  hint,
  children
}: {
  value: Tool
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Hint
      label={hint}
      render={
        <Toggle
          value={value}
          aria-label={label}
          className="segment flex h-7 items-center gap-1.75 px-1.75 text-xs text-control data-pressed:text-accent xl:px-2.25"
        />
      }
    >
      {children}
      <span className="hidden xl:inline">{label}</span>
    </Hint>
  )
}

function LayoutToggle({
  value,
  label,
  children
}: {
  value: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Hint
      label={label}
      render={
        <Toggle
          value={value}
          aria-label={label}
          className={cx(
            "segment inline-flex h-6.75 w-7.25 items-center justify-center text-control",
            "data-pressed:text-[#46464d] dark:data-pressed:text-white"
          )}
        />
      }
    >
      {children}
    </Hint>
  )
}
