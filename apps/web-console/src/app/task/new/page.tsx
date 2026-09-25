"use client";

import { Suspense } from "react";
import { NewTaskComposer } from "@/features/task/NewTaskComposer";

export default function TaskNewPage() {
  return (
    <Suspense fallback={null}>
      <NewTaskComposer />
    </Suspense>
  );
}
