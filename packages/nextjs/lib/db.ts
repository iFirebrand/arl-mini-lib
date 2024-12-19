// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Wrap PrismaClient with authentication
const prismaClientSingleton = async () => {
  // Attempt to authenticate
  const { error } = await supabase.auth.signInWithPassword({
    password: process.env.SUPABASE_RLS_PASSWORD || "",
    email: process.env.SUPABASE_RLS_EMAIL || "",
  });

  if (error) {
    console.error("Authentication failed:", error.message);
    throw new Error("Database access denied");
  }

  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = await prismaClientSingleton();
} else {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = await prismaClientSingleton();
  }
  prisma = globalThis.prismaGlobal;
}

export default prisma;
