#!/usr/bin/env node

// Test script for newsletter subscription API endpoints
// Usage: node test-newsletter-api.js

const baseUrl = process.env.API_URL || 'http://localhost:3000';

async function testSubscribe(email) {
  console.log(`\n📧 Testing subscribe for: ${email}`);

  try {
    const response = await fetch(`${baseUrl}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        source: 'kindred'
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Subscribe successful:', data);
    } else {
      console.log('❌ Subscribe failed:', data);
    }

    return response.ok;
  } catch (error) {
    console.error('❌ Subscribe error:', error.message);
    return false;
  }
}

async function testUnsubscribe(email) {
  console.log(`\n🚫 Testing unsubscribe for: ${email}`);

  try {
    const response = await fetch(`${baseUrl}/api/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email
        // No token required for direct API calls
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Unsubscribe successful:', data);
    } else {
      console.log('❌ Unsubscribe failed:', data);
    }

    return response.ok;
  } catch (error) {
    console.error('❌ Unsubscribe error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Newsletter API Endpoints');
  console.log('====================================');
  console.log(`Base URL: ${baseUrl}`);

  const testEmail = `test+${Date.now()}@example.com`;

  // Test 1: Subscribe a new email
  console.log('\n--- Test 1: Subscribe new email ---');
  await testSubscribe(testEmail);

  // Test 2: Subscribe same email again (should succeed silently)
  console.log('\n--- Test 2: Subscribe duplicate (should succeed) ---');
  await testSubscribe(testEmail);

  // Test 3: Subscribe with invalid email
  console.log('\n--- Test 3: Subscribe invalid email ---');
  await testSubscribe('not-an-email');

  // Test 4: Unsubscribe
  console.log('\n--- Test 4: Unsubscribe ---');
  await testUnsubscribe(testEmail);

  // Test 5: Unsubscribe again (should succeed silently)
  console.log('\n--- Test 5: Unsubscribe duplicate (should succeed) ---');
  await testUnsubscribe(testEmail);

  // Test 6: Unsubscribe invalid email
  console.log('\n--- Test 6: Unsubscribe invalid email ---');
  await testUnsubscribe('not-an-email');

  console.log('\n✨ Tests complete!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testSubscribe, testUnsubscribe };