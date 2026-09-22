import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import type { Filmroom } from "~/viewer/use-filmroom"

const shortcuts = [
  ["Choose an image", "1–4 / ← →"],
  ["Pan / adjust window", "V / W"],
  ["Zoom", "Scroll / + −"],
  ["Fit / reset selected image", "F / R"],
  ["Invert grayscale", "I"],
  ["Compare up to four images", "C"]
]

export function Help({ app }: { app: Filmroom }) {
  return (
    <Dialog.Root open={app.help} onOpenChange={app.setHelp}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/15 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/33" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-118.75 -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-white/40 bg-popover p-6.5 text-ink shadow-[0_20px_80px_#00000045,0_0_0_0.5px_#00000012] backdrop-blur-[30px] transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 dark:border-white/12 dark:shadow-[0_20px_80px_#00000070,0_0_0_0.5px_#00000045]">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="m-0 text-[19px] font-[650] tracking-[-0.4px]">
              Filmroom Help
            </Dialog.Title>
            <Dialog.Close aria-label="Close help" className="toolbar-button">
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-xs leading-[1.7] text-[#777780] dark:text-[#bebeca]">
            The four original images from your September 8, 2026 right shoulder study are included
            and open automatically.
          </Dialog.Description>
          <div className="my-5 rounded-[9px] border border-black/5 bg-white px-3.5 py-3 dark:border-white/5 dark:bg-[#3a3a40]">
            {shortcuts.map(([action, keys]) => (
              <div key={action} className="flex justify-between gap-2.5 py-2 text-xs">
                <span>{action}</span>
                <kbd className="font-sans text-[11px] text-[#92929b] dark:text-[#b0b0be]">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-xs leading-[1.7] text-[#777780] dark:text-[#bebeca]">
            In comparison mode, select an image to adjust it. Each projection keeps its own
            settings. PNG export includes the full image, with the current window and orientation.
            DICOM export preserves the unchanged originals.
          </p>
          <p className="mb-0 text-[10px] leading-[1.7] text-[#a0a0a8] dark:text-[#a5a5b2]">
            Reloading restores the original display settings. Save DICOM originals downloads the
            included ZIP unchanged, with all four images and DICOMDIR.
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
