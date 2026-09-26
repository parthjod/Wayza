import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CampusPOI data...');

  await prisma.campusPOI.deleteMany();

  await prisma.campusPOI.createMany({
    data: [
      {
        name: 'MIT WPU Front Gate',
        label: 'MIT WPU Front Gate',
        lat: 18.5191,
        lng: 73.8553,
      },
      {
        name: 'MIT WPU Back Gate',
        label: 'MIT WPU Back Gate',
        lat: 18.5178,
        lng: 73.8571,
      },
      {
        name: 'MIT WPU Sports Building',
        label: 'MIT WPU Sports Building',
        lat: 18.5202,
        lng: 73.8545,
      },
    ],
  });

  console.log('Seeded 3 campus POIs.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
