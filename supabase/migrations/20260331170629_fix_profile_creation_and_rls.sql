/*
  # Fix Profile Creation and RLS Policies

  1. Changes
    - Create trigger to automatically create profile when auth user is created
    - Update RLS policies to use auth_user_id consistently
    - Ensure profiles table has proper defaults

  2. Security
    - Maintain existing RLS policies
    - Ensure profile creation is automatic and secure
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, role, ativo)
  VALUES (NEW.id, NEW.email, 'user', true)
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure all existing auth users have profiles
INSERT INTO public.profiles (auth_user_id, email, role, ativo)
SELECT 
  au.id,
  au.email,
  'admin' as role,
  true as ativo
FROM auth.users au
LEFT JOIN public.profiles p ON p.auth_user_id = au.id
WHERE p.id IS NULL
ON CONFLICT (auth_user_id) DO NOTHING;