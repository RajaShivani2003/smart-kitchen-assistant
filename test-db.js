const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    await p.$connect();
    console.log('DB connected successfully');
    
    // Try to count users
    const count = await p.user.count();
    console.log('User count:', count);
    
    // Try to create a test user
    const user = await p.user.create({
      data: {
        name: 'Test User',
        email: 'testuser@example.com',
        password: '$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234',
      }
    });
    console.log('Created user:', user.id, user.email);
    
    // Try to find user
    const found = await p.user.findUnique({ where: { email: 'testuser@example.com' } });
    console.log('Found user:', found ? found.email : 'not found');
    
    // Clean up
    await p.user.delete({ where: { id: user.id } });
    console.log('Cleaned up test user');
    
    await p.$disconnect();
    console.log('All tests passed!');
  } catch (e) {
    console.error('Error:', e.message);
    await p.$disconnect();
    process.exit(1);
  }
}

main();
