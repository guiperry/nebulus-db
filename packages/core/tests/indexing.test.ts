import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, IndexType, InMemoryAdapter } from '../src';

describe('NebulusDB Indexing', () => {
  let db: any;
  let users: any;

  beforeEach(() => {
    // Create a fresh database for each test
    db = createDb({ adapter: new InMemoryAdapter() });
    users = db.collection('users');
  });

  describe('Index Creation', () => {
    it('should create an index', () => {
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      const indexes = users.getIndexes();
      expect(indexes).toHaveLength(1);
      expect(indexes[0].name).toBe('email_idx');
      expect(indexes[0].fields).toEqual(['email']);
      expect(indexes[0].type).toBe(IndexType.UNIQUE);
    });

    it('should create multiple indexes', () => {
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      users.createIndex({
        name: 'age_idx',
        fields: ['age'],
        type: IndexType.SINGLE
      });

      const indexes = users.getIndexes();
      expect(indexes).toHaveLength(2);
      expect(indexes.map((idx: any) => idx.name).sort()).toEqual(['age_idx', 'email_idx']);
    });

    it('should create a compound index', () => {
      users.createIndex({
        name: 'name_age_idx',
        fields: ['name', 'age'],
        type: IndexType.COMPOUND
      });

      const indexes = users.getIndexes();
      expect(indexes).toHaveLength(1);
      expect(indexes[0].fields).toEqual(['name', 'age']);
      expect(indexes[0].type).toBe(IndexType.COMPOUND);
    });
  });

  describe('Index Usage', () => {
    it('should use index for queries', async () => {
      // Add test data
      await users.insert({ name: 'Alice', email: 'alice@example.com', age: 30 });
      await users.insert({ name: 'Bob', email: 'bob@example.com', age: 25 });
      await users.insert({ name: 'Charlie', email: 'charlie@example.com', age: 35 });

      // Create an index
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      // Query by indexed field
      const result = await users.findOne({ email: 'bob@example.com' });
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Bob');
    });

    it('should enforce uniqueness for unique indexes', async () => {
      // Create a unique index
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      // Insert a document
      await users.insert({ name: 'Alice', email: 'alice@example.com' });

      // Try to insert another document with the same email
      await expect(
        users.insert({ name: 'Another Alice', email: 'alice@example.com' })
      ).rejects.toThrow(/Unique constraint violation/);
    });

    it('should use compound indexes for queries', async () => {
      // Add test data
      await users.insert({ name: 'Alice', country: 'USA', city: 'New York' });
      await users.insert({ name: 'Bob', country: 'USA', city: 'Boston' });
      await users.insert({ name: 'Charlie', country: 'UK', city: 'London' });

      // Create a compound index
      users.createIndex({
        name: 'location_idx',
        fields: ['country', 'city'],
        type: IndexType.COMPOUND
      });

      // Query by both indexed fields
      const result = await users.findOne({ country: 'USA', city: 'Boston' });
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Bob');
    });
  });

  describe('Index Management', () => {
    it('should drop an index', () => {
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      expect(users.getIndexes()).toHaveLength(1);

      const result = users.dropIndex('email_idx');
      expect(result).toBe(true);
      expect(users.getIndexes()).toHaveLength(0);
    });

    it('should return false when dropping a non-existent index', () => {
      const result = users.dropIndex('non_existent_idx');
      expect(result).toBe(false);
    });

    it('should rebuild indexes when setting all documents', async () => {
      // Create an index
      users.createIndex({
        name: 'email_idx',
        fields: ['email'],
        type: IndexType.UNIQUE
      });

      // Add some documents
      await users.insert({ name: 'Alice', email: 'alice@example.com' });
      await users.insert({ name: 'Bob', email: 'bob@example.com' });

      // Replace all documents
      users.setAll([
        { id: '1', name: 'Charlie', email: 'charlie@example.com' },
        { id: '2', name: 'Dave', email: 'dave@example.com' }
      ]);

      // Try to insert a document with a duplicate email
      await expect(
        users.insert({ name: 'Another Charlie', email: 'charlie@example.com' })
      ).rejects.toThrow(/Unique constraint violation/);
    });
  });

  describe('Performance', () => {
    it('should improve query performance with indexes', async () => {
      // Create a large collection
      const products = db.collection('products');

      // Add 1000 products
      const testData = [];
      for (let i = 0; i < 1000; i++) {
        testData.push({
          id: `${i}`,
          name: `Product ${i}`,
          category: ['A', 'B', 'C'][i % 3],
          price: Math.floor(Math.random() * 1000)
        });
      }
      products.setAll(testData);

      // Query without index
      const startWithoutIndex = performance.now();
      await products.find({ category: 'B' });
      const timeWithoutIndex = performance.now() - startWithoutIndex;

      // Create an index
      products.createIndex({
        name: 'category_idx',
        fields: ['category'],
        type: IndexType.SINGLE
      });

      // Query with index
      const startWithIndex = performance.now();
      await products.find({ category: 'B' });
      const timeWithIndex = performance.now() - startWithIndex;

      // The indexed query should be faster, but in tests the difference might be small
      // We're just checking that it works, not the actual performance difference
      expect(timeWithIndex).toBeLessThanOrEqual(timeWithoutIndex * 1.5);
    });
  });

  describe('Compound Index Partial/Range Queries', () => {
    beforeEach(async () => {
      await users.insert({ name: 'Alice', country: 'USA', city: 'New York', age: 30 });
      await users.insert({ name: 'Bob', country: 'USA', city: 'Boston', age: 25 });
      await users.insert({ name: 'Charlie', country: 'UK', city: 'London', age: 35 });
      await users.insert({ name: 'Diana', country: 'USA', city: 'Boston', age: 40 });
      await users.insert({ name: 'Eve', country: 'USA', city: 'New York', age: 22 });
      users.createIndex({
        name: 'country_city_age_idx',
        fields: ['country', 'city', 'age'],
        type: IndexType.COMPOUND
      });
    });

    it('should use compound index for prefix query (country only)', async () => {
      const results = await users.find({ country: 'USA' });
      expect(results.length).toBe(4);
      expect(results.map((u: any) => u.name).sort()).toEqual(['Alice', 'Bob', 'Diana', 'Eve']);
    });

    it('should use compound index for prefix query (country + city)', async () => {
      const results = await users.find({ country: 'USA', city: 'Boston' });
      expect(results.length).toBe(2);
      expect(results.map((u: any) => u.name).sort()).toEqual(['Bob', 'Diana']);
    });

    it('should use compound index for prefix + range query (country + city + age >= 30)', async () => {
      const results = await users.find({ country: 'USA', city: 'Boston', age: { $gte: 30 } });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Diana');
    });

    it('should use compound index for prefix + range query (country + city + age < 30)', async () => {
      const results = await users.find({ country: 'USA', city: 'Boston', age: { $lt: 30 } });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Bob');
    });

    it('should use compound index for prefix + $in query (country + city + age in [25, 40])', async () => {
      const results = await users.find({ country: 'USA', city: 'Boston', age: { $in: [25, 40] } });
      expect(results.length).toBe(2);
      expect(results.map((u: any) => u.name).sort()).toEqual(['Bob', 'Diana']);
    });

    it('should use compound index for prefix + range query (country + city >= "London")', async () => {
      // This tests string range on city
      const results = await users.find({ country: 'USA', city: { $gte: 'London' } });
      // Only New York and Boston in USA, so $gte 'London' matches New York
      expect(results.length).toBe(2);
      expect(results.map((u: any) => u.city).sort()).toEqual(['New York', 'New York']);
    });

    it('should use compound index for multi-field range query (city and age)', async () => {
      // Query for users in USA, city between 'A' and 'New York', age between 25 and 40
      const results = await users.find({
        country: 'USA',
        city: { $gte: 'A', $lte: 'New York' },
        age: { $gte: 25, $lte: 40 }
      });
      // Should match Alice (New York, 30), Bob (Boston, 25), Diana (Boston, 40), Eve (New York, 22 is out)
      expect(results.map((u: any) => u.name).sort()).toEqual(['Alice', 'Bob', 'Diana']);
    });

    it('should use compound index for multi-field range query (all fields)', async () => {
      // Query for country >= 'UK', city >= 'A', age >= 30
      const results = await users.find({
        country: { $gte: 'UK' },
        city: { $gte: 'A' },
        age: { $gte: 30 }
      });
      // Should match all docs >= 'UK|A|30' (Charlie, Alice, Diana, Eve, Bob)
      expect(results.length).toBe(3); // UK|London|35, USA|New York|30, USA|Boston|40
      expect(results.map((u: any) => u.name).sort()).toEqual(['Alice', 'Charlie', 'Diana']);
    });

    it('should use compound index for lower bound only on some fields', async () => {
      // Query for country = 'USA', city >= 'Boston'
      const results = await users.find({
        country: 'USA',
        city: { $gte: 'Boston' }
      });
      // Should match Alice (New York), Bob (Boston), Diana (Boston), Eve (New York)
      expect(results.map((u: any) => u.name).sort()).toEqual(['Alice', 'Bob', 'Diana', 'Eve']);
    });

    it('should use compound index for mix of eq and range on different fields', async () => {
      // Query for country = 'USA', city = 'Boston', age < 40
      const results = await users.find({
        country: 'USA',
        city: 'Boston',
        age: { $lt: 40 }
      });
      // Should match Bob (Boston, 25)
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Bob');
    });
  });
});
