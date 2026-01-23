-- Delete all existing Best Buy templates
DELETE FROM bb_templates;

-- Also delete any associated listings and fields to clean up
DELETE FROM bb_listing_fields;
DELETE FROM bb_listings;

-- Verify deletion
SELECT COUNT(*) as remaining_templates FROM bb_templates;
