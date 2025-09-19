-- Option 1: Add column as nullable first, update existing records, then make NOT NULL
ALTER TABLE "Study" ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update existing records (you'll need to decide how to assign them)
-- For example, assign all to a specific user or delete them
UPDATE "Study" SET user_id = 'some-user-uuid' WHERE user_id IS NULL;

-- Then make it NOT NULL
ALTER TABLE "Study" ALTER COLUMN user_id SET NOT NULL;