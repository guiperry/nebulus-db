const { createDatabase } = require('@nebulus-db/nebulus-db');

async function runBasicTests() {
  console.log('Starting basic NebulusDB tests...');

  try {
    // Create database with environment-specific adapter
    console.log('Creating database...');
    const db = await createDatabase({
      name: 'test-db',
      collections: ['users']
    });
    
    // Create collection
    console.log('Creating collection...');
    const users = db.collection('users');
    
    // Test insert
    console.log('Testing insert...');
    const user = await users.insert({
      _id: 'user1',
      name: 'Test User',
      email: 'test@example.com',
      age: 30
    });
    console.log('Inserted user:', user);

    // Test find
    console.log('Testing find...');
    const allUsers = await users.find();
    console.log('Found users:', allUsers);

    // Test findOne
    console.log('Testing findOne...');
    const foundUser = await users.findOne({ name: 'Test User' });
    console.log('Found user:', foundUser);

    // Test update
    console.log('Testing update...');
    const updatedUser = await users.update(
      { _id: 'user1' },
      { name: 'Test User Updated', age: 31 }
    );
    console.log('Updated user:', updatedUser);

    // Test delete
    console.log('Testing delete...');
    const deleteResult = await users.delete({ _id: 'user1' });
    console.log('Delete result:', deleteResult);

    // Verify delete
    const remainingUsers = await users.find();
    console.log('Remaining users:', remainingUsers);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runBasicTests().catch(console.error);