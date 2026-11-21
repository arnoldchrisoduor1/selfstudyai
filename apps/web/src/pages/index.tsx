import { useEffect } from "react";
import { useRouter } from "next/router";

import { Loader } from "@self-study/ui/Loader";

import { basePath } from "@/lib/nav";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${basePath}/overview/`);
  }, [router]);

  return <Loader label="Redirecting" />;
}