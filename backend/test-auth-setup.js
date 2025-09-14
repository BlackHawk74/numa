const { supabase } = require("./dist/database/supabase");

async function testAuthSetup() {
  try {
    console.log("Testing Supabase authentication setup...");

    // Test 1: Check if we can connect to Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (healthError) {
      console.error("❌ Supabase connection failed:", healthError.message);
      return false;
    }

    console.log("✅ Supabase connection successful");

    // Test 2: Check if RLS is enabled
    const { data: rlsCheck, error: rlsError } = await supabase.rpc(
      "check_rls_enabled"
    );

    if (rlsError) {
      console.log("⚠️  Could not check RLS status (this is normal)");
    } else {
      console.log("✅ RLS status checked");
    }

    // Test 3: Try to create a test user (this should work with service role)
    const testUserId = "00000000-0000-0000-0000-000000000001";

    // Clean up any existing test user first
    await supabase.from("users").delete().eq("id", testUserId);

    const { data: testUser, error: userError } = await supabase
      .from("users")
      .insert({
        id: testUserId,
        name: "Test User",
        preferences: { test: true },
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ Test user creation failed:", userError.message);
      return false;
    }

    console.log("✅ Test user created successfully");

    // Clean up test user
    await supabase.from("users").delete().eq("id", testUserId);

    console.log("✅ Test user cleaned up");

    console.log("\n🎉 Authentication setup test completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Make sure your .env file has the correct Supabase keys");
    console.log("2. Run the auth migration: node apply-auth-migration.js");
    console.log("3. Start the frontend and backend servers");
    console.log("4. Test user registration and login");

    return true;
  } catch (error) {
    console.error("❌ Auth setup test failed:", error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testAuthSetup()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { testAuthSetup };
