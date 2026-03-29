import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const games = await p.game.findMany({ select: { id: true, name: true, maxRounds: true, status: true }, orderBy: { createdAt: 'desc' }, take: 5 });
console.log(JSON.stringify(games, null, 2));
await p.$disconnect();
