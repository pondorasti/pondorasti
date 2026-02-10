return {
  "folke/snacks.nvim",
  opts = function(_, opts)
    opts.picker = opts.picker or {}
    opts.picker.layouts = opts.picker.layouts or {}
    opts.picker.layouts.sidebar = vim.tbl_deep_extend(
      "force",
      opts.picker.layouts.sidebar or {},
      { layout = { position = "right" } }
    )

    opts.picker.sources = opts.picker.sources or {}
    opts.picker.sources.explorer = opts.picker.sources.explorer or {}
    opts.picker.sources.explorer.layout = "sidebar"
    opts.picker.sources.explorer.hidden = true
    opts.picker.sources.explorer.ignored = false

    opts.picker.sources.files = opts.picker.sources.files or {}
    opts.picker.sources.files.hidden = true
    opts.picker.sources.files.ignored = false
  end,
}
