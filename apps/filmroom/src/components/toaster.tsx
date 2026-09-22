import { Toast } from "@base-ui/react/toast"

export function Toaster() {
  const { toasts } = Toast.useToastManager()
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="rounded-[11px] border border-white/33 bg-[#f5f5f5e8] px-5 py-3 text-xs whitespace-nowrap text-[#33333a] shadow-[0_5px_24px_#00000029,0_0_0_0.5px_#0000000d] backdrop-blur-[20px] transition-[opacity,translate] duration-150 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 dark:border-white/11 dark:bg-[#424248f0] dark:text-[#ececf2] dark:shadow-[0_5px_24px_#00000055,0_0_0_0.5px_#00000040]"
          >
            <Toast.Description />
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  )
}
