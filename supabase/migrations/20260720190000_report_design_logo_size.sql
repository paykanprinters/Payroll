-- Report Design: logo size overrides (width / height / object-fit)
alter table public.report_design_settings
  add column if not exists report_logo_width integer not null default 180,
  add column if not exists report_logo_height integer not null default 60,
  add column if not exists report_logo_fit text not null default 'contain';

comment on column public.report_design_settings.report_logo_width is
  'Report header logo width in px (Report Design override)';
comment on column public.report_design_settings.report_logo_height is
  'Report header logo height in px (Report Design override)';
comment on column public.report_design_settings.report_logo_fit is
  'Report header logo object-fit (contain, cover, fill, none, scale-down)';
