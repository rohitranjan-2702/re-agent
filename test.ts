import { prisma } from "@/lib/prisma";

const test = async () => {
  const user = await prisma.user.findFirst({});
  console.log(user);
};

test();
