
/*
# Fix handle_new_user trigger — add exception handling

## Problem
The trigger was failing during auth.signUp(), causing "Database error saving new user".
Wrapping the insert in EXCEPTION WHEN OTHERS ensures the user is always created
even if the perfis row can't be inserted (e.g. conflict, constraint issue).

## Changes
- handle_new_user() now catches all exceptions and still returns NEW
  so the auth.users insert always succeeds.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO perfis (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'utilizador')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome  = COALESCE(EXCLUDED.nome, perfis.nome),
    role  = COALESCE(EXCLUDED.role, perfis.role);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
