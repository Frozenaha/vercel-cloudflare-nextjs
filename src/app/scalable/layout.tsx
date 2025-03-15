import Providers from "@/components/Providers";
import React from "react";

function layout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}

export default layout;
