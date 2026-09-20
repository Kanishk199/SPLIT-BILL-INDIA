const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const hash = await bcrypt.hash('Password123!', 10);
  const users = [
    { name: 'Rahul Sharma', email: 'rahul@gmail.com', phone: '9876500001', avatarColor: '#3B82F6' },
    { name: 'Pooja Verma', email: 'pooja@gmail.com', phone: '9876500002', avatarColor: '#EC4899' },
    { name: 'Aman Singh', email: 'aman@gmail.com', phone: '9876500003', avatarColor: '#10B981' },
    { name: 'Sneha Patel', email: 'sneha@gmail.com', phone: '9876500004', avatarColor: '#F59E0B' },
    { name: 'Kanishk Gupta', email: 'kanishk@gmail.com', phone: '9876500005', avatarColor: '#8B5CF6' },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          avatarColor: u.avatarColor,
          passwordHash: hash
        }
      });
      console.log('Created user:', u.email, `(${u.name})`);
    } else {
      console.log('Already exists:', u.email);
    }
  }
}

seed()
  .then(() => console.log('✅ Seeding complete!'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
