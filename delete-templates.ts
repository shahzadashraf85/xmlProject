import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function deleteTemplates() {
    console.log('🗑️  Deleting all Best Buy templates...');

    // Delete templates
    const { error: templateError, count } = await supabase
        .from('bb_templates')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (templateError) {
        console.error('❌ Error deleting templates:', templateError);
    } else {
        console.log('✅ Deleted all templates');
    }

    // Verify
    const { data, error } = await supabase
        .from('bb_templates')
        .select('id, template_name');

    if (error) {
        console.error('Error checking:', error);
    } else {
        console.log(`\n📊 Remaining templates: ${data?.length || 0}`);
        if (data && data.length > 0) {
            console.log('Templates:', data);
        }
    }
}

deleteTemplates();
