import { PrismaClient, UserRole, StudioMemberRole, GalleryAccessType, GalleryStatus, StorageProviderType, StorageConnectionStatus, ProcessingStatus, JobType, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PixMatch AI database seeding...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@pixmatch.ai' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@pixmatch.ai',
      password_hash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 2. Create Demo Studio 1: Lumière Photography
  const studio1 = await prisma.studio.upsert({
    where: { slug: 'lumiere-studios' },
    update: {},
    create: {
      name: 'Lumière Studios',
      slug: 'lumiere-studios',
      logo_url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=150&auto=format&fit=crop&q=80',
      website: 'https://lumiere.example.com',
    },
  });

  // 3. Create Studio 1 Owner & Member
  const owner1 = await prisma.user.upsert({
    where: { email: 'alex@lumiere.com' },
    update: {},
    create: {
      name: 'Alex Rivera',
      email: 'alex@lumiere.com',
      password_hash: passwordHash,
      role: UserRole.STUDIO_OWNER,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  await prisma.studioMembership.upsert({
    where: { user_id_studio_id: { user_id: owner1.id, studio_id: studio1.id } },
    update: {},
    create: {
      user_id: owner1.id,
      studio_id: studio1.id,
      role: StudioMemberRole.OWNER,
    },
  });

  const member1 = await prisma.user.upsert({
    where: { email: 'sarah@lumiere.com' },
    update: {},
    create: {
      name: 'Sarah Chen',
      email: 'sarah@lumiere.com',
      password_hash: passwordHash,
      role: UserRole.STUDIO_MEMBER,
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  });

  await prisma.studioMembership.upsert({
    where: { user_id_studio_id: { user_id: member1.id, studio_id: studio1.id } },
    update: {},
    create: {
      user_id: member1.id,
      studio_id: studio1.id,
      role: StudioMemberRole.PHOTOGRAPHER,
    },
  });

  // 4. Create Studio 1 Subscription
  await prisma.subscription.upsert({
    where: { studio_id: studio1.id },
    update: {},
    create: {
      studio_id: studio1.id,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      storage_limit_bytes: BigInt(50 * 1024 * 1024 * 1024), // 50GB
      photo_limit: 15000,
      ai_search_limit: 2500,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // 5. Create Storage Connections for Studio 1
  await prisma.storageConnection.createMany({
    data: [
      {
        studio_id: studio1.id,
        provider: StorageProviderType.PLATFORM,
        display_name: 'PixMatch Fast Local Storage',
        status: StorageConnectionStatus.ACTIVE,
        storage_used_bytes: BigInt(1420000000), // ~1.42 GB
        last_sync_at: new Date(),
      },
      {
        studio_id: studio1.id,
        provider: StorageProviderType.CLOUDFLARE_R2,
        display_name: 'Studio Archive R2',
        status: StorageConnectionStatus.READY,
        storage_used_bytes: BigInt(0),
        last_sync_at: null,
      },
    ],
    skipDuplicates: true,
  });

  // 6. Create Demo Galleries for Studio 1
  const gallery1 = await prisma.gallery.upsert({
    where: { studio_id_slug: { studio_id: studio1.id, slug: 'sophia-and-liam-wedding' } },
    update: {},
    create: {
      studio_id: studio1.id,
      title: 'Sophia & Liam Wedding',
      slug: 'sophia-and-liam-wedding',
      event_type: 'Wedding',
      event_date: new Date('2026-06-18'),
      description: 'Golden hour summer wedding ceremony at Villa Montalvo Estate.',
      cover_photo_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80',
      access_type: GalleryAccessType.PUBLIC,
      status: GalleryStatus.ACTIVE,
    },
  });

  const gallery2 = await prisma.gallery.upsert({
    where: { studio_id_slug: { studio_id: studio1.id, slug: 'tech-summit-2026' } },
    update: {},
    create: {
      studio_id: studio1.id,
      title: 'Global Tech Summit 2026',
      slug: 'tech-summit-2026',
      event_type: 'Corporate Event',
      event_date: new Date('2026-08-10'),
      description: 'Keynotes, executive portraits, and breakout networking sessions.',
      cover_photo_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
      access_type: GalleryAccessType.PASSWORD,
      password_hash: await bcrypt.hash('VIP2026', 10),
      status: GalleryStatus.ACTIVE,
    },
  });

  // 7. Seed Photos for Gallery 1
  const demoPhotos = [
    {
      original_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80',
      width: 4000,
      height: 2667,
      file_size: BigInt(4200000),
      mime_type: 'image/jpeg',
      storage_path: 'galleries/sophia-and-liam-wedding/photo-1.jpg',
    },
    {
      original_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80',
      width: 3840,
      height: 2560,
      file_size: BigInt(3800000),
      mime_type: 'image/jpeg',
      storage_path: 'galleries/sophia-and-liam-wedding/photo-2.jpg',
    },
    {
      original_url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&auto=format&fit=crop&q=80',
      width: 4200,
      height: 2800,
      file_size: BigInt(5100000),
      mime_type: 'image/jpeg',
      storage_path: 'galleries/sophia-and-liam-wedding/photo-3.jpg',
    },
    {
      original_url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400&auto=format&fit=crop&q=80',
      width: 3900,
      height: 2600,
      file_size: BigInt(4600000),
      mime_type: 'image/jpeg',
      storage_path: 'galleries/sophia-and-liam-wedding/photo-4.jpg',
    },
  ];

  for (const p of demoPhotos) {
    await prisma.photo.create({
      data: {
        studio_id: studio1.id,
        gallery_id: gallery1.id,
        storage_provider: StorageProviderType.PLATFORM,
        storage_path: p.storage_path,
        original_url: p.original_url,
        thumbnail_url: p.thumbnail_url,
        width: p.width,
        height: p.height,
        file_size: p.file_size,
        mime_type: p.mime_type,
        processing_status: ProcessingStatus.COMPLETED,
      },
    });
  }

  // 8. Seed Sample Processing Jobs
  await prisma.processingJob.create({
    data: {
      studio_id: studio1.id,
      gallery_id: gallery1.id,
      job_type: JobType.THUMBNAIL_GENERATION,
      status: ProcessingStatus.COMPLETED,
      progress: 100,
    },
  });

  await prisma.processingJob.create({
    data: {
      studio_id: studio1.id,
      gallery_id: gallery2.id,
      job_type: JobType.METADATA_EXTRACTION,
      status: ProcessingStatus.PROCESSING,
      progress: 65,
    },
  });

  // 9. Seed Demo Clients
  await prisma.client.createMany({
    data: [
      {
        studio_id: studio1.id,
        gallery_id: gallery1.id,
        name: 'Sophia Miller',
        email: 'sophia.miller@example.com',
        phone: '+1 555-0199',
      },
      {
        studio_id: studio1.id,
        gallery_id: gallery1.id,
        name: 'Liam Anderson',
        email: 'liam.anderson@example.com',
        phone: '+1 555-0142',
      },
    ],
    skipDuplicates: true,
  });

  // 10. Seed Second Independent Studio (Demonstrating Multi-Tenancy Isolation)
  const studio2 = await prisma.studio.upsert({
    where: { slug: 'apex-portraiture' },
    update: {},
    create: {
      name: 'Apex Portraiture Studio',
      slug: 'apex-portraiture',
      website: 'https://apexphotos.example.com',
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'marcus@apexphotos.com' },
    update: {},
    create: {
      name: 'Marcus Vance',
      email: 'marcus@apexphotos.com',
      password_hash: passwordHash,
      role: UserRole.STUDIO_OWNER,
    },
  });

  await prisma.studioMembership.upsert({
    where: { user_id_studio_id: { user_id: owner2.id, studio_id: studio2.id } },
    update: {},
    create: {
      user_id: owner2.id,
      studio_id: studio2.id,
      role: StudioMemberRole.OWNER,
    },
  });

  await prisma.subscription.upsert({
    where: { studio_id: studio2.id },
    update: {},
    create: {
      studio_id: studio2.id,
      plan: SubscriptionPlan.STARTER,
      status: SubscriptionStatus.ACTIVE,
      storage_limit_bytes: BigInt(10 * 1024 * 1024 * 1024),
      photo_limit: 2500,
      ai_search_limit: 250,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Demo multi-tenant seed data successfully populated!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
