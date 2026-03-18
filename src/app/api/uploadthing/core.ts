import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth-config";

const f = createUploadthing();

export const uploadRouter = {
  cheerImage: f({
    image: {
      maxFileSize: "512KB",
      maxFileCount: 1,
    },
  }).middleware(async () => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    return { userId: session.user.id };
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url };
  }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
