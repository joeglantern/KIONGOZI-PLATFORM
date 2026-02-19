-- Replace 'your_email@example.com' with the email of the user you want to promote
UPDATE profiles
SET role = 'instructor'
WHERE email = 'your_email@example.com';

-- Verify the change
SELECT * FROM profiles WHERE role = 'instructor';
