'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <motion.main key={path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .28 }}>{children}</motion.main>;
}
