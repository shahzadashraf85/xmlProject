-- Best Buy Module Migration (Idempotent / Safe to re-run)

-- 1. Create Tables (IF NOT EXISTS prevents errors if they exist)
CREATE TABLE IF NOT EXISTS public.bb_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    template_name TEXT NOT NULL,
    category_code TEXT,
    column_count INTEGER,
    columns_json JSONB NOT NULL,
    raw_template_file_path TEXT
);

CREATE TABLE IF NOT EXISTS public.bb_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    template_id UUID REFERENCES public.bb_templates(id),
    status TEXT DEFAULT 'draft',
    product_name TEXT,
    specs_text TEXT,
    known JSONB,
    ai_output JSONB,
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.bb_listing_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES public.bb_listings(id) ON DELETE CASCADE,
    field_code TEXT NOT NULL,
    field_value TEXT,
    UNIQUE(listing_id, field_code)
);

CREATE TABLE IF NOT EXISTS public.bb_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    template_id UUID REFERENCES public.bb_templates(id),
    export_type TEXT CHECK (export_type IN ('xlsx', 'csv')),
    file_path TEXT,
    row_count INTEGER,
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS (Safe to run multiple times)
ALTER TABLE public.bb_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_listing_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_exports ENABLE ROW LEVEL SECURITY;

-- 3. Triggers (Drop and Recreate to avoid "already exists" error)
DROP TRIGGER IF EXISTS update_bb_listings_updated_at ON public.bb_listings;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bb_listings_updated_at
    BEFORE UPDATE ON public.bb_listings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 4. Buckets (Insert with Conflict handling)
INSERT INTO storage.buckets (id, name, public) VALUES ('bestbuy_templates', 'bestbuy_templates', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('bestbuy_exports', 'bestbuy_exports', false) ON CONFLICT DO NOTHING;

-- 5. Policies (Drop existing to avoid duplication errors, then create new)
-- Clean up old policies first
DROP POLICY IF EXISTS "Allow read access to templates for authenticated users" ON public.bb_templates;
DROP POLICY IF EXISTS "Allow insert access to templates for authenticated users" ON public.bb_templates;
DROP POLICY IF EXISTS "Users can view own listings" ON public.bb_listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON public.bb_listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.bb_listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.bb_listings;
DROP POLICY IF EXISTS "Detailed access to listing fields" ON public.bb_listing_fields;
DROP POLICY IF EXISTS "Users can see own exports" ON public.bb_exports;
DROP POLICY IF EXISTS "Users can create exports" ON public.bb_exports;

DROP POLICY IF EXISTS "Authenticated users can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read exports" ON storage.objects;

-- Re-Apply Policies
-- Templates
CREATE POLICY "Allow read access to templates for authenticated users" 
ON public.bb_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access to templates for authenticated users" 
ON public.bb_templates FOR INSERT TO authenticated WITH CHECK (true);

-- Listings
CREATE POLICY "Users can view own listings" 
ON public.bb_listings FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can insert own listings" 
ON public.bb_listings FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own listings" 
ON public.bb_listings FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own listings" 
ON public.bb_listings FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Listing Fields
CREATE POLICY "Detailed access to listing fields" 
ON public.bb_listing_fields FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.bb_listings 
        WHERE id = bb_listing_fields.listing_id AND created_by = auth.uid()
    )
);

-- Exports
CREATE POLICY "Users can see own exports" 
ON public.bb_exports FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can create exports" 
ON public.bb_exports FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Storage Policies
-- Note: Storage policies are global on storage.objects, so we must be specific
CREATE POLICY "Authenticated users can upload templates"
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK ( bucket_id = 'bestbuy_templates' );

CREATE POLICY "Authenticated users can read templates"
ON storage.objects FOR SELECT TO authenticated 
USING ( bucket_id = 'bestbuy_templates' );

CREATE POLICY "Authenticated users can upload exports"
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK ( bucket_id = 'bestbuy_exports' );

CREATE POLICY "Authenticated users can read exports"
ON storage.objects FOR SELECT TO authenticated 
USING ( bucket_id = 'bestbuy_exports' );
