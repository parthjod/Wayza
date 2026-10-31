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
        lat: 18.5184,
        lng: 73.8155,
      },
      {
        name: 'MIT WPU Back Gate',
        label: 'MIT WPU Back Gate',
        lat: 18.5168,
        lng: 73.8138,
      },
      {
        name: 'MIT WPU Sports Building',
        label: 'MIT WPU Sports Building',
        lat: 18.5195,
        lng: 73.8145,
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
