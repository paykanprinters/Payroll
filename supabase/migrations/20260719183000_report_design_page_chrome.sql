-- Report Design: page sheet chrome (border, radius, inset, padding)
alter table public.report_design_settings
  add column if not exists show_page_border boolean not null default true,
  add column if not exists page_border_radius_px integer not null default 12,
  add column if not exists page_sheet_inset_mm numeric not null default 8,
  add column if not exists page_content_padding_mm numeric not null default 8,
  add column if not exists page_border_width_px numeric not null default 1.5;

comment on column public.report_design_settings.show_page_border is
  'Draw a border around each paginated report sheet';
comment on column public.report_design_settings.page_border_radius_px is
  'Corner radius in px for each sheet frame (0 = square)';
comment on column public.report_design_settings.page_sheet_inset_mm is
  'Distance from paper edge to the sheet border (mm)';
comment on column public.report_design_settings.page_content_padding_mm is
  'Padding inside the sheet border (mm)';
comment on column public.report_design_settings.page_border_width_px is
  'Sheet border stroke width (px)';
