// Simple test to check the auth flow
import { supabase } from './lib/supabase.ts';

async function testAuthFlow() {
  console.log('Testing auth flow...');
  
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Exists' : 'None', sessionError);
    
    if (session) {
      console.log('User ID:', session.user.id);
      console.log('User email:', session.user.email);
      console.log('Email confirmed:', session.user.email_confirmed_at ? 'Yes' : 'No');
    }
    
    // Test sign up
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    console.log('Testing sign up with:', testEmail);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User'
        }
      }
    });
    
    console.log('Sign up result:', signUpData, signUpError);
    
    if (signUpData.user && !signUpError) {
      console.log('Sign up successful!');
      console.log('User needs email confirmation:', !signUpData.session);
      
      if (signUpData.session) {
        console.log('User is immediately signed in');
        
        // Test API call
        try {
          const response = await fetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${signUpData.session.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('API call result:', response.status, response.statusText);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('User data:', userData);
          } else {
            const errorData = await response.text();
            console.log('API error:', errorData);
          }
        } catch (apiError) {
          console.log('API call failed:', apiError);
        }
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAuthFlow();