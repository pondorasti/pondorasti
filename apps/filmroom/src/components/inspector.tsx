import { Button } from "@base-ui/react/button"
import { Slider } from "@base-ui/react/slider"
import { Switch } from "@base-ui/react/switch"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { Download, Image } from "lucide-react"
import { bundledStudy } from "~/dicom/study"
import type { Filmroom } from "~/viewer/use-filmroom"
import type { View } from "~/viewer/view"

const heading = "flex items-center justify-between text-xs leading-5 font-semibold text-label"

export function Inspector({ app }: { app: Filmroom }) {
  const { view, ready } = app
  return (
    <aside
      aria-label="Display settings"
      className="order-3 grid grid-cols-2 gap-4 bg-inspector px-4 py-5 sm:order-none sm:col-start-3 sm:row-start-1 sm:flex sm:min-h-0 sm:flex-col sm:gap-0 sm:overflow-auto sm:border-l sm:border-edge sm:px-3.25 sm:pt-5.25 sm:pb-3.25 lg:px-4.25"
    >
      <section className="hidden sm:block">
        <div className={heading}>Image</div>
        <div className="mt-3.75 mb-1 flex items-center justify-between gap-2">
          <h2 className="m-0 text-[17px] font-semibold tracking-[-0.45px] [overflow-wrap:anywhere]">
            {view?.data.name ?? bundledStudy.title}
          </h2>
          {view?.data.laterality && (
            <span className="min-w-4.75 rounded bg-tag text-center text-[10px] leading-4.25 font-semibold text-[#81818a] dark:text-[#b9b9c5]">
              {view.data.laterality}
            </span>
          )}
        </div>
        <p className="m-0 text-xs text-secondary">{bundledStudy.title}</p>
        <dl className="mt-4.5 mb-0 text-[11px]">
          <Detail
            label="Dimensions"
            value={view ? `${view.data.columns} × ${view.data.rows}` : "—"}
          />
          <Detail label="Format" value={view ? `${view.data.bits}-bit DICOM` : "—"} />
        </dl>
      </section>

      <section className="sm:mt-5.75 sm:border-t sm:border-line sm:pt-4.25">
        <div className={heading}>
          Adjustments
          <Button
            disabled={!ready}
            onClick={app.reset}
            className="rounded px-1 text-[11px] font-normal text-accent hover:bg-hover"
          >
            Reset
          </Button>
        </div>
        <div className="mt-3 rounded-[10px] border border-card-edge bg-card p-3 shadow-[0_1px_2px_#00000003]">
          <ToggleGroup
            aria-label="Window preset"
            disabled={!ready}
            value={view?.isOriginal ? ["original"] : view?.isAuto ? ["auto"] : []}
            onValueChange={(value) => {
              if (!view) return
              if (value[0] === "original") view.setWindow(view.data.center, view.data.width)
              if (value[0] === "auto") view.setWindow(view.data.autoCenter, view.data.autoWidth)
            }}
            className="mb-5.75 flex gap-0.5 rounded-md bg-[#eeeeef] p-0.5 dark:bg-[#222225]"
          >
            <Preset value="original">Original</Preset>
            <Preset value="auto">Auto contrast</Preset>
          </ToggleGroup>
          <WindowSlider
            label="Window level"
            hint="Lower = brighter"
            view={view}
            value={view?.center}
            min={view?.data.centerMin ?? 0}
            max={view?.data.centerMax ?? 4095}
            onChange={(value) => view?.setWindow(value, view.width)}
          />
          <WindowSlider
            label="Window width"
            hint="Lower = more contrast"
            view={view}
            value={view?.width}
            min={1}
            max={view?.data.widthMax ?? 8192}
            onChange={(value) => view?.setWindow(view.center, value)}
          />
          <label className="flex w-full items-center border-t border-black/5 pt-3 pb-px text-[10px] text-[#47474d] md:text-[11px] dark:border-white/5 dark:text-label">
            Invert grayscale
            <Switch.Root
              disabled={!ready}
              checked={view?.invert ?? false}
              onCheckedChange={() => view?.toggleInvert()}
              className="ml-auto flex h-4.25 w-7.25 rounded-full bg-switch p-0.5 transition-colors data-checked:bg-[#34c759]"
            >
              <Switch.Thumb className="block size-3.25 rounded-full bg-white shadow-[0_1px_2px_#00000022] transition-transform data-checked:translate-x-3" />
            </Switch.Root>
          </label>
        </div>
        <div className="px-0.5 pt-2.25 text-[10px] leading-normal text-[#98989f] dark:text-[#a1a1ad]">
          {view?.transformText || "Original orientation"}
        </div>
      </section>

      <section className="pt-8 sm:mt-auto sm:pt-5.75">
        <Button
          disabled={!ready}
          onClick={() => void app.exportPng()}
          className="flex w-full items-center justify-center gap-1.75 rounded-md border-[0.5px] border-[#0071e5] bg-[linear-gradient(#188aff,#0078f5)] px-2.5 py-1.75 text-xs font-medium text-white shadow-[inset_0_1px_#ffffff26,0_1px_2px_#0062d133] hover:bg-[linear-gradient(#2b94ff,#1184fb)] active:bg-[#006ee4]"
        >
          <Download size={14} />
          Export PNG
        </Button>
        <p className="mt-2 mb-3.25 text-center text-[10px] text-[#9999a0] dark:text-[#a1a1ad]">
          Full resolution, with your adjustments.
        </p>
        <Button
          disabled={app.exporting}
          onClick={() => void app.exportDicom()}
          className="flex w-full items-center justify-between gap-1.5 rounded-md border border-black/9 bg-white px-2.5 py-2 text-[11px] text-[#676770] shadow-[0_1px_2px_#00000006] hover:bg-[#fafafa] dark:border-white/5 dark:bg-[#414146] dark:text-[#dddde5] dark:hover:bg-[#4b4b51]"
        >
          Save DICOM originals
          <Download size={13} className="text-[#86868e] dark:text-[#b4b4c0]" />
        </Button>
        <div className="mt-3.75 hidden items-center justify-center gap-1.25 text-[8px] whitespace-nowrap text-[#9b9ba2] sm:flex md:text-[9px] dark:text-[#9494a0]">
          <Image size={11} />
          Original DICOM images included.
        </div>
      </section>
    </aside>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2.5 py-1.25 leading-[1.4]">
      <dt className="text-[#929299] dark:text-[#9999a5]">{label}</dt>
      <dd className="m-0 text-[#606069] tabular-nums dark:text-[#b9b9c4]">{value}</dd>
    </div>
  )
}

function Preset({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Toggle
      value={value}
      className="segment flex-1 rounded px-0.5 py-1 text-[10px] text-[#626269] data-pressed:text-[#333338] md:text-[11px] dark:text-[#bcbcc6] dark:data-pressed:text-white"
    >
      {children}
    </Toggle>
  )
}

function WindowSlider({
  label,
  hint,
  view,
  value,
  min,
  max,
  onChange
}: {
  label: string
  hint: string
  view: View | undefined
  value: number | undefined
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <Slider.Root
      disabled={!view}
      value={value ?? min}
      min={min}
      max={max}
      step={1}
      onValueChange={(next) => onChange(next as number)}
      className="mb-4.75"
    >
      <div className="mb-3.25 flex items-center justify-between gap-1.5 text-[10px] md:text-[11px]">
        <Slider.Label className="text-label">{label}</Slider.Label>
        <output className="min-w-10.5 text-right text-[10px] text-[#676770] tabular-nums dark:text-[#bcbcc8]">
          {value == null ? "—" : Math.round(value)}
        </output>
      </div>
      <Slider.Control className="flex h-4.25 touch-none items-center select-none">
        <Slider.Track className="h-1 w-full rounded-full bg-slider">
          <Slider.Indicator className="rounded-full bg-slider-fill" />
          <Slider.Thumb className="size-4.25 rounded-full border-[0.5px] border-black/5 bg-white shadow-[0_1px_3px_#00000030,0_0_1px_#00000010] focus-visible:outline-3 focus-visible:outline-[#007aff65]" />
        </Slider.Track>
      </Slider.Control>
      <p className="mt-2.25 mb-0 text-[10px] text-[#9a9aa1] dark:text-[#a0a0ac]">{hint}</p>
    </Slider.Root>
  )
}
