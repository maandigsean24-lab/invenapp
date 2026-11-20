import { supabase, supabaseErrorMessage, supabaseRequest } from '../supabase/client';

export const normalizeEmail = (email) => email.trim().toLowerCase();

function accountFromAuthUser(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    fullName: profile?.full_name || authUser.user_metadata?.full_name || '',
  };
}

async function loadAccount(authUser) {
  const { data: profile, error } = await supabaseRequest(() => supabase
    .from('profiles')
    .select('full_name')
    .eq('id', authUser.id)
    .single());

  if (error) throw new Error(`Unable to load your account profile: ${supabaseErrorMessage(error)}`);
  return accountFromAuthUser(authUser, profile);
}

export async function registerUser({ fullName, email, password }) {
  const { data, error } = await supabaseRequest(() => supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { data: { full_name: fullName.trim() } },
  }));

  if (error) throw new Error(supabaseErrorMessage(error));
  return { emailConfirmationRequired: !data.session };
}

export async function loginUser({ email, password }) {
  const { data, error } = await supabaseRequest(() => supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  }));

  if (error) throw new Error(supabaseErrorMessage(error));
  return loadAccount(data.user);
}

export async function updateUserName(user, fullName) {
  const name = fullName.trim();
  const { data: profile, error } = await supabaseRequest(() => supabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', user.id)
    .select('full_name')
    .single());

  if (error) throw new Error(`Unable to update your account name: ${supabaseErrorMessage(error)}`);
  return { ...user, fullName: profile.full_name };
}

export async function changeUserPassword({ email, currentPassword, newPassword }) {
  const { data: current, error: sessionError } = await supabaseRequest(() => supabase.auth.getUser());
  if (sessionError) throw new Error(supabaseErrorMessage(sessionError));
  if (normalizeEmail(current.user.email) !== normalizeEmail(email)) {
    throw new Error('Please log in again before changing your password.');
  }

  const { data, error } = await supabaseRequest(() => supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: currentPassword,
  }));

  if (error) {
    if (supabaseErrorMessage(error).toLowerCase().includes('invalid login credentials')) {
      throw new Error('Current password is incorrect.');
    }
    throw new Error(supabaseErrorMessage(error));
  }

  const { error: updateError } = await supabaseRequest(() => supabase.auth.updateUser({ password: newPassword }));
  if (updateError) throw new Error(supabaseErrorMessage(updateError));
  return data.user;
}

export async function restoreSession() {
  const { data, error } = await supabaseRequest(() => supabase.auth.getSession());
  if (error) throw new Error(`Unable to restore your saved session: ${supabaseErrorMessage(error)}`);
  if (!data.session?.user) return null;
  return loadAccount(data.session.user);
}

export async function clearSession() {
  const { error } = await supabaseRequest(() => supabase.auth.signOut());
  if (error) throw new Error(`Unable to log out right now: ${supabaseErrorMessage(error)}`);
}
