-- Create storage buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can upload imports" on storage.objects;
drop policy if exists "Users can view own imports" on storage.objects;
drop policy if exists "Users can upload exports" on storage.objects;
drop policy if exists "Users can view own exports" on storage.objects;

-- Create Upload Policies
create policy "Users can upload imports"
  on storage.objects for insert
  with check ( bucket_id = 'imports' AND auth.role() = 'authenticated' );

create policy "Users can upload exports"
  on storage.objects for insert
  with check ( bucket_id = 'exports' AND auth.role() = 'authenticated' );

-- Create View Policies (Own files only)
create policy "Users can view own imports"
  on storage.objects for select
  using ( bucket_id = 'imports' AND owner = auth.uid() );

create policy "Users can view own exports"
  on storage.objects for select
  using ( bucket_id = 'exports' AND owner = auth.uid() );
