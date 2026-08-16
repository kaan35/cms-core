"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { UserPermissionsEditor } from "@cms/plugin-auth-admin";

export default function UserDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  return <UserPermissionsEditor userId={id} />;
}
